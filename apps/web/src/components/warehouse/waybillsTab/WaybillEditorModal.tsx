import React from "react";
import { money } from "../../../AppHelpers.js";
import { kopecksToRubles } from "../../inventory/acceptanceWaybillsEngine.js";
import { WaybillItemsGrid } from "./WaybillItemsGrid.js";
import { WaybillEditorSupplierFields } from "./WaybillEditorSupplierFields.js";
import type { WaybillEditorModalProps } from "./types.js";

export { ExpressWaybillModal } from "./ExpressWaybillModal.js";

export const WaybillEditorModal: React.FC<WaybillEditorModalProps> = ({
	draftWaybill,
	onChangeSupplier,
	onChangeWaybillNumber,
	onChangeReceiptDate,
	onAddTemplateItem,
	onRemoveDraftItem,
	onCancel,
	onSubmit,
}) => {
	return (
		<div className="flex-1 flex flex-col min-h-0 overflow-hidden" data-testid="waybill-create-form">
			<div className="p-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between shrink-0">
				<div>
					<h4 className="text-xs font-bold text-[var(--ink)]">Новая приходная накладная</h4>
					<p className="text-[11px] text-[var(--muted)]">Пополнение склада и погашение отрицательных остатков</p>
				</div>
				<button type="button" onClick={onCancel} className="secondary-button h-7 px-2.5 text-xs font-medium">
					Отмена
				</button>
			</div>

			<WaybillEditorSupplierFields
				supplier={draftWaybill.supplier}
				waybillNumber={draftWaybill.waybillNumber}
				receiptDate={draftWaybill.receiptDate}
				onChangeSupplier={onChangeSupplier}
				onChangeWaybillNumber={onChangeWaybillNumber}
				onChangeReceiptDate={onChangeReceiptDate}
				onAddTemplateItem={onAddTemplateItem}
			/>

			<div className="flex-1 overflow-y-auto p-3">
				<WaybillItemsGrid
					items={draftWaybill.items}
					mode="draft"
					onRemoveItem={onRemoveDraftItem}
				/>
			</div>

			<div className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between shrink-0 text-xs">
				<div>
					<span>Итого с НДС: </span>
					<strong className="text-sm font-bold text-teal-700 dark:text-teal-300">
						{money(kopecksToRubles(draftWaybill.totals.totalCostKopecks))}
					</strong>
					<span className="text-[11px] text-[var(--muted)] ml-2">
						({draftWaybill.items.length} поз.)
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button type="button" onClick={onCancel} className="secondary-button h-8 px-3 text-xs">
						Отмена
					</button>
					<button
						type="button"
						onClick={() => onSubmit(draftWaybill)}
						className="primary-button h-8 px-4 text-xs font-semibold shadow-xs"
						data-testid="btn-confirm-post-waybill"
					>
						Провести накладную
					</button>
				</div>
			</div>
		</div>
	);
};

export default WaybillEditorModal;
