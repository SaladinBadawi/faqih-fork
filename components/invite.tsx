"use client";

import { Copy, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { useMessages } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config";

// Inviting friends: the phone's share sheet where there is one (WhatsApp,
// Telegram, messages...), else the link is copied. The link is this site's
// home page, which works for anyone, signed in or not.

const inviteUrl = () => `${window.location.origin}/`;

const useInvite = () => {
  const t = useMessages();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${t.invite.text} ${inviteUrl()}`);
      toast.success(t.invite.copied);
    } catch {
      toast.error(t.error);
    }
  };

  const share = async () => {
    if (!navigator.share) return copy();
    try {
      await navigator.share({
        title: APP_NAME,
        text: t.invite.text,
        url: inviteUrl(),
      });
    } catch (error) {
      // Closing the share sheet isn't an error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copy();
    }
  };

  const whatsapp = () =>
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${t.invite.text} ${inviteUrl()}`)}`,
      "_blank",
      "noopener,noreferrer"
    );

  return { t, share, copy, whatsapp };
};

/** A small "Invite friends" button, for the menu. */
export const InviteButton = () => {
  const { t, share } = useInvite();

  return (
    <Button variant="ghost" size="sm" onClick={share}>
      <UserPlus className="me-2 h-4 w-4" />
      {t.invite.title}
    </Button>
  );
};

/** Invite friends: share, WhatsApp, or copy the link. */
export const InviteCard = () => {
  const { t, share, copy, whatsapp } = useInvite();

  return (
    <div className="flex flex-col gap-y-3 rounded-xl border-2 p-4">
      <div className="flex items-center gap-x-2">
        <UserPlus className="h-6 w-6 text-sky-500" />
        <h3 className="text-lg font-bold text-neutral-700">{t.invite.title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{t.invite.body}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={share}>
          <Share2 className="me-2 h-4 w-4" />
          {t.invite.share}
        </Button>
        <Button variant="primaryOutline" size="sm" onClick={whatsapp}>
          {t.invite.whatsapp}
        </Button>
        <Button variant="secondaryOutline" size="sm" onClick={copy}>
          <Copy className="me-2 h-4 w-4" />
          {t.invite.copy}
        </Button>
      </div>
    </div>
  );
};
