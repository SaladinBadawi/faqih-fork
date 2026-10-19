"use client";

import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { features, links } from "@/config";

// Clerk components only render when Clerk is in use; local dev login
// (NEXT_PUBLIC_DEV_AUTH=local) gets simple stand-ins with no Clerk provider.

const LocalUserBadge = () => (
  <div className="flex items-center gap-x-2" title="Local dev login">
    <Image
      src="/mascot.svg"
      alt="Dev User"
      height={32}
      width={32}
      className="rounded-full border"
    />
    <span className="text-sm font-semibold text-neutral-600">Dev User</span>
  </div>
);

const SourceCodeLink = ({ className }: { className?: string }) => (
  <Link
    href={links.sourceCode}
    target="_blank"
    rel="noreferrer noopener"
    className={className}
  >
    <Image src="/github.svg" alt="Source Code" height={20} width={20} />
  </Link>
);

export const UserMenu = () => {
  if (features.localAuth) return <LocalUserBadge />;

  return (
    <>
      <ClerkLoading>
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </ClerkLoading>

      <ClerkLoaded>
        <UserButton
          appearance={{
            elements: { userButtonPopoverCard: { pointerEvents: "initial" } },
          }}
        />
      </ClerkLoaded>
    </>
  );
};

const ClerkHeaderAuth = ({ showUserButton }: { showUserButton: boolean }) => {
  const { isSignedIn } = useAuth();

  return (
    <>
      <ClerkLoading>
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </ClerkLoading>

      <ClerkLoaded>
        {showUserButton && (
          <Show when="signed-in">
            <UserButton />
          </Show>
        )}

        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button size="lg" variant="ghost">
              Login
            </Button>
          </SignInButton>
        </Show>

        <SourceCodeLink className={isSignedIn ? "pt-1.5" : "pt-3"} />
      </ClerkLoaded>
    </>
  );
};

export const HeaderAuth = ({ showUserButton = true }) => {
  if (features.localAuth)
    return (
      <>
        <LocalUserBadge />
        <SourceCodeLink className="pt-1.5" />
      </>
    );

  return <ClerkHeaderAuth showUserButton={showUserButton} />;
};

export const GetStartedButtons = () => {
  if (features.localAuth)
    return (
      <Button size="lg" variant="secondary" className="w-full" asChild>
        <Link href="/learn">Continue Learning</Link>
      </Button>
    );

  return (
    <>
      <ClerkLoading>
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </ClerkLoading>

      <ClerkLoaded>
        <Show when="signed-in">
          <Button size="lg" variant="secondary" className="w-full" asChild>
            <Link href="/learn">Continue Learning</Link>
          </Button>
        </Show>

        <Show when="signed-out">
          <SignUpButton mode="modal">
            <Button size="lg" variant="secondary" className="w-full">
              Get Started
            </Button>
          </SignUpButton>

          <SignInButton mode="modal">
            <Button size="lg" variant="primaryOutline" className="w-full">
              I already have an account
            </Button>
          </SignInButton>
        </Show>
      </ClerkLoaded>
    </>
  );
};
