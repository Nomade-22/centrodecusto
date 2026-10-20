"use client";
/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 *
 * Shipped v2 auth scaffolding. Same contract as signup/page.tsx: <form
 * onSubmit>, e.preventDefault(), and window.location.href redirect are all
 * load-bearing for the mobile WebView. DO NOT replace <form onSubmit> with
 * <button onClick> — that broke signin platform-wide in a prior AI rewrite.
 *
 *   Safe:   restyle, rewrite copy, add form fields.
 *   Unsafe: replacing <form>, removing preventDefault, bypassing
 *           authClient.signIn.email, changing the callbackUrl redirect.
 */
"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

function SignInForm() {
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") || "/";
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
  const [requestingActivation, setRequestingActivation] = useState(false);
  const [activationMessage, setActivationMessage] = useState<string | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Consultar o servidor: credenciais OAuth nunca devem ir para o navegador.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/google-status", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Falha ao consultar login Google");
        return response.json() as Promise<{ enabled: boolean }>;
      })
      .then((result) => {
        if (!controller.signal.aborted) setGoogleConfigured(result.enabled === true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setGoogleConfigured(false);
      });
    return () => controller.abort();
  }, []);

  const onGoogleSignIn = async () => {
    if (!googleConfigured || loading || googleLoading) return;
    setError(null);
    setGoogleLoading(true);
    try {
      const safeCallback =
        callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/";
      const { error: googleError } = await authClient.signIn.social({
        provider: "google",
        callbackURL: safeCallback,
      });
      if (googleError) {
        setError(googleError.message ?? "Não foi possível entrar com o Google.");
        setGoogleLoading(false);
      }
    } catch {
      setError("Falha ao iniciar o acesso pelo Google. Tente novamente.");
      setGoogleLoading(false);
    }
  };

  const requestActivation = async () => {
    setActivationMessage(null);
    setError(null);
    if (!email.trim()) {
      setError("Informe seu e-mail para solicitar a ativação.");
      return;
    }
    setRequestingActivation(true);
    try {
      const response = await fetch("/api/auth/request-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Não foi possível solicitar o link.");
      } else {
        setActivationMessage(result.message ??
          "Se sua conta estiver autorizada, você receberá um link de ativação.");
      }
    } catch {
      setError("Não foi possível solicitar o link. Tente novamente.");
    } finally {
      setRequestingActivation(false);
    }
  };


	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		const { error: signInError } = await authClient.signIn.email({
			email,
			password,
		});

		if (signInError) {
			setError(signInError.message ?? "Sign in failed");
			setLoading(false);
			return;
		}

		if (typeof window !== "undefined") {
			window.location.href = callbackUrl;
		} else {
			console.warn(
				"signin: window is undefined; cannot redirect to callbackUrl",
			);
		}
	};

	return (
		<main className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-[16px]">
			<form
				onSubmit={(e) => {
					void onSubmit(e);
				}}
				className="flex w-full max-w-[400px] flex-col gap-[16px] rounded-[12px] bg-white p-[24px] shadow"
			>
				<h1 className="text-[24px] font-semibold">Centro de Custo Multprest</h1>
            {searchParams.get("activated") === "1" && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                Senha criada. Entre com seu e-mail e a senha escolhida.
              </div>
            )}
            <p className="text-[14px] text-gray-600">Entre com uma conta autorizada.</p>


				<label className="flex flex-col gap-[4px] text-[14px]">
					E-mail
					<input
						type="email"
						required
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="rounded-[8px] border border-gray-300 p-[10px] text-[16px] outline-none focus:border-blue-500"
					/>
				</label>

				<label className="flex flex-col gap-[4px] text-[14px]">
					Senha
					<input
						type="password"
						required
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="rounded-[8px] border border-gray-300 p-[10px] text-[16px] outline-none focus:border-blue-500"
					/>
				</label>

				{error && (
					<div className="rounded-[8px] bg-red-50 p-[10px] text-[14px] text-red-600">
						{error}
					</div>
				)}

				<button
					type="submit"
					disabled={loading}
					className="rounded-[8px] bg-blue-600 p-[12px] text-[16px] font-medium text-white disabled:opacity-50"
				>
					{loading ? "Entrando…" : "Entrar"}
				</button>


            <div className="flex items-center gap-3 text-gray-400 text-xs">
              <span className="h-px flex-1 bg-gray-200" />
              <span>ou</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => { void onGoogleSignIn(); }}
              disabled={googleConfigured !== true || googleLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-[8px] border border-gray-300 bg-white p-[12px] text-[16px] font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? "Abrindo Google…" : "Entrar com Google"}
            </button>
            {googleConfigured === false && (
              <p role="status" className="rounded-lg bg-amber-50 p-3 text-center text-[13px] text-amber-900">
                Login Google aguardando configuração das credenciais OAuth pelo administrador.
                Enquanto isso, o acesso por senha continua disponível.
              </p>
            )}


            {activationMessage && (
              <p role="status" className="rounded-lg bg-emerald-50 p-3 text-center text-[13px] text-emerald-800">
                {activationMessage}
              </p>
            )}
            <div className="text-center">
              <button
                type="button"
                onClick={() => { void requestActivation(); }}
                disabled={requestingActivation}
                className="text-[13px] text-blue-700 underline disabled:opacity-60"
              >
                {requestingActivation ? "Solicitando…" : "Primeiro acesso? Receber link para criar a senha"}
              </button>
            </div>
			</form>
		</main>
	);
}

export default function SignInPage() {
	return (
		<Suspense>
			<SignInForm />
		</Suspense>
	);
}
