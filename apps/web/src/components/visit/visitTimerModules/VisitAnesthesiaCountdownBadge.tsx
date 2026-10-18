import React from "react";
import { Syringe } from "lucide-react";

export interface VisitAnesthesiaCountdownBadgeProps {
	readonly countdown: string;
}

export function VisitAnesthesiaCountdownBadge({ countdown }: VisitAnesthesiaCountdownBadgeProps) {
	const isReady = countdown === "Готово";
	return (
		<div
			data-testid="chair-anesthesia-countdown-badge"
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold shrink-0 ${
				isReady
					? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
					: "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300 animate-pulse"
			}`}
			title="Ожидание наступления действия анестезии"
		>
			<Syringe size={13} className="shrink-0 text-purple-600 dark:text-purple-400" />
			<span>
				{isReady ? "Анестезия готова" : `Анестезия: ${countdown}`}
			</span>
		</div>
	);
}
