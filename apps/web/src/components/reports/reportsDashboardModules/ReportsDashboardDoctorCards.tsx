import type React from "react";
import { money } from "../../../AppHelpers";
import type { DoctorRow } from "../ManagerReportsTypes";
import { formatPercent } from "../managerReportsHelpers";

export interface ReportsDashboardDoctorCardsProps {
	readonly rows: readonly DoctorRow[];
}

export const ReportsDashboardDoctorCards: React.FC<ReportsDashboardDoctorCardsProps> = ({
	rows,
}) => {
	if (rows.length === 0) {
		return (
			<div className="py-4 text-center text-xs text-[var(--muted)]">
				Нет данных по врачам за выбранный период.
			</div>
		);
	}

	return (
		<div className="sm:hidden space-y-2.5">
			{rows.map((doc, idx) => {
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
								<strong className="text-[var(--teal,#0d9488)]">
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
			})}
		</div>
	);
};
