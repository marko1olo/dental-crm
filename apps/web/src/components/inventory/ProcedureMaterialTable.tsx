import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import type React from "react";
import {
	calculateLineCostKopecks,
	type DeductionLineItem,
	evaluateStockStatus,
	formatQuantityWithUnitRu,
	formatUnitPriceUnitRu,
	TECH_MAP_CATEGORY_COLORS,
	TECH_MAP_CATEGORY_LABELS,
} from "./inventoryMath.js";
import type { InventoryItem } from "./useInventoryLogic.js";

export interface ProcedureMaterialTableProps {
	readonly filteredLines: readonly DeductionLineItem[];
	readonly warehouseItems: readonly InventoryItem[];
	readonly onAddStandardPreset: () => void;
	readonly onStepQuantity: (lineId: string, delta: number) => void;
	readonly onDirectQuantityChange: (lineId: string, val: string) => void;
	readonly onResetToStandard: (lineId: string) => void;
	readonly onRemoveLine: (lineId: string) => void;
}

export const ProcedureMaterialTable: React.FC<ProcedureMaterialTableProps> = ({
	filteredLines,
	warehouseItems: _warehouseItems,
	onAddStandardPreset,
	onStepQuantity,
	onDirectQuantityChange,
	onResetToStandard,
	onRemoveLine,
}) => {
	if (filteredLines.length === 0) {
		return (
			<div
				style={{
					padding: "48px 24px",
					textAlign: "center",
					color: "var(--muted)",
					fontSize: 15,
					fontWeight: 600,
				}}
			>
				<div>
					Материалы не найдены. Выберите техкарту выше или добавьте позицию со склада.
				</div>
				<button
					type="button"
					className="inventory-add-btn"
					onClick={onAddStandardPreset}
					style={{
						marginTop: 16,
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						minHeight: "34px",
						padding: "0 16px",
						fontSize: 13,
						fontWeight: 700,
					}}
					data-testid="auto-populate-standard-preset-btn"
				>
					<Plus size={16} />
					Добавить стандартный расходный набор в 1 клик
				</button>
			</div>
		);
	}

	return (
		<div className="inventory-table-container">
			<table className="inventory-dense-table">
				<thead>
					<tr>
						<th>Материал / Категория</th>
						<th>Норма</th>
						<th>Остаток склада</th>
						<th style={{ textAlign: "center" }}>Списание (кол-во)</th>
						<th style={{ textAlign: "right" }}>Себестоимость</th>
						<th style={{ width: "32px" }}></th>
					</tr>
				</thead>
				<tbody>
					{filteredLines.map((line) => {
						const stockStatus = evaluateStockStatus(
							line.stockQuantity,
							line.quantity,
							line.criticalThreshold,
							line.unit,
						);
						const lineCostKopecks = calculateLineCostKopecks(
							line.unitCostKopecks,
							line.quantity,
						);
						const catColor =
							TECH_MAP_CATEGORY_COLORS[line.category] ??
							TECH_MAP_CATEGORY_COLORS.other;

						return (
							<tr
								key={line.id}
								className={`inventory-table-row ${
									stockStatus.severity === "critical"
										? "has-deficit"
										: stockStatus.severity === "warning"
											? "has-warning"
											: ""
								}`}
								style={{ height: "38px" }}
							>
								{/* Name & Category */}
								<td className="inventory-td-name">
									<div
										className="inventory-name-cell"
										style={{
											display: "flex",
											alignItems: "center",
											gap: "6px",
											flexWrap: "nowrap",
										}}
									>
										<span
											className="inventory-material-name truncate max-w-[220px]"
											style={{
												fontSize: "12px",
												fontWeight: 700,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
											title={line.materialName}
										>
											{line.materialName}
										</span>
										<span
											className="inventory-category-badge"
											style={{
												padding: "1px 5px",
												fontSize: "9px",
												fontWeight: 700,
												background: catColor.bg,
												color: catColor.text,
												border: `1px solid ${catColor.border}`,
												flexShrink: 0,
												whiteSpace: "nowrap",
											}}
										>
											{TECH_MAP_CATEGORY_LABELS[line.category]}
										</span>
										{line.lotNumber && (
											<span
												className="inventory-lot-tag"
												style={{
													fontSize: "10px",
													color: "var(--muted)",
													flexShrink: 0,
												}}
											>
												п. {line.lotNumber}
											</span>
										)}
										{line.expirationDate && (
											<span
												className="inventory-exp-tag"
												style={{
													fontSize: "10px",
													color: "var(--muted)",
													flexShrink: 0,
												}}
											>
												до {line.expirationDate}
											</span>
										)}
									</div>
								</td>

								{/* Standard Norm */}
								<td
									className="inventory-td-norm"
									style={{
										fontSize: "12px",
										fontWeight: 600,
										color: "var(--muted)",
										whiteSpace: "nowrap",
									}}
								>
									{formatQuantityWithUnitRu(line.standardQuantity, line.unit)}
								</td>

								{/* Stock Status */}
								<td
									className="inventory-td-stock"
									style={{ whiteSpace: "nowrap" }}
								>
									{stockStatus.severity === "critical" ? (
										<span
											className="inventory-deficit-badge"
											style={{ fontSize: "10px", padding: "1px 5px" }}
										>
											<AlertTriangle size={11} />
											Дефицит {formatQuantityWithUnitRu(stockStatus.deficit, line.unit)} (склад: {formatQuantityWithUnitRu(line.stockQuantity, line.unit)})
										</span>
									) : stockStatus.severity === "warning" ? (
										<span
											className="inventory-stock-pill stock-warning"
											style={{ fontSize: "10px", padding: "1px 5px" }}
										>
											<AlertTriangle size={11} />
											Остаток: {formatQuantityWithUnitRu(line.stockQuantity, line.unit)}
										</span>
									) : (
										<span
											className="inventory-stock-pill stock-ok"
											style={{ fontSize: "10px", padding: "1px 5px" }}
										>
											Остаток: {formatQuantityWithUnitRu(line.stockQuantity, line.unit)}
										</span>
									)}
								</td>

								{/* Stepper / Input */}
								<td
									className="inventory-td-stepper"
									style={{ whiteSpace: "nowrap" }}
								>
									<div
										className="inventory-compact-stepper-wrap"
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "4px",
										}}
									>
										<div className="inventory-stepper-group">
											<button
												type="button"
												className="inventory-stepper-btn"
												onClick={() => onStepQuantity(line.id, -1)}
												disabled={false}
												aria-label="Уменьшить количество"
											>
												−
											</button>
											<input
												type="text"
												className="inventory-stepper-input"
												value={line.quantity}
												onChange={(e) =>
													onDirectQuantityChange(line.id, e.target.value)
												}
											/>
											<button
												type="button"
												className="inventory-stepper-btn"
												onClick={() => onStepQuantity(line.id, 1)}
												aria-label="Увеличить количество"
											>
												+
											</button>
										</div>
										<button
											type="button"
											className="inventory-quick-chip"
											style={{
												height: "26px",
												padding: "0 6px",
												fontSize: "10px",
											}}
											onClick={() => onResetToStandard(line.id)}
											title="Вернуть стандартную норму"
										>
											Норма
										</button>
									</div>
								</td>

								{/* Cost */}
								<td
									className="inventory-td-cost"
									style={{ textAlign: "right", whiteSpace: "nowrap" }}
								>
									<div
										className="inventory-cost-cell"
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "flex-end",
											gap: "0",
										}}
									>
										<span
											className="inventory-cost-val"
											style={{ fontSize: "12px", fontWeight: 700 }}
										>
											{(lineCostKopecks / 100).toLocaleString("ru-RU", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}{" "}
											₽
										</span>
										<span
											className="inventory-unit-price"
											style={{ fontSize: "9px" }}
										>
											{(line.unitCostKopecks / 100).toLocaleString("ru-RU", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}{" "}
											₽ / {formatUnitPriceUnitRu(line.unit)}
										</span>
									</div>
								</td>

								{/* Delete Action */}
								<td
									className="inventory-td-action"
									style={{ textAlign: "center" }}
								>
									<button
										type="button"
										className="inventory-remove-line-btn"
										style={{ width: "26px", height: "26px" }}
										onClick={() => onRemoveLine(line.id)}
										aria-label="Удалить позицию"
									>
										<Trash2 size={13} />
									</button>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
