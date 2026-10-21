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
		<div className="p-5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
			<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center gap-2 mb-3">
				<Users className="w-4 h-4 text-teal-600" />
				Показатели врачей: выручка, средний чек и доходимость
			</h3>

			<div className="overflow-x-auto">
				<table className="w-full text-xs text-left border-collapse">
					<thead>
						<tr className="border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]">
							<th className="py-2.5 px-3 font-semibold">Врач</th>
							<th className="py-2.5 px-3 font-semibold text-right">Выручка</th>
							<th className="py-2.5 px-3 font-semibold text-center">Приемов</th>
							<th className="py-2.5 px-3 font-semibold text-right">
								Средний чек
							</th>
							<th className="py-2.5 px-3 font-semibold text-center">
								Доходимость
							</th>
							<th className="py-2.5 px-3 font-semibold text-center">Неявки</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
						{rows.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="py-4 text-center text-[var(--muted,#64748b)]"
								>
									Нет данных по врачам за выбранный период.
								</td>
							</tr>
						) : (
							rows.map((doc, idx) => (
								<tr
									key={doc.doctorUserId ?? `doc-row-${idx}`}
									className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors"
								>
									<td className="py-2.5 px-3 font-medium text-[var(--ink,#0f172a)]">
										{doc.doctorName}
									</td>
									<td className="py-2.5 px-3 text-right font-bold text-[var(--ink,#0f172a)]">
										{money(doc.revenueRub ?? 0)}
									</td>
									<td className="py-2.5 px-3 text-center">
										{doc.appointmentsCompleted ?? 0}
										<span className="text-[var(--muted,#64748b)] text-[10px] ml-1">
											/ {doc.appointmentsTotal ?? 0}
										</span>
									</td>
									<td className="py-2.5 px-3 text-right font-bold text-teal-600 dark:text-teal-400">
										{doc.averageTicketRub ? money(doc.averageTicketRub) : "—"}
									</td>
									<td className="py-2.5 px-3 text-center">
										{formatPercent(doc.completionRate)}
									</td>
									<td className="py-2.5 px-3 text-center">
										{formatPercent(doc.noShowRate)}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};
