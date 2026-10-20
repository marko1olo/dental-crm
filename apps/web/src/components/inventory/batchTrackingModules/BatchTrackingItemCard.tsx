import { ArrowDownToLine, ArrowUpFromLine, Clock, Trash2 } from "lucide-react";
import type React from "react";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { EnrichedBatch } from "./batchTrackingTypes.js";

export interface BatchTrackingItemCardProps {
	readonly batch: EnrichedBatch;
	readonly onDeductBatch?:
		| ((
				item: InventoryItem,
				qty: number,
				lotNumber: string,
		  ) => void | Promise<void>)
		| undefined;
	readonly onReceiveBatch?:
		| ((
				item: InventoryItem,
				qty: number,
				lotNumber: string,
				expirationDate: string,
		  ) => void | Promise<void>)
		| undefined;
	readonly onWriteOffExpired?:
		| ((item: InventoryItem, lotNumber: string) => void)
		| undefined;
}

export const BatchTrackingItemCard: React.FC<BatchTrackingItemCardProps> = ({
	batch,
	onDeductBatch,
	onReceiveBatch,
	onWriteOffExpired,
}) => {
	const isExpired = batch.fefoStatus === "red";
	const isWarning = batch.fefoStatus === "yellow";
	const isOverdraft = batch.quantity < 0;

	return (
		<div
			className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors ${
				isExpired
					? "bg-rose-500/5 border-rose-500/30"
					: isWarning
						? "bg-amber-500/5 border-amber-500/30"
						: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/40"
			}`}
			data-testid={`batch-card-${batch.item.id}`}
		>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap mb-1">
					<span className="font-bold text-xs text-[var(--ink)] truncate">
						{batch.item.name}
					</span>
					<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
						Серия: {batch.lotNumber}
					</span>
					{batch.item.sku && (
						<span className="text-[11px] text-[var(--muted)]">
							{batch.item.sku}
						</span>
					)}
				</div>
				<div className="flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap">
					<span className="flex items-center gap-1 font-medium">
						<Clock
							size={13}
							className={
								isExpired
									? "text-rose-600"
									: isWarning
										? "text-amber-600"
										: "text-teal-600"
							}
						/>
						Срок годности: <strong>{batch.expirationDate}</strong>
					</span>
					<span
						className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
							isExpired
								? "bg-rose-500/20 text-rose-800 dark:text-rose-200"
								: isWarning
									? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
									: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
						}`}
					>
						{batch.fefoBadge}
					</span>
					<span className="font-semibold text-[var(--ink)]">
						Остаток:{" "}
						<span
							className={
								isOverdraft ? "text-amber-600 dark:text-amber-400" : ""
							}
						>
							{batch.quantity} {batch.item.unit || "шт."}
						</span>
						{isOverdraft && " (расход сверх остатка)"}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				{isExpired ? (
					<button
						type="button"
						onClick={() => onWriteOffExpired?.(batch.item, batch.lotNumber)}
						className="h-8 min-h-[32px] sm:h-8 px-3 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
						data-testid={`btn-writeoff-expired-${batch.item.id}`}
						title="Списать просроченную серию по акту утилизации"
					>
						<Trash2 size={13} />
						<span>Акт утилизации</span>
					</button>
				) : (
					<>
						<button
							type="button"
							onClick={() => onDeductBatch?.(batch.item, 1, batch.lotNumber)}
							className="h-8 min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-semibold border border-[var(--line)] text-[var(--ink)] hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-500 transition-all flex items-center gap-1.5 cursor-pointer"
							data-testid={`btn-deduct-batch-${batch.item.id}`}
							title="Списать 1 ед. из этой серии по регламенту FEFO"
						>
							<ArrowDownToLine
								size={13}
								className="text-teal-600 dark:text-teal-400"
							/>
							<span>Списать по FEFO</span>
						</button>
						<button
							type="button"
							onClick={() =>
								onReceiveBatch?.(
									batch.item,
									10,
									batch.lotNumber,
									batch.expirationDate,
								)
							}
							className="h-8 min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-semibold border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all flex items-center gap-1 cursor-pointer"
							data-testid={`btn-receive-batch-${batch.item.id}`}
							title="Оприходовать партию (+10 ед.)"
						>
							<ArrowUpFromLine size={13} className="text-emerald-600" />
							<span>+10</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
};
