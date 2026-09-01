/**
 * DENTE CRM — Patient Treatment Plan Roadmap Component
 * (DOMAIN: PATIENT-FRIENDLY 804N TRANSLATION, 5-STAGE CLINICAL ROADMAP, PROGRESS BAR & 13% NDFL DEDUCTION)
 */

import React, { useMemo, useState } from "react";
import {
	Activity,
	AlertTriangle,
	ArrowRight,
	CalendarPlus,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Coins,
	Crown,
	Download,
	FileBadge,
	FileText,
	HeartPulse,
	HelpCircle,
	Info,
	Percent,
	Scissors,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
} from "lucide-react";
import {
	calculatePlanTaxDeductionBreakdown,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import { formatFdiToothName } from "../portal/patientPortalEngine";
import type { TreatmentPlanStage, TreatmentPlanItem } from "./types";
import "./treatmentPlanRoadmap.css";

/**
 * Formats integer kopecks into exact Russian rubles format: "12 500,00"
 */
export function formatKopecksToRubExact(kopecks: number): string {
	const rub = kopecksToRub(kopecks);
	return rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type RoadmapStageKind =
	| "stage_1_emergency"
	| "stage_2_therapy"
	| "stage_3_surgery"
	| "stage_4_orthopedics"
	| "stage_5_hygiene_checkup";

export interface RoadmapProcedureItem {
	id: string;
	code804n?: string | undefined;
	medicalTitleRu: string;
	patientFriendlyTitleRu: string;
	toothNumber?: number | string | undefined;
	toothFdi?: string | undefined;
	priceRub: number;
	priceKopecks: number;
	quantity: number;
	isCompleted?: boolean | undefined;
	doctorName?: string | undefined;
	categoryCode?: "1" | "2" | undefined; // 1 = standard, 2 = expensive (surgery/implant)
}

export interface RoadmapStageData {
	stageNumber: 1 | 2 | 3 | 4 | 5;
	stageKind: RoadmapStageKind;
	titleRu: string;
	subtitleRu: string;
	patientGoalRu: string;
	status: "completed" | "in_progress" | "planned";
	teethFdiList: string[];
	procedures: RoadmapProcedureItem[];
	totalRub: number;
	totalKopecks: number;
	completedRub: number;
	completedKopecks: number;
	remainingRub: number;
	remainingKopecks: number;
	estimatedVisitsCount: number;
	targetMonthRu?: string;
}

export interface TreatmentPlanRoadmapProps {
	stages?: readonly TreatmentPlanStage[];
	customRoadmapStages?: readonly RoadmapStageData[];
	planTitle?: string;
	planNumber?: string;
	curatingDoctorName?: string;
	patientFullName?: string;
	onBookStage?: (stage: RoadmapStageData) => void;
	onRequestTaxCertificate?: () => void;
	className?: string;
}

/**
 * 804n Code & Medical Term Translator to Patient-Friendly Clear Russian
 */
export function translate804nToPatientDescription(code804n?: string, rawMedicalTitle?: string): {
	friendlyTitle: string;
	categoryCode: "1" | "2";
	stageKind: RoadmapStageKind;
} {
	const cleanCode = (code804n || "").trim();
	const titleLower = (rawMedicalTitle || "").toLowerCase();

	// 1. Неотложная помощь и снятие боли
	if (
		cleanCode === "A16.07.007" ||
		cleanCode === "A16.07.011" ||
		cleanCode === "A16.07.016" ||
		titleLower.includes("неотложн") ||
		titleLower.includes("острая боль") ||
		titleLower.includes("пульпотомия") ||
		titleLower.includes("вскрытие пародонтального абсцесса") ||
		titleLower.includes("снятие боли")
	) {
		return {
			friendlyTitle: "Купирование острой боли и неотложная помощь",
			categoryCode: "1",
			stageKind: "stage_1_emergency",
		};
	}

	// 2. Терапевтическая санация (Кариес, пульпит, эндодонтия, пломбы)
	if (
		cleanCode.startsWith("A16.07.002") || // Кариес / пломбы
		cleanCode.startsWith("A16.07.030") || // Инструментальная обработка каналов
		cleanCode.startsWith("A16.07.008") || // Пломбирование каналов
		cleanCode.startsWith("A16.07.082") || // Восстановление зуба коронковой частью
		titleLower.includes("кариес") ||
		titleLower.includes("пульпит") ||
		titleLower.includes("периодонтит") ||
		titleLower.includes("пломб") ||
		titleLower.includes("канал") ||
		titleLower.includes("эндодонт") ||
		titleLower.includes("реставраци")
	) {
		let friendly = "Терапевтическое лечение зуба и установка эстетической пломбы";
		if (titleLower.includes("канал") || cleanCode.startsWith("A16.07.030") || cleanCode.startsWith("A16.07.008")) {
			friendly = "Лечение корневых каналов под микроскопом (эндодонтия)";
		} else if (titleLower.includes("кариес") || cleanCode.startsWith("A16.07.002")) {
			friendly = "Лечение кариеса с анатомической реставрацией нанокомпозитом";
		}
		return {
			friendlyTitle: friendly,
			categoryCode: "1",
			stageKind: "stage_2_therapy",
		};
	}

	// 3. Хирургия и имплантация (Удаление, имплантаты, синус-лифтинг, костная пластика)
	if (
		cleanCode.startsWith("A16.07.054") || // Имплантация
		cleanCode.startsWith("A16.07.041") || // Костная пластика
		cleanCode.startsWith("A16.07.001") || // Удаление
		cleanCode.startsWith("A16.07.055") || // Реконструкция
		titleLower.includes("имплант") ||
		titleLower.includes("удален") ||
		titleLower.includes("синус-лифтинг") ||
		titleLower.includes("костная пластика") ||
		titleLower.includes("аугментац")
	) {
		let friendly = "Хирургическая процедура и установка дентального имплантата";
		if (cleanCode.startsWith("A16.07.001") || titleLower.includes("удален")) {
			friendly = "Бережное (атравматичное) удаление несохранного зуба";
		} else if (cleanCode.startsWith("A16.07.054") || titleLower.includes("имплант")) {
			friendly = "Установка премиум дентального имплантата (титан)";
		} else if (titleLower.includes("синус") || titleLower.includes("костн")) {
			friendly = "Наращивание костной ткани (синус-лифтинг / остеопластика)";
		}
		return {
			friendlyTitle: friendly,
			categoryCode: "2", // Дорогостоящее лечение (Код 02)
			stageKind: "stage_3_surgery",
		};
	}

	// 4. Ортопедическое протезирование (Коронки, мосты, виниры, сканирование)
	if (
		cleanCode.startsWith("A16.07.004") || // Коронки
		cleanCode.startsWith("A16.07.006") || // Протезирование на имплантатах
		cleanCode.startsWith("A16.07.005") || // Мостовидные протезы
		cleanCode.startsWith("A02.07.010") || // 3D-сканирование
		titleLower.includes("коронк") ||
		titleLower.includes("протез") ||
		titleLower.includes("мост") ||
		titleLower.includes("винир") ||
		titleLower.includes("сканирован") ||
		titleLower.includes("циркони") ||
		titleLower.includes("e.max")
	) {
		let friendly = "Ортопедическое восстановление зуба керамической коронкой";
		if (titleLower.includes("имплант") || cleanCode.startsWith("A16.07.006")) {
			friendly = "Керамическая коронка из диоксида циркония с фиксацией на имплантате";
		} else if (titleLower.includes("скан") || cleanCode.startsWith("A02.07.010")) {
			friendly = "Цифровое интраоральное 3D-сканирование челюстей (без слепочной массы)";
		} else if (titleLower.includes("винир")) {
			friendly = "Керамический винир E.max для безупречной эстетики улыбки";
		}
		return {
			friendlyTitle: friendly,
			categoryCode: titleLower.includes("имплант") ? "2" : "1",
			stageKind: "stage_4_orthopedics",
		};
	}

	// 5. Профгигиена и диспансерное наблюдение
	if (
		cleanCode.startsWith("A16.07.051") || // Профгигиена
		cleanCode.startsWith("A16.07.020") || // Удаление камня
		cleanCode.startsWith("A16.07.025") || // Фторирование
		titleLower.includes("гигиен") ||
		titleLower.includes("чистк") ||
		titleLower.includes("air-flow") ||
		titleLower.includes("airflow") ||
		titleLower.includes("ультразвук") ||
		titleLower.includes("полировк") ||
		titleLower.includes("фторирован") ||
		titleLower.includes("осмотр")
	) {
		return {
			friendlyTitle: "Комплексная гигиена: ультразвук + Air-Flow + реминерализация",
			categoryCode: "1",
			stageKind: "stage_5_hygiene_checkup",
		};
	}

	// Общий фоллбэк
	return {
		friendlyTitle: rawMedicalTitle || "Стоматологическая процедура",
		categoryCode: "1",
		stageKind: "stage_2_therapy",
	};
}

/**
 * 5 Canonical Roadmap Stage Metadata
 */
const CANONICAL_ROADMAP_META: Record<
	RoadmapStageKind,
	{
		stageNumber: 1 | 2 | 3 | 4 | 5;
		titleRu: string;
		subtitleRu: string;
		patientGoalRu: string;
		icon: React.ReactNode;
	}
> = {
	stage_1_emergency: {
		stageNumber: 1,
		titleRu: "Этап 1: Неотложная помощь и снятие боли",
		subtitleRu: "Экстренная диагностика и устранение болевого синдрома",
		patientGoalRu: "Быстро снять острую боль, провести обезболивание и защитить зуб временной герметичной повязкой.",
		icon: <HeartPulse className="w-4 h-4 text-rose-400" />,
	},
	stage_2_therapy: {
		stageNumber: 2,
		titleRu: "Этап 2: Терапевтическая санация",
		subtitleRu: "Лечение кариеса, каналов и художественная реставрация",
		patientGoalRu: "Полностью ликвидировать все очаги кариеса и инфекции в каналах, укрепить зубы современными световыми материалами.",
		icon: <Stethoscope className="w-4 h-4 text-cyan-400" />,
	},
	stage_3_surgery: {
		stageNumber: 3,
		titleRu: "Этап 3: Хирургия и имплантация",
		subtitleRu: "Атравматичное удаление и установка имплантатов",
		patientGoalRu: "Бережно удалить разрушенные корни, подготовить костную ткань и установить надежные титановые имплантаты.",
		icon: <Scissors className="w-4 h-4 text-amber-400" />,
	},
	stage_4_orthopedics: {
		stageNumber: 4,
		titleRu: "Этап 4: Ортопедическое протезирование",
		subtitleRu: "3D-сканирование и установка циркониевых коронок",
		patientGoalRu: "Восстановить жевательную функцию и идеальную эстетику улыбки с помощью прочных коронок из диоксида циркония.",
		icon: <Crown className="w-4 h-4 text-purple-400" />,
	},
	stage_5_hygiene_checkup: {
		stageNumber: 5,
		titleRu: "Этап 5: Профгигиена и диспансерное наблюдение",
		subtitleRu: "Защита десен, полировка и контрольный осмотр",
		patientGoalRu: "Очистить зубы от налета и камня методом Air-Flow, укрепить эмаль минералами и зафиксировать гарантию на лечение.",
		icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
	},
};

export const TreatmentPlanRoadmap: React.FC<TreatmentPlanRoadmapProps> = ({
	stages = [],
	customRoadmapStages,
	planTitle = "Комплексный план стоматологического лечения",
	planNumber = "ПЛ-2026/0891",
	curatingDoctorName = "Д-р Смирнов Алексей Петрович",
	patientFullName = "Смирнова Екатерина Васильевна",
	onBookStage,
	onRequestTaxCertificate,
	className = "",
}) => {
	const [expandedStageNumbers, setExpandedStageNumbers] = useState<Record<number, boolean>>({
		1: true,
		2: true,
		3: true,
		4: true,
		5: true,
	});

	const toggleStage = (stageNum: number) => {
		setExpandedStageNumbers((prev) => ({ ...prev, [stageNum]: !prev[stageNum] }));
	};

	// Construct 5 Canonical Stages from input data
	const roadmapStages: RoadmapStageData[] = useMemo(() => {
		if (customRoadmapStages && customRoadmapStages.length > 0) {
			return [...customRoadmapStages];
		}

		// Build from standard TreatmentPlanStage[]
		const allItems = stages.flatMap((s) => s.items || []);

		// Buckets for each of the 5 canonical stages
		const stageBuckets: Record<RoadmapStageKind, RoadmapProcedureItem[]> = {
			stage_1_emergency: [],
			stage_2_therapy: [],
			stage_3_surgery: [],
			stage_4_orthopedics: [],
			stage_5_hygiene_checkup: [],
		};

		// Teeth map per stage
		const stageTeethMap: Record<RoadmapStageKind, Set<string>> = {
			stage_1_emergency: new Set(),
			stage_2_therapy: new Set(),
			stage_3_surgery: new Set(),
			stage_4_orthopedics: new Set(),
			stage_5_hygiene_checkup: new Set(),
		};

		for (const it of allItems) {
			const { friendlyTitle, categoryCode, stageKind } = translate804nToPatientDescription(
				it.code804n,
				it.name,
			);

			const toothStr = it.toothNumber ? String(it.toothNumber) : undefined;
			if (toothStr) {
				stageTeethMap[stageKind].add(toothStr);
			}

			const priceKop =
				typeof (it as unknown as { priceKopecks?: number }).priceKopecks === "number"
					? Math.round((it as unknown as { priceKopecks: number }).priceKopecks)
					: Math.round((it.priceRub || 0) * 100);

			stageBuckets[stageKind].push({
				id: it.id,
				code804n: it.code804n,
				medicalTitleRu: it.name,
				patientFriendlyTitleRu: friendlyTitle,
				toothNumber: it.toothNumber,
				toothFdi: toothStr ? formatFdiToothName(toothStr) : undefined,
				priceRub: it.priceRub || 0,
				priceKopecks: priceKop,
				quantity: it.quantity || 1,
				isCompleted: Boolean((it as unknown as { isCompleted?: boolean }).isCompleted),
				categoryCode,
			});
		}

		const stageKindsOrder: RoadmapStageKind[] = [
			"stage_1_emergency",
			"stage_2_therapy",
			"stage_3_surgery",
			"stage_4_orthopedics",
			"stage_5_hygiene_checkup",
		];

		return stageKindsOrder.map((kind) => {
			const meta = CANONICAL_ROADMAP_META[kind];
			const procs = stageBuckets[kind];
			const totalKop = procs.reduce((sum, p) => sum + p.priceKopecks * p.quantity, 0);
			const completedKop = procs
				.filter((p) => p.isCompleted)
				.reduce((sum, p) => sum + p.priceKopecks * p.quantity, 0);
			const remainingKop = Math.max(0, totalKop - completedKop);

			let status: "completed" | "in_progress" | "planned" = "planned";
			if (totalKop > 0 && completedKop >= totalKop) {
				status = "completed";
			} else if (completedKop > 0) {
				status = "in_progress";
			}

			// Estimated visits: at least 1 visit per 3 procedures or 1
			const estimatedVisits = Math.max(1, Math.ceil(procs.length / 2));

			return {
				stageNumber: meta.stageNumber,
				stageKind: kind,
				titleRu: meta.titleRu,
				subtitleRu: meta.subtitleRu,
				patientGoalRu: meta.patientGoalRu,
				status,
				teethFdiList: Array.from(stageTeethMap[kind]),
				procedures: procs,
				totalRub: kopecksToRub(totalKop),
				totalKopecks: totalKop,
				completedRub: kopecksToRub(completedKop),
				completedKopecks: completedKop,
				remainingRub: kopecksToRub(remainingKop),
				remainingKopecks: remainingKop,
				estimatedVisitsCount: estimatedVisits,
			};
		});
	}, [customRoadmapStages, stages]);

	// Global Metrics
	const { grandTotalKopecks, completedTotalKopecks, remainingTotalKopecks, progressPercent } = useMemo(() => {
		const totalKop = roadmapStages.reduce((sum, s) => sum + s.totalKopecks, 0);
		const compKop = roadmapStages.reduce((sum, s) => sum + s.completedKopecks, 0);
		const remKop = Math.max(0, totalKop - compKop);
		const pct = totalKop > 0 ? Math.min(100, Math.round((compKop / totalKop) * 100)) : 0;

		return {
			grandTotalKopecks: totalKop,
			completedTotalKopecks: compKop,
			remainingTotalKopecks: remKop,
			progressPercent: pct,
		};
	}, [roadmapStages]);

	// 13% Tax Deduction Calculation via @dental/shared
	const taxBreakdown = useMemo(() => {
		const allProcs = roadmapStages.flatMap((s) => s.procedures);
		const taxItems = allProcs.map((p) => ({
			id: p.id,
			code804n: p.code804n,
			name: p.medicalTitleRu,
			serviceName: p.medicalTitleRu,
			taxCode: p.categoryCode,
			priceRub: p.priceRub,
			priceKopecks: p.priceKopecks,
			quantity: p.quantity,
		}));

		return calculatePlanTaxDeductionBreakdown(taxItems);
	}, [roadmapStages]);

	return (
		<div className={`roadmap-container ${className}`} data-testid="treatment-plan-roadmap">
			{/* 1. Hero Progress Overview Card */}
			<div className="roadmap-hero" data-testid="roadmap-hero">
				<div className="roadmap-header-row">
					<div>
						<div className="text-xs font-semibold text-[var(--brand,#0d9488)] uppercase tracking-wider">
							{planNumber} • Куратор: {curatingDoctorName}
						</div>
						<h3 className="roadmap-title">{planTitle}</h3>
						<div className="roadmap-subtitle">Пациент: {patientFullName}</div>
					</div>

					<div className="roadmap-percent-pill" data-testid="roadmap-percent-pill">
						<Percent className="w-3.5 h-3.5" />
						<span>{progressPercent}% выполнено</span>
					</div>
				</div>

				{/* Progress bar */}
				<div className="roadmap-progress-bar-bg">
					<div
						className="roadmap-progress-bar-fill"
						style={{ width: `${progressPercent}%` }}
						data-testid="roadmap-progress-bar-fill"
					/>
				</div>

				{/* Financial Metrics in Exact Rubles & Kopecks */}
				<div className="roadmap-metrics-grid">
					<div className="roadmap-metric-card">
						<div className="roadmap-metric-label">Общая стоимость плана</div>
						<div className="roadmap-metric-value" data-testid="metric-total-cost">
							{formatKopecksToRubExact(grandTotalKopecks)} ₽
						</div>
					</div>

					<div className="roadmap-metric-card">
						<div className="roadmap-metric-label">Оплачено и выполнено</div>
						<div className="roadmap-metric-value text-emerald-400" data-testid="metric-completed-cost">
							{formatKopecksToRubExact(completedTotalKopecks)} ₽
						</div>
					</div>

					<div className="roadmap-metric-card">
						<div className="roadmap-metric-label">Остаток к оплате</div>
						<div className="roadmap-metric-value text-amber-400" data-testid="metric-remaining-cost">
							{formatKopecksToRubExact(remainingTotalKopecks)} ₽
						</div>
					</div>
				</div>
			</div>

			{/* 2. 13% Tax Deduction Banner (FNS Code 01 / Code 02) */}
			<div className="roadmap-tax-banner" data-testid="roadmap-tax-banner">
				<div className="flex items-start gap-3">
					<div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
						<Coins className="w-5 h-5" />
					</div>
					<div>
						<div className="text-sm font-bold text-white flex items-center gap-2">
							<span>Налоговый вычет 13% (Возврат от ФНС России)</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
								+{formatKopecksToRubExact(taxBreakdown.grandTotalRefund13Kopecks)} ₽
							</span>
						</div>
						<div className="text-xs text-[var(--ink-muted,#94a3b8)] mt-1 leading-relaxed">
							{taxBreakdown.hasCode02ExpensiveServices ? (
								<>
									План включает дорогостоящее лечение (Код 02: имплантация) — вычет 13% рассчитывается{" "}
									<strong className="text-white">со всей суммы без лимита</strong>.
								</>
							) : (
								<>
									Стандартное лечение (Код 01) — лимит вычета до 150 000 ₽ в год (возврат до 19 500 ₽).
								</>
							)}
							<div className="mt-0.5 text-slate-200">
								Итоговая стоимость с учетом возврата:{" "}
								<strong className="text-emerald-400 font-bold">
									{formatKopecksToRubExact(taxBreakdown.netPriceWithRefundKopecks)} ₽
								</strong>
							</div>
						</div>
					</div>
				</div>

				<div className="flex-shrink-0 flex items-center">
					<button
						type="button"
						onClick={onRequestTaxCertificate}
						className="h-9 px-3.5 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-sky-500/30 text-sky-300 hover:text-white hover:bg-sky-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
						data-testid="request-tax-cert-btn"
					>
						<FileBadge className="w-4 h-4" />
						Справка для ФНС (КНД 1151156)
					</button>
				</div>
			</div>

			{/* 3. 5 Canonical Roadmap Stages */}
			<div className="roadmap-stages-list" data-testid="roadmap-stages-list">
				{roadmapStages.map((stage) => {
					const isExpanded = Boolean(expandedStageNumbers[stage.stageNumber]);
					const meta = CANONICAL_ROADMAP_META[stage.stageKind];

					return (
						<div
							key={stage.stageNumber}
							className={`roadmap-stage-card ${stage.status}`}
							data-testid={`roadmap-stage-${stage.stageNumber}`}
						>
							{/* Stage Header */}
							<div className="roadmap-stage-header">
								<div className="flex items-start gap-3 flex-1 min-w-0">
									<div className={`roadmap-stage-num-badge ${stage.status}`}>
										{stage.status === "completed" ? (
											<Check className="w-4 h-4" />
										) : (
											<span>{stage.stageNumber}</span>
										)}
									</div>

									<div className="roadmap-stage-title-wrap">
										<div className="flex items-center gap-2">
											<span className="roadmap-stage-name">{stage.titleRu}</span>
										</div>
										<div className="roadmap-stage-desc">{stage.subtitleRu}</div>
									</div>
								</div>

								{/* Status Badge */}
								<div className="flex items-center gap-2">
									<div className={`roadmap-stage-status-badge ${stage.status}`}>
										{stage.status === "completed" && (
											<>
												<CheckCircle2 className="w-3 h-3" />
												<span>Выполнено</span>
											</>
										)}
										{stage.status === "in_progress" && (
											<>
												<Clock className="w-3 h-3" />
												<span>В процессе</span>
											</>
										)}
										{stage.status === "planned" && <span>Запланировано</span>}
									</div>

									<button
										type="button"
										onClick={() => toggleStage(stage.stageNumber)}
										className="p-1 rounded-md hover:bg-[var(--paper-soft,#1e293b)] text-[var(--ink-muted,#94a3b8)] hover:text-white"
										aria-label={isExpanded ? "Свернуть" : "Развернуть"}
										data-testid={`toggle-stage-btn-${stage.stageNumber}`}
									>
										{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
									</button>
								</div>
							</div>

							{/* Stage Goal Explanation */}
							<div className="text-xs text-[var(--ink-muted,#94a3b8)] bg-[var(--paper-soft,#1e293b)]/40 p-2.5 rounded-lg border border-[var(--line-subtle,rgba(255,255,255,0.03))] mb-3 leading-relaxed">
								<strong className="text-slate-300">Цель этапа: </strong>
								{stage.patientGoalRu}
							</div>

							{/* Teeth Involved */}
							{stage.teethFdiList.length > 0 && (
								<div className="roadmap-teeth-row">
									<span className="text-xs text-[var(--ink-muted,#94a3b8)] mr-1 self-center">
										Зубы:
									</span>
									{stage.teethFdiList.map((tooth) => (
										<span
											key={tooth}
											className="roadmap-tooth-tag"
											title={formatFdiToothName(tooth)}
										>
											{tooth}
										</span>
									))}
								</div>
							)}

							{/* Expanded Procedures Table */}
							{isExpanded && (
								<div className="roadmap-procedures-table">
									{stage.procedures.length > 0 ? (
										stage.procedures.map((proc) => (
											<div key={proc.id} className="roadmap-proc-row">
												<div className="flex-1 min-w-0">
													<div className="roadmap-proc-title">
														{proc.code804n && (
															<span className="roadmap-proc-code-tag">{proc.code804n}</span>
														)}
														<span>{proc.patientFriendlyTitleRu}</span>
														{proc.toothNumber && (
															<span className="text-[var(--ink-muted,#94a3b8)] text-xs ml-1.5">
																(зуб {proc.toothNumber})
															</span>
														)}
													</div>
													{proc.medicalTitleRu !== proc.patientFriendlyTitleRu && (
														<div className="text-[11px] text-[var(--ink-muted,#94a3b8)] mt-0.5">
															Мед. номенклатура: {proc.medicalTitleRu}
														</div>
													)}
												</div>

												<div className="roadmap-proc-price">
													{formatKopecksToRubExact(proc.priceKopecks * proc.quantity)} ₽
												</div>
											</div>
										))
									) : (
										<div className="text-xs text-[var(--ink-muted,#94a3b8)] py-2 text-center">
											Процедуры для данного этапа будут сформированы после завершения предыдущего шага
										</div>
									)}
								</div>
							)}

							{/* Stage Footer: Cost & 1-Click Action */}
							<div className="roadmap-stage-footer">
								<div>
									<div className="roadmap-stage-total-label">Стоимость этапа</div>
									<div className="roadmap-stage-total-sum">
										{formatKopecksToRubExact(stage.totalKopecks)} ₽
									</div>
								</div>

								{stage.status !== "completed" && (
									<button
										type="button"
										onClick={() => onBookStage?.(stage)}
										className="roadmap-book-stage-btn"
										data-testid={`book-stage-btn-${stage.stageNumber}`}
									>
										<CalendarPlus className="w-4 h-4" />
										Записаться на этот этап
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
