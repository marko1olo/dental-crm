import type { Appointment } from "@dental/shared";
import { APPOINTMENT_REFUSAL_REASONS_CATALOG } from "@dental/shared";
import React from "react";

export function AppointmentRefusalBanner({
	appointment,
	isQuickStatusUpdating,
	appointmentHasOpenVisit,
	onQuickStatusChange,
}: {
	appointment: Appointment;
	isQuickStatusUpdating: boolean;
	appointmentHasOpenVisit: boolean;
	onQuickStatusChange: (
		status: Appointment["status"],
		noteAppend?: string,
	) => Promise<void>;
}) {
	if (
		appointment?.status !== "cancelled" &&
		appointment?.status !== "no_show"
	) {
		return null;
	}

	const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
	const match = text.match(/\[Отмена: ([^\]]+)\]/);
	const hasReason = /\[Отмена: [^\]]+\]/.test(text);

	return (
		<div
			className={`mt-1.5 p-2 rounded-xl border text-xs flex flex-col gap-1.5 ${
				appointment.status === "cancelled"
					? "border-rose-500/25 bg-rose-500/10 text-[var(--ink)]"
					: "border-amber-500/25 bg-amber-500/10 text-[var(--ink)]"
			}`}
			data-testid="appointment-card-refusal-banner"
		>
			<div className="flex items-center justify-between gap-1 flex-wrap">
				<span className="font-semibold text-[11px] uppercase tracking-wider text-rose-700 dark:text-rose-300">
					{appointment.status === "cancelled"
						? "Запись отменена"
						: "Пациент не явился"}
				</span>
				{match && match[1] && (
					<span className="font-medium text-xs text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/40">
						{match[1]}
					</span>
				)}
			</div>
			{!hasReason && (
				<div
					className="flex flex-wrap gap-1 mt-0.5"
					data-testid="appointment-card-refusal-chips"
				>
					<span className="text-[11px] text-[var(--muted)] w-full">
						Причина отказа:
					</span>
					{APPOINTMENT_REFUSAL_REASONS_CATALOG.slice(0, 4).map((refuse) => (
						<button
							key={refuse.code}
							type="button"
							disabled={isQuickStatusUpdating || appointmentHasOpenVisit}
							className="px-2 py-1 min-h-[28px] rounded-lg text-[11px] font-medium bg-[var(--paper)] hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-[var(--line)] text-[var(--ink)] hover:border-rose-300 transition-colors cursor-pointer active:scale-95 shadow-2xs"
							data-testid={`appointment-card-refusal-chip-${refuse.code}`}
							onClick={(e) => {
								e.stopPropagation();
								const statusToSet =
									appointment.status === "no_show" ? "no_show" : "cancelled";
								void onQuickStatusChange(
									statusToSet,
									`[Отмена: ${refuse.nameRu}]`,
								);
							}}
						>
							{refuse.nameRu}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
