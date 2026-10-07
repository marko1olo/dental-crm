import React, { useEffect } from "react";
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
		subtitleRu: "Атравматичное удаление и установка имплантатов",
		patientGoalRu: "Бережно удалить несохранные корни, подготовить костную ткань и установить надежные титановые имплантаты.",
		timelineRu: "1 визит • приживление 2–3 месяца",
		preparationRu: "Пройти 3D КТ челюстей; за 48 часов исключить алкоголь.",
		warrantyRu: "Пожизненная гарантия на имплантат + 5 лет гарантии клиники.",
		status: "planned",
		teethFdiList: ["36"],
		procedures: [
			{
				id: "proc-3-1",
				code804n: "A16.07.054",
				medicalTitleRu: "Установка дентального имплантата Osstem TS III",
				patientFriendlyTitleRu: "Установка премиум дентального имплантата (титан)",
				toothNumber: 36,
				priceRub: 35000,
				priceKopecks: 3500000,
				quantity: 1,
				isCompleted: false,
				categoryCode: "2",
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

export function TreatmentPlanRoadmapPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	return (
		<div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-[var(--ink)] p-4 sm:p-6 transition-colors duration-200">
			<div className="max-w-[1200px] mx-auto space-y-4">
				<header className="flex items-center justify-between pb-2 border-b border-[var(--line)] text-xs">
					<div className="flex items-center gap-2">
						<span className="font-extrabold text-sm text-[var(--ink)]">
							Дорожная карта плана лечения DENTE
						</span>
						<span className="text-[var(--muted)]">| Пациент: Кузнецов Д. М. • Карта № 77102</span>
					</div>
					<div className="flex items-center gap-1.5">
						<a
							href="?theme=light"
							className={`h-7 px-3 rounded-md text-xs font-bold border flex items-center transition-all ${
								rawTheme === "light"
									? "bg-[var(--accent)] text-white border-[var(--accent)]"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
							}`}
						>
							☀️ Light
						</a>
						<a
							href="?theme=dark"
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
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<TreatmentPlanRoadmapPreviewApp />);
}
