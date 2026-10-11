"use client";

import AuthCallbackPage from "@/views/AuthCallback";

import { AuthProvider } from "@/lib/auth-shim";

export default function ClientView() {
  return <AuthProvider><AuthCallbackPage /></AuthProvider>;
}
