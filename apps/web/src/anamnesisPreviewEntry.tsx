import React, { useEffect } from "react";
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

import { PatientAnamnesisTab } from "./components/patient/PatientAnamnesisTab";

function AnamnesisPreviewApp() {
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const theme = params.get("theme") || localStorage.getItem("dente_theme_mode") || "light";
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		document.documentElement.style.colorScheme = theme;
	}, []);

	return (
		<div
			className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 transition-colors duration-200 overflow-y-auto"
			data-testid="anamnesis-standalone-workspace"
		>
			<div className="max-w-4xl mx-auto space-y-4">
				<header className="mb-4 p-4 rounded-2xl bg-[var(--paper-card)] border border-[var(--line)] shadow-xs flex items-center justify-between">
					<div>
						<h1 className="text-base sm:text-lg font-bold text-[var(--ink)]">
							Ковалёв Роман Станиславович
						</h1>
						<p className="text-xs text-[var(--muted)] mt-0.5">
							Медицинская карта: СТ-2026-088 • Полных лет: 36
						</p>
					</div>
					<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
						Соматический паспорт
					</span>
				</header>
				<PatientAnamnesisTab
					patientId="demo_anamnesis_patient"
					patientName="Ковалёв Роман Станиславович"
				/>
			</div>
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<AnamnesisPreviewApp />);
}
