import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";
import { PerioWorkspaceModal } from "./components/perio/PerioWorkspaceModal";

function PerioPreviewApp() {
	const [activeTab, setActiveTab] = useState<"psr" | "chart">(() => {
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			return (params.get("tab") as "psr" | "chart") || "psr";
		}
		return "psr";
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || localStorage.getItem("dente_theme_mode") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.documentElement.style.colorScheme = theme;
	}, []);

	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-start transition-colors duration-200">
			<PerioWorkspaceModal
				isOpen={true}
				isModal={false}
				patientName="Иванов Сергей Павлович (34 года)"
				doctorName="Д-р Смирнова Е.А."
				initialTab={activeTab}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<PerioPreviewApp />);
}
