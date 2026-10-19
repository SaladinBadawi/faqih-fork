import {
  BookOpen,
  HandHeart,
  Landmark,
  Languages,
  ScrollText,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const TRACKS = [
  { label: "Quran", Icon: BookOpen },
  { label: "Hadith", Icon: ScrollText },
  { label: "Sirah", Icon: Landmark },
  { label: "Arabic", Icon: Languages },
  { label: "Fiqh", Icon: HandHeart },
];

export const Footer = () => {
  return (
    <div className="hidden h-20 w-full border-t-2 border-slate-200 p-2 lg:block">
      <div className="mx-auto flex h-full max-w-screen-lg items-center justify-evenly">
        {TRACKS.map(({ label, Icon }) => (
          <Button
            key={label}
            size="lg"
            variant="ghost"
            className="w-full cursor-default"
          >
            <Icon className="mr-4 h-7 w-7 text-green-600" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
};
