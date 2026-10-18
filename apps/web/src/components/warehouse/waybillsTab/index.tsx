import React from "react";
import type { WarehouseWaybillsTabProps } from "./types.js";
import { useWarehouseWaybills } from "./useWarehouseWaybills.js";
import { WaybillsListTable } from "./WaybillsListTable.js";
import { ExpressWaybillModal, WaybillEditorModal } from "./WaybillEditorModal.js";
import { WaybillsToolbar } from "./WaybillsToolbar.js";
import { WaybillDetailsView } from "./WaybillDetailsView.js";
import { WaybillDetailsEmpty } from "./WaybillDetailsEmpty.js";

export * from "./types.js";
export { useWarehouseWaybills } from "./useWarehouseWaybills.js";
export { WaybillsListTable } from "./WaybillsListTable.js";
export { ExpressWaybillModal, WaybillEditorModal } from "./WaybillEditorModal.js";
export { WaybillItemsGrid } from "./WaybillItemsGrid.js";
export { WaybillsToolbar } from "./WaybillsToolbar.js";
export { WaybillDetailsView } from "./WaybillDetailsView.js";
export { WaybillDetailsEmpty } from "./WaybillDetailsEmpty.js";

/**
 * Вкладка приходных накладных ТОРГ-12 и оприходования партий ТМЦ (Мандаты 8e, 8n).
 * Декомпозирована строго <= 120 строк в соответствии с Мандатом 8b.
 */
export const WarehouseWaybillsTab: React.FC<WarehouseWaybillsTabProps> = (props) => {
	const {
		waybillsList, selectedWaybill, setSelectedWaybill,
		isCreatingNew, setIsCreatingNew, searchQuery, setSearchQuery,
		draftWaybill, isExpressModalOpen, setIsExpressModalOpen,
		expressSupplierId, setExpressSupplierId, expressWaybillNum, setExpressWaybillNum,
		expressDate, setExpressDate, expressAmountRub, setExpressAmountRub,
		handlePostExpressWaybill, handleAddTemplateItem, handleRemoveDraftItem,
		handlePostWaybill, handlePrintTorg12, handleExportCsv,
		handleStartCreateNew, filteredWaybills, handleChangeSupplier,
		handleChangeWaybillNumber, handleChangeReceiptDate,
	} = useWarehouseWaybills(props);

	return (
		<div className="warehouse-waybills-tab flex-1 flex flex-col min-h-0 overflow-hidden w-full gap-2.5" data-testid="warehouse-waybills-tab">
			<WaybillsToolbar
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				onOpenExpress={() => setIsExpressModalOpen(true)}
				onStartCreateNew={handleStartCreateNew}
			/>

			<div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2.5 min-h-0 overflow-hidden">
				<WaybillsListTable
					waybills={filteredWaybills}
					totalWaybillsCount={waybillsList.length}
					selectedWaybillId={selectedWaybill?.id ?? null}
					isCreatingNew={isCreatingNew}
					onSelectWaybill={(wb) => {
						setSelectedWaybill(wb);
						setIsCreatingNew(false);
					}}
					onStartCreateNew={handleStartCreateNew}
				/>

				<div className="md:col-span-2 border border-[var(--line)] rounded-xl bg-[var(--paper)] flex flex-col overflow-hidden">
					{isCreatingNew ? (
						<WaybillEditorModal
							draftWaybill={draftWaybill}
							onChangeSupplier={handleChangeSupplier}
							onChangeWaybillNumber={handleChangeWaybillNumber}
							onChangeReceiptDate={handleChangeReceiptDate}
							onAddTemplateItem={handleAddTemplateItem}
							onRemoveDraftItem={handleRemoveDraftItem}
							onCancel={() => setIsCreatingNew(false)}
							onSubmit={handlePostWaybill}
						/>
					) : selectedWaybill ? (
						<WaybillDetailsView
							waybill={selectedWaybill}
							onPrintTorg12={handlePrintTorg12}
							onExportCsv={handleExportCsv}
						/>
					) : (
						<WaybillDetailsEmpty
							totalWaybillsCount={waybillsList.length}
							onStartCreateNew={handleStartCreateNew}
						/>
					)}
				</div>
			</div>

			<ExpressWaybillModal
				isOpen={isExpressModalOpen}
				supplierId={expressSupplierId}
				waybillNum={expressWaybillNum}
				receiptDate={expressDate}
				amountRub={expressAmountRub}
				onSupplierIdChange={setExpressSupplierId}
				onWaybillNumChange={setExpressWaybillNum}
				onReceiptDateChange={setExpressDate}
				onAmountRubChange={setExpressAmountRub}
				onClose={() => setIsExpressModalOpen(false)}
				onSubmit={handlePostExpressWaybill}
			/>
		</div>
	);
};

export default WarehouseWaybillsTab;
