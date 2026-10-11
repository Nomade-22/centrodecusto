"use client";

import nextDynamic from "next/dynamic";

const ClientView = nextDynamic(() => import("./client-view"), {
  ssr: false,
});

export default function ClientPage() {
  return <ClientView />;
}
