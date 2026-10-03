import { AlertCircle, ShieldCheck } from "lucide-react";
import type React from "react";
import {
	type InventoryAuditTotals,
	formatRubCurrency,
} from "./warehouseInventoryEngine.js";

export interface WarehouseInventoryKpisGridProps {
	readonly totals: InventoryAuditTotals;
}

export const WarehouseInventoryKpisGrid: React.FC<WarehouseInventoryKpisGridProps> = ({
	totals,
}) => {
	return (
		<div className="warehouse-inventory-summary-grid">
			<div className="warehouse-kpi-card">
				<span className="warehouse-kpi-label">Позиции / Расхождения</span>
				<div className="warehouse-kpi-value">
					{totals.totalItemsCount}{" "}
					<span style={{ fontSize: "0.85rem", fontWeight: "normal", color: "var(--muted)" }}>
						(Совпало: {totals.matchedItemsCount})
					</span>
				</div>
				<div className="warehouse-kpi-sub">
					{totals.surplusItemsCount > 0 && (
						<span style={{ color: "var(--ok-fg, #059669)", fontWeight: 600 }}>
							+{totals.surplusItemsCount} излишков
						</span>
					)}
					{totals.shortageItemsCount > 0 && (
						<span style={{ color: "var(--bad-fg, #dc2626)", fontWeight: 600, marginLeft: 4 }}>
							-{totals.shortageItemsCount} недостач
						</span>
					)}
					{totals.surplusItemsCount === 0 && totals.shortageItemsCount === 0 && (
						<span>Расхождений нет</span>
					)}
				</div>
			</div>

			<div className="warehouse-kpi-card">
				<span className="warehouse-kpi-label">Книжный остаток (учет)</span>
				<div className="warehouse-kpi-value">{formatRubCurrency(totals.totalBookCostRubles)}</div>
				<div className="warehouse-kpi-sub">Всего: {totals.totalBookQuantity} ед. ТМЦ</div>
			</div>

			<div className="warehouse-kpi-card">
				<span className="warehouse-kpi-label">Фактический остаток</span>
				<div className="warehouse-kpi-value">{formatRubCurrency(totals.totalActualCostRubles)}</div>
				<div className="warehouse-kpi-sub">Всего: {totals.totalActualQuantity} ед. ТМЦ</div>
			</div>

			<div className="warehouse-kpi-card">
				<span className="warehouse-kpi-label">Сальдо сличительной сверки</span>
				<div
					className={`warehouse-kpi-value ${
						totals.netDiscrepancyCostRubles > 0
							? "surplus"
							: totals.netDiscrepancyCostRubles < 0
								? "shortage"
								: ""
					}`}
				>
					{totals.netDiscrepancyCostRubles > 0 ? "+" : ""}
					{formatRubCurrency(totals.netDiscrepancyCostRubles)}
				</div>
				<div className="warehouse-kpi-sub">
					{totals.netDiscrepancyCostRubles === 0
						? "100% баланс"
						: totals.netDiscrepancyCostRubles > 0
							? "Суммарный излишек"
							: "Суммарная недостача"}
				</div>
			</div>

			<div className="warehouse-kpi-card">
				<span className="warehouse-kpi-label">Контроль сроков годности</span>
				<div
					className="warehouse-kpi-value"
					style={{
						color: totals.expiredItemsCount > 0 ? "var(--bad-fg, #dc2626)" : "var(--ok-fg, #059669)",
						display: "flex",
						alignItems: "center",
						gap: 6,
					}}
				>
					{totals.expiredItemsCount > 0 ? (
						<>
							<AlertCircle size={18} />
							<span>{totals.expiredItemsCount} просрочено</span>
						</>
					) : (
						<>
							<ShieldCheck size={18} />
							<span>Все партии в норме</span>
						</>
					)}
				</div>
				<div className="warehouse-kpi-sub">
					{totals.warningItemsCount > 0
						? `${totals.warningItemsCount} партий требуют внимания (<60д)`
						: "Свежие партии"}
				</div>
			</div>
		</div>
	);
};
