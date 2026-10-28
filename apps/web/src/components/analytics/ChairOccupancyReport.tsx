/**
 * apps/web/src/components/analytics/ChairOccupancyReport.tsx
 *
 * Отчёт загрузки кресел клиники (SSOT).
 *
 * ЧЕСТНЫЙ РАСЧЁТ ЗАНЯТОСТИ КРЕСЕЛ:
 * - Кресло 1, Кресло 2 ...
 * - Часов в плане (базовый фонд смены: рабочие дни * часы смены)
 * - Отработано часов (суммарная длительность завершённых и активных приёмов)
 * - Коэффициент загрузки (%)
 * - Свободные окна / часы для дозаписи пациентов
 * - 100% дизайн-токены var(--paper), var(--ink), var(--line), var(--teal)
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	Armchair,
	Clock,
	DoorOpen,
	Percent,
	Printer,
	RefreshCw,
} from "lucide-react";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export interface ChairLoadItem {
	readonly chairId: string | null;
	readonly chairName: string;
	readonly appointments: number;
	readonly bookedMinutes: number;
	readonly utilization: number | null;
	readonly plannedHours: number;
	readonly workedHours: number;
	readonly freeHours: number;
	readonly utilizationPercent: number;
}

export interface ChairLoadBasis {
	readonly workingDays: number;
	readonly minutesPerDay: number;
	readonly totalMinutesPerChair: number;
	readonly note: string;
}

export interface ChairOccupancyReportProps {
	readonly period?: string;
	readonly onPeriodChange?: (period: string) => void;
	readonly onPrint?: () => void;
}

const PERIOD_LABELS: Record<string, string> = {
	day: "Сегодня",
	week: "Неделя",
	month: "Месяц",
	quarter: "Квартал",
	year: "Год",
};

export const ChairOccupancyReport: React.FC<ChairOccupancyReportProps> = ({
	period = "month",
	onPeriodChange,
	onPrint,
}) => {
	const [activePeriod, setActivePeriod] = useState<string>(period);
	const [loading, setLoading] = useState<boolean>(true);
	const [chairs, setChairs] = useState<ChairLoadItem[]>([]);
	const [basis, setBasis] = useState<ChairLoadBasis | null>(null);

	const handlePeriodSelect = useCallback(
		(p: string) => {
			setActivePeriod(p);
			if (onPeriodChange) onPeriodChange(p);
		},
		[onPeriodChange],
	);

	const fetchChairs = useCallback(async (p: string) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/reports/chairs?period=${p}`);
			if (res.ok) {
				const json = await res.json();
				const b: ChairLoadBasis = json.basis || {
					workingDays: 24,
					minutesPerDay: 720,
					totalMinutesPerChair: 17280,
					note: "",
				};
				const plannedH = Math.round(b.totalMinutesPerChair / 60);

				const mappedRows: ChairLoadItem[] = (json.rows || []).map((r: any) => {
					const workedH = Math.round(((r.bookedMinutes || 0) / 60) * 10) / 10;
					const uPercent = r.utilization !== null ? Math.round(r.utilization * 100) : 0;
					const freeH = Math.max(0, Math.round((plannedH - workedH) * 10) / 10);
					return {
						chairId: r.chairId,
						chairName: r.chairName || "Стоматологическое кресло",
						appointments: Number(r.appointments || 0),
						bookedMinutes: Number(r.bookedMinutes || 0),
						utilization: r.utilization,
						plannedHours: plannedH,
						workedHours: workedH,
						freeHours: freeH,
						utilizationPercent: uPercent,
					};
				});

				setChairs(mappedRows);
				setBasis(b);
				setLoading(false);
				return;
			}
		} catch {
			// fallback
		}

		if (isDemoShowcaseMode()) {
			const demoRows: ChairLoadItem[] = [
				{
					chairId: "chair-1",
					chairName: "Кресло 1 (Терапия и эндодонтия)",
					appointments: 54,
					bookedMinutes: 8100,
					utilization: 0.78,
					plannedHours: 173,
					workedHours: 135,
					freeHours: 38,
					utilizationPercent: 78,
				},
				{
					chairId: "chair-2",
					chairName: "Кресло 2 (Ортопедия и хирургия)",
					appointments: 42,
					bookedMinutes: 6720,
					utilization: 0.65,
					plannedHours: 173,
					workedHours: 112,
					freeHours: 61,
					utilizationPercent: 65,
				},
				{
					chairId: "chair-3",
					chairName: "Кресло 3 (Гигиена и профилактика)",
					appointments: 36,
					bookedMinutes: 4680,
					utilization: 0.45,
					plannedHours: 173,
					workedHours: 78,
					freeHours: 95,
					utilizationPercent: 45,
				},
			];
			setChairs(demoRows);
			setBasis({
				workingDays: 24,
				minutesPerDay: 720,
				totalMinutesPerChair: 10380,
				note: "Знаменатель: 24 рабочих дн. × 12 ч. Отменённые приёмы в занятые часы не входят.",
			});
		} else {
			setChairs([]);
			setBasis(null);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		fetchChairs(activePeriod);
	}, [activePeriod, fetchChairs]);

	// Суммарные расчеты по клинике
	const totalPlanned = chairs.reduce((sum, c) => sum + c.plannedHours, 0);
	const totalWorked = chairs.reduce((sum, c) => sum + c.workedHours, 0);
	const totalFree = Math.max(0, Math.round((totalPlanned - totalWorked) * 10) / 10);
	const clinicAvgUtilization =
		totalPlanned > 0 ? Math.round((totalWorked / totalPlanned) * 100) : 0;

	return (
		<div className="space-y-6" data-testid="chair-occupancy-report">
			{/* Компактный тулбар в 1 строку (32-36px) */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar flex-nowrap">
					{(["day", "week", "month", "quarter", "year"] as const).map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => handlePeriodSelect(p)}
							className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
								activePeriod === p
									? "bg-[var(--teal)] text-white font-semibold shadow-sm"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]"
							}`}
						>
							{PERIOD_LABELS[p]}
						</button>
					))}
				</div>

				<div className="flex items-center justify-end gap-2 shrink-0">
					<button
						type="button"
						onClick={() => fetchChairs(activePeriod)}
						disabled={loading}
						className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)] transition-colors cursor-pointer"
						title="Обновить загрузку"
					>
						<RefreshCw size={14} className={loading ? "animate-spin" : ""} />
					</button>

					<button
						type="button"
						onClick={onPrint || (() => window.print())}
						className="secondary-button h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--teal)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
					>
						<Printer size={14} aria-hidden="true" />
						<span>Печать отчёта</span>
					</button>
				</div>
			</div>

			{/* Сводные показатели загрузки кресел */}
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
					<div className="text-xs text-[var(--muted)] mb-1">Средняя загрузка клиники</div>
					<div className="text-xl font-bold text-[var(--teal)]">
						{loading ? "..." : `${clinicAvgUtilization}%`}
					</div>
					<div className="text-[11px] text-[var(--muted)] mt-0.5">
						Кресел в работе: {chairs.length}
					</div>
				</div>

				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
					<div className="text-xs text-[var(--muted)] mb-1">Часов в плане (база)</div>
					<div className="text-xl font-bold text-[var(--ink)]">
						{loading ? "..." : `${totalPlanned} ч.`}
					</div>
					<div className="text-[11px] text-[var(--muted)] mt-0.5">
						{basis?.workingDays || 0} смен по {Math.round((basis?.minutesPerDay || 720) / 60)} ч.
					</div>
				</div>

				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
					<div className="text-xs text-[var(--muted)] mb-1">Отработано часов</div>
					<div className="text-xl font-bold text-[var(--ink)]">
						{loading ? "..." : `${totalWorked} ч.`}
					</div>
					<div className="text-[11px] text-[var(--muted)] mt-0.5">
						Фактическое время приёмов
					</div>
				</div>

				<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
					<div className="text-xs text-[var(--muted)] mb-1">Свободные окна (часы)</div>
					<div className="text-xl font-bold text-[var(--warn-fg,#d97706)]">
						{loading ? "..." : `${totalFree} ч.`}
					</div>
					<div className="text-[11px] text-[var(--muted)] mt-0.5">
						Резерв для дозаписи пациентов
					</div>
				</div>
			</div>

			{/* Таблица загрузки кресел для десктопа */}
			<div className="hidden sm:block rounded-xl bg-[var(--paper)] border border-[var(--line)] overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] font-medium">
								<th className="py-2.5 px-3">Кресло клиники</th>
								<th className="py-2.5 px-3 text-right">Часов в плане</th>
								<th className="py-2.5 px-3 text-right">Отработано часов</th>
								<th className="py-2.5 px-3 text-right">Свободные окна (ч.)</th>
								<th className="py-2.5 px-3 text-right">Коэффициент загрузки</th>
								<th className="py-2.5 px-3 w-40">Шкала загрузки</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line-subtle)] text-[var(--ink)]">
							{chairs.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-8 text-center text-[var(--muted)]">
										{loading ? "Загрузка данных о креслах..." : "Нет данных о загрузке за выбранный период"}
									</td>
								</tr>
							) : (
								chairs.map((chair, idx) => (
									<tr key={chair.chairId || `chair-${idx}`} className="hover:bg-[var(--paper-soft)] transition-colors">
										<td className="py-2.5 px-3 font-semibold flex items-center gap-2">
											<Armchair size={15} className="text-[var(--teal)] shrink-0" />
											<span>{chair.chairName}</span>
										</td>
										<td className="py-2.5 px-3 text-right tabular-nums text-[var(--muted)]">
											{chair.plannedHours} ч.
										</td>
										<td className="py-2.5 px-3 text-right tabular-nums font-medium">
											{chair.workedHours} ч.
										</td>
										<td className="py-2.5 px-3 text-right tabular-nums text-[var(--warn-fg,#d97706)]">
											{chair.freeHours} ч.
										</td>
										<td className="py-2.5 px-3 text-right tabular-nums font-bold text-[var(--teal)]">
											{chair.utilizationPercent}%
										</td>
										<td className="py-2.5 px-3">
											<div className="w-full bg-[var(--line)] h-2 rounded-full overflow-hidden">
												<div
													className="bg-[var(--teal)] h-full transition-all duration-300"
													style={{ width: `${Math.min(100, chair.utilizationPercent)}%` }}
												/>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Мобильные Grouped Cards для 390px */}
			<div className="sm:hidden space-y-3">
				{chairs.length === 0 ? (
					<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper)] rounded-xl border border-[var(--line)]">
						{loading ? "Загрузка..." : "Нет данных за период"}
					</div>
				) : (
					chairs.map((chair, idx) => (
						<div
							key={chair.chairId || `chair-mob-${idx}`}
							className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm space-y-2.5"
						>
							<div className="flex items-center justify-between">
								<div className="font-bold text-xs text-[var(--ink)] flex items-center gap-1.5">
									<Armchair size={14} className="text-[var(--teal)]" />
									<span>{chair.chairName}</span>
								</div>
								<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] font-bold text-[var(--teal)]">
									{chair.utilizationPercent}%
								</span>
							</div>

							<div className="w-full bg-[var(--line)] h-2 rounded-full overflow-hidden">
								<div
									className="bg-[var(--teal)] h-full transition-all duration-300"
									style={{ width: `${Math.min(100, chair.utilizationPercent)}%` }}
								/>
							</div>

							<div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
								<div className="p-1.5 rounded-lg bg-[var(--paper-soft)]">
									<div className="text-[10px] text-[var(--muted)]">План</div>
									<div className="font-semibold text-[var(--ink)]">{chair.plannedHours} ч.</div>
								</div>
								<div className="p-1.5 rounded-lg bg-[var(--paper-soft)]">
									<div className="text-[10px] text-[var(--muted)]">Факт</div>
									<div className="font-semibold text-[var(--ink)]">{chair.workedHours} ч.</div>
								</div>
								<div className="p-1.5 rounded-lg bg-[var(--paper-soft)]">
									<div className="text-[10px] text-[var(--muted)]">Окна</div>
									<div className="font-semibold text-[var(--warn-fg,#d97706)]">{chair.freeHours} ч.</div>
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};
