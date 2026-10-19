import { features } from "@/config";
import { getAuth } from "@/lib/auth";

export const getIsAdmin = async () => {
  if (features.localAuth) return true;

  const { userId } = await getAuth();
  const adminIds = (process.env.CLERK_ADMIN_IDS ?? "").split(", "); // stored in .env file as string separated by comma(,) and space( )

  if (!userId) return false;

  return adminIds.indexOf(userId) !== -1;
};
