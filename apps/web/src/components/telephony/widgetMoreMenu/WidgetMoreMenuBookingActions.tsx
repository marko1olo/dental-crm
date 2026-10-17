import { Calendar, CalendarDays, UserPlus, Zap } from "lucide-react";
import React from "react";
import type { IncomingCallPayload } from "../../../store/telephonyStore";
import type { CallAttribution } from "../telephonyAttribution";

export interface WidgetMoreMenuBookingActionsProps {
	onClose: () => void;
	activeCall: IncomingCallPayload | null;
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null;
	callAttribution: CallAttribution | null;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	onQuickBook: (slot: "urgent" | "consultation" | "tomorrow") => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: () => void;
}

export function WidgetMoreMenuBookingActions({
	onClose,
	activeCall,
	resolvedPatient,
	callAttribution,
	isCapturingLead,
	onCaptureLead,
	onQuickBook,
	isCreatingPatient,
	onQuickCreatePatient,
}: WidgetMoreMenuBookingActionsProps) {
	return (
		<>
			{!resolvedPatient && callAttribution && (
				<button
					type="button"
					onClick={() => {
						onCaptureLead();
						onClose();
					}}
					disabled={isCapturingLead || activeCall?.isLeadCaptured}
					className="w-full text-left px-2.5 py-2 rounded-lg bg-[var(--teal-surface)] hover:opacity-90 text-[var(--teal)] font-bold flex items-center gap-2 transition-colors cursor-pointer border border-[var(--teal-soft)] mb-1"
					data-testid="widget-action-capture-lead"
					title={`Захват в лиды с авторазметкой канала (${callAttribution.channelLabel})`}
				>
					<UserPlus size={14} className="text-[var(--teal)] shrink-0" />
					<span className="truncate">
						{activeCall?.isLeadCaptured
							? "Лид захвачен"
							: isCapturingLead
								? "Захват лида..."
								: `В лиды: ${callAttribution.channelLabel}`}
					</span>
				</button>
			)}

			<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
				Слоты быстрой записи:
			</div>

			<button
				type="button"
				onClick={() => {
					onQuickBook("urgent");
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2 transition-colors cursor-pointer"
				data-testid="widget-action-cito"
			>
				<Zap size={13} className="text-amber-500 shrink-0" />
				<span>Острая боль (10:00)</span>
			</button>

			<button
				type="button"
				onClick={() => {
					onQuickBook("consultation");
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--teal-surface)] text-[var(--teal)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<Calendar size={13} className="text-[var(--teal)] shrink-0" />
				<span>Консультация (15:00)</span>
			</button>

			<button
				type="button"
				onClick={() => {
					onQuickBook("tomorrow");
					onClose();
				}}
				className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] font-medium flex items-center gap-2 transition-colors cursor-pointer"
			>
				<CalendarDays size={13} className="text-slate-500 shrink-0" />
				<span>Завтра (11:00)</span>
			</button>

			{!resolvedPatient && activeCall && (
				<button
					type="button"
					onClick={() => {
						onQuickCreatePatient();
						onClose();
					}}
					className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 transition-colors cursor-pointer"
				>
					<UserPlus size={13} className="text-emerald-600 shrink-0" />
					<span>
						{isCreatingPatient ? "Создание пациента..." : "1-Click создание пациента"}
					</span>
				</button>
			)}
		</>
	);
}
