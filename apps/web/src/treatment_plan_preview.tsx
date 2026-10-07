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
import { TreatmentPlanStageCard } from "./components/treatment-plans/TreatmentPlanStageCard";
import { generate3TierPlanComparison } from "./components/treatment-plans/treatmentPlanStagesEngine";
import {
	assignDoctorToStageInStages,
	assignDoctorToItemInStages,
} from "./components/treatment-plans/treatmentPlanStageMutations";
import type { ToothData } from "./components/odontogram/ToothChart";
import type {
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanStatus,
	TreatmentPlanStage,
	TreatmentPlanDoctorOption,
} from "./components/treatment-plans/types";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

// 1. Пациент с реальными патологиями (Мандат 8k: Zero Mocks)
const sampleTeeth: ToothData[] = [
	{ toothNumber: 16, state: "Caries" },
	{ toothNumber: 24, state: "Root" },
	{ toothNumber: 36, state: "Missing" },
	{ toothNumber: 46, state: "Pulpitis" },
];

const sampleTiers = generate3TierPlanComparison(sampleTeeth);

// 2. Мульти-врачебный консилиум клиники DENTE (Терапевт, Хирург, Ортопед, Пародонтолог)
const sampleDoctors: readonly TreatmentPlanDoctorOption[] = [
	{
		id: "doc-therapist-1",
		fullName: "Д-р Смирнова Е. А.",
		specialty: "therapist",
		role: "doctor",
	},
	{
		id: "doc-surgeon-2",
		fullName: "Д-р Волков И. С.",
		specialty: "surgeon",
		role: "doctor",
	},
	{
		id: "doc-orthopedist-3",
		fullName: "Д-р Ковалев С. П.",
		specialty: "orthopedist",
		role: "doctor",
	},
	{
		id: "doc-perio-4",
		fullName: "Д-р Захарова М. В.",
		specialty: "periodontist",
		role: "doctor",
	},
];

// 3. Этапы плана лечения с распределением по врачам консилиума (номенклатура 804н)
const initialSampleStages: TreatmentPlanStage[] = [
	{
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Терапевтическая санация и эндодонтия",
		subtitle: "Лечение кариеса и пульпита под операционным микроскопом",
		clinicalGoal: "Ликвидация очагов инфекции и сохранение витальности",
		estimatedVisits: 2,
		estimatedWeeks: 1,
		order804nCodes: ["A16.07.030", "A16.07.002.001", "A16.07.051"],
		status: "agreed",
		doctorId: "doc-therapist-1",
		doctorName: "Д-р Смирнова Е. А.",
		doctorSpecialty: "therapist",
		items: [
			{
				id: "item-th-1",
				toothNumber: 46,
				code804n: "A16.07.030",
				name: "Эндодонтическое лечение пульпита (3 канала)",
				category: "Терапия",
				priceRub: 7500,
				unitPriceRub: 7500,
				discountRub: 0,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				doctorId: "doc-therapist-1",
				doctorName: "Д-р Смирнова Е. А.",
				doctorSpecialty: "therapist",
			},
			{
				id: "item-th-2",
				toothNumber: 16,
				code804n: "A16.07.002.001",
				name: "Восстановление зуба пломбой (Ceram.X Duo)",
				category: "Терапия",
				priceRub: 5200,
				unitPriceRub: 5200,
				discountRub: 0,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				doctorId: "doc-therapist-1",
				doctorName: "Д-р Смирнова Е. А.",
				doctorSpecialty: "therapist",
			},
			{
				id: "item-th-3",
				code804n: "A16.07.051",
				name: "Профессиональная гигиена полости рта (AirFlow + ультразвук)",
				category: "Гигиена",
				priceRub: 4500,
				unitPriceRub: 4500,
				discountRub: 0,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				doctorId: null,
				doctorName: null,
				doctorSpecialty: null,
			},
		],
		totalRub: 17200,
		totalKopecks: 1720000,
	},
	{
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургическая санация и дентальная имплантация",
		subtitle: "Атравматичное удаление корня и установка имплантата Osstem",
		clinicalGoal: "Восстановление целостности зубного ряда",
		estimatedVisits: 1,
		estimatedWeeks: 2,
		order804nCodes: ["A16.07.006", "A16.07.007.001"],
		status: "agreed",
		doctorId: "doc-surgeon-2",
		doctorName: "Д-р Волков И. С.",
		doctorSpecialty: "surgeon",
		items: [
			{
				id: "item-sg-1",
				toothNumber: 36,
				code804n: "A16.07.006",
				name: "Операция дентальной имплантации (Osstem TS III SA)",
				category: "Хирургия",
				priceRub: 28000,
				unitPriceRub: 28000,
				discountRub: 0,
				quantity: 1,
				phase: 2,
				stageKind: "stage_2_surgery",
				doctorId: "doc-surgeon-2",
				doctorName: "Д-р Волков И. С.",
				doctorSpecialty: "surgeon",
			},
			{
				id: "item-sg-2",
				toothNumber: 24,
				code804n: "A16.07.007.001",
				name: "Атравматичное удаление корня зуба с кюретажем",
				category: "Хирургия",
				priceRub: 3500,
				unitPriceRub: 3500,
				discountRub: 0,
				quantity: 1,
				phase: 2,
				stageKind: "stage_2_surgery",
				doctorId: "doc-surgeon-2",
				doctorName: "Д-р Волков И. С.",
				doctorSpecialty: "surgeon",
			},
		],
		totalRub: 31500,
		totalKopecks: 3150000,
	},
	{
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle: "Протезирование на имплантатах и одиночные коронки",
		clinicalGoal: "Анатомическое и окклюзионное восстановление функции",
		estimatedVisits: 2,
		estimatedWeeks: 3,
		order804nCodes: ["A16.07.004.004", "A16.07.004.002"],
		status: "agreed",
		doctorId: null,
		doctorName: null,
		doctorSpecialty: null,
		items: [
			{
				id: "item-op-1",
				toothNumber: 36,
				code804n: "A16.07.004.004",
				name: "Коронка из диоксида циркония на имплантате (Prettau)",
				category: "Ортопедия",
				priceRub: 25000,
				unitPriceRub: 25000,
				discountRub: 0,
				quantity: 1,
				phase: 3,
				stageKind: "stage_3_orthopedics",
				doctorId: "doc-orthopedist-3",
				doctorName: "Д-р Ковалев С. П.",
				doctorSpecialty: "orthopedist",
			},
			{
				id: "item-op-2",
				toothNumber: 46,
				code804n: "A16.07.004.002",
				name: "Керамическая коронка E-max Press на культевой вкладке",
				category: "Ортопедия",
				priceRub: 22000,
				unitPriceRub: 22000,
				discountRub: 0,
				quantity: 1,
				phase: 3,
				stageKind: "stage_3_orthopedics",
				doctorId: null,
				doctorName: null,
				doctorSpecialty: null,
			},
		],
		totalRub: 47000,
		totalKopecks: 4700000,
	},
];

function TreatmentPlanPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const rawTab = (params.get("tab") || "stages") as "3tier" | "stages" | "phased4";
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>("optimum");
	const [planStatus, setPlanStatus] = useState<TreatmentPlanStatus>("agreed");
	const [activeTab, setActiveTab] = useState<"3tier" | "stages" | "phased4">(rawTab);
	const [discount, setDiscount] = useState(5);
	const [bonus, setBonus] = useState(1500);
	const [stages, setStages] = useState<TreatmentPlanStage[]>(initialSampleStages);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	const handleAssignStageDoctor = (
		stage: TreatmentPlanStage,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => {
		setStages((prev) =>
			assignDoctorToStageInStages(prev, stage.stageNumber, doctorId, doctorName, doctorSpecialty),
		);
	};

	const handleAssignItemDoctor = (
		itemId: string,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => {
		setStages((prev) =>
			assignDoctorToItemInStages(prev, itemId, doctorId, doctorName, doctorSpecialty),
		);
	};

	return (
		<div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-[var(--ink)] p-2.5 sm:p-3 transition-colors duration-200">
			<div className="max-w-[1400px] mx-auto space-y-2.5">
				<header className="flex items-center justify-between pb-1.5 border-b border-[var(--line)] text-xs">
					<div className="flex items-center gap-2">
						<span className="font-extrabold text-[var(--ink)]">План лечения · Мульти-врачебный консилиум</span>
						<span className="text-[var(--muted)]">| Пациент: Кузнецов Д. М. (К-77102)</span>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => {
								window.location.search = `?tab=${activeTab}&theme=light`;
							}}
							className={`h-6 px-2.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
								rawTheme === "light"
									? "bg-[var(--accent)] text-white border-[var(--accent)]"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
							}`}
						>
							Light
						</button>
						<button
							type="button"
							onClick={() => {
								window.location.search = `?tab=${activeTab}&theme=dark`;
							}}
							className={`h-6 px-2.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
								rawTheme === "dark"
									? "bg-[var(--accent)] text-white border-[var(--accent)]"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
							}`}
						>
							Dark
						</button>
					</div>
				</header>

				{/* 1. Command Toolbar with Status, Actions, Tabs, and Save Button */}
				<TreatmentPlanToolbar
					planAgeDays={0}
					planStatus={planStatus}
					onStatusTransition={setPlanStatus}
					patientName="Кузнецов Дмитрий Михайлович"
					totalItemsCount={7}
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
					customStages={stages}
					cbctAutoPlanTiers={null}
					copilotFeedback={null}
					setCopilotFeedback={() => {}}
					isCopilotExecuting={false}
					onExecuteCopilot={() => {}}
					onResetPlan={() => setStages(initialSampleStages)}
					onOpenChairsideBundlesModal={() => {}}
					onApplyClinicalBundle={() => {}}
					orthopedicTeeth={[16, 21]}
				/>

				{/* 2. Main Studio Area: Stages view with multi-doctor allocation OR 3-Tier comparison */}
				<main className="space-y-4">
					{activeTab === "stages" ? (
						<div className="flex flex-col gap-4" data-testid="tp-stages-container">
							{stages.map((stage) => (
								<TreatmentPlanStageCard
									key={stage.stageNumber}
									stage={stage}
									defaultExpanded={true}
									doctors={sampleDoctors}
									onAssignStageDoctor={handleAssignStageDoctor}
									onAssignItemDoctor={handleAssignItemDoctor}
								/>
							))}
						</div>
					) : (
						<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl p-3 shadow-sm">
							<TreatmentPlan3TierComparison
								tiers={sampleTiers}
								selectedTierId={selectedTierId}
								onSelectTier={(tier: TreatmentPlanTier) => setSelectedTierId(tier.tierId)}
								onApproveAndSign={() => {}}
								onOpenInstallment={() => {}}
								onPrintContract={() => {}}
								onOpenComparatorStudio={() => {}}
								onOpenStagePaymentStudio={() => {}}
								onOpenPriceValidatorStudio={() => {}}
							/>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<TreatmentPlanPreviewApp />);
}
