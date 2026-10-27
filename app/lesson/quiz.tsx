"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Volume2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useAudio, useWindowSize, useMount } from "react-use";
import { toast } from "sonner";

import {
  skipListening,
  upsertChallengeProgress,
} from "@/actions/challenge-progress";
import { reviewAnswer } from "@/actions/review";
import { reduceHearts } from "@/actions/user-progress";
import { useMessages } from "@/components/locale-provider";
import { MeaningsProvider } from "@/components/meanings";
import { useIsKids, useMode } from "@/components/mode-provider";
import { type Step, isSpeakable, useReadAloud } from "@/components/read-aloud";
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
import { LAST_UNIT_COOKIE, setPreferenceCookie } from "@/lib/mode";
import { recitationAudio } from "@/lib/recitation";
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
import { Study } from "./study";

type QuizProps = {
  initialPercentage: number;
  initialHearts: number;
  initialLessonId: number;
  /** Remembered on the device, so the learn page returns to this surah. */
  unitId?: number;
  /**
   * A hearts review (app/lesson/review): each right answer gives a heart
   * back, a wrong one costs nothing, and the end returns to the lesson.
   */
  review?: { returnHref: string };
  /** Read first: the texts the lesson is about, shown before the questions. */
  studyTexts?: (typeof sourceTexts.$inferSelect)[];
  /** English mode: the meaning of each ayah in the lesson, by "surah:ayah". */
  meanings?: Record<string, string>;
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
  unitId,
  review,
  studyTexts = [],
  meanings = {},
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
  const mode = useMode();
  const { enabled: readAloudOn, play, stop } = useReadAloud();

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
  const [challenges, setChallenges] = useState(initialLessonChallenges);
  // Lessons open on what they're about; exams and reviews go straight in.
  const [studying, setStudying] = useState(
    () => !review && !isExam && studyTexts.length > 0
  );
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

  const prompts: Partial<Record<string, string>> = t.lesson.prompts;
  // The title is an instruction ("ما الآية التالية؟"), except for old SELECT
  // challenges without a prompt, where it is the question itself.
  const instruction =
    challenge &&
    (challenge.prompt ??
      prompts[challenge.type] ??
      (challenge.type === "ASSIST" ? t.lesson.defaultPrompt : undefined));
  const title = instruction ?? challenge?.question;

  // LISTEN plays the challenge's own ayah ("quran:s:a" -> "s:a").
  const listenRef =
    challenge?.type === "LISTEN"
      ? /^quran:(\d+:\d+)$/.exec(challenge.sourceText?.key ?? "")?.[1]
      : undefined;

  // LISTEN sources, best first; memoised so the player doesn't replay.
  const listenAudioSrc = challenge?.sourceText?.audioSrc;
  const listenUrls = useMemo(
    () =>
      listenRef
        ? recitationAudio(listenRef, mode)
        : listenAudioSrc
          ? [listenAudioSrc]
          : [],
    [listenAudioSrc, listenRef, mode]
  );

  // What "read aloud" says when a question opens: the instruction in the
  // app's voice, then any ayat in the question as real recitation. Quran
  // text is never spoken by the synthetic voice (see isSpeakable).
  const openingSteps = useMemo<Step[]>(() => {
    if (!challenge) return [];
    const steps: Step[] = [];
    if (instruction) steps.push({ kind: "speak", text: instruction });
    const ayat = challenge.readAloud?.ayat ?? (listenRef ? [listenRef] : []);
    for (const ref of ayat) {
      if (steps.length) steps.push({ kind: "wait", ms: 300 });
      steps.push({ kind: "recite", ref });
    }
    const question = challenge.question.replace(/\n⬇\n/g, ". ");
    if (!ayat.length && question && isSpeakable(question))
      steps.push({ kind: "speak", text: question });
    return steps;
  }, [challenge, instruction, listenRef]);

  useEffect(() => {
    if (readAloudOn && !studying && openingSteps.length) play(openingSteps);
  }, [openingSteps, play, readAloudOn, studying]);

  // Leaving the lesson stops any sound.
  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (unitId) setPreferenceCookie(LAST_UNIT_COOKIE, String(unitId));
  }, [unitId]);

  // Spoken "أحسنت!" / "حاول مرة أخرى" after the chime.
  const encourage = (text: string) => {
    if (readAloudOn)
      play([
        { kind: "wait", ms: 600 },
        { kind: "speak", text },
      ]);
  };

  const resetAnswer = () => {
    setStatus("none");
    setSelectedOption(undefined);
    setAnswer({ ready: false, correct: false });
    setAttempt((a) => a + 1);
  };

  // "Can't listen now": skip this and the lesson's other listening
  // questions, without points or hearts, and carry on.
  const onCantListen = () => {
    const ids = challenges
      .slice(activeIndex)
      .filter((c) => c.type === "LISTEN" && !c.completed)
      .map((c) => c.id);
    startTransition(() => {
      skipListening(ids)
        .then(() => {
          stop();
          setPercentage((prev) =>
            Math.min(100, prev + (ids.length * 100) / challenges.length)
          );
          setChallenges((prev) => prev.filter((c) => !ids.includes(c.id)));
          resetAnswer();
        })
        .catch(() => toast.error(t.lesson.error));
    });
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

    if (review) {
      // Review: a right answer earns a heart back; a wrong one costs nothing.
      if (!isCorrect) {
        void incorrectControls.play();
        encourage(t.lesson.wrong);
        setStatus("wrong");
        return;
      }
      startTransition(() => {
        reviewAnswer(challenge.id)
          .then(({ hearts }) => {
            void correctControls.play();
            encourage(t.lesson.correct);
            setStatus("correct");
            setHearts(hearts);
            setPercentage((prev) => prev + 100 / challenges.length);
          })
          .catch(() => toast.error(t.lesson.error));
      });
      return;
    }

    if (isCorrect) {
      startTransition(() => {
        upsertChallengeProgress(challenge.id)
          .then((response) => {
            if (response?.error === "hearts") {
              openHeartsModal(lessonId);
              return;
            }

            void correctControls.play();
            encourage(t.lesson.correct);
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
              openHeartsModal(lessonId);
              return;
            }

            void incorrectControls.play();
            encourage(t.lesson.wrong);
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
        {/* No music (ma'azif): just the short "correct" sound, once. */}
        <audio src="/correct.wav" autoPlay />
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
            {review
              ? t.review.done
              : isExam
                ? t.lesson.examPassed
                : t.lesson.finished}
          </h1>

          <div className="flex w-full items-center gap-x-4">
            {/* A review earns hearts, not points. */}
            {!review && (
              <ResultCard variant="points" value={challenges.length * 10} />
            )}
            {!isKids && (
              <ResultCard
                variant="hearts"
                value={userSubscription?.isActive ? Infinity : hearts}
              />
            )}
          </div>
        </div>

        <Footer
          lessonId={review ? undefined : lessonId}
          status="completed"
          onCheck={() => router.push(review?.returnHref ?? "/learn")}
        />
      </>
    );
  }

  const exerciseKey = `${challenge.id}:${attempt}`;
  const payload = challenge.payload;
  const selectedText = options.find((o) => o.id === selectedOption)?.text;

  if (studying)
    return (
      <>
        <Header
          hearts={hearts}
          percentage={percentage}
          hasActiveSubscription={!!userSubscription?.isActive}
          hideHearts={isKids}
        />
        <div className="flex flex-1 justify-center overflow-y-auto pt-8">
          <Study
            texts={studyTexts}
            onStart={() => {
              stop();
              setStudying(false);
            }}
          />
        </div>
      </>
    );

  return (
    <MeaningsProvider meanings={meanings}>
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
            <div className="flex items-center justify-center gap-x-3 lg:justify-start">
              {/* Announced to screen readers on every new question. */}
              <h1
                aria-live="polite"
                className="text-center text-lg font-bold text-neutral-700 lg:text-start lg:text-3xl"
              >
                {title}
              </h1>
              {/* Replay works even when read-aloud is off in Settings. */}
              {openingSteps.length > 0 && (
                <button
                  type="button"
                  onClick={() => play(openingSteps)}
                  aria-label={t.lesson.listenAgain}
                  className="shrink-0 rounded-xl border-2 border-b-4 p-2 text-sky-500 hover:bg-black/5 active:border-b-2"
                >
                  <Volume2 className="h-6 w-6" />
                </button>
              )}
            </div>

            <div>
              {(challenge.type === "ASSIST" ||
                challenge.type === "TRUE_FALSE" ||
                challenge.type === "COMPLETE_AYAH") && (
                <QuestionBubble
                  question={challenge.question}
                  meanings={(challenge.readAloud?.ayat ?? [])
                    .map((ref) => meanings[ref])
                    .filter((m): m is string => !!m)}
                />
              )}

              {challenge.type === "LISTEN" && listenUrls.length > 0 && (
                <>
                  <AudioPlayer urls={listenUrls} />
                  {status === "none" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={onCantListen}
                      className="mx-auto mb-6 block text-sm font-bold text-sky-500 hover:underline"
                    >
                      {t.lesson.cantListen}
                    </button>
                  )}
                </>
              )}

              {challenge.type === "COMPLETE_WORD" && (
                <BlankSentence
                  meaning={
                    meanings[
                      challenge.sourceText?.key.replace(/^quran:/, "") ?? ""
                    ]
                  }
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
                  recitations={(payload as OrderPayload).recitations}
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
    </MeaningsProvider>
  );
};
