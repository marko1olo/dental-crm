import { Calendar, Clock, X, Zap } from "lucide-react";
import React from "react";
import type { Dashboard } from "@dental/shared";
import { findNearestAvailableSlot } from "../../utils/scheduleCollisionUtils";

export type QuickSlotType = "today_urgent" | "today_standard" | "tomorrow" | "today_cito";

export interface QuickSlotOption {
	type: QuickSlotType;
	title: string;
	subtitle: string;
	time: string;
	badgeClass: string;
	buttonClass: string;
}

export const QUICK_SLOT_PRESETS: QuickSlotOption[] = [
	{
		type: "today_urgent",
		title: "Сегодня 10:00",
		subtitle: "Острая боль",
		time: "10:00",
		badgeClass: "text-amber-700 dark:text-amber-300",
		buttonClass:
			"bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200",
	},
	{
		type: "today_standard",
		title: "Сегодня 14:30",
		subtitle: "Консультация",
		time: "14:30",
		badgeClass: "text-[var(--teal)]",
		buttonClass:
			"bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border-[var(--teal-soft)] text-[var(--teal)]",
	},
	{
		type: "tomorrow",
		title: "Завтра 11:00",
		subtitle: "Плановый",
		time: "11:00",
		badgeClass: "text-[var(--muted,#64748b)]",
		buttonClass:
			"bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]",
	},
];

export function computeQuickBookingSlots(
	dashboard: Dashboard | null | undefined,
	resolvedPatientId?: string | null | undefined,
): {
	slots: QuickSlotOption[];
	getSlotInterval: (slotType: QuickSlotType) => { startsAt: string; endsAt: string };
} {
	const todayIso = dashboard?.todayIso || new Date().toISOString().slice(0, 10);
	const appointments = dashboard?.appointments || [];
	const activeStaff = dashboard?.clinicSettings?.staff?.filter((s) => s.active && (s.role === "doctor" || s.role === "owner")) || [];
	const defaultDoctorId = activeStaff[0]?.id || dashboard?.clinicSettings?.staff?.[0]?.id || "doc-1";
	const activeChairs = dashboard?.clinicSettings?.chairs?.filter((c) => c.active) || [];
	const defaultChairId = activeChairs[0]?.id || dashboard?.clinicSettings?.chairs?.[0]?.id || "";
	const ctx = { staff: dashboard?.clinicSettings?.staff, chairs: dashboard?.clinicSettings?.chairs };

	const now = new Date();
	const roundedNow = new Date(Math.ceil(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000));

	// 1. Urgent slot today
	const today9am = new Date(todayIso);
	today9am.setHours(9, 0, 0, 0);
	const earliestUrgent = roundedNow.getTime() > today9am.getTime() && roundedNow.toISOString().slice(0, 10) === todayIso ? roundedNow : today9am;
	const urgentStartIso = earliestUrgent.toISOString();
	const urgentEndIso = new Date(earliestUrgent.getTime() + 30 * 60 * 1000).toISOString();
	const urgentNearest = findNearestAvailableSlot(
		{ startsAt: urgentStartIso, endsAt: urgentEndIso, doctorUserId: defaultDoctorId, chairId: defaultChairId, patientId: resolvedPatientId || null },
		appointments, ctx,
	);
	const urgentInterval = { startsAt: urgentNearest ? urgentNearest.startsAt : urgentStartIso, endsAt: urgentNearest ? urgentNearest.endsAt : urgentEndIso };
	const urgentTimeDisplay = urgentNearest ? urgentNearest.timeDisplay : urgentStartIso.slice(11, 16);

	// 2. Standard slot today
	const candidateStandard = new Date(roundedNow.getTime() + 60 * 60 * 1000);
	let standardStartIso: string;
	if (candidateStandard.toISOString().slice(0, 10) !== todayIso || candidateStandard.getHours() >= 20) {
		const fallback = new Date(todayIso); fallback.setHours(14, 0, 0, 0); standardStartIso = fallback.toISOString();
	} else {
		standardStartIso = candidateStandard.toISOString();
	}
	const standardEndIso = new Date(new Date(standardStartIso).getTime() + 30 * 60 * 1000).toISOString();
	const standardNearest = findNearestAvailableSlot(
		{ startsAt: standardStartIso, endsAt: standardEndIso, doctorUserId: defaultDoctorId, chairId: defaultChairId, patientId: resolvedPatientId || null },
		appointments, ctx,
	);
	const standardInterval = { startsAt: standardNearest ? standardNearest.startsAt : standardStartIso, endsAt: standardNearest ? standardNearest.endsAt : standardEndIso };
	const standardTimeDisplay = standardNearest ? standardNearest.timeDisplay : standardStartIso.slice(11, 16);

	// 3. Tomorrow slot
	const dTomorrow = new Date(todayIso); dTomorrow.setDate(dTomorrow.getDate() + 1); dTomorrow.setHours(10, 0, 0, 0);
	const tomorrowStartIso = dTomorrow.toISOString();
	const tomorrowEndIso = new Date(dTomorrow.getTime() + 30 * 60 * 1000).toISOString();
	const tomorrowNearest = findNearestAvailableSlot(
		{ startsAt: tomorrowStartIso, endsAt: tomorrowEndIso, doctorUserId: defaultDoctorId, chairId: defaultChairId, patientId: resolvedPatientId || null },
		appointments, ctx,
	);
	const tomorrowInterval = { startsAt: tomorrowNearest ? tomorrowNearest.startsAt : tomorrowStartIso, endsAt: tomorrowNearest ? tomorrowNearest.endsAt : tomorrowEndIso };
	const tomorrowTimeDisplay = tomorrowNearest ? tomorrowNearest.timeDisplay : tomorrowStartIso.slice(11, 16);

	const slots: QuickSlotOption[] = [
		{
			type: "today_urgent",
			title: `Сегодня ${urgentTimeDisplay}`,
			subtitle: "Острая боль",
			time: urgentTimeDisplay,
			badgeClass: "text-amber-700 dark:text-amber-300",
			buttonClass: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200",
		},
		{
			type: "today_standard",
			title: `Сегодня ${standardTimeDisplay}`,
			subtitle: "Консультация",
			time: standardTimeDisplay,
			badgeClass: "text-[var(--teal)]",
			buttonClass: "bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border-[var(--teal-soft)] text-[var(--teal)]",
		},
		{
			type: "tomorrow",
			title: `Завтра ${tomorrowTimeDisplay}`,
			subtitle: "Плановый",
			time: tomorrowTimeDisplay,
			badgeClass: "text-[var(--muted,#64748b)]",
			buttonClass: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]",
		},
	];

	return {
		slots,
		getSlotInterval: (slotType: QuickSlotType) => {
			if (slotType === "today_urgent" || slotType === "today_cito") return urgentInterval;
			if (slotType === "tomorrow") return tomorrowInterval;
			return standardInterval;
		},
	};
}

export interface IncomingCallQuickBookingProps {
	onSelectSlot: (slotType: QuickSlotType) => void;
	slots?: readonly QuickSlotOption[] | undefined;
	className?: string | undefined;
	onClose?: (() => void) | undefined;
}

export function IncomingCallQuickBooking({
	onSelectSlot,
	slots,
	className = "",
	onClose,
}: IncomingCallQuickBookingProps) {
	const displaySlots = slots && slots.length > 0 ? slots : QUICK_SLOT_PRESETS;
	return (
		<div
			className={`p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--teal-soft)] space-y-2 animate-in fade-in ${className}`}
			data-testid="incoming-call-quick-booking-slots"
		>
			<div className="flex items-center justify-between text-xs font-bold text-[var(--teal)] uppercase tracking-wider mb-1">
				<div className="flex items-center gap-1.5">
					<Calendar size={13} />
					<span>Быстрая запись в 1 клик</span>
				</div>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
						title="Закрыть выбор слотов"
						aria-label="Закрыть быструю запись"
					>
						<X size={14} />
					</button>
				)}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				{displaySlots.map((slot) => (
					<button
						key={slot.type}
						type="button"
						onClick={() => onSelectSlot(slot.type)}
						className={`w-full min-h-[48px] p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer flex flex-col justify-between ${slot.buttonClass}`}
						data-testid={`quick-slot-${slot.type}`}
					>
						<div className="flex items-center justify-between w-full">
							<span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${slot.badgeClass}`}>
								{slot.type === "today_urgent" ? <Zap size={11} className="text-amber-500 fill-amber-500" /> : <Clock size={11} />}
								<span>{slot.subtitle}</span>
							</span>
							<span className="text-[11px] font-mono font-bold">{slot.time}</span>
						</div>
						<span className="text-xs font-bold mt-1 block truncate text-[var(--ink,#0f172a)]">{slot.title}</span>
					</button>
				))}
			</div>
		</div>
	);
}

export default IncomingCallQuickBooking;
