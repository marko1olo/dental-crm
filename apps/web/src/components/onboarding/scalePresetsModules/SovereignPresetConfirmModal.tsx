import React from "react";
import { Check, CheckCircle2, Clock } from "lucide-react";
import type { SovereignPresetDefinition } from "./scalePresetsTypesAndConstants";

export interface SovereignPresetConfirmModalProps {
	readonly confirmingPreset: SovereignPresetDefinition | null;
	readonly isApplying: boolean;
	readonly onClose: () => void;
	readonly onConfirm: (preset: SovereignPresetDefinition) => void;
}

export const SovereignPresetConfirmModal: React.FC<SovereignPresetConfirmModalProps> = React.memo(({
	confirmingPreset,
	isApplying,
	onClose,
	onConfirm,
}) => {
	if (!confirmingPreset) return null;
	const Icon = confirmingPreset.icon;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
			data-testid="scale-preset-confirm-modal"
		>
			<div
				className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
				role="dialog"
				aria-modal="true"
				aria-labelledby="confirm-scale-preset-title"
			>
				<div className="flex items-start gap-3">
					<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
						<Icon size={22} aria-hidden="true" />
					</div>
					<div className="flex-1">
						<h3
							id="confirm-scale-preset-title"
							className="m-0 text-base font-bold text-[var(--ink)] leading-snug"
						>
							Применить пресет «{confirmingPreset.title}»?
						</h3>
						<p className="m-0 mt-1 text-xs text-[var(--muted)]">
							{confirmingPreset.recommendationText}
						</p>
					</div>
				</div>

				<div className="p-3 rounded-xl bg-[var(--line)]/30 border border-[var(--line)] space-y-2">
					<div className="text-xs font-semibold text-[var(--ink)] flex items-center justify-between">
						<span>Оптимизация кресел:</span>
						<span className="text-teal-600 dark:text-teal-400 font-bold">
							{confirmingPreset.chairsCountText}
						</span>
					</div>
					<ul className="text-xs text-[var(--muted)] space-y-1.5 pl-0 list-none m-0">
						{confirmingPreset.features.slice(0, 3).map((f, i) => (
							<li key={i} className="flex items-center gap-2">
								<CheckCircle2 size={13} className="text-teal-600 shrink-0" aria-hidden="true" />
								<span>{f}</span>
							</li>
						))}
					</ul>
				</div>

				<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
					<button
						type="button"
						onClick={onClose}
						disabled={isApplying}
						className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
						data-testid="cancel-preset-modal-btn"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={() => onConfirm(confirmingPreset)}
						disabled={isApplying}
						className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
						data-testid="confirm-preset-modal-btn"
					>
						{isApplying ? (
							<>
								<Clock size={14} className="animate-spin" aria-hidden="true" />
								Применение...
							</>
						) : (
							<>
								<Check size={14} aria-hidden="true" />
								Применить пресет
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
});

SovereignPresetConfirmModal.displayName = "SovereignPresetConfirmModal";
