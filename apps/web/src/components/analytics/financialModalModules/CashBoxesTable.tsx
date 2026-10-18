import React from "react";
import { CreditCard } from "lucide-react";
import type { CashBoxRecord } from "./financialReportExport";

interface CashBoxesTableProps {
	readonly cashBoxes: readonly CashBoxRecord[];
}

export function CashBoxesTable({ cashBoxes }: CashBoxesTableProps) {
	return (
		<div className="fin-analytics-table-wrap" data-testid="cashboxes-table-expanded">
			<table className="fin-analytics-table">
				<thead>
					<tr>
						<th>Кассовый счет</th>
						<th>Код</th>
						<th style={{ textAlign: "right" }}>Текущий остаток (₽)</th>
						<th style={{ textAlign: "center" }}>Смена</th>
						<th>Назначение счета</th>
					</tr>
				</thead>
				<tbody>
					{cashBoxes.length === 0 ? (
						<tr>
							<td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 16 }}>
								Кассовые счета загружаются из базы данных...
							</td>
						</tr>
					) : (
						cashBoxes.map((box) => (
							<tr key={box.id}>
								<td style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
									<CreditCard size={14} color="var(--teal)" />
									<span>{box.name}</span>
								</td>
								<td style={{ fontFamily: "monospace", color: "var(--muted)" }}>{box.code}</td>
								<td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
									{Number(box.balanceRub).toLocaleString("ru-RU")} ₽
								</td>
								<td style={{ textAlign: "center" }}>
									<span
										style={{
											fontSize: 11,
											padding: "2px 6px",
											borderRadius: 4,
											background: box.isShiftOpen ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)",
											color: box.isShiftOpen ? "var(--ok-fg)" : "var(--muted)",
											fontWeight: 600,
										}}
									>
										{box.isShiftOpen ? "Открыта" : "Закрыта"}
									</span>
								</td>
								<td style={{ color: "var(--muted)" }}>
									{box.code.includes("cash")
										? "Наличные платежи кассы"
										: box.code.includes("terminal")
											? "Безналичный эквайринг и СБП"
											: box.code.includes("checking")
												? "Расчетный счет юрлиц и ДМС"
												: "Внутренний клиринговый счет"}
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
