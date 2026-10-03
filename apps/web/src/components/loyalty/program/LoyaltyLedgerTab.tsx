import type React from "react";
import { Download, Search } from "lucide-react";
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
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<Search size={18} color="var(--muted)" />
					<input
						type="text"
						placeholder="Поиск по операциям..."
						value={ledgerSearch}
						onChange={(e) => onLedgerSearchChange(e.target.value)}
						style={{
							padding: "0.375rem 0.75rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--line)",
							fontSize: "0.8125rem",
							width: "240px",
						}}
					/>
				</div>

				<button
					type="button"
					onClick={onExportLedger}
					style={{
						padding: "0.5rem 1rem",
						minHeight: "44px",
						borderRadius: "0.5rem",
						border: "none",
						background: "var(--teal)",
						color: "var(--on-teal, var(--paper))",
						fontWeight: 700,
						fontSize: "0.8125rem",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.375rem",
					}}
				>
					<Download size={16} />
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
