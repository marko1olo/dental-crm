import { Syringe, X } from "lucide-react";
import type { AnestheticDrugId } from "../anesthesiaCatalog";
import { AnesthesiaMobileDrawerPresets } from "./AnesthesiaMobileDrawerPresets";
import { AnesthesiaMobileDrawerVolume } from "./AnesthesiaMobileDrawerVolume";

export interface AnesthesiaMobileDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly disabled?: boolean | undefined;
	readonly selectedDrugId: AnestheticDrugId | string;
	readonly selectedCarpulesCount: number;
	readonly onSelectCarpulesCount: (count: number) => void;
	readonly onApplyUltracainForte: () => void;
	readonly onApplySeptanest100k?: (() => void) | undefined;
	readonly onApplyUltracain200k: () => void;
	readonly onApplyScandonestCardio: () => void;
	readonly onApplyNoAnesthesia: () => void;
	readonly onApplyCurrent: () => void;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
}

export function AnesthesiaMobileDrawer(props: AnesthesiaMobileDrawerProps) {
	if (!props.isOpen) return null;

	const handleStep = (delta: number) =>
		props.onSelectCarpulesCount(
			Math.min(
				6.0,
				Math.max(
					0.5,
					Math.round((props.selectedCarpulesCount + delta) * 10) / 10,
				),
			),
		);

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden"
			role="dialog"
			aria-modal="true"
		>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
				onClick={props.onClose}
				aria-hidden="true"
			/>
			<div className="relative z-10 w-full max-h-[85dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl overflow-x-clip">
				<div className="flex justify-center pt-3 pb-1 cursor-grab">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>
				<div className="flex items-center justify-between px-4 py-2 border-b border-[var(--line-subtle)]">
					<span className="text-base font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Syringe size={16} className="text-teal-600" />
						<span>Экспресс-анестезия (1 клик)</span>
					</span>
					<button
						type="button"
						onClick={props.onClose}
						className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)]"
						aria-label="Закрыть"
					>
						<X size={16} />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 overscroll-contain">
					{(props.hasLidocaineAllergy || props.hasArticaineAllergy) && (
						<div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold">
							⚠️ Аллергия: {props.hasLidocaineAllergy ? "Лидокаин" : ""}{" "}
							{props.hasArticaineAllergy ? "Артикаин" : ""} (рекомендован
							Скандонест 3%)
						</div>
					)}
					<AnesthesiaMobileDrawerPresets
						disabled={props.disabled}
						onApplyUltracainForte={props.onApplyUltracainForte}
						onApplySeptanest100k={props.onApplySeptanest100k}
						onApplyUltracain200k={props.onApplyUltracain200k}
						onApplyScandonestCardio={props.onApplyScandonestCardio}
						onApplyNoAnesthesia={props.onApplyNoAnesthesia}
						onClose={props.onClose}
					/>
					<AnesthesiaMobileDrawerVolume
						disabled={props.disabled}
						selectedCarpulesCount={props.selectedCarpulesCount}
						onStep={handleStep}
					/>
				</div>
				<div className="p-4 border-t border-[var(--line-subtle)] bg-[var(--paper)] pb-[max(16px,env(safe-area-inset-bottom))]">
					<button
						type="button"
						disabled={props.disabled}
						onClick={() => {
							props.onApplyCurrent();
							props.onClose();
						}}
						className="w-full min-h-[48px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
					>
						<Syringe size={16} />
						<span>
							Применить выбранное ({props.selectedCarpulesCount} карп.)
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}
