/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaMobileBottomSheet.tsx
 * Apple iOS HIG Mobile Bottom Sheet Drawer for Anesthesia (Mandate 8e, 8al, <= 120 lines)
 */

import { CheckCircle2, Syringe, X } from "lucide-react";
import React from "react";
import type { AnestheticDrugId, InjectionTechniqueId } from "../anesthesiaCatalog";

export interface AnesthesiaMobileBottomSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly carpulesCount: number;
	readonly setCarpulesCount: (count: number) => void;
	readonly selectedDrugId: AnestheticDrugId | "none";
	readonly techniqueId: InjectionTechniqueId;
	readonly setTechniqueId: (t: InjectionTechniqueId) => void;
	readonly onApplyDirect: (drugId: AnestheticDrugId | "none", count: number, tech?: InjectionTechniqueId) => void;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaMobileBottomSheet({
	isOpen,
	onClose,
	carpulesCount,
	setCarpulesCount,
	selectedDrugId,
	techniqueId,
	setTechniqueId,
	onApplyDirect,
}: AnesthesiaMobileBottomSheetProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity lg:hidden anesthesia-mobile-sheet" data-testid="anesthesia-mobile-sheet" onClick={onClose}>
			<div className="w-full max-w-lg bg-[var(--paper)] rounded-t-[24px] p-4 shadow-2xl border-t border-[var(--line)] flex flex-col gap-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
				<div className="w-[36px] h-[5px] bg-[var(--line-strong)] rounded-full mx-auto shrink-0 mb-1" />
				<div className="flex items-center justify-between pb-1 border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<Syringe className="w-5 h-5 text-teal-600 shrink-0" />
						<h3 className="text-sm font-bold text-[var(--ink)]">Обезболивание у кресла</h3>
					</div>
					<button type="button" onClick={onClose} aria-label="Закрыть" className="anesthesia-sheet-close-btn p-2 min-h-[44px] min-w-[44px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer">
						<X size={20} />
					</button>
				</div>

				<div className="flex rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5" role="group">
					<button type="button" onClick={() => setTechniqueId("infiltration")} className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer ${techniqueId === "infiltration" ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border border-[var(--teal)]" : "anesthesia-tab-unselected"}`}>
						Инфильтрационная
					</button>
					<button type="button" onClick={() => setTechniqueId("mandibular_torus")} className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer ${techniqueId === "mandibular_torus" ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border border-[var(--teal)]" : "anesthesia-tab-unselected"}`}>
						Проводниковая
					</button>
				</div>

				<div className="flex flex-col gap-2 pt-1">
					<button type="button" onClick={() => onApplyDirect("articaine_1_100k", 1.0, "infiltration")} className={`w-full min-h-[48px] px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${selectedDrugId === "articaine_1_100k" ? "border-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/20 text-[var(--ink)] ring-1 ring-emerald-600/30" : "border-[var(--line)] bg-[var(--paper)]"}`}>
						<div>
							<div className="text-xs font-bold text-[var(--ink)]">Ультракаин 1:100к (Форте)</div>
							<div className="text-[11px] text-[var(--muted)]">1 карпула 1.7 мл • Инфильтрация • Стандарт</div>
						</div>
						<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">1.7 мл</span>
					</button>

					<button type="button" onClick={() => onApplyDirect("articaine_1_200k", 1.0, "mandibular_torus")} className={`w-full min-h-[48px] px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${selectedDrugId === "articaine_1_200k" ? "border-teal-600 bg-teal-500/10 dark:bg-teal-500/20 text-[var(--ink)] ring-1 ring-teal-600/30" : "border-[var(--line)] bg-[var(--paper)]"}`}>
						<div>
							<div className="text-xs font-bold text-[var(--ink)]">Убистезин (Артикаин 1:200к)</div>
							<div className="text-[11px] text-[var(--muted)]">1 карпула 1.7 мл • Проводниковая • Щадящий адреналин</div>
						</div>
						<span className="text-xs font-bold text-teal-600 dark:text-teal-400">1.7 мл</span>
					</button>

					<button type="button" onClick={() => onApplyDirect("mepivacaine_plain", 1.0, techniqueId)} className={`w-full min-h-[48px] px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${selectedDrugId === "mepivacaine_plain" ? "border-amber-600 bg-amber-500/10 dark:bg-amber-500/20 text-[var(--ink)] ring-1 ring-amber-600/30" : "border-[var(--line)] bg-[var(--paper)]"}`}>
						<div>
							<div className="text-xs font-bold text-[var(--ink)]">Скандонест (без адреналина)</div>
							<div className="text-[11px] text-[var(--muted)]">1 карпула 1.7 мл • Мепивакаин 3% • Кардио-риск</div>
						</div>
						<span className="text-xs font-bold text-amber-600 dark:text-amber-400">1.7 мл</span>
					</button>

					<button
						type="button"
						onClick={() => onApplyDirect("none", 0)}
						className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
							selectedDrugId === "none"
								? "border-slate-500 bg-slate-500/10 text-[var(--ink)] font-bold"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<span className="text-xs font-semibold">Без анестезии (по согласию)</span>
						<span className="text-xs font-bold text-slate-500 shrink-0">0 мл</span>
					</button>
				</div>

				<div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<span className="text-xs font-bold text-[var(--ink)]">Доза: {carpulesCount} карп. ({(carpulesCount * 1.7).toFixed(1)} мл)</span>
					<div className="flex items-center gap-1">
						<button type="button" disabled={carpulesCount <= 0.5} onClick={() => setCarpulesCount(Math.max(0.5, carpulesCount - 0.5))} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-black text-sm flex items-center justify-center cursor-pointer" data-testid="btn-decrease-carpules-mobile">−</button>
						<button type="button" disabled={carpulesCount >= 10.0} onClick={() => setCarpulesCount(Math.min(10.0, carpulesCount + 0.5))} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-black text-sm flex items-center justify-center cursor-pointer" data-testid="btn-increase-carpules-mobile">+</button>
					</div>
				</div>

				<div className="pt-2 pb-[env(safe-area-inset-bottom)]">
					<button type="button" onClick={() => { onApplyDirect(selectedDrugId, carpulesCount, techniqueId); onClose(); }} className="primary-button w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98" data-testid="btn-apply-anesthesia-mobile-to-card">
						<CheckCircle2 size={16} />
						<span>Применить анестезию в протокол</span>
					</button>
				</div>
			</div>
		</div>
	);
}
