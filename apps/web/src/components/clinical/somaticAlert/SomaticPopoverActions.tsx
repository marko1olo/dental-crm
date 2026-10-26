import { CheckCircle2, Copy, FileText } from "lucide-react";
import React from "react";

export interface SomaticPopoverActionsProps {
	readonly onSyncToDiary: (e?: React.MouseEvent) => void;
	readonly onApplyNorm: (e?: React.MouseEvent) => void;
	readonly onOpenAnamnesisModal?: (() => void) | undefined;
}

export const SomaticPopoverActions: React.FC<SomaticPopoverActionsProps> = ({
	onSyncToDiary,
	onApplyNorm,
	onOpenAnamnesisModal,
}) => {
	return (
		<div className="flex items-center justify-between gap-1.5 border-t border-[var(--line)] pt-2 flex-wrap">
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={onSyncToDiary}
					data-testid="btn-somatic-copy-diary"
					className="secondary-button h-7 px-2 text-xs font-medium flex items-center gap-1 cursor-pointer rounded-md text-sky-700 dark:text-sky-300 border-sky-500/40 hover:bg-sky-50 dark:hover:bg-sky-950/30"
					title="Скопировать предупреждения и рекомендации в дневник приёма"
				>
					<Copy size={12} className="shrink-0" />
					<span>В дневник приёма</span>
				</button>

				{onOpenAnamnesisModal && (
					<button
						type="button"
						onClick={onOpenAnamnesisModal}
						data-testid="btn-somatic-open-modal"
						className="secondary-button h-7 px-2 text-xs font-medium flex items-center gap-1 cursor-pointer rounded-md text-[var(--ink)]"
						title="Редактировать анкету здоровья пациента"
					>
						<FileText size={12} className="shrink-0" />
						<span>Анкета</span>
					</button>
				)}
			</div>

			<button
				type="button"
				onClick={onApplyNorm}
				data-testid="btn-somatic-confirm-norm"
				className="secondary-button h-7 px-2 text-xs font-bold flex items-center gap-1 cursor-pointer rounded-md text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
				title="Патология исключена: зафиксировать норму"
			>
				<CheckCircle2 size={12} className="shrink-0" />
				<span>Норма (патология исключена)</span>
			</button>
		</div>
	);
};
