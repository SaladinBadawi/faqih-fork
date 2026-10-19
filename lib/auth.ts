import {
  auth as clerkAuth,
  currentUser as clerkCurrentUser,
} from "@clerk/nextjs/server";

import { features } from "@/config";

type AppUser = {
  id: string;
  firstName: string | null;
  imageUrl: string;
  email: string | undefined;
};

export const LOCAL_USER: AppUser = {
  id: "local_dev_user",
  firstName: "Dev User",
  imageUrl: "/mascot.svg",
  email: "dev@localhost",
};

// Use these instead of Clerk's auth()/currentUser() so local dev login works.
export const getAuth = async (): Promise<{ userId: string | null }> => {
  if (features.localAuth) return { userId: LOCAL_USER.id };

  const { userId } = await clerkAuth();
  return { userId };
};

export const getCurrentUser = async (): Promise<AppUser | null> => {
  if (features.localAuth) return LOCAL_USER;

  const user = await clerkCurrentUser();
  if (!user) return null;

  return {
    id: user.id,
    firstName: user.firstName,
    imageUrl: user.imageUrl,
    email: user.emailAddresses[0]?.emailAddress,
  };
};
