import { Users } from "lucide-react";
import type React from "react";
import { money } from "../../../AppHelpers";
import type { ReportsSummary } from "../ManagerReportsTypes";
import { formatPercent } from "../managerReportsHelpers";

export interface ReportsDashboardDoctorsTableProps {
	readonly summary: ReportsSummary | null;
}

export const ReportsDashboardDoctorsTable: React.FC<
	ReportsDashboardDoctorsTableProps
> = ({ summary }) => {
	const rows = summary?.doctors?.rows ?? [];

	return (
		<div className="p-4 sm:p-5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs">
			<h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2 mb-3">
				<Users className="w-4 h-4 text-teal-600" />
				Показатели врачей: выручка, средний чек и доходимость
			</h3>

			{/* Мобильный вид: Apple Grouped List Cards без горизонтального скролла */}
			<div className="sm:hidden space-y-2.5">
				{rows.length === 0 ? (
					<div className="py-4 text-center text-xs text-[var(--muted)]">
						Нет данных по врачам за выбранный период.
					</div>
				) : (
					rows.map((doc, idx) => {
						const avgTicket =
							doc.averageTicketRub !== null && doc.averageTicketRub !== undefined
								? doc.averageTicketRub
								: (doc.appointmentsCompleted ?? 0) > 0 && doc.revenueRub
									? Math.round(doc.revenueRub / doc.appointmentsCompleted)
									: 0;

						return (
							<div
								key={doc.doctorUserId ?? `doc-card-${idx}`}
								className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-semibold text-xs text-[var(--ink)] leading-tight">
										{doc.doctorName}
									</span>
									<span className="font-bold text-xs text-[var(--ink)] whitespace-nowrap">
										{money(doc.revenueRub ?? 0)}
									</span>
								</div>
								<div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[var(--line-subtle,var(--line))] text-[var(--muted)]">
									<div>
										<span>Приёмов: </span>
										<strong className="text-[var(--ink)]">
											{doc.appointmentsCompleted ?? 0}
										</strong>
										<span className="text-[10px]"> / {doc.appointmentsTotal ?? 0}</span>
									</div>
									<div className="text-right">
										<span>Ср. чек: </span>
										<strong className="text-teal-600 dark:text-teal-400">
											{money(avgTicket)}
										</strong>
									</div>
									<div>
										<span>Доходимость: </span>
										<strong className="text-[var(--ink)]">
											{formatPercent(doc.completionRate)}
										</strong>
									</div>
									<div className="text-right">
										<span>Неявки: </span>
										<strong className="text-[var(--ink)]">
											{formatPercent(doc.noShowRate)}
										</strong>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Десктопный вид: плотная аккуратная таблица */}
			<div className="hidden sm:block overflow-x-auto">
				<table className="w-full text-xs text-left border-collapse">
					<thead>
						<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)]">
							<th className="py-2.5 px-3 font-semibold">Врач</th>
							<th className="py-2.5 px-3 font-semibold text-right">Выручка</th>
							<th className="py-2.5 px-3 font-semibold text-center">Приёмов</th>
							<th className="py-2.5 px-3 font-semibold text-right">
								Средний чек
							</th>
							<th className="py-2.5 px-3 font-semibold text-center">
								Доходимость
							</th>
							<th className="py-2.5 px-3 font-semibold text-center">Неявки</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line)]">
						{rows.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="py-4 text-center text-[var(--muted)]"
								>
									Нет данных по врачам за выбранный период.
								</td>
							</tr>
						) : (
							rows.map((doc, idx) => {
								const avgTicket =
									doc.averageTicketRub !== null && doc.averageTicketRub !== undefined
										? doc.averageTicketRub
										: (doc.appointmentsCompleted ?? 0) > 0 && doc.revenueRub
											? Math.round(doc.revenueRub / doc.appointmentsCompleted)
											: 0;

								return (
									<tr
										key={doc.doctorUserId ?? `doc-row-${idx}`}
										className="hover:bg-[var(--paper-soft)] transition-colors"
									>
										<td className="py-2.5 px-3 font-medium text-[var(--ink)]">
											{doc.doctorName}
										</td>
										<td className="py-2.5 px-3 text-right font-bold text-[var(--ink)]">
											{money(doc.revenueRub ?? 0)}
										</td>
										<td className="py-2.5 px-3 text-center">
											{doc.appointmentsCompleted ?? 0}
											<span className="text-[var(--muted)] text-[10px] ml-1">
												/ {doc.appointmentsTotal ?? 0}
											</span>
										</td>
										<td className="py-2.5 px-3 text-right font-bold text-teal-600 dark:text-teal-400">
											{money(avgTicket)}
										</td>
										<td className="py-2.5 px-3 text-center">
											{formatPercent(doc.completionRate)}
										</td>
										<td className="py-2.5 px-3 text-center">
											{formatPercent(doc.noShowRate)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};
