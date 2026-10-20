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
import { getMode } from "@/lib/preferences";

import { Header } from "./header";
import { Unit } from "./unit";

const LearnPage = async () => {
  const userProgressData = getUserProgress();
  const courseProgressData = getCourseProgress();
  const unitsData = getUnits();
  const userSubscriptionData = getUserSubscription();

  const [userProgress, units, courseProgress, userSubscription, mode] =
    await Promise.all([
      userProgressData,
      unitsData,
      courseProgressData,
      userSubscriptionData,
      getMode(),
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
        {units.map((unit) => (
          <div key={unit.id} className="mb-10">
            <Unit
              title={unit.title}
              description={unit.description}
              lessons={unit.lessons}
              unlocked={unit.unlocked}
              completed={unit.completed}
              testedOut={unit.testedOut}
            />
          </div>
        ))}
      </FeedWrapper>
    </div>
  );
};

export default LearnPage;
