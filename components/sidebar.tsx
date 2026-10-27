"use client";

import Image from "next/image";
import Link from "next/link";

import { UserMenu } from "@/components/auth-controls";
import { InviteButton } from "@/components/invite";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useMessages } from "@/components/locale-provider";
import { useIsKids } from "@/components/mode-provider";
import { APP_NAME, features } from "@/config";
import { cn } from "@/lib/utils";

import { SidebarItem } from "./sidebar-item";

type SidebarProps = {
  className?: string;
};

export const Sidebar = ({ className }: SidebarProps) => {
  const t = useMessages();
  const isKids = useIsKids();

  return (
    <div
      className={cn(
        "start-0 top-0 flex h-full flex-col border-e-2 px-4 lg:fixed lg:w-[256px]",
        className
      )}
    >
      <Link href="/learn">
        <div className="flex items-center gap-x-3 pb-7 ps-4 pt-8">
          <Image src="/mascot.svg" alt="Mascot" height={40} width={40} />

          <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
            {APP_NAME}
          </h1>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-y-2">
        <SidebarItem label={t.nav.learn} href="/learn" iconSrc="/learn.svg" />
        <SidebarItem label={t.nav.read} href="/read" iconSrc="/read.svg" />
        <SidebarItem label={t.nav.modes} href="/modes" iconSrc="/modes.svg" />
        {/* Kids mode keeps the menu short: no points, hearts or rankings. */}
        {!isKids && (
          <>
            <SidebarItem
              label={t.nav.leaderboard}
              href="/leaderboard"
              iconSrc="/leaderboard.svg"
            />
            {features.shop && (
              <SidebarItem
                label={t.nav.shop}
                href="/shop"
                iconSrc="/shop.svg"
              />
            )}
          </>
        )}
        <SidebarItem
          label={t.nav.settings}
          href="/settings"
          iconSrc="/mascot.svg"
        />
      </div>

      <div className="flex flex-col items-start gap-y-3 p-4">
        <InviteButton />
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </div>
  );
};
