"use client";

import { authClient } from "@/lib/auth-client";

export default function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e1a2d] p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#18283f] p-8 text-center shadow-lg">
        <h1 className="mb-3 text-2xl font-semibold">Acesso não autorizado</h1>
        <p className="mb-6 text-slate-300">
          Sua conta foi autenticada, mas ainda não está autorizada a acessar
          o Centro de Custo Multprest. Solicite acesso ao administrador.
        </p>
        <button
          type="button"
          onClick={async () => {
            await authClient.signOut();
            window.location.assign("/account/signin");
          }}
          className="rounded-lg bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-500"
        >
          Sair e usar outra conta
        </button>
      </div>
    </main>
  );
}
