import React, { useEffect, useState } from "react";
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
import "./components/messaging/omnichannelHub.css";

import { PatientOmnichannelHubModal } from "./components/messaging/PatientOmnichannelHubModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function OperatorChatPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;

	useEffect(() => {
		const updateTheme = () => {
			const currentTheme = (document.documentElement.getAttribute("data-theme") || rawTheme) as ThemeMode;
			const resolved = resolveTheme(currentTheme, false);
			applyThemeToRoot(document.documentElement, resolved);
			const isDark = currentTheme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.setAttribute("data-theme", currentTheme);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
		};
		updateTheme();
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
		return () => observer.disconnect();
	}, [rawTheme]);

	return (
		<div className="w-full min-h-screen bg-[var(--paper)] p-4 flex items-center justify-center">
			<PatientOmnichannelHubModal
				isOpen={true}
				onClose={() => {}}
				initialPatientId="pat-101"
				clinicName="Стоматология DENTE Премиум"
				clinicAddress="г. Москва, ул. Арбат, 24"
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<OperatorChatPreviewApp />);
}
