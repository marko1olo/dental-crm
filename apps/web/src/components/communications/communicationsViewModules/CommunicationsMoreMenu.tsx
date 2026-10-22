import { Calendar } from "lucide-react";

export function CommunicationsMoreMenu({
	isOpen,
	onClose,
	onOpenRecallsHub,
	onGoToSchedule,
}: {
	isOpen: boolean;
	onClose: () => void;
	onOpenRecallsHub: () => void;
	onGoToSchedule: () => void;
}) {
	if (!isOpen) return null;

	return (
		<div
			className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl z-40 p-1.5 flex flex-col gap-1 select-none"
			role="menu"
		>
			<button
				type="button"
				onClick={() => { onClose(); onOpenRecallsHub(); }}
				className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors text-left cursor-pointer"
				data-testid="communications-recalls-hub-btn"
				role="menuitem"
			>
				<Calendar size={14} className="text-[var(--primary)] shrink-0" />
				<span>Профосмотры и реколлы</span>
			</button>
			<button
				type="button"
				onClick={() => { onClose(); onGoToSchedule(); }}
				className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors text-left cursor-pointer"
				role="menuitem"
			>
				<Calendar size={14} className="text-[var(--muted)] shrink-0" />
				<span>Перейти в расписание</span>
			</button>
		</div>
	);
}
