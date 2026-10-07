import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/components.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./components/billing/paymentModalStudio.css";

import { OrthodonticVisitProtocolWidget } from "./components/orthodontics/OrthodonticVisitProtocolWidget";
import { CephalometricAnalysisModal } from "./components/radiology/CephalometricAnalysisModal";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "./components/orthodontics/CephalometricCanvas";
import { OrthodonticMaterialsQuickSelector } from "./components/orthodontics/OrthodonticMaterialsQuickSelector";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function OrthoProtocolPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const view = params.get("view") || "protocol"; // "protocol", "ceph", "materials"
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 flex flex-col items-center justify-center">
			<div className="text-center mb-4">
				<h1 className="text-lg font-bold text-[var(--ink)]">
					DENTE Orthodontic Studio — {view === "ceph" ? "ТРГ Цефалометрия" : view === "materials" ? "Каталог материалов" : "Протокол Приёма 043/у"}
				</h1>
				<p className="text-xs text-[var(--muted)]">
					Тема: {rawTheme.toUpperCase()} | Режим: {view.toUpperCase()} | Форма 043/у
				</p>
			</div>

			{view === "ceph" ? (
				<CephalometricAnalysisModal
					isOpen={isOpen}
					onClose={() => setIsOpen(false)}
					patientId="pat-102"
					patientName="Петрова Анна Сергеевна"
					initialImageUrl={SAMPLE_TRG_CEPHALOGRAM_URL}
				/>
			) : view === "materials" ? (
				<div className="w-full max-w-xl bg-[var(--paper-card,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl p-5 shadow-lg">
					<OrthodonticMaterialsQuickSelector
						onSelectMaterial={(mat) => console.log("Selected:", mat)}
					/>
				</div>
			) : (
				<OrthodonticVisitProtocolWidget
					isOpen={isOpen}
					onClose={() => setIsOpen(false)}
					patientId="pat-102"
					patientName="Петрова Анна Сергеевна"
					clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					doctorName="Д-р Воронов Алексей Владимирович"
				/>
			)}
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<OrthoProtocolPreviewApp />
		</React.StrictMode>
	);
}
