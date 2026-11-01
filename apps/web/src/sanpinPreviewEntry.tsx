/**
 * apps/web/src/sanpinPreviewEntry.tsx
 *
 * Точка входа для изолированного рендера и снятия скриншотов Санитарной Студии DENTE CRM.
 * Поддерживает Светлую и Тёмную тему, Apple HIG Bottom Sheet, демо-витрину (Мандаты 8am, 8ze).
 */

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/themes.css";
import "./theme.css";
import "./styles/tailwind.css";
import "./components/sanpin/sanpin.css";
import "./components/sanpin/styles/sanpinStudio.css";
import { SanpinStudioModal } from "./components/sanpin/SanpinStudioModal";

function SanpinPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const themeParam = params.get("theme") || "light";
	const tabParam = params.get("tab") || "autoclave";
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
		<div className="w-full min-h-screen bg-[var(--paper-canvas,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink-inverted,#f8fafc)] p-0 sm:p-5 box-border flex flex-col justify-end sm:justify-center items-center">
			<SanpinStudioModal
				isOpen={true}
				onClose={() => {}}
				isDemo={true}
				initialTab={tabParam}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<SanpinPreviewApp />);
}
