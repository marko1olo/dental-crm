import type React from "react";
import { Trash2 } from "lucide-react";
import type { ChestnyZnakScannedItem } from "@dental/shared";
import { MdlpStatusBadge } from "./MdlpStatusBadge.js";

export interface MdlpScannedTableRowProps {
	readonly item: ChestnyZnakScannedItem;
	readonly displayIndex: number;
	readonly onRemoveItem: (id: string) => void;
}

export const MdlpScannedTableRow: React.FC<MdlpScannedTableRowProps> = ({
	item,
	displayIndex,
	onRemoveItem,
}) => {
	return (
		<tr data-testid={`mdlp-row-${item.id}`}>
			<td style={{ color: "var(--muted)", fontWeight: 700 }}>
				{displayIndex}
			</td>
			<td>
				<div className="font-bold text-[var(--ink)]">{item.tradeName}</div>
				<div className="text-xs text-[var(--muted)]">
					{item.inn} · {item.dosageForm}
				</div>
			</td>
			<td>
				<div className="font-mono text-xs text-[var(--ink)]">
					{item.gtin || "—"}
				</div>
				<div className="font-mono text-[10px] text-[var(--muted)] truncate max-w-[180px]">
					{item.serialNumber ? `SN: ${item.serialNumber}` : "—"}
				</div>
			</td>
			<td>
				<span className="font-mono text-xs text-[var(--ink)]">
					{item.series || "—"}
				</span>
			</td>
			<td>
				<div className="font-mono text-xs text-[var(--ink)]">
					{item.expirationDate || "—"}
				</div>
				{item.isExpired && (
					<div className="text-[10px] text-rose-400 font-semibold">Истек</div>
				)}
				{item.isExpiringSoon && (
					<div className="text-[10px] text-amber-400 font-semibold">
						{item.daysUntilExpiration} дн.
					</div>
				)}
			</td>
			<td>
				<MdlpStatusBadge item={item} />
			</td>
			<td style={{ fontWeight: 700 }}>
				{item.costRub != null ? `${item.costRub.toFixed(2)} ₽` : "—"}
			</td>
			<td style={{ textAlign: "center" }}>
				<button
					type="button"
					onClick={() => onRemoveItem(item.id)}
					className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
					title="Удалить из списка"
					data-testid={`delete-item-${item.id}`}
				>
					<Trash2 className="w-4 h-4" />
				</button>
			</td>
		</tr>
	);
};
