/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaMobileBottomSheet.tsx
 * Apple iOS HIG Mobile Bottom Sheet for Anesthesia (Mandate 8b, <= 120 lines)
 */

import { Syringe, X } from "lucide-react";
import React from "react";
import type { AnestheticDrugId } from "../anesthesiaCatalog";

export interface AnesthesiaMobileBottomSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly carpulesCount: number;
	readonly selectedDrugId: AnestheticDrugId | "none";
	readonly onApplyDirect: (drugId: AnestheticDrugId | "none", count: number) => void;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaMobileBottomSheet({
	isOpen,
	onClose,
	carpulesCount,
	selectedDrugId,
	onApplyDirect,
	disabled = false,
}: AnesthesiaMobileBottomSheetProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
			onClick={onClose}
		>
			<div
				className="w-full max-w-lg bg-[var(--paper)] rounded-t-[24px] p-4 shadow-2xl border-t border-[var(--line)] flex flex-col gap-3 max-h-[85vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="w-10 h-1.5 bg-[var(--line)] rounded-full mx-auto self-center mb-1" />
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Syringe className="w-5 h-5 text-teal-600" />
						<h3 className="text-base font-bold text-[var(--ink)]">Выбор анестезии у кресла</h3>
					</div>
					<button type="button" onClick={onClose} className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)]">
						<X size={18} />
					</button>
				</div>
				<div className="flex flex-col gap-2 pt-1">
					<button
						type="button"
						disabled={disabled}
						onClick={() => { onApplyDirect("articaine_1_100k", carpulesCount); onClose(); }}
						className="w-full min-h-[48px] px-3 py-2.5 rounded-xl border border-emerald-600/40 bg-emerald-500/10 text-left flex items-center justify-between"
					>
						<div>
							<div className="text-xs font-bold text-[var(--ink)]">Ультракаин Д-С Форте 1:100 000</div>
							<div className="text-[11px] text-[var(--muted)]">Артикаин 4% • Стандарт глубокого обезболивания</div>
						</div>
						<span className="text-xs font-bold text-emerald-600">1 карп.</span>
					</button>

					<button
						type="button"
						disabled={disabled}
						onClick={() => { onApplyDirect("articaine_1_200k", carpulesCount); onClose(); }}
						className="w-full min-h-[48px] px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-left flex items-center justify-between"
					>
						<div>
							<div className="text-xs font-bold text-[var(--ink)]">Ультракаин Д-С 1:200 000</div>
							<div className="text-[11px] text-[var(--muted)]">Щадящий адреналин • Терапевтический протокол</div>
						</div>
						<span className="text-xs font-bold text-teal-600">1 карп.</span>
					</button>

					<button
						type="button"
						disabled={disabled}
						onClick={() => { onApplyDirect("mepivacaine_plain", carpulesCount); onClose(); }}
						className="w-full min-h-[48px] px-3 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-left flex items-center justify-between"
					>
						<div>
							<div className="text-xs font-bold text-[var(--ink)]">Скандонест без адреналина (Мепивакаин 3%)</div>
							<div className="text-[11px] text-[var(--muted)]">Без вазоконстриктора • Сердечникам и при аллергии</div>
						</div>
						<span className="text-xs font-bold text-amber-600">1 карп.</span>
					</button>
				</div>

				<button
					type="button"
					disabled={disabled}
					onClick={() => { onApplyDirect(selectedDrugId, carpulesCount); onClose(); }}
					className="primary-button w-full min-h-[48px] rounded-xl bg-teal-600 text-white font-bold text-sm shadow-md mt-2 flex items-center justify-center gap-2"
				>
					<Syringe size={16} />
					<span>{`Применить анестезию (${carpulesCount} карп.)`}</span>
				</button>
			</div>
		</div>
	);
}
