/**
 * MaterialBomItemRow.tsx — Строка материала в технологической карте расхода (BOM).
 *
 * Отображает:
 * 1. Название расходника с гарантированным клиренсом текста.
 * 2. Норму списания и каноническую единицу измерения (г, мл, шт, карпулы).
 * 3. Цену за единицу и себестоимость нормы.
 * 4. Тактильный бейдж наличия на складе с предупреждением о дефиците.
 * 5. Кнопки быстрого редактирования и удаления.
 */

import { AlertTriangle, CheckCircle2, Edit3, Trash2 } from "lucide-react";
import React from "react";
import { formatInventoryUnitRu } from "@dental/shared";
import type { ProcedureMaterialRuleViewItem } from "./materialBomTypes.js";

export interface MaterialBomItemRowProps {
	readonly rule: ProcedureMaterialRuleViewItem;
	readonly onEdit: (rule: ProcedureMaterialRuleViewItem) => void;
	readonly onDelete: (ruleId: string) => void;
}

export function MaterialBomItemRow({
	rule,
	onEdit,
	onDelete,
}: MaterialBomItemRowProps) {
	const qty = Number(rule.quantityToDeduct ?? 0);
	const unitPrice = Number(rule.unitCostRub ?? 0);
	const lineCost = qty * unitPrice;
	const stock = Number(rule.stockQuantity ?? 0);
	const isDeficit = stock < qty;
	const isLow = stock <= (Number(rule.criticalThreshold ?? 0) || 5);
	const unitLabel = formatInventoryUnitRu(rule.unit);

	return (
		<tr key={rule.id}>
			<td>
				<strong style={{ color: "var(--ink)", paddingLeft: 4 }}>{rule.itemName}</strong>
			</td>
			<td>
				<span style={{ fontWeight: 700, color: "var(--teal-dark, #0f766e)" }}>
					{qty.toLocaleString("ru-RU", { maximumFractionDigits: 4 })}
				</span>
			</td>
			<td>{unitLabel}</td>
			<td>
				{unitPrice > 0
					? `${unitPrice.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
					: "—"}
			</td>
			<td>
				{lineCost > 0
					? `${lineCost.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
					: "—"}
			</td>
			<td>
				<span
					className={`material-boms-stock-badge ${
						isDeficit
							? "material-boms-stock-crit"
							: isLow
								? "material-boms-stock-warn"
								: "material-boms-stock-ok"
					}`}
				>
					{isDeficit ? (
						<AlertTriangle size={12} />
					) : (
						<CheckCircle2 size={12} />
					)}
					{stock.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} {unitLabel}
				</span>
			</td>
			<td style={{ textAlign: "right" }}>
				<div style={{ display: "inline-flex", gap: 6 }}>
					<button
						type="button"
						className="material-boms-icon-btn"
						title="Изменить норму расхода"
						onClick={() => onEdit(rule)}
					>
						<Edit3 size={15} />
					</button>
					<button
						type="button"
						className="material-boms-icon-btn material-boms-icon-btn-danger"
						title="Удалить материал из нормы расхода"
						onClick={() => onDelete(rule.id)}
					>
						<Trash2 size={15} />
					</button>
				</div>
			</td>
		</tr>
	);
}
