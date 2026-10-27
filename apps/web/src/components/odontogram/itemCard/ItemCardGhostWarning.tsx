import type React from "react";
import { AlertTriangle, ArrowRightLeft, RotateCcw, Trash2 } from "lucide-react";
import {
	type GhostToothConflict,
	isDeciduousFdiToothNumber,
	type PlanItem,
} from "../treatmentEstimatorPricing";

export interface ItemCardGhostWarningProps {
	readonly item: PlanItem;
	readonly ghostConflict?: GhostToothConflict | null | undefined;
	readonly onReplaceWithImplant?: ((toothNumber: number) => void) | undefined;
	readonly onRestoreToothStatus?: ((toothNumber: number) => void) | undefined;
	readonly onRemoveClick: () => void;
}

export const ItemCardGhostWarning: React.FC<ItemCardGhostWarningProps> = ({
	item,
	ghostConflict,
	onReplaceWithImplant,
	onRestoreToothStatus,
	onRemoveClick,
}) => {
	if (!ghostConflict) return null;

	const toothNum = item.toothNumber;

	return (
		<div
			className="mt-2 p-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-100 text-xs"
			role="alert"
			data-testid={`ghost-tooth-warning-${toothNum}`}
		>
			<div className="flex items-start gap-2">
				<AlertTriangle
					size={15}
					className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
					aria-hidden="true"
				/>
				<div className="flex-1 min-w-0">
					<div className="font-bold leading-snug">
						{ghostConflict.warningBadgeText}
					</div>
					<div className="mt-2 flex items-center gap-2 flex-wrap">
						{onReplaceWithImplant &&
							toothNum !== undefined &&
							!isDeciduousFdiToothNumber(toothNum) && (
								<button
									type="button"
									onClick={() => onReplaceWithImplant(toothNum)}
									className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
									title="Заменить позицию на дентальную имплантацию"
									data-testid={`btn-ghost-replace-implant-${toothNum}`}
								>
									<ArrowRightLeft size={12} />
									<span>Заменить на имплантацию</span>
								</button>
							)}
						{onRestoreToothStatus && toothNum !== undefined && (
							<button
								type="button"
								onClick={() => onRestoreToothStatus(toothNum)}
								className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-white dark:bg-zinc-800 border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer"
								title="Восстановить статус зуба на формуле (врачебная автономия)"
								data-testid={`btn-ghost-restore-tooth-${toothNum}`}
							>
								<RotateCcw size={12} />
								<span>Восстановить статус на формуле</span>
							</button>
						)}
						<button
							type="button"
							onClick={onRemoveClick}
							className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 hover:bg-rose-200 dark:hover:bg-rose-900/70 transition-colors cursor-pointer"
							title="Удалить недействительную услугу"
							data-testid={`btn-ghost-remove-item-${toothNum}`}
						>
							<Trash2 size={12} />
							<span>Удалить услугу</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
