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

export interface IncomingCallQuickBookingProps {
	onSelectSlot: (slotType: QuickSlotType) => void;
	slots?: readonly QuickSlotOption[] | undefined;
	className?: string | undefined;
	onClose?: (() => void) | undefined;
}
