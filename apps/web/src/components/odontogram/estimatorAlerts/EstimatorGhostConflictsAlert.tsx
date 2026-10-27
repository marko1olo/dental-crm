import type React from "react";
import { AlertTriangle } from "lucide-react";
import type { GhostToothConflict } from "../treatmentEstimatorPricing";

export interface EstimatorGhostConflictsAlertProps {
	readonly ghostConflicts?: readonly GhostToothConflict[] | undefined;
	readonly onReplaceWithImplant?: ((toothNumber: number) => void) | undefined;
	readonly onRestoreToothStatus?: ((toothNumber: number) => void) | undefined;
	readonly onRemoveItemByTooth?: ((toothNumber: number) => void) | undefined;
}

export const EstimatorGhostConflictsAlert: React.FC<EstimatorGhostConflictsAlertProps> = ({
	ghostConflicts,
	onReplaceWithImplant,
	onRestoreToothStatus,
	onRemoveItemByTooth,
}) => {
	if (!ghostConflicts || ghostConflicts.length === 0) return null;

	return (
		<div
			role="alert"
			className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-800"
			data-testid="ghost-teeth-conflicts-alert"
		>
			<AlertTriangle
				size={16}
				className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
				aria-hidden="true"
			/>
			<div className="flex-1 min-w-0 break-words">
				<div className="font-bold text-sm">
					Обнаружены зубы-призраки в плане лечения ({ghostConflicts.length}):
				</div>
				<div className="mt-1 text-slate-700 dark:text-zinc-300">
					В плане лечения присутствуют услуги на зубы, которые отмечены как
					удаленные на зубной формуле. Доступна автоматическая корректировка:
				</div>
				<div className="mt-2 flex flex-col gap-2">
					{ghostConflicts.map((c) => (
						<div
							key={c.toothNumber}
							className="p-2 rounded-md bg-white/70 dark:bg-zinc-900/70 border border-amber-200 dark:border-amber-900 flex flex-wrap items-center justify-between gap-2"
						>
							<div className="min-w-0">
								<span className="font-bold text-amber-800 dark:text-amber-300">
									Зуб {c.toothNumber}:
								</span>{" "}
								<span>{c.warningBadgeText}</span>
							</div>
							<div className="flex items-center gap-1.5 flex-wrap shrink-0">
								{onReplaceWithImplant && (
									<button
										type="button"
										onClick={() => onReplaceWithImplant(c.toothNumber)}
										className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
									>
										Заменить на имплантацию
									</button>
								)}
								{onRestoreToothStatus && (
									<button
										type="button"
										onClick={() => onRestoreToothStatus(c.toothNumber)}
										className="px-2 py-0.5 text-[11px] font-bold rounded bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
									>
										Восстановить статус на формуле
									</button>
								)}
								{onRemoveItemByTooth && (
									<button
										type="button"
										onClick={() => onRemoveItemByTooth(c.toothNumber)}
										className="px-2 py-0.5 text-[11px] font-bold rounded bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 hover:bg-rose-200 transition-colors cursor-pointer"
									>
										Удалить услугу
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
