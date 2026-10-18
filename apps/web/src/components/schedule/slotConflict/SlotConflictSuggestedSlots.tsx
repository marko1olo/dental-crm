import React from "react";
import { Calendar } from "lucide-react";

export interface SlotConflictSuggestedSlotsProps {
	readonly suggestedSlots: readonly (string | { timeDisplay?: string; label?: string; startsAt?: string; endsAt?: string })[];
	readonly onSelectSlot: (slotTime: string) => void;
	readonly onClose: () => void;
}

export const SlotConflictSuggestedSlots: React.FC<SlotConflictSuggestedSlotsProps> = ({
	suggestedSlots,
	onSelectSlot,
	onClose,
}) => (
	<div className="space-y-1.5" data-testid="slot-conflict-suggested-slots-section">
		<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
			<Calendar className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary,#0d9488))]" />
			<span>Выбрать другое свободное окно:</span>
		</label>
		{suggestedSlots && suggestedSlots.length > 0 ? (
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
				{suggestedSlots.map((rawSlot, idx) => {
					const slotLabel = typeof rawSlot === "string" ? rawSlot : rawSlot?.timeDisplay || rawSlot?.label || "Свободное окно";
					const slotValue = typeof rawSlot === "string" ? rawSlot : rawSlot?.timeDisplay || (rawSlot?.startsAt ? new Date(rawSlot.startsAt).toISOString().slice(11, 16) : "") || rawSlot?.label || "";
					const key = typeof rawSlot === "string" ? rawSlot : rawSlot?.startsAt || rawSlot?.timeDisplay || `slot-${idx}`;
					return (
						<button
							key={key}
							type="button"
							data-slot-btn="true"
							data-testid="suggested-slot-btn"
							data-autofocus={idx === 0 ? "true" : undefined}
							onClick={() => { onSelectSlot(slotValue); onClose(); }}
							className="secondary-button min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-xl border border-[var(--teal,var(--brand-primary,#0d9488))]/40 bg-[var(--teal-soft,var(--paper-soft,#f0fdfa))] hover:bg-[var(--teal,var(--brand-primary,#0d9488))] hover:text-white text-[var(--teal-dark,var(--teal,#0d9488))] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs group touch-manipulation select-none active:scale-[0.98]"
							title={`Записать на ${slotLabel}`}
							aria-label={`Выбрать альтернативное время ${slotLabel}`}
						>
							<Calendar className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
							<span>{slotLabel}</span>
						</button>
					);
				})}
			</div>
		) : (
			<p className="text-xs text-[var(--muted,#64748b)] italic">
				Ближайшие окна не найдены. Выберите время вручную в сетке расписания.
			</p>
		)}
	</div>
);
