import { Calendar, Clock, Zap } from "lucide-react";
import React from "react";
import type { Dashboard } from "@dental/shared";
import { findNearestAvailableSlot } from "../../utils/scheduleCollisionUtils";

export type QuickSlotType = "today_urgent" | "today_standard" | "tomorrow";

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

/**
 * Calculates collision-free quick booking slots against actual clinic schedule (Mandates 8b, 8e, 8n).
 */
export function computeQuickBookingSlots(
	dashboard: Dashboard | null | undefined,
	resolvedPatientId?: string | null | undefined,
): {
	slots: QuickSlotOption[];
	getSlotInterval: (slotType: QuickSlotType) => { startsAt: string; endsAt: string };
} {
	const todayIso = dashboard?.todayIso || new Date().toISOString().slice(0, 10);
	const appointments = dashboard?.appointments || [];
	const activeStaff =
		dashboard?.clinicSettings?.staff?.filter(
			(s) => s.active && (s.role === "doctor" || s.role === "owner"),
		) || [];
	const defaultDoctorId =
		activeStaff[0]?.id || dashboard?.clinicSettings?.staff?.[0]?.id || "doc-1";
	const activeChairs =
		dashboard?.clinicSettings?.chairs?.filter((c) => c.active) || [];
	const defaultChairId =
		activeChairs[0]?.id || dashboard?.clinicSettings?.chairs?.[0]?.id || "";

	const now = new Date();
	const roundedNow = new Date(
		Math.ceil(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000),
	);

	// 1. Urgent slot today
	const today9am = new Date(todayIso);
	today9am.setHours(9, 0, 0, 0);
	const earliestUrgent =
		roundedNow.getTime() > today9am.getTime() &&
		roundedNow.toISOString().slice(0, 10) === todayIso
			? roundedNow
			: today9am;
	const urgentStartIso = earliestUrgent.toISOString();
	const urgentEndIso = new Date(
		earliestUrgent.getTime() + 30 * 60 * 1000,
	).toISOString();

	const urgentNearest = findNearestAvailableSlot(
		{
			startsAt: urgentStartIso,
			endsAt: urgentEndIso,
			doctorUserId: defaultDoctorId,
			chairId: defaultChairId,
			patientId: resolvedPatientId || null,
		},
		appointments,
		{
			staff: dashboard?.clinicSettings?.staff,
			chairs: dashboard?.clinicSettings?.chairs,
		},
	);

	const urgentInterval = {
		startsAt: urgentNearest ? urgentNearest.startsAt : urgentStartIso,
		endsAt: urgentNearest ? urgentNearest.endsAt : urgentEndIso,
	};
	const urgentTimeDisplay = urgentNearest
		? urgentNearest.timeDisplay
		: urgentStartIso.slice(11, 16);

	// 2. Standard slot today
	const candidateStandard = new Date(roundedNow.getTime() + 60 * 60 * 1000);
	let standardStartIso: string;
	if (
		candidateStandard.toISOString().slice(0, 10) !== todayIso ||
		candidateStandard.getHours() >= 20
	) {
		const fallback = new Date(todayIso);
		fallback.setHours(14, 0, 0, 0);
		standardStartIso = fallback.toISOString();
	} else {
		standardStartIso = candidateStandard.toISOString();
	}
	const standardEndIso = new Date(
		new Date(standardStartIso).getTime() + 30 * 60 * 1000,
	).toISOString();

	const standardNearest = findNearestAvailableSlot(
		{
			startsAt: standardStartIso,
			endsAt: standardEndIso,
			doctorUserId: defaultDoctorId,
			chairId: defaultChairId,
			patientId: resolvedPatientId || null,
		},
		appointments,
		{
			staff: dashboard?.clinicSettings?.staff,
			chairs: dashboard?.clinicSettings?.chairs,
		},
	);

	const standardInterval = {
		startsAt: standardNearest ? standardNearest.startsAt : standardStartIso,
		endsAt: standardNearest ? standardNearest.endsAt : standardEndIso,
	};
	const standardTimeDisplay = standardNearest
		? standardNearest.timeDisplay
		: standardStartIso.slice(11, 16);

	// 3. Tomorrow slot
	const dTomorrow = new Date(todayIso);
	dTomorrow.setDate(dTomorrow.getDate() + 1);
	dTomorrow.setHours(10, 0, 0, 0);
	const tomorrowStartIso = dTomorrow.toISOString();
	const tomorrowEndIso = new Date(
		dTomorrow.getTime() + 30 * 60 * 1000,
	).toISOString();

	const tomorrowNearest = findNearestAvailableSlot(
		{
			startsAt: tomorrowStartIso,
			endsAt: tomorrowEndIso,
			doctorUserId: defaultDoctorId,
			chairId: defaultChairId,
			patientId: resolvedPatientId || null,
		},
		appointments,
		{
			staff: dashboard?.clinicSettings?.staff,
			chairs: dashboard?.clinicSettings?.chairs,
		},
	);

	const tomorrowInterval = {
		startsAt: tomorrowNearest ? tomorrowNearest.startsAt : tomorrowStartIso,
		endsAt: tomorrowNearest ? tomorrowNearest.endsAt : tomorrowEndIso,
	};
	const tomorrowTimeDisplay = tomorrowNearest
		? tomorrowNearest.timeDisplay
		: tomorrowStartIso.slice(11, 16);

	const slots: QuickSlotOption[] = [
		{
			type: "today_urgent",
			title: `Сегодня ${urgentTimeDisplay}`,
			subtitle: "Острая боль",
			time: urgentTimeDisplay,
			badgeClass: "text-amber-700 dark:text-amber-300",
			buttonClass:
				"bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200",
		},
		{
			type: "today_standard",
			title: `Сегодня ${standardTimeDisplay}`,
			subtitle: "Консультация",
			time: standardTimeDisplay,
			badgeClass: "text-[var(--teal)]",
			buttonClass:
				"bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] border-[var(--teal-soft)] text-[var(--teal)]",
		},
		{
			type: "tomorrow",
			title: `Завтра ${tomorrowTimeDisplay}`,
			subtitle: "Плановый",
			time: tomorrowTimeDisplay,
			badgeClass: "text-[var(--muted,#64748b)]",
			buttonClass:
				"bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f1f5f9)] border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]",
		},
	];

	const getSlotInterval = (slotType: QuickSlotType) => {
		switch (slotType) {
			case "today_urgent":
				return urgentInterval;
			case "tomorrow":
				return tomorrowInterval;
			case "today_standard":
			default:
				return standardInterval;
		}
	};

	return { slots, getSlotInterval };
}

export interface IncomingCallQuickBookingProps {
	onSelectSlot: (slotType: QuickSlotType) => void;
	slots?: readonly QuickSlotOption[] | undefined;
	className?: string | undefined;
}

/**
 * 1-Click Quick Booking Slots for Doctors and Reception.
 * Strictly adheres to Mandate 8e & 8n: Solo doctor & reception autonomy without mandatory assistant or branch.
 */
export function IncomingCallQuickBooking({
	onSelectSlot,
	slots,
	className = "",
}: IncomingCallQuickBookingProps) {
	const displaySlots = slots && slots.length > 0 ? slots : QUICK_SLOT_PRESETS;
	return (
		<div
			className={`p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--teal-soft)] space-y-2 animate-in fade-in ${className}`}
			data-testid="incoming-call-quick-booking-slots"
		>
			<div className="flex items-center justify-between">
				<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--teal)] flex items-center gap-1">
					<Zap size={12} className="text-amber-500" />
					Слоты быстрой записи:
				</span>
				<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
					<Clock size={10} />
					В 1 клик
				</span>
			</div>
			<div className="grid grid-cols-3 gap-1.5">
				{displaySlots.map((slot) => (
					<button
						key={slot.type}
						type="button"
						onClick={() => onSelectSlot(slot.type)}
						className={`min-h-[44px] px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer shadow-xs active:scale-95 ${slot.buttonClass}`}
						title={`Записать: ${slot.title} (${slot.subtitle})`}
						data-testid={`quick-slot-btn-${slot.type}`}
					>
						<span>{slot.title}</span>
						<span className={`text-[9px] font-normal ${slot.badgeClass}`}>
							{slot.subtitle}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}
