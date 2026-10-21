import type React from "react";
import { WarehouseAuditTableHeader } from "./auditTab/WarehouseAuditTableHeader.js";
import { WarehouseAuditTableRow } from "./auditTab/WarehouseAuditTableRow.js";
import type { WarehouseAuditItemLine } from "./warehouseInventoryEngine.js";

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
				<WarehouseAuditTableHeader />
				<tbody>
					{filteredItems.length === 0 ? (
						<tr>
							<td colSpan={13} style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
								Позиций по заданным критериям фильтрации не найдено.
							</td>
						</tr>
					) : (
						filteredItems.map((it, idx) => (
							<WarehouseAuditTableRow
								key={it.itemId}
								it={it}
								idx={idx}
								onQuantityChange={onQuantityChange}
							/>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};

export default WarehouseInventoryAuditTable;
