import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { features } from "@/config";

const SignInPage = () => {
  if (features.localAuth) redirect("/learn");

  return <SignIn />;
};

export default SignInPage;
