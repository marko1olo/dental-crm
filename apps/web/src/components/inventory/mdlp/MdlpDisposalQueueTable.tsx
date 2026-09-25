import type { MdlpCarpuleQueueItem } from "@dental/shared";
import { ArrowUpDown, Layers, Trash2 } from "lucide-react";
import type React from "react";

export interface MdlpDisposalQueueTableProps {
	readonly items: readonly MdlpCarpuleQueueItem[];
	readonly onSortFefo: () => void;
	readonly onClearQueue: () => void;
	readonly onRemoveItem: (id: string) => void;
}

export const MdlpDisposalQueueTable: React.FC<MdlpDisposalQueueTableProps> = ({
	items,
	onSortFefo,
	onClearQueue,
	onRemoveItem,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<div className="font-bold text-sm flex items-center gap-2">
					<Layers size={18} className="text-teal-600" />
					<span>Очередь карпул на списание ({items.length})</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="mdlp-btn mdlp-btn-secondary min-h-[44px] text-xs px-2.5"
						style={{ minHeight: "44px" }}
						onClick={onSortFefo}
						title="Сортировать по сроку годности (FEFO)"
						data-testid="sort-fefo-btn"
					>
						<ArrowUpDown size={14} /> Сортировка FEFO
					</button>
					<button
						type="button"
						className="mdlp-btn mdlp-btn-ghost min-h-[44px] text-xs px-2 text-bad-fg hover:bg-red-50"
						style={{ minHeight: "44px" }}
						onClick={onClearQueue}
						title="Очистить всю очередь"
						data-testid="clear-queue-btn"
					>
						<Trash2 size={14} /> Очистить
					</button>
				</div>
			</div>

			<div className="mdlp-table-wrap">
				<table className="mdlp-table">
					<thead>
						<tr>
							<th style={{ width: "30px" }}>№</th>
							<th>Препарат / МНН</th>
							<th>Серия (LOT)</th>
							<th>Срок годности</th>
							<th>SGTIN (Маркировка)</th>
							<th style={{ textAlign: "right" }}>Цена, ₽</th>
							<th>Пациент / Визит</th>
							<th style={{ width: "40px" }}></th>
						</tr>
					</thead>
					<tbody>
						{items.length === 0 ? (
							<tr>
								<td
									colSpan={8}
									style={{
										textAlign: "center",
										padding: "2rem",
										color: "var(--muted)",
									}}
								>
									Очередь списания пуста. Отсканируйте DataMatrix код
									карпулы 2D-сканером.
								</td>
							</tr>
						) : (
							items.map((it, idx) => (
								<tr key={it.id}>
									<td
										style={{
											textAlign: "center",
											color: "var(--muted)",
										}}
									>
										{idx + 1}
									</td>
									<td className="min-w-0 max-w-xs">
										<div className="font-bold text-ink truncate" title={it.drugInfo?.tradeName ?? it.gtin}>
											{it.drugInfo?.tradeName ?? it.gtin}
										</div>
										<div className="text-[11px] text-muted truncate">
											{it.drugInfo?.inn ?? "Анестетик"}
										</div>
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
										<span className="font-mono text-[11px] text-ink">
											{it.sgtin}
										</span>
									</td>
									<td
										style={{
											textAlign: "right",
											fontWeight: "bold",
										}}
									>
										{it.costRub?.toFixed(2) ?? "0.00"}
									</td>
									<td className="text-xs text-muted">
										{it.patientName ? (
											<div>{it.patientName}</div>
										) : (
											<div>—</div>
										)}
										{it.doctorName && (
											<div className="text-[11px]">
												{it.doctorName}
											</div>
										)}
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
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};
