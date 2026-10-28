import Link from "next/link";

import { HeaderAuth } from "@/components/auth-controls";
import { Logo } from "@/components/logo";

export const Header = () => {
  return (
    <header className="h-20 w-full border-b-2 border-slate-200 px-4">
      <div className="mx-auto flex h-full items-center justify-between lg:max-w-screen-lg">
        <Link href="/" className="flex items-center gap-x-3 pb-7 ps-4 pt-8">
          <Logo />
        </Link>

        <div className="flex gap-x-3">
          <HeaderAuth showUserButton={false} />
        </div>
      </div>
    </header>
  );
};
