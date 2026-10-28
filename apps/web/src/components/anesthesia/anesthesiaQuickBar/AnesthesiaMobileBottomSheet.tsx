/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaMobileBottomSheet.tsx
 * Apple iOS HIG Mobile Bottom Sheet Drawer for Anesthesia (Mandate 8e, 8al, <= 120 lines)
 */

import { AlertTriangle, CheckCircle2, Syringe, X } from "lucide-react";
import React from "react";
import type { AnestheticDrugId, InjectionTechniqueId } from "../anesthesiaCatalog";
import { CLINICAL_FAST_PRESETS, type ClinicalFastPresetItem } from "./primaryDrugs";

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
	readonly isOverdose?: boolean | undefined;
	readonly maxSafeCarpulesCount?: number | undefined;
}

export function AnesthesiaMobileBottomSheet({
	isOpen, onClose, carpulesCount, setCarpulesCount, selectedDrugId, techniqueId, setTechniqueId, onApplyDirect, isOverdose, maxSafeCarpulesCount,
}: AnesthesiaMobileBottomSheetProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity lg:hidden anesthesia-mobile-sheet" data-testid="anesthesia-mobile-sheet" onClick={onClose}>
			<div className="w-full max-w-lg bg-[var(--paper)] rounded-t-[24px] p-4 shadow-2xl border-t border-[var(--line)] flex flex-col gap-3 max-h-[85vh] overflow-y-auto max-w-full overflow-x-clip" onClick={(e) => e.stopPropagation()}>
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
					<button type="button" onClick={() => setTechniqueId("intraligamentary_sta")} className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold transition-all cursor-pointer ${techniqueId === "intraligamentary_sta" ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border border-[var(--teal)]" : "anesthesia-tab-unselected"}`}>
						Интралигаментарная
					</button>
				</div>

				<div className="flex flex-col gap-2 pt-1">
					{CLINICAL_FAST_PRESETS.map((p: ClinicalFastPresetItem) => {
						const isSelected = selectedDrugId === p.drugId;
						const activeCls = isSelected
							? p.isCardioRecommended ? "border-amber-600 bg-amber-500/10 text-[var(--ink)] ring-1 ring-amber-600/30" : "border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--ink)] ring-1 ring-[var(--teal,#0d9488)]/30"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]";

						return (
							<button key={p.testId} type="button" onClick={() => onApplyDirect(p.drugId, p.count, p.defaultTechnique ?? techniqueId)} className={`w-full min-h-[48px] px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${activeCls}`}>
								<div>
									<div className="text-xs font-bold text-[var(--ink)]">{p.shortLabelRu}</div>
									<div className="text-[11px] text-[var(--muted)]">{p.clinicalScopeRu}</div>
								</div>
								<span className="text-xs font-bold text-[var(--teal,#0d9488)] shrink-0">{p.volumeMl > 0 ? `${p.volumeMl} мл` : "0 мл"}</span>
							</button>
						);
					})}
				</div>

				{isOverdose && maxSafeCarpulesCount && carpulesCount > maxSafeCarpulesCount && (
					<div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5" data-testid="mobile-anesthesia-passive-warning">
						<AlertTriangle size={13} className="text-amber-600 shrink-0" />
						<span>Доза выше стандартной нормы (макс. {maxSafeCarpulesCount} карп.)</span>
					</div>
				)}

				<div className="flex flex-col gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-bold text-[var(--ink)]">Дозировка: {carpulesCount} карп. ({(carpulesCount * 1.7).toFixed(1)} мл)</span>
						<div className="flex items-center gap-1">
							<button type="button" disabled={carpulesCount <= 0.5} onClick={() => setCarpulesCount(Math.max(0.5, carpulesCount - 0.5))} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-30" data-testid="btn-decrease-carpules-mobile">−</button>
							<button type="button" disabled={carpulesCount >= 10.0} onClick={() => setCarpulesCount(Math.min(10.0, carpulesCount + 0.5))} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-30" data-testid="btn-increase-carpules-mobile">+</button>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2 pt-1">
						<button type="button" onClick={() => setCarpulesCount(1.0)} className={`min-h-[44px] py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${carpulesCount === 1.0 ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border-[var(--teal)] shadow-2xs" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"}`} data-testid="btn-dose-1carp-mobile">
							1 карпула (1.7 мл)
						</button>
						<button type="button" onClick={() => setCarpulesCount(2.0)} className={`min-h-[44px] py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${carpulesCount === 2.0 ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] border-[var(--teal)] shadow-2xs" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"}`} data-testid="btn-dose-2carp-mobile">
							2 карпулы (3.4 мл)
						</button>
					</div>
				</div>

				<div className="pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
					<button type="button" onClick={() => { onApplyDirect(selectedDrugId, carpulesCount, techniqueId); onClose(); }} className="primary-button w-full min-h-[48px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98" data-testid="btn-apply-anesthesia-mobile-to-card">
						<CheckCircle2 size={16} />
						<span>Применить анестезию</span>
					</button>
				</div>
			</div>
		</div>
	);
}
