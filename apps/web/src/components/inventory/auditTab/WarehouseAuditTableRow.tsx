import type React from "react";
import { type WarehouseAuditItemLine, kopecksToRubles } from "../warehouseInventoryEngine.js";
import { WarehouseAuditRowStepper } from "./WarehouseAuditRowStepper.js";

export interface WarehouseAuditTableRowProps {
	readonly it: WarehouseAuditItemLine;
	readonly idx: number;
	readonly onQuantityChange: (itemId: string, newActual: number) => void;
}

export const WarehouseAuditTableRow: React.FC<WarehouseAuditTableRowProps> = ({
	it,
	idx,
	onQuantityChange,
}) => {
	const isExpired = it.fefoStatus === "expired";
	const isDiscrepant = it.discrepancyType !== "match";

	return (
		<tr className={isExpired ? "row-expired" : isDiscrepant ? "row-discrepancy" : ""}>
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

			<td className="font-mono tabular-nums text-right font-semibold" style={{ textAlign: "right" }}>
				{it.bookQuantity}
			</td>

			<WarehouseAuditRowStepper it={it} onQuantityChange={onQuantityChange} />

			<td style={{ textAlign: "center" }}>
				<span className={`discrepancy-pill font-mono tabular-nums ${it.discrepancyType}`}>
					{it.discrepancyQuantity > 0 ? `+${it.discrepancyQuantity}` : it.discrepancyQuantity}
				</span>
			</td>

			<td className="font-mono tabular-nums text-right" style={{ textAlign: "right" }}>
				{kopecksToRubles(it.unitCostKopecks).toFixed(2)}
			</td>

			<td className="font-mono tabular-nums text-right" style={{ textAlign: "right" }}>
				{kopecksToRubles(it.bookTotalKopecks).toFixed(2)}
			</td>

			<td className="font-mono tabular-nums text-right font-semibold" style={{ textAlign: "right" }}>
				{kopecksToRubles(it.actualTotalKopecks).toFixed(2)}
			</td>

			<td
				className="font-mono tabular-nums text-right font-bold"
				style={{
					textAlign: "right",
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
};

export default WarehouseAuditTableRow;
