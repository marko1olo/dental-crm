import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./components/analytics/executiveDashboard.css";

import { ExecutiveDashboard } from "./components/analytics/ExecutiveDashboard";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function MobileAnalyticsPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 box-border overflow-x-clip">
			{/* Верхняя компактная шапка iOS */}
			<header className="flex items-center justify-between mb-3 px-1">
				<div>
					<h1 className="text-base font-bold text-[var(--ink)] tracking-tight">
						Аналитика и KPI
					</h1>
					<p className="text-xs text-[var(--muted)]">
						Пульт генерального директора • Apple HIG
					</p>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="text-[11px] font-semibold text-[var(--teal)] bg-[rgba(13,148,136,0.12)] px-2 py-0.5 rounded-full border border-[rgba(13,148,136,0.25)]">
						Online
					</span>
				</div>
			</header>

			<ExecutiveDashboard />
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<MobileAnalyticsPreviewApp />
		</React.StrictMode>,
	);
}
