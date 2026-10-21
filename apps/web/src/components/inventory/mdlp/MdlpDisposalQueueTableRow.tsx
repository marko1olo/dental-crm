import type { MdlpCarpuleQueueItem } from "@dental/shared";
import { Trash2 } from "lucide-react";
import type React from "react";

export interface MdlpDisposalQueueTableRowProps {
	readonly item: MdlpCarpuleQueueItem;
	readonly index: number;
	readonly onRemoveItem: (id: string) => void;
}

export const MdlpDisposalQueueTableRow: React.FC<MdlpDisposalQueueTableRowProps> = ({
	item: it,
	index: idx,
	onRemoveItem,
}) => {
	return (
		<tr>
			<td style={{ textAlign: "center", color: "var(--muted)" }}>{idx + 1}</td>
			<td className="min-w-0 max-w-xs">
				<div className="font-bold text-ink truncate" title={it.drugInfo?.tradeName ?? it.gtin}>
					{it.drugInfo?.tradeName ?? it.gtin}
				</div>
				<div className="text-[11px] text-muted truncate">{it.drugInfo?.inn ?? "Анестетик"}</div>
			</td>
			<td>
				<span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-paper-soft border border-line">
					{it.series ?? "—"}
				</span>
			</td>
			<td>
				{it.expirationDate ? (
					<span
						className={`text-xs font-semibold px-2 py-0.5 rounded ${
							it.isExpired
								? "bg-[var(--bad-bg,#fee2e2)] text-[var(--bad-fg,#dc2626)] font-bold"
								: it.isExpiringSoon
									? "bg-[var(--warn-bg,#fef3c7)] text-[var(--warn-fg,#d97706)] font-bold"
									: "text-muted"
						}`}
					>
						{it.expirationDate}
						{it.isExpiringSoon && " (≤90дн)"}
						{it.isExpired && " (ПРОСРОЧЕНО)"}
					</span>
				) : (
					<span className="text-muted">—</span>
				)}
			</td>
			<td>
				<span className="font-mono text-[11px] text-ink">{it.sgtin}</span>
			</td>
			<td style={{ textAlign: "right", fontWeight: "bold" }}>
				{it.costRub?.toFixed(2) ?? "0.00"}
			</td>
			<td className="text-xs text-muted">
				{it.patientName ? <div>{it.patientName}</div> : <div>—</div>}
				{it.doctorName && <div className="text-[11px]">{it.doctorName}</div>}
			</td>
			<td style={{ textAlign: "center" }}>
				<button
					type="button"
					className="text-muted hover:text-bad-fg p-1 rounded"
					onClick={() => onRemoveItem(it.id)}
					title="Удалить из очереди"
				>
					<Trash2 size={15} />
				</button>
			</td>
		</tr>
	);
};
