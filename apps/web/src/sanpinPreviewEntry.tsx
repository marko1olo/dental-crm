/**
 * sanpinPreviewEntry.tsx — Preview entry for SanPiN & Sterilization Production Control Hub SSOT.
 * Governed by Mandates 8b, 8e, 8n, 8am, 8ze, Apple HIG.
 */

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/themes.css";
import "./theme.css";
import "./styles/tailwind.css";
import { SanpinSterilizationHubModal } from "./components/sanpin/SanpinSterilizationHubModal";

function SanpinPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const isDark = themeParam === "dark" || themeParam === "night";

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
		if (isDark) {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.classList.add("light");
			document.body.classList.remove("dark");
		}
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	}, [isDark]);

	return (
		<div className="w-full min-h-screen bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] flex flex-col items-center justify-end sm:justify-center p-0">
			<SanpinSterilizationHubModal
				isOpen={true}
				onClose={() => {}}
				isDemo={true}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<SanpinPreviewApp />);
}
