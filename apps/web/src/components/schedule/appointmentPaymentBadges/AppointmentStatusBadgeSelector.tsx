import type { Appointment } from "@dental/shared";
import { Check } from "lucide-react";
import React from "react";

export interface AppointmentStatusBadgeSelectorProps {
	appointmentId: string;
	displayStatus: Appointment["status"];
	appointmentLabels: Record<Appointment["status"], string>;
	isQuickStatusUpdating: boolean;
	isLocked: boolean;
	compactMicro?: boolean;
	onStatusChange: (newStatus: Appointment["status"]) => void;
}

export function AppointmentStatusBadgeSelector({
	appointmentId,
	displayStatus,
	appointmentLabels,
	isQuickStatusUpdating,
	isLocked,
	compactMicro = false,
	onStatusChange,
}: AppointmentStatusBadgeSelectorProps) {
	return (
		<div
			className={`appointment-status-badge-selector relative inline-flex items-center gap-1 ${
				compactMicro
					? "h-6 min-h-[24px] max-h-6 px-1.5 py-0 rounded-md text-[11px]"
					: "min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-xl text-xs"
			} font-bold border transition-colors shrink-0 ${
				displayStatus === "in_treatment"
					? "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/60 font-black"
					: displayStatus === "confirmed"
						? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40"
						: displayStatus === "arrived"
							? "bg-amber-500/20 text-amber-900 dark:text-amber-100 border-amber-500/40 font-black"
							: displayStatus === "completed"
								? "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
								: displayStatus === "cancelled" || displayStatus === "no_show"
									? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40"
									: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
			}`}
			data-testid={`appointment-status-badge-${appointmentId}`}
		>
			{displayStatus === "in_treatment" ? (
				<span
					className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"
					aria-hidden="true"
				/>
			) : displayStatus === "completed" ? (
				<Check
					size={compactMicro ? 11 : 12}
					className="shrink-0 text-current"
					aria-hidden="true"
				/>
			) : (
				<span
					className={`w-1.5 h-1.5 rounded-full shrink-0 ${
						displayStatus === "confirmed"
							? "bg-teal-500"
							: displayStatus === "arrived"
								? "bg-amber-500"
								: displayStatus === "cancelled" || displayStatus === "no_show"
									? "bg-rose-500"
									: displayStatus === "planned"
										? "bg-blue-500"
										: "bg-[var(--line-strong)]"
					}`}
					aria-hidden="true"
				/>
			)}
			<select
				className={`appointment-status-select bg-transparent text-current font-bold ${
					compactMicro
						? "text-[11px] p-0 h-auto"
						: "text-xs p-0 pr-0.5 min-h-[44px] sm:min-h-0 sm:h-auto"
				} cursor-pointer outline-none border-none appearance-none`}
				value={displayStatus}
				disabled={isQuickStatusUpdating || isLocked}
				onChange={(e) => {
					e.stopPropagation();
					onStatusChange(e.target.value as Appointment["status"]);
				}}
				title={`Статус записи: ${appointmentLabels?.[displayStatus] || displayStatus}`}
				aria-label="Изменить статус приема"
			>
				{(Object.keys(appointmentLabels ?? {}) as Appointment["status"][]).map(
					(status) => (
						<option
							key={status}
							value={status}
							className="bg-[var(--paper)] text-[var(--ink)] font-normal"
							disabled={isLocked}
						>
							{appointmentLabels?.[status] ?? status}
						</option>
					),
				)}
			</select>
		</div>
	);
}
