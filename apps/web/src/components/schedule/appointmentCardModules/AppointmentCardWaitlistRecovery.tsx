import React from "react";
import { Zap } from "lucide-react";
import type { Appointment } from "@dental/shared";
import { WaitlistMatchesBlock } from "../WaitlistMatchesBlock";

export interface AppointmentCardWaitlistRecoveryProps {
	appointment: Appointment;
	onOpenSmartRecovery: () => void;
}

export function AppointmentCardWaitlistRecovery({
	appointment,
	onOpenSmartRecovery,
}: AppointmentCardWaitlistRecoveryProps) {
	if (
		!(
			(appointment?.status === "cancelled" || appointment?.status === "no_show") &&
			appointment?.startsAt &&
			new Date(appointment.startsAt).getTime() > Date.now()
		)
	) {
		return null;
	}

	return (
		<div
			style={{
				marginTop: 4,
				padding: "8px 10px",
				borderRadius: 10,
				border: "1px solid var(--line)",
				background: "var(--paper-soft)",
			}}
			data-testid="appointment-card-waitlist-matches"
		>
			<div className="flex items-center justify-between gap-1.5 mb-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
					<Zap className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Окно свободно</span>
				</span>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onOpenSmartRecovery();
					}}
					className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)]/30 hover:bg-[var(--teal)] hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
					data-testid="smart-slot-recovery-open-btn"
				>
					<span>Умный подбор (3 кандидата)</span>
				</button>
			</div>
			<WaitlistMatchesBlock appointmentId={appointment.id} compact />
		</div>
	);
}
