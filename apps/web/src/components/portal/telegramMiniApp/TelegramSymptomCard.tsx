/**
 * Single Symptom Card in Telegram Tooth Bottom Sheet
 * (DOMAIN: TELEGRAM MINI APP - LAYER 4 SUBCOMPONENT)
 */

import React from "react";
import { Check } from "lucide-react";
import type { ToothComplaintCatalogItem } from "./toothComplaintCatalog.js";

export interface TelegramSymptomCardProps {
	item: ToothComplaintCatalogItem;
	isSelected: boolean;
	onSelect: () => void;
}

export const TelegramSymptomCard: React.FC<TelegramSymptomCardProps> = ({
	item,
	isSelected,
	onSelect,
}) => {
	const Icon = item.icon;
	return (
		<button
			type="button"
			className={`tg-symptom-card ${isSelected ? "selected" : ""}`}
			onClick={onSelect}
		>
			<div className="flex items-start gap-2.5 min-w-0">
				<div
					className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
						isSelected ? "bg-[var(--tg-accent)] text-white" : "bg-[var(--tg-border)] text-[var(--tg-text)]"
					}`}
				>
					<Icon size={16} />
				</div>
				<div className="text-left min-w-0">
					<div className="text-xs font-bold text-[var(--tg-text)] flex items-center gap-1.5">
						<span>{item.label}</span>
						{item.cito && (
							<span className="text-[9px] bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 px-1 py-0.2 rounded font-extrabold">
								⚡ Срочно!
							</span>
						)}
					</div>
					<div className="text-[11px] text-[var(--tg-text-muted)] leading-tight mt-0.5">
						{item.description}
					</div>
				</div>
			</div>
			{isSelected && (
				<div className="w-5 h-5 rounded-full bg-[var(--tg-accent)] text-white flex items-center justify-center flex-shrink-0">
					<Check size={13} strokeWidth={3} />
				</div>
			)}
		</button>
	);
};
