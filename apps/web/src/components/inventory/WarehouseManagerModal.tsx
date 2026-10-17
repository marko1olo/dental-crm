import { ShieldAlert } from "lucide-react";
import React, { useState } from "react";
import { showToast } from "../GlobalToast.js";
import {
	type WarehouseManagerModalProps,
	type WarehouseWriteoffItem,
	CANONICAL_WAREHOUSE_PRESETS,
	DEFAULT_WAREHOUSE_ITEMS,
	useWarehouseManagerLogic,
	WarehouseManagerHeader,
	WarehouseManagerToolbar,
	WarehouseManagerTable,
	WarehouseManagerActPreview,
	WarehouseManagerFooter,
} from "./warehouseManagerModules/index.js";

export type { WarehouseWriteoffItem, WarehouseManagerModalProps };
export { CANONICAL_WAREHOUSE_PRESETS, DEFAULT_WAREHOUSE_ITEMS };

export function WarehouseManagerModal(props: WarehouseManagerModalProps) {
	const { isOpen, onClose, onConfirmWriteoff, onOpenInventoryAudit, initialItems, organizationId } = props;
	const doctorName = props.doctorName || "Д-р Кузнецов А.В.";
	const nurseName = props.nurseName || "Иванова Е.В. (старшая медсестра)";
	const cabinetName = props.cabinetName || "Кабинет №1 (Терапия/Хирургия)";
	const logic = useWarehouseManagerLogic(isOpen, initialItems, organizationId);
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!isOpen) return null;

	const handleConfirm = async () => {
		if (logic.activeWriteoffLines.length === 0) {
			showToast("Выберите хотя бы один материал для списания", "warning");
			return;
		}
		setIsSubmitting(true);
		try {
			if (onConfirmWriteoff) await onConfirmWriteoff(logic.activeWriteoffLines);
			showToast(
				logic.hasActiveOverdraft
					? `Списано позиций: ${logic.activeWriteoffLines.length} (расход сверх остатка / списание с дефицитом)`
					: `Успешно списано позиций: ${logic.activeWriteoffLines.length}`,
				"success",
			);
			onClose();
		} catch {
			showToast("Ошибка при фиксации списания", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto" data-testid="warehouse-manager-modal" role="dialog" aria-modal="true" aria-label="Складской учет и списание расходных материалов">
			<div className="bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--border,#e2e8f0)] rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
				<WarehouseManagerHeader
					activeView={logic.activeView}
					onBackToInventory={() => logic.setActiveView("inventory")}
					onOpenInventoryAudit={onOpenInventoryAudit}
					onSwitchToAct={() => logic.setActiveView("act_preview")}
					onClose={onClose}
					writeoffCount={logic.activeWriteoffLines.length}
					cabinetName={cabinetName} nurseName={nurseName} doctorName={doctorName}
				/>
				{logic.activeView === "inventory" && (
					<WarehouseManagerToolbar
						searchQuery={logic.searchQuery} onSearchChange={logic.setSearchQuery}
						categoryFilter={logic.categoryFilter} onCategoryChange={logic.setCategoryFilter}
						onApplyPreset={logic.handleApplyPreset} onClearAll={logic.handleClearAll}
						writeoffCount={logic.activeWriteoffLines.length}
					/>
				)}
				{logic.hasActiveOverdraft && (
					<div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200 shrink-0" data-testid="soft-overdraft-banner">
						<ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<div className="flex-1 leading-snug min-w-0">
							<strong>Внимание: остаток отрицательный, требуется оприходование накладной.</strong> Расход учтён с дефицитом и не блокирует текущие операции склада и приём пациентов.
						</div>
					</div>
				)}
				<div className="flex-1 overflow-y-auto p-5">
					{logic.activeView === "inventory" ? (
						<WarehouseManagerTable
							rawItems={logic.rawItems} filteredItems={logic.filteredItems}
							visibleItems={logic.itemsSlice.visibleItems} hasMore={logic.itemsSlice.hasMore}
							remainingCount={logic.itemsSlice.remainingCount} onShowMore={() => logic.setDisplayLimit((p) => p + 40)}
							searchQuery={logic.searchQuery} isLoadingStock={logic.isLoadingStock}
							onRefreshStock={logic.fetchLiveStock} writeoffQuantities={logic.writeoffQuantities}
							onStepQuantity={logic.handleStepQuantity}
						/>
					) : (
						<WarehouseManagerActPreview
							activeWriteoffLines={logic.activeWriteoffLines} totalWriteoffCostRub={logic.totalWriteoffCostRub}
							cabinetName={cabinetName} nurseName={nurseName} doctorName={doctorName}
						/>
					)}
				</div>
				<WarehouseManagerFooter
					writeoffCount={logic.activeWriteoffLines.length} totalWriteoffCostRub={logic.totalWriteoffCostRub}
					isSubmitting={isSubmitting} onCancel={onClose} onConfirm={handleConfirm}
				/>
			</div>
		</div>
	);
}

export default WarehouseManagerModal;
