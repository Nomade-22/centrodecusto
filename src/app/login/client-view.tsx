"use client";

import LoginPage from "@/views/Login";

import { AuthProvider } from "@/lib/auth-shim";

export default function ClientView() {
  return <AuthProvider><LoginPage /></AuthProvider>;
}
