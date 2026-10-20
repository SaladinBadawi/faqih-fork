"use client";

import { useState, useTransition } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useAudio, useWindowSize, useMount } from "react-use";
import { toast } from "sonner";

import { upsertChallengeProgress } from "@/actions/challenge-progress";
import { reduceHearts } from "@/actions/user-progress";
import { useMessages } from "@/components/locale-provider";
import { useIsKids } from "@/components/mode-provider";
import { MAX_HEARTS } from "@/constants";
import {
  challengeOptions,
  challenges,
  lessons,
  sourceTexts,
  userSubscription,
} from "@/db/schema";
import {
  type Answer,
  type CompleteAyahPayload,
  type CompleteWordPayload,
  type MatchPayload,
  type OrderPayload,
  usesOptions,
} from "@/lib/exercises";
import { useHeartsModal } from "@/store/use-hearts-modal";
import { usePracticeModal } from "@/store/use-practice-modal";

import { Challenge } from "./challenge";
import { AudioPlayer } from "./exercises/audio-player";
import { BlankSentence } from "./exercises/blank-sentence";
import { MatchExercise } from "./exercises/match";
import { OrderExercise } from "./exercises/order";
import { TypedAnswer } from "./exercises/typed-answer";
import { Footer } from "./footer";
import { Header } from "./header";
import { QuestionBubble } from "./question-bubble";
import { ResultCard } from "./result-card";
import { SourceNote } from "./source-note";

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  reviewStatus: (typeof lessons.$inferSelect)["reviewStatus"];
  isExam?: boolean;
  initialLessonChallenges: (typeof challenges.$inferSelect & {
    completed: boolean;
    challengeOptions: (typeof challengeOptions.$inferSelect)[];
    sourceText: typeof sourceTexts.$inferSelect | null;
  })[];
  userSubscription:
    | (typeof userSubscription.$inferSelect & {
        isActive: boolean;
      })
    | null;
};

export const Quiz = ({
  initialPercentage,
  initialHearts,
  initialLessonId,
  reviewStatus,
  isExam,
  initialLessonChallenges,
  userSubscription,
}: QuizProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [correctAudio, _c, correctControls] = useAudio({ src: "/correct.wav" });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incorrectAudio, _i, incorrectControls] = useAudio({
    src: "/incorrect.wav",
  });
  const { width, height } = useWindowSize();
  const t = useMessages();
  const isKids = useIsKids();

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { open: openHeartsModal } = useHeartsModal();
  const { open: openPracticeModal } = usePracticeModal();

  useMount(() => {
    if (initialPercentage === 100) openPracticeModal();
  });

  const [lessonId] = useState(initialLessonId);
  const [hearts, setHearts] = useState(initialHearts);
  const [percentage, setPercentage] = useState(() => {
    return initialPercentage === 100 ? 0 : initialPercentage;
  });
  const [challenges] = useState(initialLessonChallenges);
  const [activeIndex, setActiveIndex] = useState(() => {
    const uncompletedIndex = challenges.findIndex(
      (challenge) => !challenge.completed
    );

    return uncompletedIndex === -1 ? 0 : uncompletedIndex;
  });

  const [selectedOption, setSelectedOption] = useState<number>();
  const [status, setStatus] = useState<"none" | "wrong" | "correct">("none");
  // Exercises without options (ORDER, MATCH, typed answers) report here.
  const [answer, setAnswer] = useState<Answer>({
    ready: false,
    correct: false,
  });
  // Bumped on retry, so those exercises start over.
  const [attempt, setAttempt] = useState(0);

  const challenge = challenges[activeIndex];
  const options = challenge?.challengeOptions ?? [];
  const optionBased =
    !!challenge && usesOptions(challenge.type, challenge.payload);
  const ready = optionBased ? !!selectedOption : answer.ready;

  const resetAnswer = () => {
    setStatus("none");
    setSelectedOption(undefined);
    setAnswer({ ready: false, correct: false });
    setAttempt((a) => a + 1);
  };

  const onNext = () => {
    setActiveIndex((current) => current + 1);
  };

  const onSelect = (id: number) => {
    if (status !== "none") return;

    setSelectedOption(id);
  };

  const onContinue = () => {
    if (!ready) return;

    if (status === "wrong") {
      resetAnswer();
      return;
    }

    if (status === "correct") {
      onNext();
      resetAnswer();
      return;
    }

    let isCorrect = answer.correct;
    if (optionBased) {
      const correctOption = options.find((option) => option.correct);
      if (!correctOption) return;
      isCorrect = correctOption.id === selectedOption;
    }

    if (isCorrect) {
      startTransition(() => {
        upsertChallengeProgress(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal();
              return;
            }

            void correctControls.play();
            setStatus("correct");
            setPercentage((prev) => prev + 100 / challenges.length);

            // This is a practice
            if (initialPercentage === 100) {
              setHearts((prev) => Math.min(prev + 1, MAX_HEARTS));
            }
          })
          .catch(() => toast.error(t.lesson.error));
      });
    } else {
      startTransition(() => {
        reduceHearts(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal();
              return;
            }

            void incorrectControls.play();
            setStatus("wrong");

            if (!response?.error) setHearts((prev) => Math.max(prev - 1, 0));
          })
          .catch(() => toast.error(t.lesson.error));
      });
    }
  };

  if (!challenge) {
    return (
      <>
        {/* Mounted only on the finish screen, so it plays exactly once there. */}
        <audio src="/finish.mp3" autoPlay />
        <Confetti
          recycle={false}
          numberOfPieces={500}
          tweenDuration={10_000}
          width={width}
          height={height}
        />
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-y-4 text-center lg:gap-y-8">
          <Image
            src="/finish.svg"
            alt="Finish"
            className="hidden lg:block"
            height={100}
            width={100}
          />

          <Image
            src="/finish.svg"
            alt="Finish"
            className="block lg:hidden"
            height={100}
            width={100}
          />

          <h1 className="text-lg font-bold text-neutral-700 lg:text-3xl">
            {isExam ? t.lesson.examPassed : t.lesson.finished}
          </h1>

          <div className="flex w-full items-center gap-x-4">
            <ResultCard variant="points" value={challenges.length * 10} />
            {!isKids && (
              <ResultCard
                variant="hearts"
                value={userSubscription?.isActive ? Infinity : hearts}
              />
            )}
          </div>
        </div>

        <Footer
          lessonId={lessonId}
          status="completed"
          onCheck={() => router.push("/learn")}
        />
      </>
    );
  }

  const prompts: Partial<Record<string, string>> = t.lesson.prompts;
  const title =
    challenge.prompt ??
    prompts[challenge.type] ??
    (challenge.type === "ASSIST" ? t.lesson.defaultPrompt : challenge.question);

  const exerciseKey = `${challenge.id}:${attempt}`;
  const payload = challenge.payload;
  const selectedText = options.find((o) => o.id === selectedOption)?.text;

  return (
    <>
      {incorrectAudio}
      {correctAudio}
      <Header
        hearts={hearts}
        percentage={percentage}
        hasActiveSubscription={!!userSubscription?.isActive}
        hideHearts={isKids}
      />

      <div className="flex-1">
        <div className="flex h-full items-center justify-center">
          <div className="flex w-full flex-col gap-y-12 px-6 lg:min-h-[350px] lg:w-[600px] lg:px-0">
            <h1 className="text-center text-lg font-bold text-neutral-700 lg:text-start lg:text-3xl">
              {title}
            </h1>

            <div>
              {(challenge.type === "ASSIST" ||
                challenge.type === "TRUE_FALSE" ||
                challenge.type === "COMPLETE_AYAH") && (
                <QuestionBubble question={challenge.question} />
              )}

              {challenge.type === "LISTEN" &&
                challenge.sourceText?.audioSrc && (
                  <AudioPlayer src={challenge.sourceText.audioSrc} />
                )}

              {challenge.type === "COMPLETE_WORD" && (
                <BlankSentence
                  before={(payload as CompleteWordPayload).before}
                  after={(payload as CompleteWordPayload).after}
                  fill={optionBased ? selectedText : undefined}
                />
              )}

              {optionBased && (
                <Challenge
                  options={options}
                  onSelect={onSelect}
                  status={status}
                  selectedOption={selectedOption}
                  disabled={pending}
                  type={challenge.type}
                />
              )}

              {challenge.type === "ORDER" && (
                <OrderExercise
                  key={exerciseKey}
                  words={(payload as OrderPayload).words}
                  seed={challenge.id}
                  status={status}
                  onAnswer={setAnswer}
                />
              )}

              {challenge.type === "MATCH" && (
                <MatchExercise
                  key={exerciseKey}
                  pairs={(payload as MatchPayload).pairs}
                  seed={challenge.id}
                  status={status}
                  onAnswer={setAnswer}
                />
              )}

              {!optionBased &&
                (challenge.type === "COMPLETE_WORD" ||
                  challenge.type === "COMPLETE_AYAH") && (
                  <TypedAnswer
                    key={exerciseKey}
                    answer={
                      (payload as CompleteWordPayload | CompleteAyahPayload)
                        .answer
                    }
                    multiline={challenge.type === "COMPLETE_AYAH"}
                    status={status}
                    onAnswer={setAnswer}
                  />
                )}

              <SourceNote
                source={challenge.sourceText}
                isDraft={reviewStatus !== "reviewed"}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer
        disabled={pending || !ready}
        status={status}
        onCheck={onContinue}
      />
    </>
  );
};
