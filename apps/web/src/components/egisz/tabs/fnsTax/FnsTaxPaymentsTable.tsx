/**
 * FnsTaxPaymentsTable.tsx — Payments voucher table with integer kopecks precision
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatKopecksToRubles, type FnsTaxPaymentItem } from "../../egiszRemdEngine";

export interface FnsTaxPaymentsTableProps {
	readonly taxPayments: readonly FnsTaxPaymentItem[];
	readonly onAddTaxPayment: () => void;
	readonly onRemoveTaxPayment: (idx: number) => void;
	readonly onUpdateTaxPaymentDate: (idx: number, date: string) => void;
	readonly onUpdateTaxPaymentServiceCode: (idx: number, code: "1" | "2") => void;
	readonly onUpdateTaxPaymentDescription: (idx: number, desc: string) => void;
	readonly onUpdateTaxPaymentAmount: (idx: number, rublesStr: string) => void;
}

export const FnsTaxPaymentsTable: React.FC<FnsTaxPaymentsTableProps> = ({
	taxPayments,
	onAddTaxPayment,
	onRemoveTaxPayment,
	onUpdateTaxPaymentDate,
	onUpdateTaxPaymentServiceCode,
	onUpdateTaxPaymentDescription,
	onUpdateTaxPaymentAmount,
}) => {
	const totalKopecks = taxPayments.reduce((s, p) => s + (p.amountKopecks || 0), 0);

	return (
		<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
				<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
					3. Произведенные оплаты (с обязательными копейками)
				</div>
				<button
					type="button"
					onClick={onAddTaxPayment}
					style={{
						display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem",
						fontSize: "0.75rem", fontWeight: 600, borderRadius: "4px", background: "var(--primary)",
						color: "var(--ink-inverse)", border: "none", cursor: "pointer",
					}}
				>
					<Plus size={14} /> Добавить платеж
				</button>
			</div>

			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
				<thead>
					<tr style={{ background: "var(--paper-strong)", borderBottom: "1px solid var(--line)" }}>
						<th style={{ padding: "0.5rem", textAlign: "left" }}>Дата</th>
						<th style={{ padding: "0.5rem", textAlign: "left" }}>Код услуги</th>
						<th style={{ padding: "0.5rem", textAlign: "left" }}>Описание</th>
						<th style={{ padding: "0.5rem", textAlign: "right" }}>Сумма (руб.)</th>
						<th style={{ padding: "0.5rem", width: "40px" }} />
					</tr>
				</thead>
				<tbody>
					{taxPayments.map((pay, idx) => (
						<tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
							<td style={{ padding: "0.5rem" }}>
								<input
									type="date"
									value={String(pay.date).slice(0, 10)}
									onChange={(e) => onUpdateTaxPaymentDate(idx, e.target.value)}
									style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid var(--line)" }}
								/>
							</td>
							<td style={{ padding: "0.5rem" }}>
								<select
									value={pay.serviceCode}
									onChange={(e) => onUpdateTaxPaymentServiceCode(idx, e.target.value as "1" | "2")}
									style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid var(--line)" }}
								>
									<option value="1">1 (Обычное лечение)</option>
									<option value="2">2 (Дорогостоящее лечение)</option>
								</select>
							</td>
							<td style={{ padding: "0.5rem" }}>
								<input
									type="text"
									value={pay.serviceDescription || ""}
									onChange={(e) => onUpdateTaxPaymentDescription(idx, e.target.value)}
									style={{ width: "100%", padding: "0.25rem", borderRadius: "4px", border: "1px solid var(--line)" }}
								/>
							</td>
							<td style={{ padding: "0.5rem", textAlign: "right" }}>
								<input
									type="text"
									value={formatKopecksToRubles(pay.amountKopecks)}
									onChange={(e) => onUpdateTaxPaymentAmount(idx, e.target.value)}
									style={{ width: "100px", padding: "0.25rem", textAlign: "right", borderRadius: "4px", border: "1px solid var(--line)" }}
								/>
							</td>
							<td style={{ padding: "0.5rem", textAlign: "center" }}>
								<button
									type="button"
									onClick={() => onRemoveTaxPayment(idx)}
									style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
								>
									<Trash2 size={14} />
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			<div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem", fontSize: "0.875rem", fontWeight: 700 }}>
				Итого к налоговому вычету:{" "}
				<span style={{ color: "var(--primary)", marginLeft: "0.5rem" }}>
					{formatKopecksToRubles(totalKopecks)} руб.
				</span>
			</div>
		</div>
	);
};
