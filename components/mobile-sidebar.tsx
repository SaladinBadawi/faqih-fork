"use client";

import { Menu } from "lucide-react";

import { useLocale, useMessages } from "@/components/locale-provider";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/config";

import { Sidebar } from "./sidebar";

export const MobileSidebar = () => {
  const locale = useLocale();
  const t = useMessages();

  return (
    <Sheet>
      <SheetTrigger>
        <Menu className="text-white" />
      </SheetTrigger>

      <SheetContent
        className="z-[100] p-0"
        aria-describedby={undefined}
        side={locale === "ar" ? "right" : "left"}
      >
        {/* Required by Radix Dialog for screen readers; visually hidden. */}
        <SheetTitle className="sr-only">
          {APP_NAME}: {t.app.tagline}
        </SheetTitle>
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
};
