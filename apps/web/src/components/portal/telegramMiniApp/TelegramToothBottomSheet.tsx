/**
 * Native Bottom Sheet Drawer for Tooth Complaint
 * (DOMAIN: TELEGRAM MINI APP - LAYER 4 SUBCOMPONENT)
 */

import React from "react";
import { Check, Trash2, X } from "lucide-react";
import { TelegramPainScaleSelector } from "./TelegramPainScaleSelector.js";
import { TelegramSymptomCard } from "./TelegramSymptomCard.js";
import { TOOTH_COMPLAINT_CATALOG } from "./toothComplaintCatalog.js";
import { getToothAnatomicalTitle } from "./toothPickerAnatomy.js";
import type { ToothComplaintType } from "./toothPickerTypes.js";

export interface TelegramToothBottomSheetProps {
	sheetTooth: number;
	activeComplaintType: ToothComplaintType;
	painLevel: number;
	notes: string;
	hasExistingComplaint: boolean;
	onClose: () => void;
	onSelectType: (type: ToothComplaintType) => void;
	onSetPainLevel: (lvl: number) => void;
	onChangeNotes: (notes: string) => void;
	onConfirm: () => void;
	onDelete: () => void;
}

export const TelegramToothBottomSheet: React.FC<TelegramToothBottomSheetProps> = ({
	sheetTooth,
	activeComplaintType,
	painLevel,
	notes,
	hasExistingComplaint,
	onClose,
	onSelectType,
	onSetPainLevel,
	onChangeNotes,
	onConfirm,
	onDelete,
}) => {
	const toothInfo = getToothAnatomicalTitle(sheetTooth);

	return (
		<div className="tg-sheet-backdrop" onClick={onClose}>
			<div className="tg-bottom-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<div className="tg-sheet-handle" />
				<div className="tg-sheet-header">
					<div className="flex items-center gap-2.5">
						<div className="w-10 h-10 rounded-xl bg-[var(--tg-accent)]/20 text-[var(--tg-accent)] font-extrabold flex items-center justify-center text-base border border-[var(--tg-accent)]/40">
							{sheetTooth}
						</div>
						<div>
							<div className="text-base font-bold text-[var(--tg-text)]">Зуб #{sheetTooth}</div>
							<div className="text-xs text-[var(--tg-text-muted)]">
								{toothInfo.name} • {toothInfo.archName}
							</div>
						</div>
					</div>
					<button type="button" className="p-2 rounded-full text-[var(--tg-text-muted)] hover:text-[var(--tg-text)] hover:bg-[var(--tg-card-inner)] transition-all" onClick={onClose}>
						<X size={18} />
					</button>
				</div>

				<div className="tg-sheet-body">
					<div className="text-xs font-bold text-[var(--tg-text)] mb-2 uppercase tracking-wider">
						Что вас беспокоит в этом зубе?
					</div>

					<div className="space-y-2">
						{TOOTH_COMPLAINT_CATALOG.map((item) => (
							<TelegramSymptomCard
								key={item.id}
								item={item}
								isSelected={activeComplaintType === item.id}
								onSelect={() => onSelectType(item.id)}
							/>
						))}
					</div>

					<TelegramPainScaleSelector painLevel={painLevel} onSetPainLevel={onSetPainLevel} />

					<div className="mt-3">
						<label className="text-[11px] font-semibold text-[var(--tg-text-muted)] mb-1 block">Комментарий врачу:</label>
						<input
							type="text"
							placeholder="Например: болит 2 дня при накусывании"
							value={notes}
							onChange={(e) => onChangeNotes(e.target.value)}
							className="w-full bg-[var(--tg-card-inner)] border border-[var(--tg-border)] rounded-xl px-3 py-2 text-xs text-[var(--tg-text)] placeholder:text-[var(--tg-text-muted)] focus:outline-none focus:border-[var(--tg-accent)]"
						/>
					</div>

					<div className="mt-4 pt-2 space-y-2">
						<button type="button" className="tg-cta-button" onClick={onConfirm}>
							<Check size={16} />
							<span>Сохранить жалобу на зуб #{sheetTooth}</span>
						</button>
						{hasExistingComplaint && (
							<button type="button" className="w-full py-2.5 px-4 rounded-xl bg-[var(--tg-card-inner)] hover:bg-red-500/10 text-red-500 font-semibold text-xs flex items-center justify-center gap-1.5 border border-[var(--tg-border)] transition-all" onClick={onDelete}>
								<Trash2 size={14} />
								<span>Удалить жалобу</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
