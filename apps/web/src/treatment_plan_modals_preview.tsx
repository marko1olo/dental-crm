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
import "./styles/components.css";

import { ClinicalServiceBundlesModal } from "./components/treatment-plans/ClinicalServiceBundlesModal";
import { TreatmentPlanAddServiceModal } from "./components/treatment-plans/TreatmentPlanAddServiceModal";
import type { Kopecks } from "@dental/shared";
import type { TreatmentPlanStage, TreatmentPlanItem } from "./components/treatment-plans/types";
import type { CatalogServiceLookupItem } from "./components/treatment-plans/treatmentPlanPricingEngine";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

const SAMPLE_STAGES: TreatmentPlanStage[] = [
	{
		id: "stage-1",
		stageNumber: 1,
		title: "Терапевтическая санация и эндодонтия",
		subtitle: "Санация полости рта",
		clinicalGoal: "Ликвидация очагов инфекции",
		stageKind: "stage_1_therapy",
		items: [],
		totalRub: 14500,
		totalKopecks: 1450000 as Kopecks,
		estimatedVisits: 2,
		estimatedWeeks: 2,
		order804nCodes: [],
		status: "agreed",
	},
	{
		id: "stage-2",
		stageNumber: 2,
		title: "Хирургический этап и имплантация",
		subtitle: "Хирургическое лечение",
		clinicalGoal: "Дентальная имплантация",
		stageKind: "stage_2_surgery",
		items: [],
		totalRub: 42000,
		totalKopecks: 4200000 as Kopecks,
		estimatedVisits: 3,
		estimatedWeeks: 6,
		order804nCodes: [],
		status: "draft",
	},
];

const SAMPLE_CATALOG: CatalogServiceLookupItem[] = [
	{
		id: "A16.07.002.001",
		code: "A16.07.002.001",
		order804nCode: "A16.07.002.001",
		title: "Восстановление зуба пломбой с нарушением формы зуба (глубокий кариес Estelite Sigma)",
		category: "Терапия",
		basePriceRub: 5200,
		active: true,
	},
	{
		id: "A16.07.030",
		code: "A16.07.030",
		order804nCode: "A16.07.030",
		title: "Эндодонтическое лечение пульпита 3-канального моляра под микроскопом",
		category: "Эндодонтия",
		basePriceRub: 9800,
		active: true,
	},
	{
		id: "A16.07.001.001",
		code: "A16.07.001.001",
		order804nCode: "A16.07.001.001",
		title: "Удаление постоянного зуба сложное с разъединением корней",
		category: "Хирургия",
		basePriceRub: 4500,
		active: true,
	},
	{
		id: "A16.07.051",
		code: "A16.07.051",
		order804nCode: "A16.07.051",
		title: "Профессиональная гигиена полости рта и удаление зубных отложений AirFlow Prophylaxis",
		category: "Профгигиена",
		basePriceRub: 6000,
		active: true,
	},
	{
		id: "A16.07.004",
		code: "A16.07.004",
		order804nCode: "A16.07.004",
		title: "Восстановление зуба коронкой постоянной безметалловой из диоксида циркония Prettau",
		category: "Ортопедия",
		basePriceRub: 22000,
		active: true,
	},
];

export function TreatmentPlanModalsPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") as ThemeMode) || "dark";
	const initialModal = params.get("modal") || "bundles";

	const [theme, setTheme] = useState<ThemeMode>(initialTheme);
	const [activeModal, setActiveModal] = useState<"bundles" | "add_service" | "none">(
		initialModal === "add_service" ? "add_service" : "bundles",
	);

	useEffect(() => {
		const resolved = resolveTheme(theme, theme === "dark");
		applyThemeToRoot(document.documentElement, resolved);
	}, [theme]);

	return (
		<div className="min-h-screen bg-[var(--paper-soft)] text-[var(--ink)] p-4 font-sans">
			{/* Top Control Bar for Inspection */}
			<header className="max-w-5xl mx-auto mb-4 p-3 bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl flex items-center justify-between gap-3 shadow-xs">
				<div className="flex items-center gap-2">
					<span className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">
						Инспектор модалок плана:
					</span>
					<div className="dente-filter-chips">
						<button
							type="button"
							onClick={() => setActiveModal("bundles")}
							className={`dente-filter-chip ${activeModal === "bundles" ? "active" : ""}`}
							data-active={activeModal === "bundles"}
							data-testid="switch-modal-bundles"
						>
							Пакеты лечения
						</button>
						<button
							type="button"
							onClick={() => setActiveModal("add_service")}
							className={`dente-filter-chip ${activeModal === "add_service" ? "active" : ""}`}
							data-active={activeModal === "add_service"}
							data-testid="switch-modal-add-service"
						>
							Каталог услуг
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-xs text-[var(--muted)] font-medium">Тема:</span>
					<div className="dente-filter-chips">
						<button
							type="button"
							onClick={() => setTheme("light")}
							className={`dente-filter-chip ${theme === "light" ? "active" : ""}`}
							data-active={theme === "light"}
							data-testid="switch-theme-light"
						>
							☀️ Светлая
						</button>
						<button
							type="button"
							onClick={() => setTheme("dark")}
							className={`dente-filter-chip ${theme === "dark" ? "active" : ""}`}
							data-active={theme === "dark"}
							data-testid="switch-theme-dark"
						>
							🌙 Тёмная
						</button>
					</div>
				</div>
			</header>

			{/* Background placeholder workspace */}
			<main className="max-w-5xl mx-auto p-8 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-sm text-center space-y-4">
				<h1 className="text-lg font-black text-[var(--ink)]">
					Рабочая станция плана лечения DENTE
				</h1>
				<p className="text-xs text-[var(--muted)] max-w-md mx-auto">
					Пациент: Иванов Иван Иванович | Карта #2026-441 | Врач: д-р Смирнова Е. А.
				</p>
				<div className="flex justify-center gap-3 pt-2">
					<button
						type="button"
						onClick={() => setActiveModal("bundles")}
						className="primary-button min-h-[38px] px-4 font-bold"
					>
						Открыть «Клинические пакеты лечения»
					</button>
					<button
						type="button"
						onClick={() => setActiveModal("add_service")}
						className="secondary-button min-h-[38px] px-4 font-semibold"
					>
						Открыть «Каталог клинических услуг»
					</button>
				</div>
			</main>

			{/* Modal 1: ClinicalServiceBundlesModal */}
			<ClinicalServiceBundlesModal
				isOpen={activeModal === "bundles"}
				onClose={() => setActiveModal("none")}
				initialToothNumber={16}
				patientId="pat-demo-1"
				patientName="Иванов Иван Иванович"
				targetMode="both"
				onApplyToPlan={() => {}}
				onApplyToInvoice={() => {}}
			/>

			{/* Modal 2: TreatmentPlanAddServiceModal */}
			<TreatmentPlanAddServiceModal
				isOpen={activeModal === "add_service"}
				onClose={() => setActiveModal("none")}
				stages={SAMPLE_STAGES}
				targetStage={SAMPLE_STAGES[0]!}
				catalog={SAMPLE_CATALOG}
				onAddService={() => {}}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<TreatmentPlanModalsPreviewApp />);
}
