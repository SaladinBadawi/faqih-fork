"use client";

import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

// Faqih's logo (docs/BRAND.md). The mark is the letter ف in the
// eight-pointed hizb star (۞) of the mushaf; the name is written in both
// languages, the app's own language first.

type LogoMarkProps = { size?: number; className?: string };

/** The star with ف: the app icon, and the logo's mark. */
export const LogoMark = ({ size = 40, className }: LogoMarkProps) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    className={className}
    aria-hidden
  >
    <rect x="15" y="15" width="70" height="70" rx="3.5" fill="#ffc800" />
    <rect
      x="15"
      y="15"
      width="70"
      height="70"
      rx="3.5"
      fill="#ffc800"
      transform="rotate(45 50 50)"
    />
    <circle cx="50" cy="50" r="31" fill="#1b3a6b" />
    <path
      transform="translate(51.2 50.5) scale(0.6)"
      d="M-34 0 C-31 38 30 38 30 6 C30 -8 27 -18 18 -18 C9 -18 7 -9 10 -5 C13 -1 21 1 30 2"
      fill="none"
      stroke="#fff"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="61.5" cy="31" r="3.8" fill="#ffc800" />
  </svg>
);

type LogoProps = { size?: "sm" | "md"; className?: string };

/** Mark and name: فقيه leads in Arabic, Faqih in English. */
export const Logo = ({ size = "md", className }: LogoProps) => {
  const locale = useLocale();
  const arabic = (
    <span
      key="ar"
      lang="ar"
      className={cn(
        "font-kufi font-bold leading-none",
        locale === "ar"
          ? size === "md"
            ? "text-3xl"
            : "text-2xl"
          : "text-base"
      )}
    >
      فقيه
    </span>
  );
  const english = (
    <span
      key="en"
      lang="en"
      className={cn(
        "font-sans font-extrabold leading-none tracking-wide",
        locale === "en" ? (size === "md" ? "text-2xl" : "text-xl") : "text-sm"
      )}
    >
      Faqih
    </span>
  );

  return (
    <span
      role="img"
      className={cn("flex items-center gap-x-3 text-brand-700", className)}
      aria-label={locale === "ar" ? "فقيه" : "Faqih"}
    >
      <LogoMark size={size === "md" ? 44 : 36} />
      <span className="flex flex-col items-start gap-y-1" aria-hidden>
        {locale === "ar" ? [arabic, english] : [english, arabic]}
      </span>
    </span>
  );
};
