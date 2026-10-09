import type { Appointment } from "@dental/shared";
import { Calendar } from "lucide-react";
import React, { useMemo } from "react";

export interface VisitHistoryCardItemProps {
	appointment: Appointment;
	doctorFullName?: string | null;
	onOpenVisit?: (visitId: string) => void;
}

export const VisitHistoryCardItem: React.FC<VisitHistoryCardItemProps> = React.memo(
	({ appointment, doctorFullName, onOpenVisit }) => {
		const formattedDate = useMemo(() => {
			if (!appointment.startsAt) return "Дата не указана";
			const d = new Date(appointment.startsAt);
			if (Number.isNaN(d.getTime())) return "Дата не указана";
			return d.toLocaleString("ru-RU", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		}, [appointment.startsAt]);

		const statusLabel = useMemo(() => {
			switch (appointment.status) {
				case "completed":
					return "Завершён";
				case "in_treatment":
					return "Идёт приём";
				case "cancelled":
					return "Отменён";
				case "no_show":
					return "Не явился";
				case "confirmed":
					return "Подтверждён";
				default:
					return "Запланирован";
			}
		}, [appointment.status]);

		return (
			<div
				className="visit-history-card p-3 rounded-lg flex flex-col gap-1.5 bg-[var(--paper-soft)] border border-[var(--line)] transition-colors shadow-xs"
				style={{ contentVisibility: "auto", containIntrinsicSize: "auto 110px" }}
			>
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
						<Calendar className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span>{formattedDate}</span>
					</div>
					<span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper)] text-[var(--ink)] font-bold border border-[var(--line-strong)] shrink-0">
						{statusLabel}
					</span>
				</div>
				<div className="text-xs text-[var(--muted)] truncate min-w-0">
					Врач:{" "}
					<strong className="text-[var(--ink)]">
						{doctorFullName || "Врач не назначен"}
					</strong>
				</div>
				{appointment.reason ? (
					<div className="text-xs text-[var(--ink)] line-clamp-2">
						{appointment.reason}
					</div>
				) : null}
				{onOpenVisit ? (
					<div className="mt-0.5 flex justify-end">
						<button
							type="button"
							onClick={() => onOpenVisit(appointment.id)}
							className="min-h-[32px] px-1.5 text-[var(--teal)] hover:underline font-bold bg-transparent border-0 cursor-pointer text-xs inline-flex items-center"
						>
							К визиту &rarr;
						</button>
					</div>
				) : null}
			</div>
		);
	},
);
VisitHistoryCardItem.displayName = "VisitHistoryCardItem";
