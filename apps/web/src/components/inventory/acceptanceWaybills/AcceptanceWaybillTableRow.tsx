import { Trash2 } from "lucide-react";
import type React from "react";
import {
	type AcceptanceWaybillItem, type VatRate,
	calculateFefoStatus, formatRubCurrency, rublesToKopecks,
} from "../acceptanceWaybillsEngine.js";
import { AcceptanceWaybillNameCell } from "./AcceptanceWaybillNameCell.js";

export interface AcceptanceWaybillTableRowProps {
	readonly item: AcceptanceWaybillItem;
	readonly idx: number;
	readonly receiptDate: string;
	readonly overdraftItemIds: Map<string, number>;
	readonly onUpdateItem: (index: number, patch: Partial<AcceptanceWaybillItem>) => void;
	readonly onRemoveItem: (index: number) => void;
}

export const AcceptanceWaybillTableRow: React.FC<AcceptanceWaybillTableRowProps> = ({
	item, idx, receiptDate, overdraftItemIds, onUpdateItem, onRemoveItem,
}) => {
	const fefo = calculateFefoStatus(item.expirationDate, receiptDate);
	const deficitStock = overdraftItemIds.get(item.name.toLowerCase().trim());

	return (
		<tr key={item.id} data-testid={`waybill-row-${idx}`}>
			<td style={{ textAlign: "center", fontSize: 11, color: "var(--muted)" }}>{idx + 1}</td>
			<AcceptanceWaybillNameCell
				name={item.name}
				deficitStock={deficitStock}
				onChange={(val) => onUpdateItem(idx, { name: val })}
			/>
			<td>
				<input
					type="text"
					className="acceptance-table-input"
					value={item.batchNumber}
					onChange={(e) => onUpdateItem(idx, { batchNumber: e.target.value })}
					placeholder="Заводской LOT / серия"
				/>
			</td>
			<td>
				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<input
						type="date"
						className="acceptance-table-input"
						value={item.expirationDate}
						onChange={(e) => onUpdateItem(idx, { expirationDate: e.target.value })}
					/>
					<span className="fefo-badge" style={{ color: fefo.hexColor, background: fefo.bgSoft }}>
						{fefo.badgeLabelRu}
					</span>
				</div>
			</td>
			<td style={{ textAlign: "center" }}>
				<input
					type="text"
					className="acceptance-table-input"
					style={{ textAlign: "center", width: "45px", margin: "0 auto" }}
					value={item.unit}
					onChange={(e) => onUpdateItem(idx, { unit: e.target.value })}
				/>
			</td>
			<td style={{ textAlign: "right" }}>
				<input
					type="number"
					step="1"
					min="0"
					className="acceptance-table-input"
					style={{ textAlign: "right" }}
					value={item.quantity}
					onChange={(e) => onUpdateItem(idx, { quantity: Math.max(0, Number(e.target.value)) })}
				/>
			</td>
			<td style={{ textAlign: "right" }}>
				<input
					type="number"
					step="0.01"
					min="0"
					className="acceptance-table-input"
					style={{ textAlign: "right" }}
					value={(item.unitPriceKopecks / 100).toFixed(2)}
					onChange={(e) => onUpdateItem(idx, { unitPriceKopecks: rublesToKopecks(Number(e.target.value)) })}
				/>
			</td>
			<td style={{ textAlign: "center" }}>
				<select
					className="acceptance-table-input"
					style={{ height: 28, fontSize: 11, textAlign: "center" }}
					value={item.vatRate}
					onChange={(e) => onUpdateItem(idx, { vatRate: Number(e.target.value) as VatRate })}
				>
					<option value={0}>0% (Без НДС)</option>
					<option value={5}>5% (УСН)</option>
					<option value={7}>7% (УСН)</option>
					<option value={10}>10% (ЛС)</option>
					<option value={20}>20% (Стандарт)</option>
				</select>
			</td>
			<td style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
				{formatRubCurrency(item.lineTotalKopecks)}
			</td>
			<td style={{ textAlign: "center" }}>
				<button
					type="button"
					className="acceptance-btn-danger"
					onClick={() => onRemoveItem(idx)}
					title="Удалить позицию"
					data-testid={`btn-remove-item-${idx}`}
				>
					<Trash2 size={14} />
				</button>
			</td>
		</tr>
	);
};

export default AcceptanceWaybillTableRow;
