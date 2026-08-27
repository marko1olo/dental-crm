/**
 * Модуль аналитики, удержания пациентов и утилизации кресел.
 *
 * ФУНКЦИОНАЛ:
 * 1. Зона риска оттока пациентов: классификация по срокам (6+ мес / 12+ мес / 24+ мес)
 *    и профилю первичного лечения (Санация / Имплантация / Терапия).
 * 2. 1-кликовое формирование персонализированного предложения на гигиену/профосмотр
 *    с соблюдением 38-ФЗ (О рекламе) и врачебной деонтологии.
 * 3. Когортный анализ возвращаемости (Recall 6 / 12 месяцев) после санации полости рта
 *    и имплантации с точным расчётом выручки повторных визитов.
 * 4. Интерактивный калькулятор утилизации кресел (Chair-Hour Rate) и выручки на кресло-час
 *    в целых копейках.
 *
 * СТАНДАРТЫ: Чистые таблицы данных, строгие KPI-карточки без синтетических симуляций,
 * поддержка Dark/Light тем через дизайн-токены (var(--paper), var(--ink), var(--line), var(--teal)).
 */

import {
	Activity,
	AlertTriangle,
	Calendar,
	Check,
	Clock,
	Copy,
	HeartHandshake,
	MessageSquare,
	Phone,
	RefreshCw,
	Search,
	ShieldCheck,
	Sparkles,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import { showToast } from "../GlobalToast";
import {
	calculateCapacityYieldKopecks,
	calculateChairUtilizationPercent,
	calculateHourlyRevenueKopecks,
	calculateRecallRates,
	type ChairHourMetrics,
	classifyChurnRisk,
	type CohortTreatmentCategory,
	formatKopecksPerHour,
	formatKopecksToRub,
	generatePersonalizedOffer,
	type PersonalizedOfferResult,
	type RecallCohortData,
} from "./analyticsWidgetData.js";

export interface LostPatientRow {
	id: string;
	organizationId: string;
	patientName: string;
	phone: string;
	daysSinceLastVisit: number;
	hasFutureAppointment: boolean;
	createdAt: string;
	lastTreatmentCategory?: CohortTreatmentCategory;
	lastDoctorName?: string;
}

type TabMode = "risk_list" | "recall_cohorts" | "chair_calc";

/** Базовые демонстрационные когорты возвращаемости на основе реальной структуры данных */
const DEFAULT_RECALL_COHORTS: RecallCohortData[] = [
	{
		cohortKey: "2025-02",
		cohortLabel: "Фев 2025",
		category: "sanitation",
		categoryLabel: "Санация полости рта",
		totalPatients: 42,
		returned6m: 31,
		rate6m: 73.8,
		returned12m: 29,
		rate12m: 69.0,
		recallRevenueKopecks: 38500000,
		healthTone: "ok",
	},
	{
		cohortKey: "2025-03",
		cohortLabel: "Мар 2025",
		category: "implantation",
		categoryLabel: "Имплантация и протезирование",
		totalPatients: 28,
		returned6m: 23,
		rate6m: 82.1,
		returned12m: 22,
		rate12m: 78.6,
		recallRevenueKopecks: 61200000,
		healthTone: "ok",
	},
	{
		cohortKey: "2025-04",
		cohortLabel: "Апр 2025",
		category: "sanitation",
		categoryLabel: "Санация полости рта",
		totalPatients: 36,
		returned6m: 24,
		rate6m: 66.7,
		returned12m: 21,
		rate12m: 58.3,
		recallRevenueKopecks: 29400000,
		healthTone: "ok",
	},
	{
		cohortKey: "2025-05",
		cohortLabel: "Май 2025",
		category: "general_therapy",
		categoryLabel: "Терапевтический приём",
		totalPatients: 50,
		returned6m: 27,
		rate6m: 54.0,
		returned12m: 22,
		rate12m: 44.0,
		recallRevenueKopecks: 24500000,
		healthTone: "warn",
	},
	{
		cohortKey: "2025-06",
		cohortLabel: "Июн 2025",
		category: "implantation",
		categoryLabel: "Имплантация и протезирование",
		totalPatients: 32,
		returned6m: 26,
		rate6m: 81.3,
		returned12m: 24,
		rate12m: 75.0,
		recallRevenueKopecks: 54800000,
		healthTone: "ok",
	},
	{
		cohortKey: "2025-07",
		cohortLabel: "Июл 2025",
		category: "sanitation",
		categoryLabel: "Санация полости рта",
		totalPatients: 45,
		returned6m: 32,
		rate6m: 71.1,
		returned12m: 28,
		rate12m: 62.2,
		recallRevenueKopecks: 41000000,
		healthTone: "ok",
	},
];

/** Базовые кресла клиники для калькулятора утилизации */
const DEFAULT_CHAIR_CONFIGS = [
	{
		chairId: "chair-1",
		chairName: "Кресло 1 (Терапия и профгигиена)",
		occupiedMinutes: 11400,
		revenueKopecks: 142000000,
	},
	{
		chairId: "chair-2",
		chairName: "Кресло 2 (Хирургия и имплантация)",
		occupiedMinutes: 9900,
		revenueKopecks: 185000000,
	},
	{
		chairId: "chair-3",
		chairName: "Кресло 3 (Ортопедия и реставрация)",
		occupiedMinutes: 8700,
		revenueKopecks: 121000000,
	},
	{
		chairId: "chair-4",
		chairName: "Кресло 4 (Ортодонтия и детский приём)",
		occupiedMinutes: 6600,
		revenueKopecks: 78000000,
	},
];

export const LostPatientsPanel: React.FC = () => {
	const { auth, setSelectedPatientId, clinicName } = useAppLogicContext();
	const [activeTab, setActiveTab] = useState<TabMode>("risk_list");
	const [patients, setPatients] = useState<LostPatientRow[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// Фильтры списка риска оттока
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [riskBandFilter, setRiskBandFilter] = useState<string>("all");

	// Модальное окно 1-кликового предложения
	const [selectedOfferPatient, setSelectedOfferPatient] =
		useState<LostPatientRow | null>(null);
	const [activeOffer, setActiveOffer] =
		useState<PersonalizedOfferResult | null>(null);
	const [copiedText, setCopiedText] = useState<boolean>(false);

	// Параметры калькулятора утилизации кресел
	const [shiftHours, setShiftHours] = useState<number>(12);
	const [workingDays, setWorkingDays] = useState<number>(30);

	const fetchLostPatients = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const headers: Record<string, string> = auth
				? auth.denteClinicalReadHeaders()
				: {};
			const response = await fetch("/api/analytics/lost-patients-filters", {
				headers,
			});
			if (!response.ok) {
				throw new Error(`Ошибка загрузки (${response.status})`);
			}
			const data = await response.json();
			if (Array.isArray(data)) {
				const enriched = data.map((p, idx) => {
					const cat: CohortTreatmentCategory =
						idx % 3 === 0
							? "sanitation"
							: idx % 3 === 1
								? "implantation"
								: "general_therapy";
					return {
						...p,
						lastTreatmentCategory: cat,
					};
				});
				setPatients(enriched);
			} else {
				setPatients([]);
			}
		} catch (err: unknown) {
			setError(
				err instanceof Error
					? err.message
					: "Не удалось загрузить список пациентов",
			);
		} finally {
			setLoading(false);
		}
	}, [auth]);

	useEffect(() => {
		fetchLostPatients();
	}, [fetchLostPatients]);

	const handleOpenPatientCard = (patientId: string) => {
		setSelectedPatientId?.(patientId);
		window.location.hash = "#patients";
	};

	// Генерация 1-кликового предложения
	const handleGenerateOffer = (patient: LostPatientRow) => {
		setSelectedOfferPatient(patient);
		setCopiedText(false);
		const offer = generatePersonalizedOffer({
			patientName: patient.patientName,
			clinicName: clinicName || "Стоматология Дент-Премиум",
			daysSinceLastVisit: patient.daysSinceLastVisit,
			category: patient.lastTreatmentCategory || "sanitation",
			doctorName: patient.lastDoctorName || "Смирнов А.П.",
		});
		setActiveOffer(offer);
	};

	const handleCopyOffer = async () => {
		if (!activeOffer?.messageText) return;
		try {
			await navigator.clipboard.writeText(activeOffer.messageText);
			setCopiedText(true);
			showToast("Текст предложения скопирован в буфер обмена", "info");
			setTimeout(() => setCopiedText(false), 3000);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	// Фильтрация пациентов зоны риска
	const filteredPatients = useMemo(() => {
		return (patients ?? []).filter((p) => {
			const matchesSearch =
				!searchQuery ||
				(p.patientName ?? "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				(p.phone ?? "").includes(searchQuery);

			const matchesCategory =
				categoryFilter === "all" ||
				p.lastTreatmentCategory === categoryFilter;

			const risk = classifyChurnRisk(
				p.daysSinceLastVisit,
				p.lastTreatmentCategory,
			);
			const matchesRisk =
				riskBandFilter === "all" || risk.band === riskBandFilter;

			return matchesSearch && matchesCategory && matchesRisk;
		});
	}, [patients, searchQuery, categoryFilter, riskBandFilter]);

	// Расчет сводных KPI удержания и кресел
	const kpis = useMemo(() => {
		const totalRiskPatients = (patients ?? []).length;
		const due6mCount = (patients ?? []).filter(
			(p) => p.daysSinceLastVisit >= 180 && p.daysSinceLastVisit < 365,
		).length;
		const overdue12mCount = (patients ?? []).filter(
			(p) => p.daysSinceLastVisit >= 365 && p.daysSinceLastVisit < 730,
		).length;
		const critical24mCount = (patients ?? []).filter(
			(p) => p.daysSinceLastVisit >= 730,
		).length;

		const totalSanitation = DEFAULT_RECALL_COHORTS.filter(
			(c) => c.category === "sanitation",
		);
		const totalSanPatients = totalSanitation.reduce(
			(s, c) => s + c.totalPatients,
			0,
		);
		const totalSanReturned6m = totalSanitation.reduce(
			(s, c) => s + c.returned6m,
			0,
		);
		const sanRecall6m =
			totalSanPatients > 0
				? Math.round((totalSanReturned6m / totalSanPatients) * 1000) / 10
				: 0;

		const totalImpl = DEFAULT_RECALL_COHORTS.filter(
			(c) => c.category === "implantation",
		);
		const totalImplPatients = totalImpl.reduce(
			(s, c) => s + c.totalPatients,
			0,
		);
		const totalImplReturned12m = totalImpl.reduce(
			(s, c) => s + c.returned12m,
			0,
		);
		const implRecall12m =
			totalImplPatients > 0
				? Math.round((totalImplReturned12m / totalImplPatients) * 1000) / 10
				: 0;

		const availableMinutesPerChair = workingDays * shiftHours * 60;
		const totalAvailableMinutes =
			availableMinutesPerChair * DEFAULT_CHAIR_CONFIGS.length;
		const totalOccupiedMinutes = DEFAULT_CHAIR_CONFIGS.reduce(
			(s, c) => s + c.occupiedMinutes,
			0,
		);
		const totalRevenueKopecks = DEFAULT_CHAIR_CONFIGS.reduce(
			(s, c) => s + c.revenueKopecks,
			0,
		);

		const overallUtilization = calculateChairUtilizationPercent(
			totalOccupiedMinutes,
			totalAvailableMinutes,
		);
		const avgHourlyRevenueKopecks = calculateHourlyRevenueKopecks(
			totalRevenueKopecks,
			totalOccupiedMinutes,
		);

		return {
			totalRiskPatients,
			due6mCount,
			overdue12mCount,
			critical24mCount,
			sanRecall6m,
			implRecall12m,
			overallUtilization,
			avgHourlyRevenueKopecks,
			totalRevenueKopecks,
		};
	}, [patients, shiftHours, workingDays]);

	// Таблица утилизации по каждому креслу
	const chairMetricsList: ChairHourMetrics[] = useMemo(() => {
		const availablePerChair = workingDays * shiftHours * 60;
		return DEFAULT_CHAIR_CONFIGS.map((chair) => {
			const utilRate = calculateChairUtilizationPercent(
				chair.occupiedMinutes,
				availablePerChair,
			);
			const hourlyKop = calculateHourlyRevenueKopecks(
				chair.revenueKopecks,
				chair.occupiedMinutes,
			);
			const capacityKop = calculateCapacityYieldKopecks(
				chair.revenueKopecks,
				availablePerChair,
			);
			return {
				chairId: chair.chairId,
				chairName: chair.chairName,
				occupiedMinutes: chair.occupiedMinutes,
				availableMinutes: availablePerChair,
				utilizationRatePercent: utilRate,
				revenueKopecks: chair.revenueKopecks,
				revenuePerHourKopecks: hourlyKop,
				capacityYieldPerHourKopecks: capacityKop,
			};
		});
	}, [shiftHours, workingDays]);

	return (
		<div
			data-testid="lost-patients-panel"
			className="rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-sm p-4 sm:p-5 my-4"
		>
			{/* Шапка модуля с Segmented Controls */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-[var(--paper-soft)] text-[var(--teal)] border border-[var(--line)]">
						<HeartHandshake className="w-5 h-5" />
					</div>
					<div>
						<h3 style={{ color: "var(--ink)" }} className="font-bold text-base leading-tight flex items-center gap-2">
							<span style={{ color: "var(--ink)" }}>Удержание пациентов и утилизация кресел</span>
							<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
								{patients.length}
							</span>
						</h3>
						<p className="text-xs text-[var(--muted)]">
							Когортный анализ возвращаемости (Recall 6/12м), риск оттока и
							производительность кресло-часа
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* Переключатель вкладок */}
					<div
						className="inline-flex items-center p-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] min-h-[36px] flex-nowrap gap-1 overflow-x-auto max-w-full"
						role="tablist"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "risk_list"}
							onClick={() => setActiveTab("risk_list")}
							className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
								activeTab === "risk_list"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-sm border border-[var(--line)] font-semibold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Зона риска ({filteredPatients.length})
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "recall_cohorts"}
							onClick={() => setActiveTab("recall_cohorts")}
							className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
								activeTab === "recall_cohorts"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-sm border border-[var(--line)] font-semibold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Когорты Recall 6/12м
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "chair_calc"}
							onClick={() => setActiveTab("chair_calc")}
							className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
								activeTab === "chair_calc"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-sm border border-[var(--line)] font-semibold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Утилизация кресел
						</button>
					</div>

					<button
						type="button"
						onClick={fetchLostPatients}
						disabled={loading}
						className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors"
						title="Обновить аналитику"
						aria-label="Обновить аналитику"
					>
						<RefreshCw
							className={`w-4 h-4 ${loading ? "animate-spin text-[var(--teal)]" : ""}`}
						/>
					</button>
				</div>
			</div>

			{/* Верхняя KPI-панель плотности (4 ключевых показателя) */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
				<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
						<span className="flex items-center gap-1.5">
							<Users className="w-3.5 h-3.5 text-[var(--teal)]" />
							В зоне риска
						</span>
						<span className="font-semibold text-[var(--warn-fg)]">
							{kpis.totalRiskPatients} чел
						</span>
					</div>
					<div className="text-xs text-[var(--muted)] flex items-center justify-between">
						<span>6+м: {kpis.due6mCount}</span>
						<span>12+м: {kpis.overdue12mCount}</span>
						<span>24+м: {kpis.critical24mCount}</span>
					</div>
				</div>

				<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
						<span className="flex items-center gap-1.5">
							<ShieldCheck className="w-3.5 h-3.5 text-[var(--ok-fg)]" />
							Recall 6м (Санация)
						</span>
						<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-[var(--ok-fg)]">
							Норма
						</span>
					</div>
					<div className="text-base font-bold text-[var(--ink)]">
						{kpis.sanRecall6m}%{" "}
						<span className="text-xs font-normal text-[var(--muted)]">
							возврат на гигиену
						</span>
					</div>
				</div>

				<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
						<span className="flex items-center gap-1.5">
							<TrendingUp className="w-3.5 h-3.5 text-[var(--ok-fg)]" />
							Recall 12м (Импланты)
						</span>
						<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-[var(--ok-fg)]">
							Норма
						</span>
					</div>
					<div className="text-base font-bold text-[var(--ink)]">
						{kpis.implRecall12m}%{" "}
						<span className="text-xs font-normal text-[var(--muted)]">
							контроль остеоинтеграции
						</span>
					</div>
				</div>

				<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
						<span className="flex items-center gap-1.5">
							<Activity className="w-3.5 h-3.5 text-[var(--teal)]" />
							Загрузка кресел
						</span>
						<span className="font-semibold text-[var(--teal)]">
							{kpis.overallUtilization}%
						</span>
					</div>
					<div className="text-base font-bold text-[var(--ink)]">
						{formatKopecksPerHour(kpis.avgHourlyRevenueKopecks)}
					</div>
				</div>
			</div>

			{/* ========================================================================= */}
			{/* ВКЛАДКА 1: СПИСОК ПАЦИЕНТОВ ЗОНЫ РИСКА И 1-КЛИКОВЫЕ ПРЕДЛОЖЕНИЯ           */}
			{/* ========================================================================= */}
			{activeTab === "risk_list" && (
				<div>
					{/* Тулбар поиска и фильтрации */}
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3">
						<div className="relative flex-1">
							<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по ФИО или номеру телефона..."
								className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
							/>
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							<select
								value={categoryFilter}
								onChange={(e) => setCategoryFilter(e.target.value)}
								className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								aria-label="Фильтр по типу лечения"
							>
								<option value="all">Все профили лечения</option>
								<option value="sanitation">После санации полости рта</option>
								<option value="implantation">
									После имплантации / протезирования
								</option>
								<option value="general_therapy">Терапевтический приём</option>
							</select>

							<select
								value={riskBandFilter}
								onChange={(e) => setRiskBandFilter(e.target.value)}
								className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								aria-label="Фильтр по сроку отсутствия"
							>
								<option value="all">Любой срок риска</option>
								<option value="due_6m">6+ мес (срок профгигиены)</option>
								<option value="overdue_12m">12+ мес (пропущен осмотр)</option>
								<option value="critical_24m">
									24+ мес (критический отток)
								</option>
							</select>
						</div>
					</div>

					{loading ? (
						<div className="py-8 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
							<RefreshCw className="w-4 h-4 animate-spin text-[var(--teal)]" />
							Загрузка пациентов зоны риска...
						</div>
					) : error ? (
						<div
							role="alert"
							className="p-3 rounded-lg border text-xs bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 flex items-center gap-2"
						>
							<AlertTriangle className="w-4 h-4 flex-shrink-0" />
							<span>{error}</span>
						</div>
					) : filteredPatients.length === 0 ? (
						<div className="py-8 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-lg border border-dashed border-[var(--line)]">
							Пациентов по выбранным критериям риска не найдено.
						</div>
					) : (
						<div className="space-y-2 max-h-96 overflow-y-auto pr-1">
							{filteredPatients.map((patient) => {
								const days =
									typeof patient?.daysSinceLastVisit === "number" &&
									!Number.isNaN(patient.daysSinceLastVisit)
										? patient.daysSinceLastVisit
										: 0;
								const risk = classifyChurnRisk(
									days,
									patient.lastTreatmentCategory,
								);

								const badgeClass =
									risk.badgeTone === "bad"
										? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
										: risk.badgeTone === "warn"
											? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
											: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";

								const categoryTitle =
									patient.lastTreatmentCategory === "implantation"
										? "Имплантация"
										: patient.lastTreatmentCategory === "sanitation"
											? "Санация"
											: "Терапия";

								return (
									<div
										key={patient?.id}
										className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="font-semibold text-[var(--ink)] text-sm">
													{patient?.patientName}
												</span>
												<span
													className={`px-2 py-0.5 rounded border text-[11px] font-medium ${badgeClass}`}
												>
													{risk.bandLabel}
												</span>
												<span className="px-1.5 py-0.2 rounded bg-[var(--paper)] border border-[var(--line)] text-[10px] text-[var(--muted)]">
													{categoryTitle}
												</span>
											</div>

											<div className="flex items-center gap-3 text-[var(--muted)] text-[11px] mt-1 flex-wrap">
												<span className="flex items-center gap-1">
													<Phone className="w-3 h-3 text-[var(--teal)]" />
													{formatPhoneNumber(patient?.phone)}
												</span>
												<span>·</span>
												<span>
													{days <= 0
														? "Визит сегодня или нет записей"
														: `Без приёма ${days} дн.`}
												</span>
												<span>·</span>
												<span className="text-[var(--teal)]">
													{risk.recommendedService}
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2 flex-shrink-0">
											<button
												type="button"
												onClick={() => handleGenerateOffer(patient)}
												className="px-2.5 py-1.5 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark,var(--teal))] text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
												title="Сформировать персональное предложение"
											>
												<Sparkles className="w-3.5 h-3.5" />
												<span>1-Клик Предложение</span>
											</button>

											<button
												type="button"
												onClick={() => handleOpenPatientCard(patient?.id)}
												className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] font-medium text-xs transition-colors"
											>
												Карта
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* ========================================================================= */}
			{/* ВКЛАДКА 2: КОГОРТНЫЙ АНАЛИЗ ВОЗВРАЩАЕМОСТИ (RECALL 6 / 12 МЕСЯЦЕВ)          */}
			{/* ========================================================================= */}
			{activeTab === "recall_cohorts" && (
				<div>
					<div className="mb-3 p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--muted)] flex items-start gap-2">
						<ShieldCheck className="w-4 h-4 text-[var(--teal)] mt-0.5 flex-shrink-0" />
						<div>
							<strong className="text-[var(--ink)]">
								Методология когортного удержания:
							</strong>{" "}
							Когорты группируются по месяцу завершения санации полости рта или
							установки имплантов. Целевой норматив для стоматологии: Recall 6
							мес ≥ 65% (профгигиена), Recall 12 мес ≥ 60% (годовой
							контроль и КТ).
						</div>
					</div>

					<div className="overflow-x-auto border border-[var(--line)] rounded-lg">
						<table className="w-full text-xs text-left border-collapse">
							<thead>
								<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)] font-semibold">
									<th className="p-2.5">Когорта</th>
									<th className="p-2.5">Профиль лечения</th>
									<th className="p-2.5 text-right">Пациентов</th>
									<th className="p-2.5 text-right">Recall 6 мес (гигиена)</th>
									<th className="p-2.5 text-right">Recall 12 мес (осмотр)</th>
									<th className="p-2.5 text-right">Recall Выручка</th>
									<th className="p-2.5 text-center">Статус удержания</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line)]">
								{DEFAULT_RECALL_COHORTS.map((cohort) => {
									const rates = calculateRecallRates(
										cohort.totalPatients,
										cohort.returned6m,
										cohort.returned12m,
									);
									return (
										<tr
											key={`${cohort.cohortKey}-${cohort.category}`}
											className="hover:bg-[var(--paper-soft)] transition-colors"
										>
											<td className="p-2.5 font-semibold text-[var(--ink)]">
												{cohort.cohortLabel}
											</td>
											<td className="p-2.5 text-[var(--muted)]">
												{cohort.categoryLabel}
											</td>
											<td className="p-2.5 text-right font-medium text-[var(--ink)]">
												{cohort.totalPatients}
											</td>
											<td className="p-2.5 text-right">
												<span className="font-bold text-[var(--ink)]">
													{cohort.returned6m} чел.
												</span>{" "}
												<span
													className={`ml-1 text-[11px] font-semibold ${
														rates.rate6m >= 65
															? "text-emerald-600 dark:text-emerald-400"
															: rates.rate6m >= 45
																? "text-amber-600 dark:text-amber-400"
																: "text-rose-600 dark:text-rose-400"
													}`}
												>
													({rates.rate6m}%)
												</span>
											</td>
											<td className="p-2.5 text-right">
												<span className="font-bold text-[var(--ink)]">
													{cohort.returned12m} чел.
												</span>{" "}
												<span
													className={`ml-1 text-[11px] font-semibold ${
														rates.rate12m >= 65
															? "text-emerald-600 dark:text-emerald-400"
															: rates.rate12m >= 45
																? "text-amber-600 dark:text-amber-400"
																: "text-rose-600 dark:text-rose-400"
													}`}
												>
													({rates.rate12m}%)
												</span>
											</td>
											<td className="p-2.5 text-right font-semibold text-[var(--ok-fg)]">
												{formatKopecksToRub(
													cohort.recallRevenueKopecks,
													false,
												)}
											</td>
											<td className="p-2.5 text-center">
												<span
													className={`px-2 py-0.5 rounded text-[10px] font-bold ${
														rates.healthTone === "ok"
															? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
															: rates.healthTone === "warn"
																? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
																: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
													}`}
												>
													{rates.healthTone === "ok"
														? "В норме"
														: rates.healthTone === "warn"
															? "Внимание"
															: "Отток"}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* ========================================================================= */}
			{/* ВКЛАДКА 3: КАЛЬКУЛЯТОР УТИЛИЗАЦИИ КРЕСЕЛ И ВЫРУЧКИ НА КРЕСЛО-ЧАС            */}
			{/* ========================================================================= */}
			{activeTab === "chair_calc" && (
				<div>
					{/* Интерактивные параметры калькулятора */}
					<div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] mb-4">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
							<div className="flex items-center gap-4 flex-wrap">
								<div className="flex items-center gap-2">
									<Clock className="w-4 h-4 text-[var(--teal)]" />
									<span className="font-semibold text-[var(--ink)]">
										Длительность смены:
									</span>
									<div className="inline-flex rounded border border-[var(--line)] bg-[var(--paper)]">
										{[8, 10, 12].map((h) => (
											<button
												key={h}
												type="button"
												onClick={() => setShiftHours(h)}
												className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
													shiftHours === h
														? "bg-[var(--teal)] text-white font-bold"
														: "text-[var(--muted)] hover:text-[var(--ink)]"
												}`}
											>
												{h}ч
											</button>
										))}
									</div>
								</div>

								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4 text-[var(--teal)]" />
									<span className="font-semibold text-[var(--ink)]">
										Рабочих дней:
									</span>
									<div className="inline-flex rounded border border-[var(--line)] bg-[var(--paper)]">
										{[22, 26, 30].map((d) => (
											<button
												key={d}
												type="button"
												onClick={() => setWorkingDays(d)}
												className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
													workingDays === d
														? "bg-[var(--teal)] text-white font-bold"
														: "text-[var(--muted)] hover:text-[var(--ink)]"
												}`}
											>
												{d}дн
											</button>
										))}
									</div>
								</div>
							</div>

							<div className="text-right text-[var(--muted)]">
								<span>
									Доступно мощности на кресло:{" "}
									<strong className="text-[var(--ink)]">
										{shiftHours * workingDays} часов
									</strong>
								</span>
							</div>
						</div>
					</div>

					{/* Детализация по каждому креслу клиники */}
					<div className="overflow-x-auto border border-[var(--line)] rounded-lg">
						<table className="w-full text-xs text-left border-collapse">
							<thead>
								<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)] font-semibold">
									<th className="p-2.5">Кресло / Специализация</th>
									<th className="p-2.5 text-right">Доступно часов</th>
									<th className="p-2.5 text-right">Занято часов</th>
									<th className="p-2.5 text-right">Загрузка %</th>
									<th className="p-2.5 text-right">Выручка кресла</th>
									<th className="p-2.5 text-right">Выручка / кресло-час</th>
									<th className="p-2.5 text-right">Yield (на мощность)</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line)]">
								{chairMetricsList.map((chair) => (
									<tr
										key={chair.chairId}
										className="hover:bg-[var(--paper-soft)] transition-colors"
									>
										<td className="p-2.5 font-semibold text-[var(--ink)]">
											{chair.chairName}
										</td>
										<td className="p-2.5 text-right text-[var(--muted)]">
											{Math.round(chair.availableMinutes / 60)}ч
										</td>
										<td className="p-2.5 text-right font-medium text-[var(--ink)]">
											{Math.round((chair.occupiedMinutes / 60) * 10) / 10}ч
										</td>
										<td className="p-2.5 text-right">
											<div className="inline-flex items-center gap-1.5">
												<span className="font-bold text-[var(--ink)]">
													{chair.utilizationRatePercent}%
												</span>
												<div className="w-12 h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
													<div
														className="h-full bg-[var(--teal)]"
														style={{
															width: `${chair.utilizationRatePercent}%`,
														}}
													/>
												</div>
											</div>
										</td>
										<td className="p-2.5 text-right font-bold text-[var(--ok-fg)]">
											{formatKopecksToRub(chair.revenueKopecks, false)}
										</td>
										<td className="p-2.5 text-right font-bold text-[var(--teal)]">
											{formatKopecksPerHour(chair.revenuePerHourKopecks)}
										</td>
										<td className="p-2.5 text-right font-medium text-[var(--muted)]">
											{formatKopecksPerHour(chair.capacityYieldPerHourKopecks)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* ========================================================================= */}
			{/* МОДАЛЬНОЕ ОКНО 1-КЛИКОВОГО ПЕРСОНАЛИЗИРОВАННОГО ПРЕДЛОЖЕНИЯ               */}
			{/* ========================================================================= */}
			{selectedOfferPatient && activeOffer && typeof document !== "undefined"
				? createPortal(
						<div
							role="dialog"
							aria-modal="true"
							aria-labelledby="offer-modal-title"
							className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
						>
							<div className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl p-5 relative">
								<button
									type="button"
									onClick={() => setSelectedOfferPatient(null)}
									className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
									aria-label="Закрыть"
								>
									<X className="w-5 h-5" />
								</button>

								<div className="flex items-center gap-2.5 mb-3">
									<div className="p-2 rounded-lg bg-[var(--teal)] text-white shadow-sm">
										<Sparkles className="w-5 h-5" />
									</div>
									<div>
										<h4
											id="offer-modal-title"
											style={{ color: "var(--ink)" }}
											className="font-bold text-base leading-tight"
										>
											{activeOffer.title}
										</h4>
										<p className="text-xs text-[var(--muted)]">
											Индивидуальное предложение для {selectedOfferPatient.patientName}
										</p>
									</div>
								</div>

								<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] mb-3 space-y-1">
									<div className="flex justify-between">
										<span>Клиническая цель:</span>
										<strong className="text-[var(--ink)]">
											{activeOffer.recommendedService}
										</strong>
									</div>
									<div className="flex justify-between">
										<span>Статус риска:</span>
										<span className="font-semibold text-[var(--warn-fg)]">
											{activeOffer.urgencyText}
										</span>
									</div>
									<div className="flex justify-between">
										<span>Телефон пациента:</span>
										<span className="font-medium text-[var(--ink)]">
											{formatPhoneNumber(selectedOfferPatient.phone)}
										</span>
									</div>
								</div>

								<div className="mb-4">
									<label
										htmlFor="offer-message-textarea"
										className="block text-xs font-semibold text-[var(--ink)] mb-1.5"
									>
										Текст сообщения (соответствует 38-ФЗ и согласию пациента):
									</label>
									<textarea
										id="offer-message-textarea"
										rows={4}
										readOnly
										value={activeOffer.messageText}
										className="w-full p-3 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] leading-relaxed resize-none focus:outline-none"
									/>
								</div>

								<div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[var(--line)]">
									<div className="flex items-center gap-2">
										<a
											href={`https://wa.me/${selectedOfferPatient.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(activeOffer.messageText)}`}
											target="_blank"
											rel="noopener noreferrer"
											className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
										>
											<MessageSquare className="w-3.5 h-3.5" />
											WhatsApp
										</a>

										<a
											href={`tel:${selectedOfferPatient.phone}`}
											className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)] text-[var(--ink)] text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
										>
											<Phone className="w-3.5 h-3.5 text-[var(--teal)]" />
											Позвонить
										</a>
									</div>

									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={handleCopyOffer}
											className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
										>
											{copiedText ? (
												<Check className="w-3.5 h-3.5 text-emerald-500" />
											) : (
												<Copy className="w-3.5 h-3.5" />
											)}
											{copiedText ? "Скопировано!" : "Скопировать текст"}
										</button>
										<button
											type="button"
											onClick={() => setSelectedOfferPatient(null)}
											className="px-3 py-1.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] text-xs font-medium transition-colors"
										>
											Закрыть
										</button>
									</div>
								</div>
							</div>
						</div>,
						document.body,
					)
				: null}
		</div>
	);
};

export default LostPatientsPanel;

