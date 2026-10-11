"use client";

import { useAuth } from "@/lib/auth-shim";
import { Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-shim";

export default function AuthCallbackPage() {
  const { exchangeCodeForSessionToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        navigate("/");
      } catch (err) {
        console.error("Auth callback error:", err);
        if (err instanceof Error && err.message.includes("403")) {
          setError("Seu email não tem permissão para acessar este sistema.");
        } else {
          setError("Erro ao fazer login. Tente novamente.");
        }
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-red-500/50 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Acesso Negado</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Autenticando...</p>
      </div>
    </div>
  );
}
