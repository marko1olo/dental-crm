/**
 * Summary of Selected Complaints in Telegram Mini App
 * (DOMAIN: TELEGRAM MINI APP - LAYER 4 SUBCOMPONENT)
 */

import React from "react";
import { ArrowRight, Flame, Trash2 } from "lucide-react";
import { TOOTH_COMPLAINT_CATALOG } from "./toothComplaintCatalog.js";
import { getToothAnatomicalTitle } from "./toothPickerAnatomy.js";
import type { ToothComplaint } from "./toothPickerTypes.js";

export interface TelegramToothComplaintsSummaryProps {
	complaints: readonly ToothComplaint[];
	onRemoveComplaint: (toothNumber: number) => void;
	onProceedToBooking?: (() => void) | undefined;
	onTriggerHaptic?: (() => void) | undefined;
}

export const TelegramToothComplaintsSummary: React.FC<TelegramToothComplaintsSummaryProps> = ({
	complaints,
	onRemoveComplaint,
	onProceedToBooking,
	onTriggerHaptic,
}) => {
	if (complaints.length === 0) return null;

	return (
		<div className="tg-complaints-summary">
			<div className="flex items-center justify-between mb-2">
				<div className="text-xs font-bold text-[var(--tg-text)] flex items-center gap-1.5">
					<Flame size={14} className="text-red-500" />
					<span>Отмеченные зубы ({complaints.length}):</span>
				</div>
				<span className="text-[11px] text-[var(--tg-accent)] font-semibold">Готово к передаче врачу</span>
			</div>

			<div className="space-y-1.5">
				{complaints.map((c) => {
					const catalogItem = TOOTH_COMPLAINT_CATALOG.find((item) => item.id === c.complaintType);
					const toothInfo = getToothAnatomicalTitle(c.toothNumber);
					return (
						<div
							key={c.toothNumber}
							className="flex items-center justify-between p-2 rounded-xl bg-[var(--tg-card-inner)] border border-[var(--tg-border)] text-xs"
						>
							<div className="flex items-center gap-2 min-w-0">
								<div className="w-7 h-7 rounded-lg bg-[var(--tg-accent)]/20 text-[var(--tg-accent)] font-bold flex items-center justify-center text-xs flex-shrink-0 border border-[var(--tg-accent)]/30">
									{c.toothNumber}
								</div>
								<div className="min-w-0">
									<div className="font-semibold text-[var(--tg-text)] truncate flex items-center gap-1">
										<span>Зуб {c.toothNumber}</span>
										<span className="text-[10px] text-[var(--tg-text-muted)]">({toothInfo.name})</span>
									</div>
									<div className="text-[11px] text-[var(--tg-accent)] font-medium flex items-center gap-1">
										<span>{catalogItem?.label}</span>
										{c.cito && (
											<span className="text-[9px] bg-red-500/20 text-red-600 dark:text-red-300 px-1 py-0.2 rounded font-bold border border-red-500/30">
												⚡ Срочно
											</span>
										)}
									</div>
								</div>
							</div>

							<button
								type="button"
								className="p-1.5 text-[var(--tg-text-muted)] hover:text-red-500 transition-colors ml-2 flex-shrink-0"
								onClick={() => onRemoveComplaint(c.toothNumber)}
								title="Удалить жалобу"
							>
								<Trash2 size={14} />
							</button>
						</div>
					);
				})}
			</div>

			{onProceedToBooking && (
				<button
					type="button"
					className="tg-cta-button mt-3"
					onClick={() => {
						onTriggerHaptic?.();
						onProceedToBooking();
					}}
				>
					<span>Записаться к врачу с жалобами на зубы</span>
					<ArrowRight size={16} />
				</button>
			)}
		</div>
	);
};
