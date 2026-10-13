import ClientPage from "./client-page";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isEmailAllowed } from "@/app/api/_helpers/auth";

export const dynamic = "force-dynamic";

/**
 * A UI do orçamento só é renderizada após sessão válida e e-mail autorizado.
 * As APIs financeiras mantêm sua própria verificação (defesa em profundidade).
 */
export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.email) {
    redirect("/account/signin?callbackUrl=%2F");
  }

  if (!(await isEmailAllowed(session.user.email))) {
    redirect("/account/access-denied");
  }

  return <ClientPage />;
}
