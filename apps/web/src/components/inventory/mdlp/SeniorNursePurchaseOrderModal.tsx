import { Check, Copy, Printer, ShoppingCart, X } from "lucide-react";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { formatSupplierPurchaseOrderTextRu, type SupplierPurchaseOrderView } from "../inventoryMath.js";
import { SeniorNursePoTable } from "./SeniorNursePoTable.js";

export interface SeniorNursePurchaseOrderModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly purchaseOrder: SupplierPurchaseOrderView;
}

export const SeniorNursePurchaseOrderModal: React.FC<SeniorNursePurchaseOrderModalProps> = ({
	isOpen,
	onClose,
	purchaseOrder: po,
}) => {
	const [copiedPo, setCopiedPo] = useState(false);

	if (!isOpen) return null;

	const handleCopyPoText = () => {
		const text = formatSupplierPurchaseOrderTextRu(po);
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(text);
		}
		setCopiedPo(true);
		setTimeout(() => setCopiedPo(false), 2500);
	};

	const handlePrintPo = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const content = (
		<div
			className="mdlp-modal-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			data-testid="senior-nurse-po-modal"
		>
			<div
				className="mdlp-modal-container"
				style={{ maxWidth: "800px" }}
				onClick={(e) => e.stopPropagation()}
			>
				<header className="mdlp-modal-header">
					<div className="mdlp-modal-title">
						<ShoppingCart size={22} className="text-teal-600" />
						<div>
							<div className="font-bold text-base">Заказ поставщику {po.orderNumber}</div>
							<div className="text-xs text-muted">
								Автоматическое пополнение неснижаемого остатка (СанПиН 3.3686-21)
							</div>
						</div>
					</div>
					<button
						type="button"
						className="mdlp-btn mdlp-btn-ghost p-1.5"
						onClick={onClose}
						aria-label="Назад к акту списания"
					>
						<X size={18} />
					</button>
				</header>

				<div className="mdlp-modal-body">
					<SeniorNursePoTable po={po} />
				</div>

				<footer className="mdlp-modal-footer">
					<div className="flex gap-2">
						<button type="button" className="mdlp-btn mdlp-btn-secondary" onClick={handleCopyPoText}>
							{copiedPo ? <Check size={16} /> : <Copy size={16} />}
							{copiedPo ? "Скопировано" : "Копировать"}
						</button>
						<button type="button" className="mdlp-btn mdlp-btn-secondary" onClick={handlePrintPo}>
							<Printer size={16} /> Печать
						</button>
					</div>
					<button type="button" className="mdlp-btn mdlp-btn-primary" onClick={onClose}>
						← Назад к акту
					</button>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body ? createPortal(content, document.body) : content;
};
