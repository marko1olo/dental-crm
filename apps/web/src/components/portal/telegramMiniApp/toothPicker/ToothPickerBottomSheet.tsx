import type React from "react";
import { Check, HeartPulse, Trash2, X } from "lucide-react";
import type { ToothComplaintType } from "./toothPickerTypes.js";
import { getToothAnatomicalTitle, TOOTH_COMPLAINT_CATALOG } from "./toothPickerTypes.js";

export interface ToothPickerBottomSheetProps {
	readonly toothNumber: number;
	readonly activeComplaintType: ToothComplaintType;
	readonly onSelectComplaintType: (t: ToothComplaintType) => void;
	readonly painLevel: number;
	readonly onSelectPainLevel: (lvl: number) => void;
	readonly notes: string;
	readonly onChangeNotes: (notes: string) => void;
	readonly hasExistingComplaint: boolean;
	readonly onClose: () => void;
	readonly onConfirm: () => void;
	readonly onDelete: () => void;
}

export function ToothPickerBottomSheet({
	toothNumber,
	activeComplaintType,
	onSelectComplaintType,
	painLevel,
	onSelectPainLevel,
	notes,
	onChangeNotes,
	hasExistingComplaint,
	onClose,
	onConfirm,
	onDelete,
}: ToothPickerBottomSheetProps): React.JSX.Element {
	const toothInfo = getToothAnatomicalTitle(toothNumber);

	return (
		<div className="tg-sheet-backdrop" onClick={onClose}>
			<div className="tg-bottom-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<div className="tg-sheet-handle" />
				<div className="tg-sheet-header">
					<div className="flex items-center gap-2.5">
						<div className="w-10 h-10 rounded-xl bg-[var(--tg-accent)]/20 text-[var(--tg-accent)] font-extrabold flex items-center justify-center text-base border border-[var(--tg-accent)]/40">
							{toothNumber}
						</div>
						<div>
							<div className="text-base font-bold text-[var(--tg-text)]">Зуб #{toothNumber}</div>
							<div className="text-xs text-[var(--tg-text-muted)]">{toothInfo.name} • {toothInfo.archName}</div>
						</div>
					</div>
					<button type="button" className="p-2 rounded-full text-[var(--tg-text-muted)] hover:text-[var(--tg-text)] hover:bg-[var(--tg-card-inner)] transition-all" onClick={onClose}>
						<X size={18} />
					</button>
				</div>

				<div className="tg-sheet-body">
					<div className="text-xs font-bold text-[var(--tg-text)] mb-2 uppercase tracking-wider">Что вас беспокоит в этом зубе?</div>
					<div className="space-y-2">
						{TOOTH_COMPLAINT_CATALOG.map((item) => {
							const isSelected = activeComplaintType === item.id;
							const Icon = item.icon;
							return (
								<button key={item.id} type="button" className={`tg-symptom-card ${isSelected ? "selected" : ""}`} onClick={() => onSelectComplaintType(item.id)}>
									<div className="flex items-start gap-2.5 min-w-0">
										<div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isSelected ? "bg-[var(--tg-accent)] text-white" : "bg-[var(--tg-border)] text-[var(--tg-text)]"}`}>
											<Icon size={16} />
										</div>
										<div className="text-left min-w-0">
											<div className="text-xs font-bold text-[var(--tg-text)] flex items-center gap-1.5">
												<span>{item.label}</span>
												{item.cito && <span className="text-[9px] bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 px-1 py-0.2 rounded font-extrabold">⚡ Срочно!</span>}
											</div>
											<div className="text-[11px] text-[var(--tg-text-muted)] leading-tight mt-0.5">{item.description}</div>
										</div>
									</div>
									{isSelected && <div className="w-5 h-5 rounded-full bg-[var(--tg-accent)] text-white flex items-center justify-center flex-shrink-0"><Check size={13} strokeWidth={3} /></div>}
								</button>
							);
						})}
					</div>

					<div className="mt-4 pt-3 border-t border-[var(--tg-border)]">
						<div className="flex items-center justify-between text-xs text-[var(--tg-text)] mb-2">
							<span className="font-semibold flex items-center gap-1"><HeartPulse size={14} className="text-red-500" /><span>Интенсивность боли:</span></span>
							<span className="font-bold text-[var(--tg-accent)]">
								{painLevel === 1 && "1 — Лёгкий дискомфорт"}{painLevel === 2 && "2 — Терпимая боль"}{painLevel === 3 && "3 — Умеренная боль"}{painLevel === 4 && "4 — Сильная боль"}{painLevel === 5 && "5 — Нестерпимая острая боль!"}
							</span>
						</div>
						<div className="flex gap-1.5">
							{[1, 2, 3, 4, 5].map((lvl) => (
								<button key={lvl} type="button" className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition-all ${painLevel >= lvl ? (lvl >= 4 ? "bg-red-600 text-white border-red-400 shadow-md" : "bg-[var(--tg-accent)] text-white border-teal-400 shadow-sm") : "bg-[var(--tg-card-inner)] border-[var(--tg-border)] text-[var(--tg-text-muted)]"}`} onClick={() => onSelectPainLevel(lvl)}>
									{lvl}
								</button>
							))}
						</div>
					</div>

					<div className="mt-3">
						<label className="text-[11px] font-semibold text-[var(--tg-text-muted)] mb-1 block">Дополнительный комментарий врачу (необязательно):</label>
						<input type="text" placeholder="Например: болит уже 3 дня, реагирует на горячий чай" value={notes} onChange={(e) => onChangeNotes(e.target.value)} className="w-full bg-[var(--tg-card-inner)] border border-[var(--tg-border)] rounded-xl px-3 py-2 text-xs text-[var(--tg-text)] placeholder:text-[var(--tg-text-muted)] focus:outline-none focus:border-[var(--tg-accent)]" />
					</div>

					<div className="mt-4 pt-2 space-y-2">
						<button type="button" className="tg-cta-button" onClick={onConfirm}><Check size={16} /><span>Сохранить жалобу на зуб #{toothNumber}</span></button>
						{hasExistingComplaint && (
							<button type="button" className="w-full py-2.5 px-4 rounded-xl bg-[var(--tg-card-inner)] hover:bg-red-500/10 text-red-500 font-semibold text-xs flex items-center justify-center gap-1.5 border border-[var(--tg-border)] transition-all" onClick={onDelete}>
								<Trash2 size={14} /><span>Удалить жалобу с этого зуба</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
