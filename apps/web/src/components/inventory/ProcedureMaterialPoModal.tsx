import { Check, Copy, Printer, X } from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";
import type { SupplierPurchaseOrderView } from "./inventoryMath.js";

export interface ProcedureMaterialPoModalProps {
	readonly generatedPurchaseOrder: SupplierPurchaseOrderView;
	readonly onClose: () => void;
	readonly onCopy: () => void;
	readonly onPrint: () => void;
	readonly copiedPo: boolean;
}

export const ProcedureMaterialPoModal: React.FC<ProcedureMaterialPoModalProps> = ({
	generatedPurchaseOrder,
	onClose,
	onCopy,
	onPrint,
	copiedPo,
}) => {
	const poContent = (
		<div
			className="inventory-deduction-backdrop"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				className="inventory-deduction-modal inventory-po-dialog"
				style={{ maxWidth: "880px" }}
				role="dialog"
				aria-modal="true"
				aria-label="Заказ поставщику расходных материалов"
			>
				<div className="inventory-po-header">
					<div>
						<h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
							Заказ поставщику {generatedPurchaseOrder.orderNumber}
						</h3>
						<div
							style={{
								fontSize: 12,
								color: "var(--muted)",
								marginTop: 2,
							}}
						>
							Основание:{" "}
							{generatedPurchaseOrder.reason === "stock_deficit"
								? "Ликвидация дефицита материалов"
								: "Критический остаток"}{" "}
							• {generatedPurchaseOrder.orderDate}
						</div>
					</div>
					<button
						type="button"
						className="inventory-deduction-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<div className="inventory-po-body">
					<div
						style={{
							fontSize: 13,
							color: "var(--muted)",
							marginBottom: 12,
						}}
					>
						Автоматически рассчитанная спецификация к заказу для восстановления неснижаемого складского запаса:
					</div>

					<table className="inventory-po-table">
						<thead>
							<tr>
								<th>Артикул</th>
								<th>Наименование материала</th>
								<th>Ед.</th>
								<th style={{ textAlign: "right" }}>Остаток</th>
								<th style={{ textAlign: "right" }}>Дефицит</th>
								<th style={{ textAlign: "right" }}>К заказу</th>
								<th style={{ textAlign: "right" }}>Цена</th>
								<th style={{ textAlign: "right" }}>Сумма</th>
							</tr>
						</thead>
						<tbody>
							{generatedPurchaseOrder.items.map((item) => (
								<tr key={item.sku}>
									<td style={{ fontFamily: "monospace", fontSize: 11 }}>
										{item.sku}
									</td>
									<td style={{ fontWeight: 600 }}>{item.materialName}</td>
									<td>{item.unit}</td>
									<td style={{ textAlign: "right" }}>
										{item.currentStock}
									</td>
									<td
										style={{
											textAlign: "right",
											color:
												item.shortfall > 0
													? "var(--rust)"
													: "inherit",
											fontWeight: 700,
										}}
									>
										{item.shortfall > 0 ? item.shortfall : "—"}
									</td>
									<td
										style={{
											textAlign: "right",
											fontWeight: 700,
											color: "var(--teal-dark)",
										}}
									>
										{item.suggestedOrderQuantity}
									</td>
									<td style={{ textAlign: "right" }}>
										{item.unitCostFormatted}
									</td>
									<td
										style={{
											textAlign: "right",
											fontWeight: 700,
										}}
									>
										{item.totalCostFormatted}
									</td>
								</tr>
							))}
						</tbody>
					</table>

					<div
						style={{
							marginTop: 16,
							display: "flex",
							justifyContent: "flex-end",
							gap: 24,
							fontSize: 14,
						}}
					>
						<div>
							Позиций: <strong>{generatedPurchaseOrder.totalItemsCount}</strong>
						</div>
						<div>
							Итого к заказу:{" "}
							<strong
								style={{
									color: "var(--teal-dark)",
									fontSize: 16,
								}}
							>
								{generatedPurchaseOrder.totalCostFormatted}
							</strong>
						</div>
					</div>
				</div>

				<div className="inventory-po-footer">
					<div style={{ display: "flex", gap: 10 }}>
						<button
							type="button"
							className="inventory-cancel-btn"
							onClick={onCopy}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								minHeight: "34px",
							}}
						>
							{copiedPo ? <Check size={16} /> : <Copy size={16} />}
							{copiedPo ? "Скопировано!" : "Копировать текст"}
						</button>
						<button
							type="button"
							className="inventory-cancel-btn"
							onClick={onPrint}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								minHeight: "34px",
							}}
						>
							<Printer size={16} />
							Печать
						</button>
					</div>
					<button
						type="button"
						className="inventory-confirm-deduct-btn"
						onClick={onClose}
						style={{ minHeight: "34px" }}
					>
						← Вернуться к списанию
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(poContent, document.body)
		: poContent;
};
