import type React from "react";
import {
	type WarehouseAuditItemLine,
	kopecksToRubles,
} from "./warehouseInventoryEngine.js";

export interface WarehouseInventoryAuditTableProps {
	readonly filteredItems: readonly WarehouseAuditItemLine[];
	readonly onQuantityChange: (itemId: string, newActual: number) => void;
}

export const WarehouseInventoryAuditTable: React.FC<WarehouseInventoryAuditTableProps> = ({
	filteredItems,
	onQuantityChange,
}) => {
	return (
		<div className="warehouse-inventory-table-container">
			<table className="warehouse-inventory-table">
				<thead>
					<tr>
						<th style={{ width: 36, textAlign: "center" }}>№</th>
						<th>Наименование ТМЦ / Артикул</th>
						<th>Категория</th>
						<th style={{ textAlign: "center" }}>Серия (LOT)</th>
						<th style={{ textAlign: "center" }}>Срок годности (FEFO)</th>
						<th style={{ textAlign: "center" }}>Ед.</th>
						<th style={{ textAlign: "right" }}>Учет (книжн.)</th>
						<th style={{ textAlign: "center", width: 140 }}>Факт (наличие)</th>
						<th style={{ textAlign: "center" }}>Разница</th>
						<th style={{ textAlign: "right" }}>Цена (руб.)</th>
						<th style={{ textAlign: "right" }}>Сумма учета</th>
						<th style={{ textAlign: "right" }}>Сумма факта</th>
						<th style={{ textAlign: "right" }}>Расхождение (руб.)</th>
					</tr>
				</thead>
				<tbody>
					{filteredItems.length === 0 ? (
						<tr>
							<td colSpan={13} style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
								Позиций по заданным критериям фильтрации не найдено.
							</td>
						</tr>
					) : (
						filteredItems.map((it, idx) => {
							const isExpired = it.fefoStatus === "expired";
							const isDiscrepant = it.discrepancyType !== "match";

							return (
								<tr
									key={it.itemId}
									className={isExpired ? "row-expired" : isDiscrepant ? "row-discrepancy" : ""}
								>
									<td style={{ textAlign: "center", color: "var(--muted)" }}>{idx + 1}</td>

									<td style={{ minWidth: 0, maxWidth: 260 }}>
										<div className="truncate" style={{ fontWeight: 600, color: "var(--ink)" }} title={it.nameRu}>
											{it.nameRu}
										</div>
										<div className="truncate" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
											SKU: {it.sku} • {it.storageLocationRu}
										</div>
									</td>

									<td style={{ color: "var(--muted)" }}>{it.category}</td>

									<td style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}>
										{it.batchNumber}
									</td>

									<td style={{ textAlign: "center" }}>
										<span className={`fefo-badge ${it.fefoStatus.replace("_", "-")}`}>
											{it.expiryDate} (
											{isExpired
												? "Истек"
												: it.fefoStatus === "warning_30"
													? "<30д"
													: it.fefoStatus === "warning_60"
														? "<60д"
														: "Свежий"}
											)
										</span>
									</td>

									<td style={{ textAlign: "center" }}>{it.unitRu}</td>

									<td style={{ textAlign: "right", fontWeight: 600 }}>{it.bookQuantity}</td>

									<td style={{ textAlign: "center" }}>
										<div className="warehouse-qty-stepper" style={{ margin: "0 auto" }}>
											<button
												type="button"
												className="warehouse-qty-stepper-btn"
												onClick={() => onQuantityChange(it.itemId, it.actualQuantity - 1)}
												aria-label="Уменьшить фактическое количество"
											>
												-
											</button>
											<input
												type="number"
												className="warehouse-qty-input"
												value={it.actualQuantity}
												min={0}
												onChange={(e) =>
													onQuantityChange(it.itemId, Number.parseInt(e.target.value, 10) || 0)
												}
											/>
											<button
												type="button"
												className="warehouse-qty-stepper-btn"
												onClick={() => onQuantityChange(it.itemId, it.actualQuantity + 1)}
												aria-label="Увеличить фактическое количество"
											>
												+
											</button>
										</div>
									</td>

									<td style={{ textAlign: "center" }}>
										<span
											className={`discrepancy-pill ${it.discrepancyType}`}
										>
											{it.discrepancyQuantity > 0 ? `+${it.discrepancyQuantity}` : it.discrepancyQuantity}
										</span>
									</td>

									<td style={{ textAlign: "right" }}>
										{kopecksToRubles(it.unitCostKopecks).toFixed(2)}
									</td>

									<td style={{ textAlign: "right" }}>
										{kopecksToRubles(it.bookTotalKopecks).toFixed(2)}
									</td>

									<td style={{ textAlign: "right", fontWeight: 600 }}>
										{kopecksToRubles(it.actualTotalKopecks).toFixed(2)}
									</td>

									<td
										style={{
											textAlign: "right",
											fontWeight: 700,
											color:
												it.discrepancyCostKopecks > 0
													? "var(--ok-fg, #059669)"
													: it.discrepancyCostKopecks < 0
														? "var(--bad-fg, #dc2626)"
														: "var(--muted)",
										}}
									>
										{it.discrepancyCostKopecks > 0 ? "+" : ""}
										{kopecksToRubles(it.discrepancyCostKopecks).toFixed(2)}
									</td>
								</tr>
							);
						})
					)}
				</tbody>
			</table>
		</div>
	);
};
