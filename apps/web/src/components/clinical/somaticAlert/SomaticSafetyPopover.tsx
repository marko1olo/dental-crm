import { ShieldAlert, X } from "lucide-react";
import React from "react";
import type { SomaticSafetyEvaluation } from "@dental/shared";
import { SomaticFactorCard } from "./SomaticFactorCard";
import { SomaticPopoverActions } from "./SomaticPopoverActions";

export interface SomaticSafetyPopoverProps {
	readonly evaluation: SomaticSafetyEvaluation;
	readonly popoverRef: React.RefObject<HTMLDivElement | null>;
	readonly onClose: () => void;
	readonly onSyncToDiary: (e?: React.MouseEvent) => void;
	readonly onApplyNorm: (e?: React.MouseEvent) => void;
	readonly onOpenAnamnesisModal?: (() => void) | undefined;
}

export const SomaticSafetyPopover: React.FC<SomaticSafetyPopoverProps> = ({
	evaluation,
	popoverRef,
	onClose,
	onSyncToDiary,
	onApplyNorm,
	onOpenAnamnesisModal,
}) => {
	return (
		<div
			ref={popoverRef}
			data-testid="somatic-safety-alert-popover"
			role="dialog"
			aria-label="Стоматологические стоп-факторы у кресла"
			className="absolute left-0 top-full mt-1.5 w-[360px] sm:w-[460px] max-w-[460px] rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] p-3 text-[var(--ink)] shadow-2xl z-50 flex flex-col gap-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
		>
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
				<div className="flex items-center gap-1.5">
					<ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
					<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)]">
						Стоп-факторы у кресла ({evaluation.stopFactors.length})
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-md p-1 transition-colors cursor-pointer"
					aria-label="Закрыть подсказку"
				>
					<X size={14} />
				</button>
			</div>

			<div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-0.5">
				{evaluation.stopFactors.map((factor) => (
					<SomaticFactorCard key={factor.id} factor={factor} />
				))}
			</div>

			<SomaticPopoverActions
				onSyncToDiary={onSyncToDiary}
				onApplyNorm={onApplyNorm}
				onOpenAnamnesisModal={onOpenAnamnesisModal}
			/>
		</div>
	);
};
