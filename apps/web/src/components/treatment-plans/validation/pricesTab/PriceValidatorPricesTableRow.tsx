import React from "react";
import type { PriceLockResolutionPolicy } from "../planPriceValidationPresets.js";
import type { ValidatedPlanItem } from "../planPriceValidationEngine.js";

interface RowProps {
	readonly item: ValidatedPlanItem;
	readonly index: number;
	readonly onItemResolutionChange: (itemId: string, resolution: PriceLockResolutionPolicy) => void;
}

export const PriceValidatorPricesTableRow: React.FC<RowProps> = ({
	item,
	index,
	onItemResolutionChange,
}) => {
	const severityClass =
		item.severity === "error"
			? "pv-badge-danger"
			: item.severity === "warning"
				? "pv-badge-warn"
				: item.severity === "info"
					? "pv-badge-info"
					: "pv-badge-ok";

	return (
		<tr>
			<td>
				<span style={{ fontWeight: 700, marginRight: 6 }}>{index + 1}</span>
				{item.toothNumber ? (
					<span className="pv-badge pv-badge-tooth">#{item.toothNumber}</span>
				) : (
					<span className="pv-badge pv-badge-tooth">—</span>
				)}
			</td>
			<td>
				<span className="pv-badge pv-badge-code">{item.code804n}</span>
			</td>
			<td>
				<div style={{ fontWeight: 600 }}>{item.serviceTitle}</div>
				<div style={{ fontSize: "0.75rem", color: "var(--pv-text-muted)" }}>{item.category}</div>
			</td>
			<td style={{ fontWeight: 700 }}>{item.quantity}</td>
			<td>
				<div style={{ fontWeight: 700 }}>{item.planUnitPriceRub.toLocaleString("ru-RU")} ₽</div>
				{item.planDiscountRub > 0 && (
					<div style={{ fontSize: "0.75rem", color: "var(--pv-ok)" }}>
						Скидка {item.planDiscountPercent}% (-{item.planDiscountRub.toLocaleString("ru-RU")} ₽)
					</div>
				)}
			</td>
			<td>
				<div style={{ fontWeight: 700 }}>{item.currentCatalogPriceRub.toLocaleString("ru-RU")} ₽</div>
				{item.isArchived && <span className="pv-badge pv-badge-danger">В архиве</span>}
				{item.isNotFound && <span className="pv-badge pv-badge-warn">Нет в прайсе</span>}
			</td>
			<td>
				<span className={`pv-badge ${severityClass}`}>{item.statusBadgeText}</span>
			</td>
			<td>
				<div className="pv-resolution-selector">
					<button
						type="button"
						className={`pv-res-btn ${item.selectedResolution === "LOCK_ORIGINAL_PRICE" ? "active-lock" : ""}`}
						onClick={() => onItemResolutionChange(item.itemId, "LOCK_ORIGINAL_PRICE")}
						title="Фиксация цены плана"
					>
						План
					</button>
					<button
						type="button"
						className={`pv-res-btn ${item.selectedResolution === "UPDATE_TO_CURRENT_PRICE" ? "active-current" : ""}`}
						onClick={() => onItemResolutionChange(item.itemId, "UPDATE_TO_CURRENT_PRICE")}
						title={item.isArchived ? "Услуга выведена в архив" : "Пересчет по текущему прайсу"}
					>
						Прайс
					</button>
				</div>
			</td>
		</tr>
	);
};
