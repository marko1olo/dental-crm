import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
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
import { TreatmentPlan3TierComparison } from "./components/treatment-plans/TreatmentPlan3TierComparison";
import { generate3TierPlanComparison } from "./components/treatment-plans/treatmentPlanStagesEngine";
import type { ToothData } from "./components/odontogram/ToothChart";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "./components/treatment-plans/types";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

const sampleTeeth: ToothData[] = [
	{
		id: 16,
		state: "caries",
		systemicNotes: "Глубокий кариес жевательной поверхности",
	} as any,
	{
		id: 21,
		state: "caries",
		systemicNotes: "Эстетическая реставрация зоны улыбки",
	} as any,
	{
		id: 36,
		state: "missing",
		systemicNotes: "Отсутствует зуб, показана дентальная имплантация",
	} as any,
	{
		id: 46,
		state: "periodontitis",
		systemicNotes: "Периодонтит, эндодонтическое перелечивание каналов",
	} as any,
];

const sampleTiers = generate3TierPlanComparison(sampleTeeth);

function TreatmentPlanPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>("optimum");

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 sm:p-6 transition-colors duration-200">
			<div className="max-w-7xl mx-auto space-y-4">
				<header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--glass-border)]">
					<div>
						<h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
							Презентация плана лечения (3 варианта)
						</h1>
						<p className="text-xs text-[var(--muted)]">
							Пациент: Иванов Иван Иванович | Врач: Д-р Смирнов А.В. | Режим: {rawTheme.toUpperCase()}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								window.location.search = `?theme=light`;
							}}
							className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
								rawTheme === "light"
									? "bg-[var(--accent)] text-white border-[var(--accent)]"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-strong)]"
							}`}
						>
							Light
						</button>
						<button
							type="button"
							onClick={() => {
								window.location.search = `?theme=dark`;
							}}
							className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
								rawTheme === "dark"
									? "bg-[var(--accent)] text-white border-[var(--accent)]"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-strong)]"
							}`}
						>
							Dark
						</button>
					</div>
				</header>

				<main className="bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-6 shadow-sm">
					<TreatmentPlan3TierComparison
						tiers={sampleTiers}
						selectedTierId={selectedTierId}
						onSelectTier={(tier: TreatmentPlanTier) => setSelectedTierId(tier.tierId)}
						onApproveAndSign={(tier: TreatmentPlanTier) => alert(`План «${tier.title}» утвержден!`)}
						onOpenInstallment={(tier: TreatmentPlanTier) => alert(`Рассрочка для плана «${tier.title}»`)}
						onPrintContract={(tier: TreatmentPlanTier) => alert(`Печать договора для плана «${tier.title}»`)}
					/>
				</main>
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<TreatmentPlanPreviewApp />);
}
