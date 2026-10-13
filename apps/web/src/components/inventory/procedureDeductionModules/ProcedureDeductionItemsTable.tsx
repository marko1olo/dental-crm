/**
 * ProcedureDeductionItemsTable.tsx — Таблица расходных материалов процедуры
 * с отображением норм расхода по Приказу Минздрава РФ 804н, складских остатков,
 * серий партий FEFO и сенсорными регуляторами списания.
 */

import { AlertTriangle, Calendar, Plus, RotateCcw, Trash2 } from "lucide-react";
import React from "react";
import {
	calculateLineCostKopecks,
	evaluateStockStatus,
	formatQuantityWithUnitRu,
	formatUnitPriceUnitRu,
	TECH_MAP_CATEGORY_COLORS,
	TECH_MAP_CATEGORY_LABELS,
} from "../inventoryMath.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import type { DeductionLineItem } from "./procedureDeductionTypes.js";

export interface ProcedureDeductionItemsTableProps {
	readonly filteredLines: readonly DeductionLineItem[];
	readonly warehouseItems: readonly InventoryItem[];
	readonly onAddStandardPreset: () => void;
	readonly onStepQuantity: (lineId: string, delta: number) => void;
	readonly onDirectQuantityChange: (lineId: string, val: string) => void;
	readonly onResetToStandard: (lineId: string) => void;
	readonly onRemoveLine: (lineId: string) => void;
	readonly onSelectBatch?: (lineId: string, lotNumber: string, expDate?: string) => void;
}

export const ProcedureDeductionItemsTable: React.FC<
	ProcedureDeductionItemsTableProps
> = ({
	filteredLines,
	warehouseItems,
	onAddStandardPreset,
	onStepQuantity,
	onDirectQuantityChange,
	onResetToStandard,
	onRemoveLine,
	onSelectBatch,
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
					Добавить стандартный расходный набор
				</button>
			</div>
		);
	}

	return (
		<div className="inventory-table-container" data-testid="procedure-deduction-items-table">
			<table className="inventory-dense-table">
				<thead>
					<tr>
						<th>Материал / Категория</th>
						<th>Норма 804н</th>
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

						// Поиск подходящих серий/партий на складе
						const relatedWarehouseItem = warehouseItems.find(
							(w) => w.id === line.inventoryItemId,
						);

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
								{/* Наименование, категория и серия/срок годности FEFO */}
								<td className="inventory-td-name">
									<div
										className="inventory-name-cell"
										style={{
											display: "flex",
											flexDirection: "row",
											alignItems: "center",
											justifyContent: "flex-start",
											gap: "6px",
											flexWrap: "nowrap",
										}}
									>
										<span
											className="inventory-material-name"
											style={{
												fontSize: "12px",
												fontWeight: 700,
												maxWidth: "280px",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												textAlign: "left",
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
													display: "inline-flex",
													alignItems: "center",
													gap: "3px",
												}}
												title={
													line.expirationDate
														? `Серия: ${line.lotNumber}, Годен до: ${line.expirationDate}`
														: `Серия: ${line.lotNumber}`
												}
											>
												п. {line.lotNumber}
												{line.expirationDate && (
													<span className="text-[9px] opacity-75">
														({line.expirationDate.slice(0, 7)})
													</span>
												)}
											</span>
										)}
									</div>
								</td>

								{/* Норматив расхода (Приказ Минздрава РФ 804н) */}
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

								{/* Складской остаток (FEFO статус) */}
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
											Дефицит {formatQuantityWithUnitRu(stockStatus.deficit, line.unit)}
										</span>
									) : stockStatus.severity === "warning" ? (
										<span
											className="inventory-stock-pill stock-warning"
											style={{ fontSize: "10px", padding: "1px 5px" }}
										>
											<AlertTriangle size={11} />
											{formatQuantityWithUnitRu(line.stockQuantity ?? 0, line.unit)} (мало)
										</span>
									) : (
										<span
											className="inventory-stock-pill stock-ok"
											style={{ fontSize: "10px", padding: "1px 5px" }}
										>
											{formatQuantityWithUnitRu(line.stockQuantity ?? 0, line.unit)}
										</span>
									)}
								</td>

								{/* Сенсорные регуляторы списания (Solo Doctor Ergonomics: кнопка минус никогда не disabled) */}
								<td className="inventory-td-stepper" style={{ textAlign: "center" }}>
									<div
										className="inventory-stepper-wrap"
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: "4px",
											justifyContent: "center",
										}}
									>
										<button
											type="button"
											className="inventory-stepper-btn btn-minus"
											onClick={() => onStepQuantity(line.id, -1)}
											aria-label={`Уменьшить количество ${line.materialName}`}
											disabled={false}
											style={{
												width: "24px",
												height: "24px",
												minHeight: "24px",
												padding: 0,
												fontSize: "13px",
												fontWeight: 700,
											}}
										>
											−
										</button>

										<input
											type="text"
											className="inventory-qty-input"
											value={line.quantity}
											onChange={(e) =>
												onDirectQuantityChange(line.id, e.target.value)
											}
											style={{
												width: "48px",
												height: "24px",
												textAlign: "center",
												fontSize: "12px",
												fontWeight: 700,
											}}
										/>

										<button
											type="button"
											className="inventory-stepper-btn btn-plus"
											onClick={() => onStepQuantity(line.id, 1)}
											aria-label={`Увеличить количество ${line.materialName}`}
											style={{
												width: "24px",
												height: "24px",
												minHeight: "24px",
												padding: 0,
												fontSize: "13px",
												fontWeight: 700,
											}}
										>
											+
										</button>

										{line.quantity !== line.standardQuantity && (
											<button
												type="button"
												className="inventory-reset-btn"
												onClick={() => onResetToStandard(line.id)}
												title={`Сбросить в норматив (${line.standardQuantity} ${line.unit})`}
												style={{
													height: "22px",
													fontSize: "10px",
													padding: "0 6px",
													display: "inline-flex",
													alignItems: "center",
													gap: "3px",
												}}
											>
												<RotateCcw size={10} />
												Норма
											</button>
										)}
									</div>
								</td>

								{/* Себестоимость копеечно-точная */}
								<td
									className="inventory-td-cost"
									style={{
										textAlign: "right",
										fontSize: "12px",
										fontWeight: 700,
										whiteSpace: "nowrap",
									}}
								>
									<div className="inventory-cost-val font-bold text-xs">
										{(lineCostKopecks / 100).toLocaleString("ru-RU", {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}{" "}
										₽
									</div>
									<div
										className="inventory-unit-price text-[10px] text-[var(--muted)] font-normal"
									>
										{(line.unitCostKopecks / 100).toLocaleString("ru-RU", {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}{" "}
										₽ / {formatUnitPriceUnitRu(line.unit)}
									</div>
								</td>

								{/* Кнопка удаления */}
								<td style={{ textAlign: "center", width: "32px" }}>
									<button
										type="button"
										className="inventory-delete-line-btn"
										onClick={() => onRemoveLine(line.id)}
										aria-label={`Удалить ${line.materialName}`}
										style={{
											width: "24px",
											height: "24px",
											padding: 0,
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
											color: "var(--muted)",
										}}
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
