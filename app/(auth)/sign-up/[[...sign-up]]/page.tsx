import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { features } from "@/config";

const SignUpPage = () => {
  if (features.localAuth) redirect("/learn");

  return <SignUp />;
};

export default SignUpPage;
