import React from "react";
import type { TargetSlotInfo } from "../waitlistTypes";

export interface WaitlistSlotBannerProps {
	targetSlot: TargetSlotInfo;
	matchedCount: number;
}

export function WaitlistSlotBanner({ targetSlot, matchedCount }: WaitlistSlotBannerProps) {
	return (
		<div className="px-5 py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--badge-teal-bg,rgba(13,148,136,0.08))] flex items-center justify-between shrink-0">
			<div className="flex items-center gap-2.5 min-w-0">
				<span className="text-base" role="img" aria-label="slot">
					⚡
				</span>
				<div className="truncate">
					<span className="text-xs font-semibold text-[var(--teal,#0d9488)] uppercase tracking-wide block">
						Освободившееся окно для записи
					</span>
					<span className="text-xs font-medium text-[var(--text,#0f172a)] truncate block">
						{new Date(targetSlot.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
						{targetSlot.doctorName ? ` • ${targetSlot.doctorName}` : ""}
						{targetSlot.chairName ? ` • ${targetSlot.chairName}` : ""}
					</span>
				</div>
			</div>
			{matchedCount > 0 && (
				<span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--teal,#0d9488)] text-white whitespace-nowrap">
					{matchedCount} совпад.
				</span>
			)}
		</div>
	);
}
