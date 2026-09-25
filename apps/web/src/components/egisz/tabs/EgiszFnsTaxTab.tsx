/**
 * EgiszFnsTaxTab.tsx
 *
 * Tab 2: FNS Tax Deduction Certificate Editor (КНД 1151156 / Приказ ЕД-7-11/755@).
 * Taxpayer, patient relationship, and payment vouchers with exact kopeck math.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatKopecksToRubles, type FnsTaxPaymentItem } from "../egiszRemdEngine";

export interface EgiszFnsTaxTabProps {
	readonly taxDocNumber: string;
	readonly onTaxDocNumberChange: (val: string) => void;
	readonly taxYear: number;
	readonly onTaxYearChange: (val: number) => void;
	readonly taxSignerName: string;
	readonly onTaxSignerNameChange: (val: string) => void;
	readonly taxpayerName: string;
	readonly onTaxpayerNameChange: (val: string) => void;
	readonly taxpayerInn: string;
	readonly onTaxpayerInnChange: (val: string) => void;
	readonly taxpayerSnils: string;
	readonly onTaxpayerSnilsChange: (val: string) => void;
	readonly taxPatientName: string;
	readonly onTaxPatientNameChange: (val: string) => void;
	readonly taxRelCode: "1" | "2" | "3" | "4";
	readonly onTaxRelCodeChange: (val: "1" | "2" | "3" | "4") => void;
	readonly taxPatientSnils: string;
	readonly onTaxPatientSnilsChange: (val: string) => void;
	readonly taxPayments: readonly FnsTaxPaymentItem[];
	readonly onAddTaxPayment: () => void;
	readonly onRemoveTaxPayment: (idx: number) => void;
	readonly onUpdateTaxPaymentDate: (idx: number, date: string) => void;
	readonly onUpdateTaxPaymentServiceCode: (idx: number, code: "1" | "2") => void;
	readonly onUpdateTaxPaymentDescription: (idx: number, desc: string) => void;
	readonly onUpdateTaxPaymentAmount: (idx: number, rublesStr: string) => void;
}

export const EgiszFnsTaxTab: React.FC<EgiszFnsTaxTabProps> = ({
	taxDocNumber,
	onTaxDocNumberChange,
	taxYear,
	onTaxYearChange,
	taxSignerName,
	onTaxSignerNameChange,
	taxpayerName,
	onTaxpayerNameChange,
	taxpayerInn,
	onTaxpayerInnChange,
	taxpayerSnils,
	onTaxpayerSnilsChange,
	taxPatientName,
	onTaxPatientNameChange,
	taxRelCode,
	onTaxRelCodeChange,
	taxPatientSnils,
	onTaxPatientSnilsChange,
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
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			{/* Form Meta */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
						Номер справки
					</label>
					<input
						type="text"
						value={taxDocNumber}
						onChange={(e) => onTaxDocNumberChange(e.target.value)}
						style={{
							width: "100%",
							padding: "0.5rem",
							marginTop: "0.35rem",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "0.875rem",
						}}
					/>
				</div>

				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
						Налоговый период (Год)
					</label>
					<input
						type="number"
						value={taxYear}
						onChange={(e) => onTaxYearChange(Number(e.target.value) || 2026)}
						style={{
							width: "100%",
							padding: "0.5rem",
							marginTop: "0.35rem",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "0.875rem",
						}}
					/>
				</div>

				<div>
					<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
						Подписант (Руководитель)
					</label>
					<input
						type="text"
						value={taxSignerName}
						onChange={(e) => onTaxSignerNameChange(e.target.value)}
						style={{
							width: "100%",
							padding: "0.5rem",
							marginTop: "0.35rem",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "0.875rem",
						}}
					/>
				</div>
			</div>

			{/* Taxpayer & Patient Details */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem" }}>
						1. Налогоплательщик (Получатель вычета)
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						<div>
							<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>ФИО налогоплательщика</label>
							<input
								type="text"
								value={taxpayerName}
								onChange={(e) => onTaxpayerNameChange(e.target.value)}
								style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
							/>
						</div>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
							<div>
								<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>ИНН</label>
								<input
									type="text"
									value={taxpayerInn}
									onChange={(e) => onTaxpayerInnChange(e.target.value)}
									style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
								/>
							</div>
							<div>
								<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>СНИЛС</label>
								<input
									type="text"
									value={taxpayerSnils}
									onChange={(e) => onTaxpayerSnilsChange(e.target.value)}
									style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
								/>
							</div>
						</div>
					</div>
				</div>

				<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem" }}>
						2. Пациент и степень родства
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						<div>
							<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>ФИО пациента</label>
							<input
								type="text"
								value={taxPatientName}
								onChange={(e) => onTaxPatientNameChange(e.target.value)}
								style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
							/>
						</div>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
							<div>
								<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Степень родства</label>
								<select
									value={taxRelCode}
									onChange={(e) => onTaxRelCodeChange(e.target.value as "1" | "2" | "3" | "4")}
									style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
								>
									<option value="1">1 — Сам налогоплательщик</option>
									<option value="2">2 — Супруг (супруга)</option>
									<option value="3">3 — Родитель</option>
									<option value="4">4 — Ребенок / Подопечный</option>
								</select>
							</div>
							<div>
								<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>СНИЛС пациента</label>
								<input
									type="text"
									value={taxPatientSnils}
									onChange={(e) => onTaxPatientSnilsChange(e.target.value)}
									style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Payments Breakdown */}
			<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
						3. Произведенные оплаты (с обязательными копейками)
					</div>
					<button
						type="button"
						onClick={onAddTaxPayment}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.25rem",
							padding: "0.25rem 0.5rem",
							fontSize: "0.75rem",
							fontWeight: 600,
							borderRadius: "4px",
							background: "var(--primary)",
							color: "var(--ink-inverse)",
							border: "none",
							cursor: "pointer",
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
		</div>
	);
};
