import { Zap } from "lucide-react";
import React from "react";
import { IncomingCallQuickBooking } from "../IncomingCallQuickBooking";
import type { IncomingCallQuickBookingSectionProps } from "./types";

export function IncomingCallQuickBookingSection({
	ctrl,
}: IncomingCallQuickBookingSectionProps): React.JSX.Element | null {
	const {
		somaticAlerts,
		quickSlots,
		showQuickBooking,
		setShowQuickBooking,
		handleQuickBook,
	} = ctrl;

	const hasAcutePain = somaticAlerts.some((a) => a.category === "pain");

	if (!hasAcutePain && !showQuickBooking) return null;

	return (
		<>
			{/* Острая боль (Cito) Alert Banner */}
			{hasAcutePain && (
				<button
					type="button"
					onClick={() => handleQuickBook("today_urgent")}
					className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--danger,#ef4444)] hover:bg-[var(--danger-strong,#dc2626)] text-white text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs active:scale-95"
					data-testid="badge-action-cito-banner"
					title="Внеочередная экстренная запись пациента с острой болью"
				>
					<div className="flex items-center gap-1.5">
						<Zap size={14} className="text-amber-300 shrink-0" />
						<span className="font-bold text-white">Острая боль! Внеочередной приём (Cito)</span>
					</div>
					<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--danger-strong,#be123c)]/40 text-white">
						{quickSlots[0]?.time || "Срочно"}
					</span>
				</button>
			)}

			{showQuickBooking && (
				<IncomingCallQuickBooking
					slots={quickSlots}
					onSelectSlot={(slotType) => handleQuickBook(slotType)}
					onClose={() => setShowQuickBooking(false)}
				/>
			)}
		</>
	);
}
