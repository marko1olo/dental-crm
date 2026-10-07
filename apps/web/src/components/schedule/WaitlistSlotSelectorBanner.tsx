import React from "react";
import { Clock } from "lucide-react";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";

export interface WaitlistSlotSelectorBannerProps {
	activeTargetSlot: TargetSlotInfo | null;
	discoveredFreeSlots: TargetSlotInfo[];
	selectedSlotIndex: number;
	onSelectSlotIndex: (index: number) => void;
	scoredPatientsCount: number;
}

export const WaitlistSlotSelectorBanner: React.FC<WaitlistSlotSelectorBannerProps> = ({
	activeTargetSlot,
	discoveredFreeSlots,
	selectedSlotIndex,
	onSelectSlotIndex,
	scoredPatientsCount,
}) => {
	if (!activeTargetSlot?.startsAt) return null;

	const slotStartDate = new Date(activeTargetSlot.startsAt);
	const slotEndDate = activeTargetSlot.endsAt
		? new Date(activeTargetSlot.endsAt)
		: new Date(slotStartDate.getTime() + 30 * 60_000);

	const formattedDate = slotStartDate.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "long",
	});

	const formattedStartTime = slotStartDate.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});

	const formattedEndTime = slotEndDate.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<div
			className="p-4 mx-5 mt-4 rounded-xl bg-gradient-to-r from-[var(--teal)]/10 to-teal-500/5 border border-[var(--teal)]/20 flex flex-col gap-3 shrink-0"
			data-testid="target-slot-banner"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3 min-w-0">
					<div className="p-2 rounded-lg bg-[var(--teal)] text-[var(--on-teal)] shrink-0">
						<Clock className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--teal-dark)]">
							Освободившееся окно для записи
						</div>
						<div className="text-sm font-semibold text-[var(--ink)] truncate">
							{formattedDate} · {formattedStartTime} – {formattedEndTime}
						</div>
						<div className="text-xs text-[var(--muted)] mt-0.5 flex flex-wrap items-center gap-2">
							<span className="truncate max-w-[200px]">
								Врач: {activeTargetSlot.doctorName || "Любой специалист"}
							</span>
							{activeTargetSlot.freedBecause && (
								<span className="truncate max-w-[200px]">
									· Причина: {activeTargetSlot.freedBecause}
								</span>
							)}
						</div>
					</div>
				</div>
				<div className="text-xs font-semibold px-3 py-1 rounded-lg bg-[var(--teal)]/15 text-[var(--teal-dark)] shrink-0">
					{scoredPatientsCount} кандидатов в очереди
				</div>
			</div>

			{/* Quick selector across multiple discovered free slots */}
			{discoveredFreeSlots.length > 1 && (
				<div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[var(--teal)]/15">
					<span className="text-[11px] font-bold text-[var(--muted)] shrink-0 mr-1">
						Окна:
					</span>
					{discoveredFreeSlots.map((slot, idx) => {
						const sDate = new Date(slot.startsAt);
						const dateLabel = sDate.toLocaleDateString("ru-RU", {
							day: "numeric",
							month: "short",
						});
						const timeLabel = sDate.toLocaleTimeString("ru-RU", {
							hour: "2-digit",
							minute: "2-digit",
						});
						const isSel = idx === selectedSlotIndex;
						return (
							<button
								key={slot.startsAt + (slot.doctorUserId || idx)}
								type="button"
								onClick={() => onSelectSlotIndex(idx)}
								className={`px-2.5 py-1 h-7 rounded-lg text-xs font-bold whitespace-nowrap transition-all border cursor-pointer pointer-coarse:min-h-[36px] ${
									isSel
										? "bg-[var(--teal-dark)] text-white border-[var(--teal)] shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<span>
									{dateLabel} {timeLabel}
								</span>
								<span className="opacity-75 font-normal ml-1">
									({slot.doctorName?.split(" ")[0] || "Врач"})
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};
