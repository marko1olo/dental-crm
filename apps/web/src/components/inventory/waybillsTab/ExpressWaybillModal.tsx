import { Truck, X, Zap } from "lucide-react";
import type React from "react";
import { CANONICAL_DENTAL_SUPPLIERS } from "../acceptanceWaybillsEngine.js";
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
				<div className="px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center">
							<Zap size={14} />
						</div>
						<div>
							<h3 className="text-sm font-bold text-[var(--ink)]">
								Экспресс-приход накладной
							</h3>
							<p className="text-xs text-[var(--muted)]">
								Пополнение склада и погашение овердрафта
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition"
						aria-label="Закрыть"
					>
						<X size={16} />
					</button>
				</div>

				<div className="p-4 flex flex-col gap-3 text-xs">
					<div>
						<span className="block font-semibold text-[var(--muted)] mb-1">
							1. Поставщик:
						</span>
						<select
							aria-label="Поставщик"
							className="w-full h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
							value={supplierId}
							onChange={(e) => onSupplierIdChange(e.target.value)}
							data-testid="express-wb-supplier"
						>
							{CANONICAL_DENTAL_SUPPLIERS.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name} (ИНН: {s.inn})
								</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div>
							<span className="block font-semibold text-[var(--muted)] mb-1">
								2. Номер накладной:
							</span>
							<input
								type="text"
								aria-label="Номер накладной"
								className="w-full h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
								value={waybillNum}
								onChange={(e) => onWaybillNumChange(e.target.value)}
								placeholder="НАКЛ-2026/10-091"
								data-testid="express-wb-number"
							/>
						</div>
						<div>
							<span className="block font-semibold text-[var(--muted)] mb-1">
								3. Дата:
							</span>
							<input
								type="date"
								aria-label="Дата накладной"
								className="w-full h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
								value={receiptDate}
								onChange={(e) => onReceiptDateChange(e.target.value)}
								data-testid="express-wb-date"
							/>
						</div>
					</div>

					<div>
						<span className="block font-semibold text-[var(--muted)] mb-1">
							4. Итоговая сумма (₽):
						</span>
						<input
							type="number"
							aria-label="Итоговая сумма"
							className="w-full h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--primary)] font-bold text-sm"
							value={amountRub}
							onChange={(e) => onAmountRubChange(e.target.value)}
							min="0"
							step="100"
							data-testid="express-wb-amount"
						/>
					</div>
				</div>

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
