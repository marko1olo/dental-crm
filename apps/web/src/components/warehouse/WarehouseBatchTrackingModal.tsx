import { Package, ShieldAlert } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { BatchTrackingFilterBar } from "./batchTrackingModules/BatchTrackingFilterBar.js";
import { BatchTrackingHeader } from "./batchTrackingModules/BatchTrackingHeader.js";
import { BatchTrackingItemCard } from "./batchTrackingModules/BatchTrackingItemCard.js";
import type { WarehouseBatchTrackingModalProps } from "./batchTrackingModules/batchTrackingTypes.js";
import { useWarehouseBatchData } from "./batchTrackingModules/useWarehouseBatchData.js";

export { type WarehouseBatchTrackingModalProps } from "./batchTrackingModules/batchTrackingTypes.js";

/**
 * Модальное окно партионного учёта FEFO (First Expired, First Out)
 * по СанПиН 3.3686-21 и Мандатам 8e, 8n (лимит <= 120 строк).
 * Гарантирует списание партий с минимальным остаточным сроком годности.
 */
export const WarehouseBatchTrackingModal: React.FC<WarehouseBatchTrackingModalProps> = ({
	isOpen,
	onClose,
	items,
	selectedItem,
	onDeductBatch,
	onReceiveBatch,
	onWriteOffExpired,
}) => {
	const {
		searchQuery,
		setSearchQuery,
		activeFilter,
		setActiveFilter,
		selectedTargetItem,
		setSelectedTargetItem,
		filteredBatches,
		stats,
	} = useWarehouseBatchData(items, selectedItem);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[1100] flex items-center justify-center backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
			style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }}
			data-testid="warehouse-batch-tracking-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Партионный учёт и контроль сроков годности FEFO"
		>
			<div className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
				<BatchTrackingHeader onClose={onClose} />
				<BatchTrackingFilterBar
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					activeFilter={activeFilter}
					onFilterChange={setActiveFilter}
					stats={stats}
					hasTargetItem={Boolean(selectedTargetItem)}
					onResetTargetItem={() => setSelectedTargetItem(null)}
				/>
				<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 min-h-[240px]">
					{filteredBatches.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-48 text-[var(--muted)] text-xs gap-2">
							<Package size={28} className="stroke-[1.5]" />
							<p className="font-medium">Партии по выбранным критериям не найдены</p>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{filteredBatches.map((batch) => (
								<BatchTrackingItemCard
									key={`${batch.item.id}-${batch.lotNumber}`}
									batch={batch}
									onDeductBatch={onDeductBatch}
									onReceiveBatch={onReceiveBatch}
									onWriteOffExpired={onWriteOffExpired}
								/>
							))}
						</div>
					)}
				</div>
				<footer className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
					<div className="flex items-center gap-2">
						<ShieldAlert size={14} className="text-teal-600 shrink-0" />
						<span>
							Правило FEFO: при отпуске материалов в процедурный кабинет система предлагает партию с ближайшим сроком.
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-8 min-h-[32px] sm:h-8 px-4 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
						data-testid="btn-batch-footer-close"
					>
						Закрыть
					</button>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default WarehouseBatchTrackingModal;
