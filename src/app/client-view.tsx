"use client";

import HomePage from "@/views/Home";

import { AuthProvider } from "@/lib/auth-shim";

export default function ClientView() {
  return <AuthProvider><HomePage /></AuthProvider>;
}
