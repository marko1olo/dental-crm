import { Truck } from "lucide-react";
import type React from "react";
import { ExpressWaybillFormBody } from "./ExpressWaybillFormBody.js";
import { ExpressWaybillHeader } from "./ExpressWaybillHeader.js";
import type { ExpressWaybillModalProps } from "./types.js";

export const ExpressWaybillModal: React.FC<ExpressWaybillModalProps> = ({
	isOpen,
	supplierId,
	waybillNum,
	receiptDate,
	amountRub,
	onSupplierIdChange,
	onWaybillNumChange,
	onReceiptDateChange,
	onAmountRubChange,
	onClose,
	onSubmit,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
			data-testid="modal-express-waybill-overlay"
		>
			<div
				className="w-full max-w-lg rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				role="dialog"
				aria-modal="true"
				aria-label="Экспресс-оприходование накладной"
				data-testid="modal-express-waybill"
			>
				<ExpressWaybillHeader onClose={onClose} />

				<ExpressWaybillFormBody
					supplierId={supplierId}
					waybillNum={waybillNum}
					receiptDate={receiptDate}
					amountRub={amountRub}
					onSupplierIdChange={onSupplierIdChange}
					onWaybillNumChange={onWaybillNumChange}
					onReceiptDateChange={onReceiptDateChange}
					onAmountRubChange={onAmountRubChange}
				/>

				<div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="secondary-button h-9 px-3.5 text-xs font-semibold rounded-xl"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={onSubmit}
						className="primary-button h-9 px-4 text-xs font-bold gap-1.5 rounded-xl shadow-xs"
						data-testid="btn-submit-express-wb"
					>
						<Truck size={14} />
						<span>Оприходовать накладную</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default ExpressWaybillModal;
