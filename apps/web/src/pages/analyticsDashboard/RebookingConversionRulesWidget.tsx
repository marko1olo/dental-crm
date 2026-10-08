import { Calendar, Printer, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { countLabel } from "../../AppHelpers";
import { EmptyState } from "../../components/EmptyState.js";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import type {
	RebookingConversionResponse,
	RebookingConversionRulesWidgetProps,
} from "./types";

export function RebookingConversionRulesWidget({ dateRange }: RebookingConversionRulesWidgetProps) {
	const appLogic = useAppLogicContext();
	const authContext = appLogic?.auth;
	const [data, setData] = useState<RebookingConversionResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const controller = new AbortController();

		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const headers = authContext
					? authContext.denteClinicalReadHeaders()
					: {};

				const res = await fetch(
					`/api/analytics/rebooking-conversion?range=${dateRange}`,
					{
						headers,
						signal: controller.signal,
					},
				);

				if (!res.ok) {
					if (mounted) {
						setError("Не удалось загрузить данные о повторной записи");
						setLoading(false);
					}
					return;
				}

				const body = (await res.json()) as {
					success: boolean;
					data?: RebookingConversionResponse;
					message?: string;
				};
				if (!mounted) return;

				if (body.success && body.data) {
					setData(body.data);
				} else {
					setError(body.message || "Данные не получены");
				}
			} catch {
				if (mounted && !controller.signal.aborted) {
					setError("Сетевая ошибка при загрузке аналитики повторной записи");
				}
			} finally {
				if (mounted) setLoading(false);
			}
		};

		void load();

		return () => {
			mounted = false;
			controller.abort();
		};
	}, [dateRange, authContext]);

	const summary = data?.summary;
	const isSolo = summary?.isSoloDoctor ?? false;
	const totalVisits = summary?.totalVisits ?? summary?.totalCompletedVisits ?? 0;
	const totalRebookings = summary?.totalRebookings ?? 0;
	const rebookingRate = summary?.rebookingRate ?? summary?.overallConversionRate ?? 0;
	const doctorRate = summary?.doctorConversionRate ?? 0;
	const adminRate = summary?.adminConversionRate ?? 0;
	const items = (data?.events?.length ?? 0) > 0 ? (data?.events ?? []) : (data?.records ?? []);
	const isEmpty = summary?.isEmpty || (totalVisits === 0 && items.length === 0);

	return (
		<article
			className="glass-widget mt-4"
			data-testid="rebooking-conversion-widget"
		>
			<div className="glass-widget-header">
				<h3 title="Если повторная запись создана у кресла (в течение 15 минут после визита), она засчитывается врачу. Позже — администратору. В соло-режиме 100% повторных записей засчитываются врачу.">
					<Scale className="w-4 h-4 text-[var(--teal)]" aria-hidden="true" />
					<span>Кому засчитана повторная запись</span>
				</h3>
				<div className="glass-widget-actions flex items-center gap-2">
					{isSolo ? (
						<span
							className="text-xs px-2 py-0.5 rounded border bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] border-[var(--teal)] font-medium"
							title="В соло-режиме (1 кабинет) у врача нет администратора на ресепшене — все записи атрибутируются врачу"
						>
							Соло-режим (100% врачу)
						</span>
					) : (
						<span
							className="text-xs px-2 py-0.5 rounded border bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] font-medium"
							title="Окно повторной записи у кресла — 15 минут"
						>
							Порог: 15 минут
						</span>
					)}
					<button
						type="button"
						className="glass-action-btn"
						onClick={() => window.print()}
						title="Распечатать отчёт по повторным записям"
					>
						<Printer size={13} aria-hidden="true" />
						<span>Печать</span>
					</button>
				</div>
			</div>

			{/* KPI pills row */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 border-b border-[var(--line)] bg-[var(--paper-soft)]/50">
				<div className="flex flex-col gap-0.5">
					<span className="text-xs text-[var(--muted)]">Общая конверсия повторной записи</span>
					<div className="flex items-baseline gap-2">
						<span className="text-lg font-bold text-[var(--ink)]">
							{rebookingRate}%
						</span>
						<span className="text-xs text-[var(--muted)]">
							({totalRebookings} из {totalVisits} визитов)
						</span>
					</div>
				</div>

				<div className="flex flex-col gap-0.5">
					<span className="text-xs text-[var(--muted)]">Врач у кресла (≤ 15 мин)</span>
					<div className="flex items-baseline gap-2">
						<span className="text-lg font-bold text-[var(--teal)]">
							{doctorRate}%
						</span>
						<span className="text-xs text-[var(--muted)]">
							({summary?.doctorRebookingsCount ?? 0} записей)
						</span>
					</div>
				</div>

				<div className="flex flex-col gap-0.5">
					<span className="text-xs text-[var(--muted)]">
						{isSolo ? "Администратор (соло: 0)" : "Администратор / Ресепшен (> 15 мин)"}
					</span>
					<div className="flex items-baseline gap-2">
						<span className="text-lg font-bold text-[var(--ink-2,var(--muted))]">
							{adminRate}%
						</span>
						<span className="text-xs text-[var(--muted)]">
							({summary?.adminRebookingsCount ?? 0} записей)
						</span>
					</div>
				</div>
			</div>

			{/* Main body: loading, error, empty, or table */}
			<div className="p-3">
				{loading && (
					<div className="text-xs text-[var(--muted)] py-6 text-center">
						Загрузка повторных записей...
					</div>
				)}

				{!loading && error && (
					<div role="status" className="text-xs text-amber-600 dark:text-amber-400 py-4 text-center">
						{error}
					</div>
				)}

				{!loading && !error && isEmpty && (
					<EmptyState
						glass={false}
						icon={<Calendar size={20} aria-hidden="true" />}
						title="Повторных записей за период нет"
						description="Показатели конверсии повторной записи рассчитываются автоматически при создании следующих визитов пациентов."
						className="py-6 text-xs"
					/>
				)}

				{!loading && !error && !isEmpty && (
					<div className="overflow-x-auto">
						<table className="analytics-table w-full text-xs">
							<thead>
								<tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
									<th className="py-2 px-2.5 font-medium">Пациент</th>
									<th className="py-2 px-2.5 font-medium">Дата визита</th>
									<th className="py-2 px-2.5 font-medium">Дельта создания</th>
									<th className="py-2 px-2.5 font-medium">Засчитано</th>
									<th className="py-2 px-2.5 font-medium">Сотрудник</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line)]">
								{items.slice(0, 10).map((item, idx) => {
									const delta = item.timeDeltaMinutes;
									const isDoctor = item.creditedRole === "doctor";
									return (
										<tr key={item.id || `rebooking-${idx}`} className="hover:bg-[var(--paper-soft)]/50 transition-colors">
											<td className="py-2 px-2.5 font-medium text-[var(--ink)]">
												{item.patientName}
											</td>
											<td className="py-2 px-2.5 text-[var(--muted)]">
												{item.appointmentDate}
											</td>
											<td className="py-2 px-2.5 text-[var(--ink)]">
												{delta === null || delta === undefined ? (
													<span className="text-[var(--muted)]">Не зафиксировано</span>
												) : delta <= 0 ? (
													<span className="text-emerald-600 dark:text-emerald-400 font-medium">
														У кресла (во время приёма)
													</span>
												) : (
													<span>
														Через <strong>{countLabel(Math.round(delta), "минуту", "минуты", "минут")}</strong>
													</span>
												)}
											</td>
											<td className="py-2 px-2.5">
												{isDoctor ? (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
														{isSolo ? "Врач (Соло)" : "Врач у кресла (≤ 15 мин)"}
													</span>
												) : (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
														Администратор (&gt; 15 мин)
													</span>
												)}
											</td>
											<td className="py-2 px-2.5 text-[var(--muted)]">
												{item.rebookedBy || item.doctorName || "Врач у кресла"}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
						{items.length > 10 && (
							<div className="p-2 text-center text-xs text-[var(--muted)] border-t border-[var(--line)]">
								Показано 10 из {items.length} повторных записей
							</div>
						)}
					</div>
				)}
			</div>
		</article>
	);
}
