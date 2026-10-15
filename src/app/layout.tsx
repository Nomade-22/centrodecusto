import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./global.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "Centro de Custo",
	description: "Sistema de orçamentos e custos da Multprest",
	icons: {
		icon: [{ url: "/centro-de-custo-favicon.png", type: "image/png", sizes: "64x64" }],
		shortcut: "/centro-de-custo-favicon.png",
	},
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="pt-BR">
			<head>
				<link
					rel="stylesheet"
					href="/fontawesome/releases/v6.3.0/css/pro.min.css?token=2c15cc0cc7"
				/>
			</head>
			<body>
				<Providers>
					{children}
				</Providers>
			</body>
		</html>
	);
}
