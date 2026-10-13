import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isEmailAllowed } from "@/app/api/_helpers/auth";
import ChangePasswordForm from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) {
    redirect("/account/signin?callbackUrl=%2Faccount%2Fchange-password");
  }
  if (!(await isEmailAllowed(session.user.email))) {
    redirect("/account/access-denied");
  }
  return <ChangePasswordForm email={session.user.email} />;
}
