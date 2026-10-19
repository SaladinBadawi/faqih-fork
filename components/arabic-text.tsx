import { cn } from "@/lib/utils";

type ArabicTextProps = {
  children: React.ReactNode;
  // "quran" for ayat (Uthmani script), "arabic" for hadith, duas and vocabulary.
  variant?: "quran" | "arabic";
  className?: string;
};

export const ArabicText = ({
  children,
  variant = "arabic",
  className,
}: ArabicTextProps) => {
  return (
    <span
      lang="ar"
      dir="rtl"
      className={cn(
        "leading-loose",
        variant === "quran" ? "font-quran text-2xl" : "font-arabic text-xl",
        className
      )}
    >
      {children}
    </span>
  );
};
