/**
 * @dental/web/components/anesthesia/quickBar/AnesthesiaMobileDrawer.tsx
 * Native Mobile Bottom Sheet Drawer for Anesthesia (Apple HIG Mandates 8ze, 8am, 8e)
 * 36x5px Drag Handle, min-h-[44px] touch target, sticky primary CTA, 0px horizontal scroll.
 */

import React from "react";
import { CheckCircle2, Syringe, X } from "lucide-react";
import {
	CARPULE_PRESETS,
	CLINICAL_FAST_PRESETS,
	type AnestheticDrugId,
	type InjectionTechniqueId,
} from "../anesthesiaCatalogData";

export interface AnesthesiaMobileDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly techniqueId: InjectionTechniqueId;
	readonly onSelectTechnique: (tech: InjectionTechniqueId) => void;
	readonly selectedDrugId: AnestheticDrugId | "none";
	readonly carpulesCount: number;
	readonly onSelectCount: (count: number) => void;
	readonly onDecrease: () => void;
	readonly onIncrease: () => void;
	readonly isAspirationNegative: boolean;
	readonly onToggleAspiration: () => void;
	readonly onApplyAnesthesia: (drugId: AnestheticDrugId | "none", count: number, technique?: InjectionTechniqueId) => void;
}

export function AnesthesiaMobileDrawer({
	isOpen,
	onClose,
	techniqueId,
	onSelectTechnique,
	selectedDrugId,
	carpulesCount,
	onSelectCount,
	onDecrease,
	onIncrease,
	isAspirationNegative,
	onToggleAspiration,
	onApplyAnesthesia,
}: AnesthesiaMobileDrawerProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity lg:hidden anesthesia-mobile-sheet"
			data-testid="anesthesia-mobile-sheet"
			onClick={onClose}
		>
			<div
				className="w-full max-w-lg bg-[var(--paper)] rounded-t-[24px] p-4 shadow-2xl border-t border-[var(--line)] flex flex-col gap-3 max-h-[85vh] overflow-y-auto max-w-full overflow-x-clip"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Нативный Drag Handle 36x5px (Apple HIG Mandate 8ze) */}
				<div className="w-[36px] h-[5px] bg-[var(--line-strong)] rounded-full mx-auto shrink-0 mb-1" />

				<div className="flex items-center justify-between pb-1 border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<Syringe className="w-5 h-5 text-teal-600 shrink-0" />
						<h3 className="text-sm font-bold text-[var(--ink)]">Обезболивание у кресла</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть"
						className="anesthesia-sheet-close-btn p-2 min-h-[44px] min-w-[44px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] bg-transparent hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer border border-transparent"
					>
						<X size={20} />
					</button>
				</div>

				<div className="flex rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 gap-1" role="group" aria-label="Техника анестезии">
					<button
						type="button"
						onClick={() => onSelectTechnique("infiltration")}
						className={`flex-1 py-2 min-h-[44px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${techniqueId === "infiltration" ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)] shadow-2xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
					>
						Инфильтрация
					</button>
					<button
						type="button"
						onClick={() => onSelectTechnique("mandibular_torus")}
						className={`flex-1 py-2 min-h-[44px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${techniqueId === "mandibular_torus" ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)] shadow-2xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
					>
						Проводниковая
					</button>
					<button
						type="button"
						onClick={() => onSelectTechnique("intraligamentary_sta")}
						className={`flex-1 py-2 min-h-[44px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${techniqueId === "intraligamentary_sta" ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)] shadow-2xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
					>
						Интралигамент.
					</button>
				</div>

				<div className="flex flex-col gap-2">
					<span className="text-xs font-bold text-[var(--ink)]">Препарат:</span>
					{CLINICAL_FAST_PRESETS.map((cp) => (
						<button
							key={cp.testId}
							type="button"
							onClick={() => {
								onApplyAnesthesia(cp.drugId, cp.drugId === "none" ? 0 : carpulesCount, cp.defaultTechnique ?? techniqueId);
								onClose();
							}}
							className={`w-full flex items-center justify-between p-3 min-h-[48px] rounded-xl border text-xs font-semibold cursor-pointer active:scale-98 transition-all ${selectedDrugId === cp.drugId ? "border-2 border-[#0d9488] bg-[var(--teal-surface)] text-[var(--ink)] font-bold shadow-2xs" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[#0d9488]"}`}
						>
							<div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
								{cp.drugId === "none" ? (
									<CheckCircle2 size={16} className="text-slate-500 shrink-0" />
								) : (
									<Syringe size={16} className={cp.isCardioRecommended ? "text-amber-600 shrink-0" : "text-teal-600 shrink-0"} />
								)}
								<span className="truncate text-left block text-xs">{cp.shortLabelRu}</span>
							</div>
							<span className="text-[var(--muted)] text-[11px] shrink-0 text-right whitespace-nowrap">{cp.subLabelRu}</span>
						</button>
					))}
				</div>

				<div className="flex flex-col gap-1.5 pt-1">
					<span className="text-xs font-bold text-[var(--ink)]">Количество карпул:</span>
					<div className="flex items-center gap-1.5 flex-wrap">
						<fieldset className="flex-1 inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 m-0 min-h-[44px]" aria-label="Быстрый выбор карпул">
							{CARPULE_PRESETS.map((cp) => (
								<button
									key={cp.count}
									type="button"
									onClick={() => onSelectCount(cp.count)}
									className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[44px] inline-flex items-center justify-center ${carpulesCount === cp.count ? "bg-[var(--teal-surface)] text-[var(--teal-strong)] font-bold border border-[var(--teal)] shadow-2xs" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
								>
									{cp.label}
								</button>
							))}
						</fieldset>
						<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0">
							<button
								type="button"
								onClick={onDecrease}
								className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer"
								aria-label="Уменьшить дозу"
							>
								−
							</button>
							<span className="px-2.5 text-xs font-bold font-mono text-[var(--ink)]">
								{carpulesCount}
							</span>
							<button
								type="button"
								onClick={onIncrease}
								className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-xs font-black text-[var(--ink)] bg-[var(--paper)] border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer"
								aria-label="Увеличить дозу"
							>
								+
							</button>
						</div>
					</div>
				</div>

				<label className="inline-flex items-center gap-2.5 p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-medium cursor-pointer select-none">
					<input
						type="checkbox"
						checked={isAspirationNegative}
						onChange={onToggleAspiration}
						className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
					/>
					<span className="text-[var(--ink)]">Аспирационная проба отрицательная (−)</span>
				</label>

				{/* РОВНО ОДНА PRIMARY CTA КНОПКА #0d9488 — МАНДАТ 8am & 8e (НИКОГДА НЕ DISABLED) */}
				<div className="pt-2 sticky bottom-0 bg-[var(--paper)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					<button
						type="button"
						onClick={() => {
							onApplyAnesthesia(selectedDrugId, carpulesCount);
							onClose();
						}}
						className="primary-button w-full py-3.5 min-h-[48px] rounded-xl border border-[#0f766e] bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm active:scale-98"
						data-testid="btn-mobile-sheet-apply-anesthesia"
					>
						<CheckCircle2 size={16} />
						<span>Внести в карту приёма ({carpulesCount} карп.)</span>
					</button>
				</div>
			</div>
		</div>
	);
}
