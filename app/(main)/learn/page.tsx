import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { Promo } from "@/components/promo";
import { Quests } from "@/components/quests";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import {
  getCourseProgress,
  getUnits,
  getUserProgress,
  getUserSubscription,
} from "@/db/queries";
import { getLastUnitId, getMode } from "@/lib/preferences";

import { Header } from "./header";
import { ScrollToUnit } from "./scroll-to-unit";
import { UnitJump } from "./unit-jump";
import { Unit } from "./unit";

const LearnPage = async () => {
  const userProgressData = getUserProgress();
  const courseProgressData = getCourseProgress();
  const unitsData = getUnits();
  const userSubscriptionData = getUserSubscription();

  const [
    userProgress,
    units,
    courseProgress,
    userSubscription,
    mode,
    lastUnitId,
  ] = await Promise.all([
    userProgressData,
    unitsData,
    courseProgressData,
    userSubscriptionData,
    getMode(),
    getLastUnitId(),
  ]);
  const isKids = mode === "kids";

  if (!courseProgress || !userProgress || !userProgress.activeCourse)
    redirect("/courses");

  const isPro = !!userSubscription?.isActive;

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={isPro}
          hideHearts={isKids}
        />

        {!isPro && !isKids && <Promo />}
        {!isKids && <Quests points={userProgress.points} />}
      </StickyWrapper>
      <FeedWrapper>
        <Header title={userProgress.activeCourse.title} />
        {/* Back to the surah of the last lesson, not the top of the list. */}
        <ScrollToUnit
          order={units.find((u) => u.id === lastUnitId)?.order ?? null}
        />
        {/* Any surah can be learned in any order: jump straight to one. */}
        {units.length > 1 && (
          <UnitJump
            units={units.map((unit) => ({
              order: unit.order,
              title: unit.title,
              cleared: unit.cleared,
            }))}
          />
        )}
        {units.map((unit) => (
          <div
            key={unit.id}
            id={`unit-${unit.order}`}
            className="mb-10 scroll-mt-24"
          >
            <Unit
              title={unit.title}
              description={unit.description}
              lessons={unit.lessons}
              completed={unit.completed}
              passedExam={unit.passedExam}
            />
          </div>
        ))}
      </FeedWrapper>
    </div>
  );
};

export default LearnPage;
