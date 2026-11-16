import { Check, Copy, Printer, ShoppingCart, X } from "lucide-react";
import React, { useState } from "react";
import { formatSupplierPurchaseOrderTextRu, type SupplierPurchaseOrderView } from "../../inventory/inventoryMath.js";
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

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			data-testid="senior-nurse-po-modal"
		>
			<div
				className="w-full max-w-[800px] bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				<header className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<ShoppingCart size={20} className="text-[var(--primary)] shrink-0" />
						<div className="min-w-0">
							<div className="font-bold text-sm truncate">Заказ поставщику {po.orderNumber}</div>
							<div className="text-xs text-[var(--muted)] truncate">
								Автоматическое пополнение неснижаемого остатка (СанПиН 3.3686-21)
							</div>
						</div>
					</div>
					<button
						type="button"
						className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
						onClick={onClose}
						aria-label="Назад к акту списания"
					>
						<X size={18} />
					</button>
				</header>

				<div className="p-6 overflow-y-auto max-h-[70vh]">
					<SeniorNursePoTable po={po} />
				</div>

				<footer className="h-16 px-6 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-between gap-3 shrink-0">
					<div className="flex gap-2">
						<button
							type="button"
							className="h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-2"
							onClick={handleCopyPoText}
						>
							{copiedPo ? <Check size={16} /> : <Copy size={16} />}
							{copiedPo ? "Скопировано" : "Копировать"}
						</button>
						<button
							type="button"
							className="h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-2"
							onClick={handlePrintPo}
						>
							<Printer size={16} /> Печать
						</button>
					</div>
					<button
						type="button"
						className="h-9 px-4 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center justify-center"
						onClick={onClose}
					>
						Готово
					</button>
				</footer>
			</div>
		</div>
	);
};

export default SeniorNursePurchaseOrderModal;
