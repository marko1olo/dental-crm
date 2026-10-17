import { Calendar, Clock, X, Zap } from "lucide-react";
import React from "react";
import { QUICK_SLOT_PRESETS, type IncomingCallQuickBookingProps } from "./incomingCallQuickBooking/types";

export * from "./incomingCallQuickBooking/types";
export * from "./incomingCallQuickBooking/computeQuickBookingSlots";

/**
 * 1-Click Quick Booking Slots for Doctors and Reception.
 * Strictly adheres to Mandate 8e & 8n: Solo doctor & reception autonomy without mandatory assistant or branch.
 */
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
