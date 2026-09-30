import { Calendar, Clock, Zap } from "lucide-react";
import React from "react";

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

export interface IncomingCallQuickBookingProps {
	onSelectSlot: (slotType: QuickSlotType) => void;
	className?: string;
}

/**
 * 1-Click Quick Booking Slots for Doctors and Reception.
 * Strictly adheres to Mandate 8e & 8n: Solo doctor & reception autonomy without mandatory assistant or branch.
 */
export function IncomingCallQuickBooking({
	onSelectSlot,
	className = "",
}: IncomingCallQuickBookingProps) {
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
				{QUICK_SLOT_PRESETS.map((slot) => (
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
