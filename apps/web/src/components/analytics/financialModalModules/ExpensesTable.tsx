import React from "react";
import type { ExpenseReasonRecord } from "./financialPnlTypes";

interface ExpensesTableProps {
	readonly resolvedExpenses: readonly ExpenseReasonRecord[];
	readonly realPnl: any | null;
}

export function ExpensesTable({ resolvedExpenses, realPnl }: ExpensesTableProps) {
	return (
		<div className="fin-analytics-table-wrap" data-testid="expenses-table-expanded">
			<table className="fin-analytics-table">
				<thead>
					<tr>
						<th style={{ width: 60 }}>Код</th>
						<th>Наименование статьи расходов</th>
						<th>Категория</th>
						<th style={{ textAlign: "right" }}>Факт за период (₽)</th>
						<th>Назначение</th>
					</tr>
				</thead>
				<tbody>
					{resolvedExpenses.length === 0 ? (
						<tr>
							<td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 16 }}>
								Классификатор расходов загружается...
							</td>
						</tr>
					) : (
						resolvedExpenses.map((exp) => {
							const statMatch = realPnl?.statutoryExpenses?.find(
								(s: any) => Number(s.reasonId) === Number(exp.code),
							);
							const amountRub = Number(statMatch?.amountRub || 0);
							return (
								<tr key={exp.id || exp.code}>
									<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--teal)" }}>
										#{exp.code}
									</td>
									<td style={{ fontWeight: 600 }}>{exp.name}</td>
									<td>
										<span
											style={{
												fontSize: 11,
												padding: "2px 6px",
												borderRadius: 4,
												background: "color-mix(in srgb, var(--teal) 12%, transparent)",
												color: "var(--teal)",
											}}
										>
											{exp.category || "Операционные"}
										</span>
									</td>
									<td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
										{amountRub.toLocaleString("ru-RU")} ₽
									</td>
									<td style={{ color: "var(--muted)" }}>
										{exp.description || "Регламентированная статья кассового расхода"}
									</td>
								</tr>
							);
						})
					)}
				</tbody>
			</table>
		</div>
	);
}
