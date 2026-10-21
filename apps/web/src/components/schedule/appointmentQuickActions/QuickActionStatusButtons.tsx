import type { Appointment } from "@dental/shared";
import { Check } from "lucide-react";
import React from "react";
import type { QuickActionDef } from "./quickActionConfig";

export interface QuickActionStatusButtonsProps {
	actions: QuickActionDef[];
	effectiveStatus: Appointment["status"];
	optimisticNote: string | null;
	disabled: boolean;
	appointmentHasOpenVisit: boolean;
	activeVisitLockedAppointmentStatuses?: Set<Appointment["status"]> | undefined;
	compact: boolean;
	showLabels: boolean;
	onActionClick: (status: Appointment["status"], noteAppend?: string) => void;
}

export function QuickActionStatusButtons({
	actions,
	effectiveStatus,
	optimisticNote,
	disabled,
	appointmentHasOpenVisit,
	activeVisitLockedAppointmentStatuses,
	compact,
	showLabels,
	onActionClick,
}: QuickActionStatusButtonsProps) {
	return (
		<div className="flex items-center gap-1 flex-wrap min-w-0">
			<span className="text-[11px] font-semibold text-[var(--muted)] px-1 uppercase tracking-wider select-none hidden lg:inline shrink-0">
				Статус:
			</span>
			{actions.map((action) => {
				const isCurrent =
					action.key === "late"
						? effectiveStatus === "no_show" &&
							(optimisticNote !== null
								? optimisticNote === "Опоздание"
								: action.noteAppend === "Опоздание")
						: effectiveStatus === action.targetStatus;
				const isLocked =
					appointmentHasOpenVisit &&
					action.targetStatus !== "completed" &&
					Boolean(
						activeVisitLockedAppointmentStatuses?.has(action.targetStatus),
					);

				return (
					<button
						key={action.key}
						type="button"
						disabled={disabled || isLocked}
						onClick={(e) => {
							e.stopPropagation();
							onActionClick(action.targetStatus, action.noteAppend);
						}}
						className={`quick-action-pill min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-[var(--teal)] focus:outline-none ${
							isCurrent
								? action.activeClass
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper-soft)]"
						}`}
						title={
							isLocked
								? "Статус заблокирован / зафиксирован: открыт активный визит"
								: action.title
						}
						aria-label={action.title}
						aria-pressed={isCurrent}
					>
						{action.icon}
						{showLabels && (
							<span className="break-words leading-none text-center">
								{compact ? action.shortLabel : action.label}
							</span>
						)}
						{isCurrent && (
							<Check
								size={12}
								className="shrink-0 text-current ml-0.5 opacity-90"
							/>
						)}
					</button>
				);
			})}
		</div>
	);
}
