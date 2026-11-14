/**
 * DENTE Dental CRM — Direct Quick Booking Launcher
 * Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy), Mandate 8aq (Mounted in UI Tree), DEF-SCH-03.
 */
import React, { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { QuickBookingDrawer } from "./QuickBookingDrawer";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawerTypes";

export interface DirectQuickBookingLauncherProps {
	initialSlot?: QuickBookingSlotInfo | null;
}

function parseSlotFromUrl(): QuickBookingSlotInfo | null {
	if (typeof window === "undefined" || !window.location) return null;
	const params = new URLSearchParams(window.location.search);
	const isDemo = isDemoShowcaseMode();
	const chairId = params.get("chairId") || (isDemo ? "chair-1" : undefined);
	const chairName = params.get("chairName") || (isDemo ? "Кресло 1" : undefined);
	const doctorUserId = params.get("doctorId") || params.get("doctorUserId") || (isDemo ? "doctor-1" : undefined);
	const doctorName = params.get("doctorName") || (isDemo ? "Д-р Смирнова Е. В." : undefined);
	const patientName = params.get("patientName") || (isDemo ? "Иванов Иван Иванович" : undefined);
	const patientPhone = params.get("patientPhone") || (isDemo ? "+7 (999) 123-45-67" : undefined);
	const reason = params.get("reason") || (isDemo ? "Консультация" : undefined);
	const startsAt = params.get("startsAt") || new Date().toISOString();
	const durationMinutes = Number.parseInt(params.get("durationMinutes") || "30", 10) || 30;

	return {
		startsAt,
		durationMinutes,
		...(chairId ? { chairId } : {}),
		...(chairName ? { chairName } : {}),
		...(doctorUserId ? { doctorUserId } : {}),
		...(doctorName ? { doctorName } : {}),
		...(patientName ? { patientName } : {}),
		...(patientPhone ? { patientPhone } : {}),
		...(reason ? { reason } : {}),
	};
}

export const DirectQuickBookingLauncher: React.FC<DirectQuickBookingLauncherProps> = ({
	initialSlot,
}) => {
	const [isOpen, setIsOpen] = useState(true);

	const slot = useMemo(() => {
		if (initialSlot) return initialSlot;
		return parseSlotFromUrl();
	}, [initialSlot]);

	return (
		<div
			className="fixed inset-0 z-[1000] flex flex-col bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] text-[var(--ink,#0f172a)] p-3 sm:p-6 overflow-y-auto"
			data-testid="standalone-quick-booking-root"
		>
			<QuickBookingDrawer
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				initialSlot={slot}
			/>
		</div>
	);
};

export default DirectQuickBookingLauncher;
