import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import { TreatmentPlanRoadmap, type RoadmapStageData } from "./components/treatment-plans/TreatmentPlanRoadmap";
import { TreatmentPlanPresenterPrintView } from "./components/treatment-plans/TreatmentPlanPresenterPrintView";
import type { TreatmentPlanTier, TreatmentPlanStage, TreatmentPlanTierId } from "./components/treatment-plans/types";
import {
	calculateChairsideInstallments,
	calculateChairsideTaxDeduction,
} from "./components/treatment-plans/treatmentPlanMath";
import type { Kopecks } from "@dental/shared";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

const sampleCompletedRoadmapStages: RoadmapStageData[] = [
	{
		stageNumber: 1,
		stageKind: "stage_1_emergency",
		titleRu: "Этап 1: Неотложная помощь и купирование боли",
		subtitleRu: "Экстренная диагностика и устранение болевого синдрома",
		patientGoalRu: "Быстро снять острую боль, провести щадящее обезболивание и защитить зуб временной герметичной повязкой.",
		timelineRu: "1 визит • 45 минут (в день обращения)",
		preparationRu: "Сообщить врачу обо всех принимаемых препаратах и аллергиях; не прогревать щеку.",
		warrantyRu: "Купирование острого воспаления и временная герметизация (до 14 дней).",
		status: "completed",
		teethFdiList: ["16", "24"],
		procedures: [
			{
				id: "proc-1-1",
				code804n: "A16.07.007",
				medicalTitleRu: "Наложение девитализирующей пасты при острой боли",
				patientFriendlyTitleRu: "Купирование острой боли и щадящее обезболивание",
				toothNumber: 16,
				priceRub: 2500,
				priceKopecks: 250000,
				quantity: 1,
				isCompleted: true,
			},
			{
				id: "proc-1-2",
				code804n: "A16.07.011",
				medicalTitleRu: "Вскрытие пародонтального абсцесса",
				patientFriendlyTitleRu: "Антисептическая обработка и медикаментозная повязка",
				toothNumber: 24,
				priceRub: 3500,
				priceKopecks: 350000,
				quantity: 1,
				isCompleted: true,
			},
		],
		totalRub: 6000,
		totalKopecks: 600000,
		completedRub: 6000,
		completedKopecks: 600000,
		remainingRub: 0,
		remainingKopecks: 0,
		estimatedVisitsCount: 1,
	},
	{
		stageNumber: 2,
		stageKind: "stage_2_therapy",
		titleRu: "Этап 2: Терапевтическая санация и эндодонтия",
		subtitleRu: "Лечение кариеса, каналов и художественная реставрация",
		patientGoalRu: "Полностью ликвидировать очаги кариеса и инфекции в каналах, укрепить зубы современными световыми нанокомпозитами.",
		timelineRu: "2 визита • от 45 минут до 1.5 часов на зуб",
		preparationRu: "Рекомендуется плотно поесть за 1.5–2 часа до визита, провести гигиену полости рта.",
		warrantyRu: "Гарантия на световые нанокомпозитные реставрации — 2 года.",
		status: "in_progress",
		teethFdiList: ["16", "46"],
		procedures: [
			{
				id: "proc-2-1",
				code804n: "A16.07.002",
				medicalTitleRu: "Препарирование и пломбирование кариозной полости",
				patientFriendlyTitleRu: "Лечение кариеса с анатомической реставрацией нанокомпозитом",
				toothNumber: 16,
				priceRub: 4500,
				priceKopecks: 450000,
				quantity: 1,
				isCompleted: true,
			},
			{
				id: "proc-2-2",
				code804n: "A16.07.030",
				medicalTitleRu: "Эндодонтическое лечение и инструментальная обработка каналов",
				patientFriendlyTitleRu: "Лечение корневых каналов под микроскопом (эндодонтия)",
				toothNumber: 46,
				priceRub: 6500,
				priceKopecks: 650000,
				quantity: 1,
				isCompleted: false,
			},
		],
		totalRub: 11000,
		totalKopecks: 1100000,
		completedRub: 4500,
		completedKopecks: 450000,
		remainingRub: 6500,
		remainingKopecks: 650000,
		estimatedVisitsCount: 2,
	},
	{
		stageNumber: 3,
		stageKind: "stage_3_surgery",
		titleRu: "Этап 3: Хирургия и дентальная имплантация",
		subtitleRu: "Атравматичное удаление корней и установка имплантатов",
		patientGoalRu: "Безболезненно удалить несостоятельные корни и установить биосовместимый имплантат для восстановления утраченного зуба.",
		timelineRu: "1 визит хирургический • 60 минут",
		preparationRu: "Не принимать кроверазжижающие препараты без согласования; лёгкий прием пищи за 2 часа до приема.",
		warrantyRu: "Пожизненная гарантия на интеграцию имплантата от производителя, 5 лет клинической гарантии.",
		status: "planned",
		teethFdiList: ["24"],
		procedures: [
			{
				id: "proc-3-1",
				code804n: "A16.07.006",
				medicalTitleRu: "Установка дентального имплантата системы премиум-класса",
				patientFriendlyTitleRu: "Установка дентального имплантата под компьютерным контролем",
				toothNumber: 24,
				priceRub: 35000,
				priceKopecks: 3500000,
				quantity: 1,
				isCompleted: false,
			},
		],
		totalRub: 35000,
		totalKopecks: 3500000,
		completedRub: 0,
		completedKopecks: 0,
		remainingRub: 35000,
		remainingKopecks: 3500000,
		estimatedVisitsCount: 1,
	},
];

const samplePrintTierStages: TreatmentPlanStage[] = [
	{
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап I: Терапевтическая санация и профессиональная гигиена",
		subtitle: "Комплексная гигиена полости рта и лечение кариеса",
		clinicalGoal: "Ликвидация очагов инфекции и сохранение витальности зубов",
		totalRub: 22500,
		totalKopecks: 2250000 as Kopecks,
		estimatedVisits: 2,
		estimatedWeeks: 1,
		order804nCodes: ["A16.07.051", "A16.07.002"],
		items: [
			{
				id: "pr-1",
				code804n: "A16.07.051",
				name: "Комплексная профессиональная гигиена полости рта (Air-Flow + УЗ)",
				category: "Гигиена",
				unitPriceRub: 7500,
				priceRub: 7500,
				discountRub: 0,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				status: "completed",
				isCompleted: true,
			},
			{
				id: "pr-2",
				code804n: "A16.07.002",
				name: "Восстановление зуба светоотверждаемым нанокомпозитом Filtek Ultimate",
				category: "Терапия",
				toothNumber: 16,
				unitPriceRub: 7500,
				priceRub: 15000,
				discountRub: 0,
				quantity: 2,
				phase: 1,
				stageKind: "stage_1_therapy",
				status: "completed",
				isCompleted: true,
			},
		],
	},
	{
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап II: Хирургическая подготовка и дентальная имплантация",
		subtitle: "Атравматичное удаление и установка имплантата",
		clinicalGoal: "Восстановление утраченной костной опоры",
		totalRub: 65000,
		totalKopecks: 6500000 as Kopecks,
		estimatedVisits: 1,
		estimatedWeeks: 2,
		order804nCodes: ["A16.07.006"],
		items: [
			{
				id: "pr-3",
				code804n: "A16.07.006",
				name: "Установка дентального имплантата системы Nobel Biocare (Швейцария)",
				category: "Хирургия",
				toothNumber: 24,
				unitPriceRub: 65000,
				priceRub: 65000,
				discountRub: 0,
				quantity: 1,
				phase: 2,
				stageKind: "stage_2_surgery",
				status: "agreed",
				isCompleted: false,
			},
		],
	},
	{
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап III: Ортопедическая реабилитация",
		subtitle: "Керамические коронки и функциональная окклюзия",
		clinicalGoal: "Полное функциональное и эстетическое восстановление зубного ряда",
		totalRub: 55000,
		totalKopecks: 5500000 as Kopecks,
		estimatedVisits: 2,
		estimatedWeeks: 2,
		order804nCodes: ["A16.07.004"],
		items: [
			{
				id: "pr-4",
				code804n: "A16.07.004",
				name: "Коронка из диоксида циркония Prettau с винтовой фиксацией к имплантату",
				category: "Ортопедия",
				toothNumber: 24,
				unitPriceRub: 55000,
				priceRub: 55000,
				discountRub: 0,
				quantity: 1,
				phase: 3,
				stageKind: "stage_3_orthopedics",
				status: "agreed",
				isCompleted: false,
			},
		],
	},
];

const samplePrintTierTotalKopecks = 14250000 as Kopecks;
const samplePrintTier: TreatmentPlanTier = {
	tierId: "optimum",
	title: "Комплексный оптимальный план лечения",
	subtitle: "Премиальные биосовместимые материалы",
	badge: "Рекомендация врача",
	badgeClass: "badge-optimum",
	borderClass: "border-emerald-500",
	isRecommended: true,
	totalRub: 142500,
	totalKopecks: samplePrintTierTotalKopecks,
	warrantyYears: 3,
	serviceLifeYears: 10,
	durationWeeks: 5,
	durationVisits: 5,
	materialsHeadline: "Диоксид циркония Katana HTML Plus, имплантаты Nobel Biocare, композит Filtek Ultimate",
	materialsList: ["Диоксид циркония Katana HTML Plus", "Имплантаты Nobel Biocare"],
	keyAdvantages: ["Долговечность", "Эстетика"],
	stages: samplePrintTierStages,
	itemsCount: 4,
	ndflRefundRub: 18525,
	priceWithNdflRefundRub: 123975,
	monthlyInstallment12Rub: Math.round(142500 / 12),
	installments: calculateChairsideInstallments(samplePrintTierTotalKopecks),
	ndflDetails: calculateChairsideTaxDeduction(samplePrintTierTotalKopecks, true),
} as TreatmentPlanTier;

export function TreatmentPlanRoadmapPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const view = params.get("view") || "roadmap";

	const [printDocFormat, setPrintDocFormat] = useState<"patient_friendly" | "official_appendix">("patient_friendly");
	const [showMicroConsumables, setShowMicroConsumables] = useState<boolean>(false);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-[var(--ink)] p-4 sm:p-6 transition-colors duration-200" data-testid="treatment-preview-root">
			<div className="max-w-[1200px] mx-auto space-y-4">
				<header className="flex items-center justify-between pb-2 border-b border-[var(--line)] text-xs">
					<div className="flex items-center gap-3">
						<span className="font-extrabold text-sm text-[var(--ink)]">
							План лечения DENTE CRM
						</span>
						<nav className="inline-flex p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
							<a
								href={`?view=roadmap&theme=${rawTheme}`}
								className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors ${
									view === "roadmap"
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Дорожная карта (Roadmap)
							</a>
							<a
								href={`?view=print&theme=${rawTheme}`}
								className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors ${
									view === "print"
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Печать сметы (Print Doc)
							</a>
						</nav>
					</div>
					<div className="flex items-center gap-1.5">
						<a
							href={`?view=${view}&theme=light`}
							className={`h-7 px-3 rounded-md text-xs font-bold border flex items-center transition-all ${
								rawTheme === "light"
									? "bg-[var(--accent)] text-white border-[var(--accent)]"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
							}`}
						>
							☀️ Light
						</a>
						<a
							href={`?view=${view}&theme=dark`}
							className={`h-7 px-3 rounded-md text-xs font-bold border flex items-center transition-all ${
								rawTheme === "dark"
									? "bg-[var(--accent)] text-white border-[var(--accent)]"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
							}`}
						>
							🌙 Dark
						</a>
					</div>
				</header>

				{view === "print" ? (
					<div className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-4 sm:p-6 shadow-sm" data-testid="print-view-wrapper">
						<TreatmentPlanPresenterPrintView
							printDocFormat={printDocFormat}
							setPrintDocFormat={setPrintDocFormat}
							showMicroConsumables={showMicroConsumables}
							setShowMicroConsumables={setShowMicroConsumables}
							selectedTier={samplePrintTier}
							patientName="Кузнецов Дмитрий Михайлович"
							patientBirthDate="15.04.1988"
							patientPhone="+7 (999) 123-45-67"
							doctorFullName="Д-р Смирнова Елена Александровна"
							doctorSpecialty="Стоматолог-терапевт, хирург"
							clinicName="Стоматологическая клиника «DENTE»"
							clinicLegalName="ООО «ДЕНТЕ КЛИНИК»"
							clinicInn="7701234567"
							clinicOgrn="1237700123456"
							clinicAddress="г. Москва, ул. Большая Дмитровка, д. 12, стр. 1"
							clinicPhone="+7 (495) 789-01-23"
							clinicLicense="ЛО-77-01-019876 от 15.01.2023"
							displayContractNumber="Д-2026/084"
							todayRu="12.10.2026"
							watermarkText="ПЛАН ЛЕЧЕНИЯ"
							getTierLetter={(tierId) => tierId === "economy" ? "A" : tierId === "standard" ? "B" : "C"}
							patientId="01a00000-0000-0000-0002-000000000002"
							planAgeDays={0}
						/>
					</div>
				) : (
					<TreatmentPlanRoadmap
						customRoadmapStages={sampleCompletedRoadmapStages}
						planTitle="Комплексный план комплексной реабилитации зубочелюстной системы"
						planNumber="ПЛАН-2026-084"
						planId="01a00000-0000-0000-0003-000000000010"
						patientId="01a00000-0000-0000-0002-000000000002"
						curatingDoctorName="Д-р Смирнова Е. А."
						patientFullName="Кузнецов Дмитрий Михайлович"
						clinicName="Стоматологическая клиника «DENTE»"
						todayRu="12.10.2026"
					/>
				)}
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<TreatmentPlanRoadmapPreviewApp />);
}
