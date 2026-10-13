import { redirect } from "next/navigation";

export default function SignupPage() {
  // O Centro de Custo usa convites individuais, não possui cadastro público.
  redirect("/account/signin");
}
