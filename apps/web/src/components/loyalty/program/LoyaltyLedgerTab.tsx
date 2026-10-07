import type React from "react";
import { Download, Search, X } from "lucide-react";
import type { LoyaltyLedgerEntry } from "./loyaltyEngine";

export interface LoyaltyLedgerTabProps {
	readonly ledgerSearch: string;
	readonly onLedgerSearchChange: (search: string) => void;
	readonly filteredLedger: readonly LoyaltyLedgerEntry[];
	readonly onExportLedger: () => void;
}

export const LoyaltyLedgerTab: React.FC<LoyaltyLedgerTabProps> = ({
	ledgerSearch,
	onLedgerSearchChange,
	filteredLedger,
	onExportLedger,
}) => {
	return (
		<div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "1rem",
					flexWrap: "wrap",
					gap: "0.75rem",
				}}
			>
				<div className="dente-search-wrap w-64">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Поиск по операциям..."
						value={ledgerSearch}
						onChange={(e) => onLedgerSearchChange(e.target.value)}
						className="dente-search-input"
						aria-label="Поиск по операциям программы лояльности"
					/>
					{ledgerSearch && (
						<button
							type="button"
							className="dente-search-clear"
							onClick={() => onLedgerSearchChange("")}
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>

				<button
					type="button"
					onClick={onExportLedger}
					className="primary-button h-[32px] min-h-[32px] text-xs font-semibold px-3 rounded-lg inline-flex items-center gap-1.5"
				>
					<Download size={14} />
					Экспорт CSV (RFC 4180 / UTF-8 BOM)
				</button>
			</div>

			<div className="loyalty-ledger-table-wrap">
				<table className="loyalty-ledger-table">
					<thead>
						<tr>
							<th>Дата / Время</th>
							<th>Операция</th>
							<th>Счет (₽)</th>
							<th>Баллы (+/-)</th>
							<th>Баланс</th>
							<th>Кассир / Врач</th>
							<th>Кассовый чек</th>
						</tr>
					</thead>
					<tbody>
						{filteredLedger.length === 0 ? (
							<tr>
								<td
									colSpan={7}
									style={{
										textAlign: "center",
										padding: "2.5rem 1rem",
										color: "var(--muted)",
									}}
								>
									История операций с баллами пуста
								</td>
							</tr>
						) : (
							filteredLedger.map((entry) => (
								<tr key={entry.id}>
									<td>{entry.timestampIso}</td>
									<td>
										<div style={{ fontWeight: 600 }}>{entry.operationTypeRu}</div>
										<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
											{entry.noteRu}
										</div>
									</td>
									<td>{(entry.invoiceAmountKop / 100).toLocaleString("ru-RU")} ₽</td>
									<td>
										<span
											className={`loyalty-delta-badge ${
												entry.pointsDeltaRub > 0 ? "positive" : "negative"
											}`}
										>
											{entry.pointsDeltaRub > 0
												? `+${entry.pointsDeltaRub}`
												: entry.pointsDeltaRub}{" "}
											₽
										</span>
									</td>
									<td style={{ fontWeight: 700 }}>
										{entry.balanceAfterRub.toLocaleString("ru-RU")} ₽
									</td>
									<td>{entry.staffNameRu}</td>
									<td style={{ fontFamily: "monospace" }}>
										{entry.fiscalReceiptNumber ?? "—"}
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
