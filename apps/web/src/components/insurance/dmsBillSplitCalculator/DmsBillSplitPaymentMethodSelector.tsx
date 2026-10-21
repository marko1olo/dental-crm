/**
 * DmsBillSplitPaymentMethodSelector.tsx — Селектор способа внесения доплаты пациентом (безнал / нал / сплит)
 */

import { Banknote, Check, CreditCard, Split } from "lucide-react";
import React, { useId } from "react";
import {
	formatCurrencyKopecks,
	kopecksToRubles,
	type PatientPaymentMethod,
	type PatientPaymentSplitResult,
} from "../dmsSplitEngine.js";

export interface DmsBillSplitPaymentMethodSelectorProps {
	readonly paymentMethod: PatientPaymentMethod;
	readonly setPaymentMethod: (method: PatientPaymentMethod) => void;
	readonly mixedCashRub: number;
	readonly setMixedCashRub: (rub: number) => void;
	readonly totalPatientTotalKopecks: number;
	readonly paymentSplit: PatientPaymentSplitResult | null | undefined;
}

export function DmsBillSplitPaymentMethodSelector({
	paymentMethod,
	setPaymentMethod,
	mixedCashRub,
	setMixedCashRub,
	totalPatientTotalKopecks,
	paymentSplit,
}: DmsBillSplitPaymentMethodSelectorProps) {
	const cashInputId = useId();
	const maxPatientRub = kopecksToRubles(totalPatientTotalKopecks);

	return (
		<div style={{ background: "var(--paper, #ffffff)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--line, #e2e8f0)", marginBottom: "14px" }}>
			<div style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: "8px", color: "var(--ink, #0f172a)" }}>
				Способ внесения доплаты пациентом ({formatCurrencyKopecks(totalPatientTotalKopecks)}):
			</div>
			<div className="dms-quick-toolbar" style={{ marginBottom: "10px" }}>
				<button type="button" className={`dms-quick-chip ${paymentMethod === "card" ? "active" : ""}`} onClick={() => setPaymentMethod("card")}>
					<CreditCard size={14} />
					<span>Банковская карта (безнал)</span>
				</button>
				<button type="button" className={`dms-quick-chip ${paymentMethod === "cash" ? "active" : ""}`} onClick={() => setPaymentMethod("cash")}>
					<Banknote size={14} />
					<span>Наличные (касса)</span>
				</button>
				<button type="button" className={`dms-quick-chip ${paymentMethod === "mixed" ? "active" : ""}`} onClick={() => setPaymentMethod("mixed")}>
					<Split size={14} />
					<span>Смешанная (Нал + Карта)</span>
				</button>
			</div>
			{paymentMethod === "mixed" && (
				<div className="dms-grid-2" style={{ paddingTop: "8px", borderTop: "1px dashed var(--line, #e2e8f0)", alignItems: "flex-end" }}>
					<div className="dms-field-group">
						<label htmlFor={cashInputId} className="dms-label">Оплата наличными (₽)</label>
						<input
							id={cashInputId}
							type="number"
							min="0"
							max={maxPatientRub}
							step="100"
							value={mixedCashRub}
							onChange={(e) => setMixedCashRub(Math.max(0, Math.min(maxPatientRub, Number(e.target.value) || 0)))}
							className="dms-input font-mono"
						/>
					</div>
					<div className="dms-field-group">
						<span className="dms-label">Оплата банковской картой (авто-расчет)</span>
						<div className="dms-input font-mono font-bold flex items-center bg-slate-50 dark:bg-slate-900" style={{ color: "var(--primary, #0284c7)" }}>
							{paymentSplit ? formatCurrencyKopecks(paymentSplit.cardKopecks) : "0,00 ₽"}
						</div>
					</div>
				</div>
			)}
			{paymentSplit && (
				<div style={{ marginTop: "8px", fontSize: "0.75rem", color: "var(--muted, #64748b)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
					<span>Наличные: <strong>{formatCurrencyKopecks(paymentSplit.cashKopecks)}</strong></span>
					<span>&bull;</span>
					<span>Банковская карта: <strong>{formatCurrencyKopecks(paymentSplit.cardKopecks)}</strong></span>
					<span>&bull;</span>
					<span style={{ color: "var(--ok-fg, #059669)", fontWeight: 600 }}>
						<Check size={12} className="inline mr-1" />
						Сумма доплаты сходится с чеком
					</span>
				</div>
			)}
		</div>
	);
}
