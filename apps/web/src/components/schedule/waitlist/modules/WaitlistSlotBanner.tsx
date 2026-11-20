import React from "react";
import { Zap } from "lucide-react";
import type { TargetSlotInfo } from "../waitlistTypes";

export interface WaitlistSlotBannerProps {
	targetSlot: TargetSlotInfo;
	matchedCount: number;
}

function formatMatchesCount(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod100 >= 11 && mod100 <= 19) return `${count} совпадений`;
	if (mod10 === 1) return `${count} совпадение`;
	if (mod10 >= 2 && mod10 <= 4) return `${count} совпадения`;
	return `${count} совпадений`;
}

export function WaitlistSlotBanner({ targetSlot, matchedCount }: WaitlistSlotBannerProps) {
	return (
		<div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--badge-teal-bg,rgba(13,148,136,0.08))] flex items-start sm:items-center justify-between gap-2 shrink-0">
			<div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
				<Zap size={18} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5 sm:mt-0" />
				<div className="min-w-0 flex-1">
					<span className="text-[11px] sm:text-xs font-semibold text-[var(--teal,#0d9488)] tracking-wide block">
						Освободившееся окно для записи
					</span>
					<span className="text-xs font-medium text-[var(--text,#0f172a)] block leading-snug break-words">
						{new Date(targetSlot.startsAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
						{targetSlot.doctorName ? ` • ${targetSlot.doctorName}` : ""}
						{targetSlot.chairName ? ` • ${targetSlot.chairName}` : ""}
					</span>
				</div>
			</div>
			{matchedCount > 0 && (
				<span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--teal,#0d9488)] text-white whitespace-nowrap shrink-0 self-center">
					{formatMatchesCount(matchedCount)}
				</span>
			)}
		</div>
	);
}
