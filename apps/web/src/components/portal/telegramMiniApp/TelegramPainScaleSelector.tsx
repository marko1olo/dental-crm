/**
 * Pain Scale (1-5) Selector Component
 * (DOMAIN: TELEGRAM MINI APP - LAYER 4 SUBCOMPONENT)
 */

import React from "react";
import { HeartPulse } from "lucide-react";

export interface TelegramPainScaleSelectorProps {
	painLevel: number;
	onSetPainLevel: (lvl: number) => void;
}

export const TelegramPainScaleSelector: React.FC<TelegramPainScaleSelectorProps> = ({
	painLevel,
	onSetPainLevel,
}) => (
	<div className="mt-4 pt-3 border-t border-[var(--tg-border)]">
		<div className="flex items-center justify-between text-xs text-[var(--tg-text)] mb-2">
			<span className="font-semibold flex items-center gap-1">
				<HeartPulse size={14} className="text-red-500" />
				<span>Интенсивность боли:</span>
			</span>
			<span className="font-bold text-[var(--tg-accent)]">Уровень {painLevel} из 5</span>
		</div>
		<div className="flex gap-1.5">
			{[1, 2, 3, 4, 5].map((lvl) => (
				<button
					key={lvl}
					type="button"
					className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all ${
						painLevel >= lvl
							? lvl >= 4
								? "bg-red-600 text-white border-red-400 shadow-md"
								: "bg-[var(--tg-accent)] text-white border-teal-400 shadow-sm"
							: "bg-[var(--tg-card-inner)] border-[var(--tg-border)] text-[var(--tg-text-muted)]"
					}`}
					onClick={() => onSetPainLevel(lvl)}
				>
					{lvl}
				</button>
			))}
		</div>
	</div>
);
