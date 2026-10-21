import { AlertTriangle } from "lucide-react";
import React from "react";
import { formatDoctorShortName } from "../GridAppointmentCard";

export interface ScheduleMobileMetaChipsProps {
	chair?: { name: string } | undefined;
	doc?: { fullName: string } | undefined;
	balance: number | null;
	allergyText: string | null;
}

export function ScheduleMobileMetaChips({
	chair,
	doc,
	balance,
	allergyText,
}: ScheduleMobileMetaChipsProps) {
	return (
		<div className="schedule-mobile-meta-chips">
			{(chair || doc) && (
				<span className="schedule-mobile-doctor-chair-chip">
					{chair?.name || "Кабинет"}
					{doc ? ` · ${formatDoctorShortName(doc.fullName)}` : ""}
				</span>
			)}

			{balance !== null && (
				<span
					className={`schedule-mobile-balance-chip ${
						balance > 0
							? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
							: balance < 0
								? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
								: "bg-slate-500/10 text-slate-600 dark:text-slate-400"
					}`}
				>
					{balance > 0
						? `+${balance.toLocaleString("ru-RU")} ₽`
						: balance < 0
							? `Долг: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`
							: "Оплачено"}
				</span>
			)}

			{allergyText && (
				<span className="schedule-mobile-allergy-chip" title={allergyText}>
					<AlertTriangle size={10} className="shrink-0" />
					<span>{allergyText}</span>
				</span>
			)}
		</div>
	);
}
