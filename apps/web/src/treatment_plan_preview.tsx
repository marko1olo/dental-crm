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
import { TreatmentPlanToolbar } from "./components/treatment-plans/TreatmentPlanToolbar";
import { generate3TierPlanComparison } from "./components/treatment-plans/treatmentPlanStagesEngine";
import type { ToothData } from "./components/odontogram/ToothChart";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanStatus } from "./components/treatment-plans/types";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

// Patient with no charted pathology: triggers rich clinical turnkey presets (45k, 145k, 380k)
const sampleTeeth: ToothData[] = [];

const sampleTiers = generate3TierPlanComparison(sampleTeeth);

function TreatmentPlanPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>("optimum");
	const [planStatus, setPlanStatus] = useState<TreatmentPlanStatus>("agreed");
	const [activeTab, setActiveTab] = useState<"3tier" | "stages" | "phased4">("3tier");
	const [discount, setDiscount] = useState(5);
	const [bonus, setBonus] = useState(1500);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-[var(--ink)] p-4 sm:p-6 transition-colors duration-200">
			<div className="max-w-7xl mx-auto space-y-4">
				<header className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[var(--line)]">
					<div>
						<h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
							План лечения · 3-Tier Сравнение & Командная панель
						</h1>
						<p className="text-xs text-[var(--muted)]">
							Пациент: Иванов Иван Иванович | Врач: Д-р Смирнов А.В. | Тема: {rawTheme.toUpperCase()}
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
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-strong)]"
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
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-strong)]"
							}`}
						>
							Dark
						</button>
					</div>
				</header>

				{/* 1. Command Toolbar with Status, Actions, and Save Button */}
				<TreatmentPlanToolbar
					planAgeDays={0}
					planStatus={planStatus}
					onStatusTransition={setPlanStatus}
					patientName="Иванов Иван Иванович"
					totalItemsCount={8}
					activeViewTab={activeTab}
					setActiveViewTab={setActiveTab}
					signedAgreement={null}
					onOpenSignModal={() => {}}
					onExportCashier={() => {}}
					onGenerateCbctAutoPlan={() => {}}
					onOpenInvoiceModal={() => {}}
					onOpenFiscalModal={() => {}}
					onOpenCuratorModal={() => {}}
					curatorFullName="Петрова Анна Сергеевна"
					onOpenPresenterModal={() => {}}
					onOpenComparatorModal={() => {}}
					onOpenStagePaymentModal={() => {}}
					onOpenPriceValidatorModal={() => {}}
					onOpenContractPrint={() => {}}
					onOpenLabOrder={() => {}}
					onOneClickLabOrder={() => {}}
					isSaving={false}
					onSavePlanToDatabase={() => {}}
					discountPercent={discount}
					setDiscountPercent={setDiscount}
					bonusPointsToUseRub={bonus}
					setBonusPointsToUseRub={setBonus}
					patientBalanceRub={3500}
					customStages={null}
					cbctAutoPlanTiers={null}
					copilotFeedback={null}
					setCopilotFeedback={() => {}}
					isCopilotExecuting={false}
					onExecuteCopilot={() => {}}
					onResetPlan={() => {}}
					onOpenChairsideBundlesModal={() => {}}
					onApplyClinicalBundle={() => {}}
					orthopedicTeeth={[16, 21]}
				/>

				{/* 2. 3-Tier Studio with Toolbar and Comparison Cards */}
				<main className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl p-4 sm:p-6 shadow-sm">
					<TreatmentPlan3TierComparison
						tiers={sampleTiers}
						selectedTierId={selectedTierId}
						onSelectTier={(tier: TreatmentPlanTier) => setSelectedTierId(tier.tierId)}
						onApproveAndSign={(tier: TreatmentPlanTier) => {}}
						onOpenInstallment={(tier: TreatmentPlanTier) => {}}
						onPrintContract={(tier: TreatmentPlanTier) => {}}
						onOpenComparatorStudio={() => {}}
						onOpenStagePaymentStudio={() => {}}
						onOpenPriceValidatorStudio={() => {}}
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
