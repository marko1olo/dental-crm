import type React from "react";
import {
	AlertCircle,
	AlertTriangle,
	Scan,
	ShieldCheck,
	Trash2,
	XCircle,
} from "lucide-react";
import type { ChestnyZnakScannedItem } from "@dental/shared";

export interface MdlpScannedItemsTableProps {
	readonly scannedItems: readonly ChestnyZnakScannedItem[];
	readonly onRemoveItem: (id: string) => void;
}

export const MdlpScannedItemsTable: React.FC<MdlpScannedItemsTableProps> = ({
	scannedItems,
	onRemoveItem,
}) => {
	return (
		<div className="mdlp-table-container">
			<table className="mdlp-table" data-testid="mdlp-scanned-table">
				<thead>
					<tr>
						<th>№</th>
						<th>Препарат / Номенклатура</th>
						<th>GTIN / SGTIN</th>
						<th>Серия</th>
						<th>Срок годности</th>
						<th>Статус маркировки</th>
						<th>Сумма</th>
						<th style={{ textAlign: "center" }}>Действия</th>
					</tr>
				</thead>
				<tbody>
					{scannedItems.length === 0 ? (
						<tr>
							<td colSpan={8}>
								<div className="mdlp-empty-table">
									<Scan className="w-8 h-8 text-[var(--muted)] opacity-50" />
									<p className="font-semibold text-sm text-[var(--ink)]">
										Нет отсканированных упаковок
									</p>
									<p className="text-xs text-[var(--muted)]">
										Поднесите 2D-сканер к коду DataMatrix на упаковке
									</p>
								</div>
							</td>
						</tr>
					) : (
						scannedItems.map((item, index) => (
							<tr key={item.id} data-testid={`mdlp-row-${item.id}`}>
								<td style={{ color: "var(--muted)", fontWeight: 700 }}>
									{scannedItems.length - index}
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
										<div className="text-[10px] text-rose-400 font-semibold">
											Истек
										</div>
									)}
									{item.isExpiringSoon && (
										<div className="text-[10px] text-amber-400 font-semibold">
											{item.daysUntilExpiration} дн.
										</div>
									)}
								</td>
								<td>
									{item.status === "verified" && (
										<span className="mdlp-status-badge verified">
											<ShieldCheck className="w-3 h-3" />
											<span>Проверен</span>
										</span>
									)}
									{item.status === "warning" && (
										<span className="mdlp-status-badge warning" title={item.statusReason}>
											<AlertTriangle className="w-3 h-3" />
											<span>Внимание</span>
										</span>
									)}
									{item.status === "expired" && (
										<span className="mdlp-status-badge expired" title={item.statusReason}>
											<AlertCircle className="w-3 h-3" />
											<span>Просрочен</span>
										</span>
									)}
									{item.status === "invalid_checksum" && (
										<span className="mdlp-status-badge expired" title={item.statusReason}>
											<XCircle className="w-3 h-3" />
											<span>Ошибка кода</span>
										</span>
									)}
									{item.status === "invalid_format" && (
										<span className="mdlp-status-badge invalid" title={item.statusReason}>
											<AlertCircle className="w-3 h-3" />
											<span>Невалидный</span>
										</span>
									)}
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
						))
					)}
				</tbody>
			</table>
		</div>
	);
};
