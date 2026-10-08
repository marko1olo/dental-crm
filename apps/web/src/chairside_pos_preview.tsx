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
import "./components/billing/paymentModalStudio.css";
import "./components/treatment-plans/treatmentPlanRoadmap.css";

import { VisitSummaryModal } from "./components/visit/VisitSummaryModal";
import { TreatmentPlanRoadmap, type RoadmapStageData } from "./components/treatment-plans/TreatmentPlanRoadmap";
import { AppLogicProvider } from "./contexts/AppLogicContext";
import { Sun, Moon, CreditCard, Activity, CheckCircle2, RefreshCw } from "lucide-react";

const mockPatient = {
	id: "pat-chairside-demo",
	fullName: "Иванов Иван Иванович",
	phone: "+7 (999) 111-22-33",
	cardNumber: "К-10492",
	birthDate: "1988-04-12",
	depositRub: 5000,
	balanceRub: 5000,
	familyBalanceRub: 12000,
};

const mockDiary = {
	complaints: "Острая боль в области зуба 36 при накусывании",
	anamnesis: "Заболел 2 дня назад после приёма горячей пищи",
	statusLocalis: "Кариозная полость на окклюзионной поверхности зуба 36, зондирование болезненно",
	diagnosis: "К02.1 Кариес дентина 36",
	treatmentDescription: "Препарирование полости, изоляция коффердам, адгезивный протокол, нанокомпозит светового отверждения, окклюзионная полировка",
	diagnosisIcd10: "K02.1",
	diagnosisTooth: "36",
	complications: "",
	comorbidities: "",
};

const mockRoadmapStages: RoadmapStageData[] = [
	{
		stageNumber: 1,
		stageKind: "stage_1_emergency",
		titleRu: "Этап 1: Неотложная помощь и купирование боли",
		subtitleRu: "Экстренная диагностика и устранение болевого синдрома",
		patientGoalRu: "Быстро снять острую боль, провести щадящее обезболивание и защитить зуб герметичной реставрацией.",
		timelineRu: "1 визит • 45 минут",
		preparationRu: "Сообщить врачу обо всех принимаемых препаратах и аллергиях.",
		warrantyRu: "Гарантия клиники 2 года на выполненную реставрацию.",
		status: "completed",
		teethFdiList: ["36"],
		procedures: [
			{
				id: "proc-1-1",
				code804n: "A16.07.002",
				medicalTitleRu: "Восстановление зуба пломбой светового отверждения",
				patientFriendlyTitleRu: "Лечение кариеса с анатомической реставрацией нанокомпозитом",
				toothNumber: 36,
				priceRub: 4500,
				priceKopecks: 450000,
				quantity: 1,
				isCompleted: true,
			},
		],
		totalRub: 4500,
		totalKopecks: 450000,
		completedRub: 4500,
		completedKopecks: 450000,
		remainingRub: 0,
		remainingKopecks: 0,
		estimatedVisitsCount: 1,
		isFullyPaid: true,
	},
	{
		stageNumber: 2,
		stageKind: "stage_2_therapy",
		titleRu: "Этап 2: Терапевтическая санация и эндодонтия",
		subtitleRu: "Лечение кариеса и каналов соседних зубов",
		patientGoalRu: "Ликвидировать кариозные очаги на верхней челюсти, подготовить зубной ряд к протезированию.",
		timelineRu: "2 визита • по 60 минут",
		preparationRu: "Рекомендуется поесть за 1.5 часа до приёма.",
		warrantyRu: "Гарантия на световые нанокомпозиты — 2 года.",
		status: "in_progress",
		teethFdiList: ["16", "24"],
		procedures: [
			{
				id: "proc-2-1",
				code804n: "A16.07.002",
				medicalTitleRu: "Препарирование и пломбирование",
				patientFriendlyTitleRu: "Лечение кариеса контактных поверхностей",
				toothNumber: 16,
				priceRub: 4500,
				priceKopecks: 450000,
				quantity: 1,
				isCompleted: false,
			},
		],
		totalRub: 4500,
		totalKopecks: 450000,
		completedRub: 0,
		completedKopecks: 0,
		remainingRub: 4500,
		remainingKopecks: 450000,
		estimatedVisitsCount: 2,
	},
	{
		stageNumber: 3,
		stageKind: "stage_4_orthopedics",
		titleRu: "Этап 3: Ортопедическая реабилитация",
		subtitleRu: "Цифровое сканирование и керамическая коронка",
		patientGoalRu: "Восстановить жевательную функцию коронкой из диоксида циркония.",
		timelineRu: "2 визита • 7–10 дней на CAD/CAM фрезерование",
		preparationRu: "После завершения терапевтической санации.",
		warrantyRu: "Гарантия 5 лет на монолитный диоксид циркония.",
		status: "planned",
		teethFdiList: ["46"],
		procedures: [
			{
				id: "proc-3-1",
				code804n: "A16.07.004",
				medicalTitleRu: "Коронка из диоксида циркония",
				patientFriendlyTitleRu: "Керамическая коронка из диоксида циркония",
				toothNumber: 46,
				priceRub: 22000,
				priceKopecks: 2200000,
				quantity: 1,
				isCompleted: false,
			},
		],
		totalRub: 22000,
		totalKopecks: 2200000,
		completedRub: 0,
		completedKopecks: 0,
		remainingRub: 22000,
		remainingKopecks: 2200000,
		estimatedVisitsCount: 2,
	},
];

export function ChairsidePosPreviewApp() {
	const [theme, setTheme] = useState<"light" | "dark">(() => {
		const searchParams = new URLSearchParams(window.location.search);
		return (searchParams.get("theme") as "light" | "dark") || "light";
	});
	const [isPaid, setIsPaid] = useState<boolean>(() => {
		const searchParams = new URLSearchParams(window.location.search);
		return searchParams.get("paid") === "true";
	});
	const [viewMode, setViewMode] = useState<"modal" | "roadmap">("modal");

	useEffect(() => {
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "dark" ? "light" : "dark"));
	};

	const appLogicValue = {
		activeVisitId: "visit-demo-101",
		activeDoctor: { fullName: "Д-р Воронов Алексей Владимирович", specialties: ["Терапевт", "Ортопед"] },
		dashboard: {
			activeVisit: { id: "visit-demo-101" },
			clinicSettings: { legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»" },
			activePatient: mockPatient,
		},
	};

	return (
		<AppLogicProvider value={appLogicValue as any}>
			<div className="min-h-screen bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] font-sans p-4 sm:p-6 transition-colors">
				{/* Top Control Bar */}
				<header className="max-w-6xl mx-auto mb-6 flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-sm">
					<div>
						<h1 className="text-base sm:text-lg font-black text-[var(--ink)] flex items-center gap-2">
							<CreditCard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
							<span>Кабинетный чекаут и синхронизация плана лечения (Studio Clinical HIG)</span>
						</h1>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Автономия врача: СБП QR, карта и депозит у кресла • Статус «✓ ОПЛАЧЕНО 100%» в дорожной карте
						</p>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setViewMode(viewMode === "modal" ? "roadmap" : "modal")}
							className="px-3 py-1.5 min-h-[40px] rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
						>
							<Activity size={14} className="text-teal-600" />
							<span>{viewMode === "modal" ? "Смотреть дорожную карту" : "Открыть сводку приёма"}</span>
						</button>

						<button
							type="button"
							onClick={() => setIsPaid((prev) => !prev)}
							className={`px-3 py-1.5 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
								isPaid
									? "bg-emerald-600 text-white border-emerald-600"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line)]"
							}`}
							title="Переключить статус оплаты приёма"
						>
							<CheckCircle2 size={14} />
							<span>{isPaid ? "Статус: Оплачено" : "Статус: К оплате"}</span>
						</button>

						<button
							type="button"
							onClick={toggleTheme}
							className="p-2 min-h-[40px] min-w-[40px] rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer flex items-center justify-center"
							aria-label="Переключить тему оформления"
						>
							{theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
						</button>
					</div>
				</header>

				{/* Main Content Showcase */}
				<main className="max-w-6xl mx-auto space-y-6">
					{/* Roadmap View */}
					<div className="p-4 sm:p-6 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="mb-4 flex items-center justify-between pb-3 border-b border-[var(--line)]">
							<h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
								<Activity className="w-4 h-4 text-teal-600" />
								<span>Дорожная карта комплексного плана лечения</span>
							</h2>
							<span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
								Синхронизация с кассой активна
							</span>
						</div>

						<TreatmentPlanRoadmap
							customRoadmapStages={mockRoadmapStages}
							planTitle="Комплексный план стоматологической реабилитации"
							planNumber="ПЛАН-2026-088"
							curatingDoctorName="Д-р Воронов Алексей Владимирович"
							patientFullName="Иванов Иван Иванович"
						/>
					</div>
				</main>

				{/* Visit Summary Modal with Chairside POS */}
				{viewMode === "modal" && (
					<VisitSummaryModal
						isOpen={true}
						onClose={() => setViewMode("roadmap")}
						patient={mockPatient}
						diary={mockDiary}
						doctorName="Д-р Воронов Алексей Владимирович"
						doctorSpecialty="Стоматолог-терапевт"
						totalDueRub={4500}
						patientDepositRub={5000}
						patientFamilyBalanceRub={12000}
						isPaid={isPaid}
						teethData={[
							{ toothNumber: 36, state: "caries", surfaces: ["O"] },
						]}
						onCompleteVisit={() => {
							setIsPaid(true);
							setViewMode("roadmap");
						}}
					/>
				)}
			</div>
		</AppLogicProvider>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<ChairsidePosPreviewApp />);
}
