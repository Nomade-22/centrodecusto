"use client";

import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function ChangePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (next.length < 12) {
      setError("A nova senha deve ter pelo menos 12 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("As duas senhas novas não coincidem.");
      return;
    }
    if (current === next) {
      setError("Escolha uma senha diferente da senha provisória.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setError("Não foi possível alterar. Confira a senha atual e tente novamente.");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch {
      setError("Falha na conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e1a2d] p-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#19283e] p-7 shadow-xl">
        <h1 className="mb-1 text-2xl font-bold">Alterar senha</h1>
        <p className="mb-6 text-sm text-slate-300">
          Centro de Custo Multprest — {email}
        </p>
        {done ? (
          <div className="space-y-5">
            <p role="status" className="rounded-lg border border-emerald-700 bg-emerald-900/30 p-3 text-emerald-200">
              Sua senha foi alterada. As outras sessões foram encerradas.
            </p>
            <a className="block rounded-lg bg-emerald-600 p-3 text-center font-semibold hover:bg-emerald-500"
              href="/">Voltar ao Centro de Custo</a>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={change}>
            <label className="text-sm">
              Senha atual (provisória)
              <input
                type="password" autoComplete="current-password" required
                value={current} onChange={(e) => setCurrent(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-800 p-3 text-white"
              />
            </label>
            <label className="text-sm">
              Nova senha (mínimo 12 caracteres)
              <input
                type="password" autoComplete="new-password" minLength={12} maxLength={128} required
                value={next} onChange={(e) => setNext(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-800 p-3 text-white"
              />
            </label>
            <label className="text-sm">
              Confirmar nova senha
              <input
                type="password" autoComplete="new-password" minLength={12} maxLength={128} required
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-800 p-3 text-white"
              />
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
            <button
              className="rounded-lg bg-emerald-600 p-3 font-semibold hover:bg-emerald-500 disabled:opacity-60"
              type="submit" disabled={busy}>
              {busy ? "Alterando…" : "Salvar nova senha"}
            </button>
            <a href="/" className="text-center text-sm text-slate-300 hover:text-white">Voltar sem alterar</a>
          </form>
        )}
      </section>
    </main>
  );
}
