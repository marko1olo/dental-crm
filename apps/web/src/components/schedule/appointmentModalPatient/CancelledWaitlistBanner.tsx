import type { Appointment, Dashboard } from "@dental/shared";
import { Zap } from "lucide-react";
import React, { useState } from "react";
import { SmartSlotRecoveryPopover } from "../SmartSlotRecoveryPopover";
import { WaitlistMatchesBlock } from "../WaitlistMatchesBlock";

export interface CancelledWaitlistBannerProps {
	appointment: Appointment;
	dashboard: Dashboard;
	selectedPatientName?: string | null | undefined;
}

export function CancelledWaitlistBanner({
	appointment,
	dashboard,
	selectedPatientName,
}: CancelledWaitlistBannerProps) {
	const [isSmartRecoveryOpen, setIsSmartRecoveryOpen] = useState(false);

	return (
		<div className="p-2.5 sm:p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Zap className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Окно свободно для записи</span>
				</span>
				<button
					type="button"
					onClick={() => setIsSmartRecoveryOpen(true)}
					className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)]/40 hover:bg-[var(--teal)] hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
					data-testid="modal-smart-slot-recovery-btn"
				>
					<Zap className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Умный подбор (3 кандидата)</span>
				</button>
			</div>
			<WaitlistMatchesBlock appointmentId={appointment.id} compact />

			{isSmartRecoveryOpen && (
				<SmartSlotRecoveryPopover
					isOpen={isSmartRecoveryOpen}
					onClose={() => setIsSmartRecoveryOpen(false)}
					slot={{
						appointmentId: appointment.id,
						startsAt: appointment.startsAt,
						endsAt: appointment.endsAt,
						doctorId: appointment.doctorUserId,
						chairId: appointment.chairId,
						freedBecause: appointment.reason || "Отмена приёма",
						patientName: selectedPatientName || null,
					}}
					clinicName={
						dashboard?.clinicSettings?.profile?.clinicName ||
						(dashboard?.clinicSettings as any)?.name ||
						"DENTE"
					}
				/>
			)}
		</div>
	);
}
