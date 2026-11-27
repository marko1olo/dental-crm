/**
 * apps/web/src/components/analytics/RebookingConversionPanel.tsx
 *
 * ФИЧА 54: Клинический алгоритм разделения конверсии повторной записи
 * (15-минутный порог — Врач у кресла при \Delta t <= 15 мин vs Администратор при \Delta t > 15 мин).
 *
 * Инварианты DENTE CRM:
 * - 100% семантические дизайн-токены: var(--paper), var(--ink), var(--line), var(--primary)
 * - Норматив удержания клиники >= 70% (Мандаты 8e, 8n)
 * - Десктоп: элегантная таблица с процентными индикаторами
 * - Мобильные (<= 768px): нативные Apple HIG Grouped List Cards, тач >= 44px, 0px горизонтального скролла
 * - Кнопки никогда не disabled (Мандат 8e)
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Activity,
	AlertCircle,
	Calendar,
	CheckCircle2,
	Clock,
	Filter,
	HelpCircle,
	Printer,
	RefreshCw,
	Repeat,
	ShieldCheck,
	Sparkles,
	TrendingUp,
	UserCheck,
	Users,
} from "lucide-react";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export interface RebookingSummary {
	readonly totalCompletedVisits: number;
	readonly totalRebookings: number;
	readonly rebookingRate: number;
	readonly doctorRebookingsCount: number;
	readonly adminRebookingsCount: number;
	readonly chairsideRetentionRate: number;
}

export interface RebookingStaffStats {
	readonly staffId: string | null;
	readonly staffName: string;
	readonly role: "doctor" | "administrator";
	readonly completedVisitsCount: number;
	readonly rebookingsCount?: number | undefined;
	readonly rebookingCount?: number | undefined;
	readonly chairsideCount?: number | undefined;
	readonly doctorRebookingsCount?: number | undefined;
	readonly adminCount?: number | undefined;
	readonly adminRebookingsCount?: number | undefined;
	readonly conversionRate: number;
	readonly meetsTarget?: boolean | undefined;
	readonly retentionKpiStatus?: "target_met" | "needs_improvement" | undefined;
	readonly specialty?: string | undefined;
}

function normalizeStaffItem(raw: RebookingStaffStats, index: number): RebookingStaffStats & {
	readonly stableKey: string;
	readonly chairsideResolved: number;
	readonly adminResolved: number;
} {
	const chairsideResolved = Number(raw.chairsideCount ?? raw.doctorRebookingsCount ?? 0);
	const adminResolved = Number(raw.adminCount ?? raw.adminRebookingsCount ?? 0);
	return {
		...raw,
		stableKey: raw.staffId ?? `role-${raw.role}-${index}`,
		chairsideCount: chairsideResolved,
		adminCount: adminResolved,
		rebookingsCount: Number(raw.rebookingsCount ?? raw.rebookingCount ?? chairsideResolved + adminResolved),
		meetsTarget:
			typeof raw.meetsTarget === "boolean"
				? raw.meetsTarget
				: raw.retentionKpiStatus === "target_met" || raw.conversionRate >= CLINICAL_TARGET_PERCENT,
		chairsideResolved,
		adminResolved,
	};
}

export interface RebookingAuditEvent {
	readonly id: string;
	readonly visitId: string;
	readonly patientName: string;
	readonly rebookedBy: string;
	readonly timeDeltaMinutes: number | null;
	readonly creditedRole: "doctor" | "administrator";
	readonly appointmentDate: string;
	readonly attributionReason: string;
	readonly doctorName: string;
	readonly specialty?: string | undefined;
}

export interface RebookingConversionPanelProps {
	readonly period?: string;
	readonly onPeriodChange?: (period: string) => void;
	readonly onPrint?: () => void;
}

const PERIOD_OPTIONS = [
	{ id: "today", label: "Сегодня" },
	{ id: "week", label: "Неделя" },
	{ id: "month", label: "Месяц" },
	{ id: "quarter", label: "Квартал" },
	{ id: "year", label: "Год" },
];

const CLINICAL_TARGET_PERCENT = 70;

export const RebookingConversionPanel: React.FC<RebookingConversionPanelProps> = ({
	period = "month",
	onPeriodChange,
	onPrint,
}) => {
	const [activePeriod, setActivePeriod] = useState<string>(period);
	const [isSoloDoctor, setIsSoloDoctor] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [summary, setSummary] = useState<RebookingSummary | null>(null);
	const [staffList, setStaffList] = useState<RebookingStaffStats[]>([]);
	const [recentEvents, setRecentEvents] = useState<RebookingAuditEvent[]>([]);
	const [selectedRoleFilter, setSelectedRoleFilter] = useState<"all" | "doctor" | "administrator">("all");

	const handlePeriodSelect = useCallback(
		(p: string) => {
			setActivePeriod(p);
			if (onPeriodChange) onPeriodChange(p);
		},
		[onPeriodChange],
	);

	const fetchConversionData = useCallback(async () => {
		setLoading(true);
		try {
			const queryParams = new URLSearchParams({
				range: activePeriod,
				...(isSoloDoctor ? { isSoloDoctor: "true" } : {}),
			});

			const res = await fetch(`/api/analytics/rebooking-conversion?${queryParams.toString()}`, {
				headers: denteClinicalReadHeaders(),
			});

			if (res.ok) {
				const json = await res.json();
				const payload = json?.data ?? json;

				if (payload?.summary) {
					setSummary(payload.summary);
				}
				if (Array.isArray(payload?.byStaff)) {
					setStaffList(
						(payload.byStaff as RebookingStaffStats[]).map((item, idx) =>
							normalizeStaffItem(item, idx),
						),
					);
				}
				if (Array.isArray(payload?.events)) {
					setRecentEvents(payload.events);
				}
			} else {
				// В случае ошибки или первого старта — безопасный клинический стейт
				if (isDemoShowcaseMode()) {
					applyFallbackData();
				} else {
					setSummary(null);
					setStaffList([]);
					setRecentEvents([]);
				}
			}
		} catch (_err) {
			if (isDemoShowcaseMode()) {
				applyFallbackData();
			} else {
				setSummary(null);
				setStaffList([]);
				setRecentEvents([]);
			}
		} finally {
			setLoading(false);
		}
	}, [activePeriod, isSoloDoctor]);

	const applyFallbackData = useCallback(() => {
		// Честный клинический образец для отображения при пустом периоде
		setSummary({
			totalCompletedVisits: 148,
			totalRebookings: 112,
			rebookingRate: 75.7,
			doctorRebookingsCount: 88,
			adminRebookingsCount: 24,
			chairsideRetentionRate: 78.6,
		});

		setStaffList([
			{
				staffId: "doc-1",
				staffName: "Д-р Смирнова Елена Павловна",
				role: "doctor",
				specialty: "Стоматолог-терапевт",
				completedVisitsCount: 64,
				rebookingsCount: 52,
				chairsideCount: 46,
				adminCount: 6,
				conversionRate: 81.3,
				meetsTarget: true,
			},
			{
				staffId: "doc-2",
				staffName: "Д-р Ковалев Игорь Васильевич",
				role: "doctor",
				specialty: "Стоматолог-ортопед",
				completedVisitsCount: 52,
				rebookingsCount: 41,
				chairsideCount: 33,
				adminCount: 8,
				conversionRate: 78.8,
				meetsTarget: true,
			},
			{
				staffId: "doc-3",
				staffName: "Д-р Белова Анна Сергеевна",
				role: "doctor",
				specialty: "Стоматолог-хирург",
				completedVisitsCount: 32,
				rebookingsCount: 19,
				chairsideCount: 9,
				adminCount: 10,
				conversionRate: 59.4,
				meetsTarget: false,
			},
		]);

		setRecentEvents([
			{
				id: "ev-1",
				visitId: "v-101",
				patientName: "Алексеев М. В.",
				rebookedBy: "Д-р Смирнова Е. П.",
				timeDeltaMinutes: 4,
				creditedRole: "doctor",
				appointmentDate: "2026-11-28",
				attributionReason: "chairside_rebooking_under_15m",
				doctorName: "Д-р Смирнова Елена Павловна",
				specialty: "Терапия",
			},
			{
				id: "ev-2",
				visitId: "v-102",
				patientName: "Воронова К. С.",
				rebookedBy: "Администратор (Ресепшен)",
				timeDeltaMinutes: 28,
				creditedRole: "administrator",
				appointmentDate: "2026-11-25",
				attributionReason: "frontdesk_rebooking_over_15m",
				doctorName: "Д-р Ковалев Игорь Васильевич",
				specialty: "Ортопедия",
			},
			{
				id: "ev-3",
				visitId: "v-103",
				patientName: "Кузнецов Д. А.",
				rebookedBy: "Д-р Ковалев И. В.",
				timeDeltaMinutes: 0,
				creditedRole: "doctor",
				appointmentDate: "2026-12-02",
				attributionReason: "chairside_rebooking_under_15m",
				doctorName: "Д-р Ковалев Игорь Васильевич",
				specialty: "Ортопедия",
			},
		]);
	}, []);

	useEffect(() => {
		fetchConversionData();
	}, [fetchConversionData]);

	const filteredStaff = useMemo(() => {
		if (selectedRoleFilter === "all") return staffList;
		return staffList.filter((s) => s.role === selectedRoleFilter);
	}, [staffList, selectedRoleFilter]);

	const meetsClinicTarget = (summary?.chairsideRetentionRate ?? 0) >= CLINICAL_TARGET_PERCENT;

	return (
		<div
			className="rebooking-conversion-panel space-y-4 max-w-full overflow-x-clip pb-20"
			data-testid="rebooking-conversion-panel"
		>
			{/* Верхняя строка управления: Сегментный селектор периода + Соло-режим + Кнопки */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				{/* Apple Segmented Control для периодов */}
				<div
					className="p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] grid grid-cols-5 sm:flex sm:flex-nowrap gap-1 w-full sm:w-auto"
					role="tablist"
					aria-label="Период конверсии"
				>
					{PERIOD_OPTIONS.map((opt) => (
						<button
							key={opt.id}
							type="button"
							role="tab"
							aria-selected={activePeriod === opt.id}
							onClick={() => handlePeriodSelect(opt.id)}
							className={`h-8 px-1 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1 ${
								activePeriod === opt.id
									? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
									: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
							data-testid={`period-tab-${opt.id}`}
						>
							{opt.label}
						</button>
					))}
				</div>

				{/* Правый блок: Переключатель режима клиники и действия */}
				<div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
					<label
						className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] cursor-pointer select-none"
						title="Мандат 8n: В соло-режиме (1–2 кресла) 100% повторных записей атрибутируются врачу"
					>
						<input
							type="checkbox"
							checked={isSoloDoctor}
							onChange={(e) => setIsSoloDoctor(e.target.checked)}
							className="rounded border-[var(--line)] text-[var(--primary)] focus:ring-0 cursor-pointer"
						/>
						<span className="font-medium">Соло-практика</span>
					</label>

					<button
						type="button"
						onClick={fetchConversionData}
						disabled={loading}
						className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
						title="Обновить данные"
						aria-label="Обновить аналитику повторной записи"
					>
						<RefreshCw size={13} className={loading ? "animate-spin" : ""} />
						<span className="hidden sm:inline">Обновить</span>
					</button>

					{onPrint && (
						<button
							type="button"
							onClick={onPrint}
							className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-medium hover:border-[var(--primary)] transition-colors cursor-pointer inline-flex items-center gap-1"
							title="Печать аналитики"
						>
							<Printer size={13} />
							<span className="hidden sm:inline">Печать</span>
						</button>
					)}
				</div>
			</div>

			{/* Поясняющая плашка клинического алгоритма 15 минут */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink-muted)] flex items-start gap-2.5">
				<ShieldCheck size={16} className="text-[var(--primary)] shrink-0 mt-0.5" />
				<div className="space-y-0.5">
					<div className="font-semibold text-[var(--ink)]">
						Справедливое разделение конверсии повторной записи (15-минутный порог)
					</div>
					<div>
						Запись у кресла (во время приёма или в течение 15 минут после завершения) атрибутируется{" "}
						<strong className="text-[var(--ink)]">врачу</strong>. Запись позже 15 минут или
						выполненная ресепшеном — <strong className="text-[var(--ink)]">администратору</strong>.
						Норматив удержания клиники: <strong className="text-[var(--primary)]">≥ 70%</strong>.
					</div>
				</div>
			</div>

			{/* KPI-карточки первого экрана */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				{/* 1. Общая конверсия повторной записи */}
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
						<span>Общая конверсия</span>
						<Repeat size={14} className="text-[var(--primary)]" />
					</div>
					<div className="mt-2 flex items-baseline justify-between">
						<span className="text-2xl font-bold font-mono tracking-tight text-[var(--ink)]">
							{summary?.rebookingRate.toFixed(1) ?? "0.0"}%
						</span>
						<span className="text-xs text-[var(--ink-muted)] font-mono">
							{summary?.totalRebookings ?? 0} из {summary?.totalCompletedVisits ?? 0}
						</span>
					</div>
					<div className="mt-2 text-[11px] text-[var(--ink-muted)]">
						Доля пациентов, записавшихся на следующий визит
					</div>
				</div>

				{/* 2. Удержание у кресла врачом (<= 15 мин) */}
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
						<span>Удержание у кресла (≤15 мин)</span>
						<UserCheck size={14} className="text-[var(--success,#10b981)]" />
					</div>
					<div className="mt-2 flex items-baseline justify-between">
						<span className="text-2xl font-bold font-mono tracking-tight text-[var(--success,#10b981)]">
							{summary?.chairsideRetentionRate.toFixed(1) ?? "0.0"}%
						</span>
						<span className="text-xs text-[var(--ink-muted)] font-mono">
							{summary?.doctorRebookingsCount ?? 0} записей
						</span>
					</div>
					<div className="mt-2 flex items-center gap-1.5">
						<span
							className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
								meetsClinicTarget
									? "bg-[var(--success-soft,rgba(16,185,129,0.1))] text-[var(--success,#10b981)]"
									: "bg-[var(--warning-soft,rgba(245,158,11,0.1))] text-[var(--warning,#f59e0b)]"
							}`}
						>
							{meetsClinicTarget ? (
								<>
									<CheckCircle2 size={11} /> Норматив ≥70% соблюдён
								</>
							) : (
								<>
									<AlertCircle size={11} /> Ниже норматива (70%)
								</>
							)}
						</span>
					</div>
				</div>

				{/* 3. Запись через администратора (> 15 мин) */}
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
						<span>Ресепшен / Администратор</span>
						<Clock size={14} className="text-[var(--primary)]" />
					</div>
					<div className="mt-2 flex items-baseline justify-between">
						<span className="text-2xl font-bold font-mono tracking-tight text-[var(--ink)]">
							{summary?.adminRebookingsCount ?? 0}
						</span>
						<span className="text-xs text-[var(--ink-muted)] font-mono">
							{summary?.totalRebookings
								? (
										((summary.adminRebookingsCount ?? 0) / summary.totalRebookings) *
										100
									).toFixed(1)
								: "0.0"}
							%
						</span>
					</div>
					<div className="mt-2 text-[11px] text-[var(--ink-muted)]">
						Записи, оформленные после ухода из кресла (&gt;15 мин)
					</div>
				</div>

				{/* 4. Завершённые визиты за период */}
				<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
						<span>Завершено визитов</span>
						<Calendar size={14} className="text-[var(--ink-muted)]" />
					</div>
					<div className="mt-2 flex items-baseline justify-between">
						<span className="text-2xl font-bold font-mono tracking-tight text-[var(--ink)]">
							{summary?.totalCompletedVisits ?? 0}
						</span>
						<span className="text-xs text-[var(--success,#10b981)] font-medium">
							100% базы
						</span>
					</div>
					<div className="mt-2 text-[11px] text-[var(--ink-muted)]">
						База завершённых медицинских приёмов
					</div>
				</div>
			</div>

			{/* Таблица врачей (Десктоп) и Grouped List Cards (Мобильные <=768px, Apple HIG) */}
			<div className="rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs overflow-hidden">
				<div className="p-4 border-b border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
					<div>
						<h3 className="text-sm font-semibold text-[var(--ink)]">
							Конверсия удержания по врачам клиники
						</h3>
						<p className="text-xs text-[var(--ink-muted)]">
							Сравнение индивидуальной результативности с целевым стандартом (≥ 70%)
						</p>
					</div>
					<div className="flex items-center gap-1.5 text-xs">
						<span className="text-[var(--ink-muted)]">Фильтр:</span>
						<div className="inline-flex rounded-lg bg-[var(--paper-soft)] p-0.5 border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setSelectedRoleFilter("all")}
								className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
									selectedRoleFilter === "all"
										? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
										: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
								}`}
							>
								Все
							</button>
							<button
								type="button"
								onClick={() => setSelectedRoleFilter("doctor")}
								className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
									selectedRoleFilter === "doctor"
										? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
										: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
								}`}
							>
								Врачи
							</button>
						</div>
					</div>
				</div>

				{/* 1. Десктопное табличное представление (hidden on <=768px) */}
				<div className="hidden md:block overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink-muted)] font-medium">
								<th className="py-2.5 px-4">Специалист</th>
								<th className="py-2.5 px-3 text-right">Завершено приёмов</th>
								<th className="py-2.5 px-3 text-right">У кресла (≤15 мин)</th>
								<th className="py-2.5 px-3 text-right">Ресепшен (&gt;15 мин)</th>
								<th className="py-2.5 px-3 text-right">Конверсия врача</th>
								<th className="py-2.5 px-4 text-center">Статус норматива</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]">
							{filteredStaff.slice(0, 35).map((rawStaff, idx) => {
								const staff = normalizeStaffItem(rawStaff, idx);
								const isTargetMet = staff.conversionRate >= CLINICAL_TARGET_PERCENT;
								return (
									<tr
										key={staff.stableKey}
										className="hover:bg-[var(--paper-soft)]/50 transition-colors"
										data-testid={`staff-row-${staff.stableKey}`}
									>
										<td className="py-3 px-4">
											<div className="font-medium text-[var(--ink)]">{staff.staffName}</div>
											{staff.specialty && (
												<div className="text-[11px] text-[var(--ink-muted)]">
													{staff.specialty}
												</div>
											)}
										</td>
										<td className="py-3 px-3 text-right font-mono text-[var(--ink)]">
											{staff.completedVisitsCount}
										</td>
										<td className="py-3 px-3 text-right font-mono text-[var(--success,#10b981)] font-semibold">
											{staff.chairsideResolved}
										</td>
										<td className="py-3 px-3 text-right font-mono text-[var(--ink-muted)]">
											{staff.adminResolved}
										</td>
										<td className="py-3 px-3 text-right">
											<span
												className={`font-mono font-bold text-sm ${
													isTargetMet
														? "text-[var(--success,#10b981)]"
														: "text-[var(--warning,#f59e0b)]"
												}`}
											>
												{staff.conversionRate.toFixed(1)}%
											</span>
										</td>
										<td className="py-3 px-4 text-center">
											<span
												className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
													isTargetMet
														? "bg-[var(--success-soft,rgba(16,185,129,0.1))] text-[var(--success,#10b981)]"
														: "bg-[var(--warning-soft,rgba(245,158,11,0.1))] text-[var(--warning,#f59e0b)]"
												}`}
											>
												{isTargetMet ? (
													<>
														<CheckCircle2 size={11} /> Норма ≥70%
													</>
												) : (
													<>
														<AlertCircle size={11} /> Недобор
													</>
												)}
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* 2. Мобильное представление: Apple HIG Grouped List Cards (<= 768px, тач >= 44px) */}
				<div className="md:hidden p-3 space-y-2.5">
					{filteredStaff.slice(0, 35).map((rawStaff, idx) => {
						const staff = normalizeStaffItem(rawStaff, idx);
						const isTargetMet = staff.conversionRate >= CLINICAL_TARGET_PERCENT;
						return (
							<div
								key={staff.stableKey}
								className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5 shadow-xs"
								data-testid={`mobile-staff-card-${staff.stableKey}`}
							>
								<div className="flex items-start justify-between gap-2">
									<div>
										<div className="font-semibold text-sm text-[var(--ink)]">
											{staff.staffName}
										</div>
										{staff.specialty && (
											<div className="text-xs text-[var(--ink-muted)]">
												{staff.specialty}
											</div>
										)}
									</div>
									<span
										className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
											isTargetMet
												? "bg-[var(--success-soft,rgba(16,185,129,0.1))] text-[var(--success,#10b981)]"
												: "bg-[var(--warning-soft,rgba(245,158,11,0.1))] text-[var(--warning,#f59e0b)]"
										}`}
									>
										{isTargetMet ? "Норма ≥70%" : "Недобор"}
									</span>
								</div>

								<div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--line)] text-center">
									<div>
										<div className="text-[10px] text-[var(--ink-muted)]">Приёмов</div>
										<div className="font-mono font-semibold text-xs text-[var(--ink)]">
											{staff.completedVisitsCount}
										</div>
									</div>
									<div>
										<div className="text-[10px] text-[var(--ink-muted)]">У кресла</div>
										<div className="font-mono font-bold text-xs text-[var(--success,#10b981)]">
											{staff.chairsideResolved}
										</div>
									</div>
									<div>
										<div className="text-[10px] text-[var(--ink-muted)]">Конверсия</div>
										<div
											className={`font-mono font-bold text-xs ${
												isTargetMet
													? "text-[var(--success,#10b981)]"
													: "text-[var(--warning,#f59e0b)]"
											}`}
										>
											{staff.conversionRate.toFixed(1)}%
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Аудиторский журнал последних повторных записей */}
			<div className="rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs overflow-hidden">
				<div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
					<div>
						<h3 className="text-sm font-semibold text-[var(--ink)]">
							Аудиторский журнал повторных записей
						</h3>
						<p className="text-xs text-[var(--ink-muted)]">
							Автоматическое обоснование атрибуции с точностью до минуты (Δt)
						</p>
					</div>
					<span className="text-xs font-mono text-[var(--ink-muted)]">
						{recentEvents.length} событий
					</span>
				</div>

				<div className="divide-y divide-[var(--line)] max-h-80 overflow-y-auto">
					{recentEvents.length === 0 ? (
						<div className="p-6 text-center text-xs text-[var(--ink-muted)]">
							Нет зафиксированных повторных записей за выбранный период
						</div>
					) : (
						recentEvents.slice(0, 35).map((ev) => (
							<div
								key={ev.id}
								className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--paper-soft)]/40 transition-colors text-xs"
								data-testid={`event-row-${ev.id}`}
							>
								<div className="space-y-0.5">
									<div className="flex items-center gap-2">
										<span className="font-semibold text-[var(--ink)]">{ev.patientName}</span>
										<span className="text-[var(--ink-muted)]">•</span>
										<span className="text-[var(--ink-muted)]">{ev.doctorName}</span>
									</div>
									<div className="text-[11px] text-[var(--ink-muted)] flex items-center gap-2">
										<span>Запись на: <strong className="text-[var(--ink)] font-mono">{ev.appointmentDate}</strong></span>
										<span>•</span>
										<span>Оформлена: <strong className="text-[var(--ink)]">{ev.rebookedBy}</strong></span>
									</div>
								</div>

								<div className="flex items-center gap-2 shrink-0">
									<span
										className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
											ev.creditedRole === "doctor"
												? "bg-[var(--success-soft,rgba(16,185,129,0.1))] text-[var(--success,#10b981)]"
												: "bg-[var(--primary-soft,rgba(14,165,233,0.1))] text-[var(--primary)]"
										}`}
									>
										{ev.creditedRole === "doctor" ? "У кресла" : "Ресепшен"}
										{ev.timeDeltaMinutes !== null && (
											<span className="font-mono text-[10px]">
												(Δt = {ev.timeDeltaMinutes} мин)
											</span>
										)}
									</span>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
};
