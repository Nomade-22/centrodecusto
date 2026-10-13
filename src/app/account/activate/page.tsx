"use client";

import { type FormEvent, useEffect, useState } from "react";

export default function ActivateAccount() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // The one-time token lives in the fragment, never in a server URL/query.
    const invitation = window.location.hash.slice(1).trim();
    if (/^[0-9a-f]{64}$/i.test(invitation)) {
      setToken(invitation);
    } else {
      setError("Link de ativação ausente ou inválido. Solicite um novo ao administrador.");
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) return setError("Link de ativação inválido.");
    if (password.length < 12) return setError("A senha precisa ter pelo menos 12 caracteres.");
    if (password !== confirmation) return setError("As senhas digitadas não coincidem.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/activate-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao ativar o acesso.");
      setPassword("");
      setConfirmation("");
      setToken("");
      window.location.assign("/account/signin?activated=1");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d192a] px-4 py-12 text-white">
      <section className="mx-auto max-w-md rounded-2xl border border-[#304158] bg-[#19283e] p-7 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Centro de Custo Multprest</h1>
          <p className="mt-2 text-sm text-slate-300">Ativação do acesso por e-mail e senha</p>
        </div>
        <form onSubmit={activate} className="flex flex-col gap-4">
          <p className="text-sm text-slate-300">
            Escolha uma senha exclusiva para este sistema. Ela não será enviada
            pelo chat nem armazenada em texto no banco de dados.
          </p>
          <label className="text-sm">
            Nova senha (mínimo 12 caracteres)
            <input type="password" minLength={12} maxLength={128} required
              autoComplete="new-password" value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-600 bg-[#25364d] p-3 text-white" />
          </label>
          <label className="text-sm">
            Confirmar senha
            <input type="password" minLength={12} maxLength={128} required
              autoComplete="new-password" value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-600 bg-[#25364d] p-3 text-white" />
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
          <button disabled={busy || !token} type="submit"
            className="rounded-lg bg-emerald-600 p-3 font-semibold text-white disabled:opacity-50">
            {busy ? "Ativando..." : "Ativar acesso"}
          </button>
        </form>
      </section>
    </main>
  );
}
