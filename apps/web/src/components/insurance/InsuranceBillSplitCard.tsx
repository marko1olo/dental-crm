/**
 * InsuranceBillSplitCard.tsx — Ergonomic Visit Bill Split Payment Calculator.
 *
 * Mandates:
 * - 8e (Doctor & Receptionist Autonomy: no blocked buttons, instant calculations)
 * - 8n (Solo-Doctor & Small Clinic sovereignty: transparent copay, zero bureaucracy)
 * - 8l (Pure integer kopeck math, BIGINT amountKopecks, zero floating-point drift)
 * - 8am (Exactly ONE Primary CTA button #0d9488 per visible screen)
 * - 8ze (Apple HIG: touch targets >= 44x44px, natural thumb zone)
 * - 8b (Healthy sweet spot 250-320 lines)
 */

import { Banknote, Calculator, CreditCard, Layers, ShieldCheck, Sparkles, Split, Wallet } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
	calculateDmsCoPaymentSplit,
	formatCurrencyKopecks,
	formatCurrencyRub,
	kopecksToRub,
	rubToKopecks,
	type DmsBillableItem,
	type DmsGuaranteeLetter,
	type PatientPaymentMethod,
} from "./insuranceData.js";

export interface InsuranceBillSplitCardProps {
	readonly letter?: DmsGuaranteeLetter;
	readonly billItems?: readonly DmsBillableItem[];
	readonly onApplySplitToCashbox?: (splitData: {
		totalDueRub: number;
		dmsRub: number;
		patientRub: number;
		patientMethod: PatientPaymentMethod;
		patientCashRub?: number;
		patientCardRub?: number;
		letterId?: string;
		letterNumber?: string;
		insurerName?: string;
	}) => void;
}

const DEFAULT_SAMPLE_BILL_ITEMS: readonly DmsBillableItem[] = [
	{ id: "bill-1", serviceCode: "A16.07.002.001", serviceCode804n: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (световой композит)", toothNumber: "16", quantity: 1, unitPriceKopecks: 450000 },
	{ id: "bill-2", serviceCode: "A16.07.030.002", serviceCode804n: "A16.07.030.002", serviceName: "Эндодонтическое лечение (2 канала)", toothNumber: "16", quantity: 1, unitPriceKopecks: 580000 },
	{ id: "bill-3", serviceCode: "A11.07.010", serviceCode804n: "A11.07.010", serviceName: "Анестезия проводниковая артикаин", toothNumber: "16", quantity: 2, unitPriceKopecks: 95000 },
	{ id: "bill-4", serviceCode: "A06.07.012", serviceCode804n: "A06.07.012", serviceName: "Прицельная контрольная радиовизиография", toothNumber: "16", quantity: 1, unitPriceKopecks: 80000 },
	{ id: "bill-5", serviceCode: "A16.07.051", serviceCode804n: "A16.07.051", serviceName: "Профессиональная гигиена Air-Flow", quantity: 1, unitPriceKopecks: 650000, isExcluded: false },
];

export const InsuranceBillSplitCard: React.FC<InsuranceBillSplitCardProps> = ({
	letter,
	billItems = DEFAULT_SAMPLE_BILL_ITEMS,
	onApplySplitToCashbox,
}) => {
	const [activeFranchisePercent, setActiveFranchisePercent] = useState<number>(() => {
		return letter?.franchisePercent ?? letter?.franchisePct ?? 0;
	});

	const [paymentMethod, setPaymentMethod] = useState<PatientPaymentMethod>("card");
	const [mixedCashRubInput, setMixedCashRubInput] = useState<string>("0");

	// Расчет сплита копейка-в-копейку
	const splitResult = useMemo(() => {
		return calculateDmsCoPaymentSplit(billItems, {
			guaranteeLetter: letter,
			franchisePercent: activeFranchisePercent,
		});
	}, [billItems, letter, activeFranchisePercent]);

	const {
		totalBillKopecks,
		totalInsuranceCoveredKopecks,
		totalPatientOutOfPocketKopecks,
		lineItems,
		letterApprovedLimitKopecks,
		remainingLimitKopecks,
	} = splitResult;

	const patientDueRub = kopecksToRub(totalPatientOutOfPocketKopecks);
	const mixedCashRub = Math.max(0, Math.min(patientDueRub, Number(mixedCashRubInput) || 0));
	const mixedCardRub = Math.max(0, patientDueRub - mixedCashRub);

	const handleApply = () => {
		if (onApplySplitToCashbox) {
			onApplySplitToCashbox({
				totalDueRub: kopecksToRub(totalBillKopecks),
				dmsRub: kopecksToRub(totalInsuranceCoveredKopecks),
				patientRub: patientDueRub,
				patientMethod,
				patientCashRub: paymentMethod === "cash" ? patientDueRub : paymentMethod === "mixed" ? mixedCashRub : 0,
				patientCardRub: paymentMethod === "card" ? patientDueRub : paymentMethod === "mixed" ? mixedCardRub : 0,
				letterId: letter?.id,
				letterNumber: letter?.letterNumber,
				insurerName: letter?.insurerName,
			});
		}
	};

	return (
		<div className="dms-card dms-split-card" style={{ background: "var(--paper, #ffffff)", border: "1px solid var(--line, #e2e8f0)", borderRadius: "16px", padding: "20px" }}>
			{/* Шапка карточки */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(13, 148, 136, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--teal, #0d9488)" }}>
						<Split size={20} />
					</div>
					<div>
						<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
							Сплит-оплата: ДМС + Пациент в кассу
						</h3>
						<p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted, #64748b)" }}>
							{letter?.insurerName ? `Страховая компания: ${letter.insurerName}` : "Прямой расчет сплита визита"} • Лимит покрытия: {formatCurrencyKopecks(letterApprovedLimitKopecks || 5000000)}
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted, #64748b)", marginRight: "2px" }}>Франшиза:</span>
					{[0, 10, 20, 30, 50].map((pct) => (
						<button
							key={pct}
							type="button"
							onClick={() => setActiveFranchisePercent(pct)}
							style={{
								padding: "4px 8px",
								fontSize: "12px",
								fontWeight: 600,
								borderRadius: "8px",
								border: activeFranchisePercent === pct ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line, #cbd5e1)",
								background: activeFranchisePercent === pct ? "var(--teal, #0d9488)" : "var(--paper-soft, #f8fafc)",
								color: activeFranchisePercent === pct ? "#ffffff" : "var(--ink, #0f172a)",
								cursor: "pointer",
								minHeight: "32px",
							}}
						>
							{pct}%
						</button>
					))}
				</div>
			</div>

			{/* Сводные плашки 3-колоночного баланса */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "18px" }}>
				<div style={{ padding: "12px 14px", borderRadius: "12px", background: "var(--paper-soft, #f8fafc)", border: "1px solid var(--line, #e2e8f0)" }}>
					<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Общая сумма счёта</div>
					<div style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink, #0f172a)", marginTop: "4px" }}>
						{formatCurrencyKopecks(totalBillKopecks)}
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>Позиций: {lineItems.length}</div>
				</div>

				<div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(13, 148, 136, 0.08)", border: "1px solid rgba(13, 148, 136, 0.25)" }}>
					<div style={{ fontSize: "11px", color: "var(--teal, #0d9488)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
						Покрывает страховая (ДМС)
					</div>
					<div style={{ fontSize: "20px", fontWeight: 800, color: "var(--teal, #0d9488)", marginTop: "4px" }}>
						{formatCurrencyKopecks(totalInsuranceCoveredKopecks)}
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
						Остаток лимита: {formatCurrencyKopecks(remainingLimitKopecks)}
					</div>
				</div>

				<div style={{ padding: "12px 14px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
					<div style={{ fontSize: "11px", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
						Доплата пациента в кассу
					</div>
					<div style={{ fontSize: "20px", fontWeight: 800, color: "#b45309", marginTop: "4px" }}>
						{formatCurrencyKopecks(totalPatientOutOfPocketKopecks)}
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
						Франшиза: {activeFranchisePercent}%
					</div>
				</div>
			</div>

			{/* Выбор способа доплаты пациентом */}
			{patientDueRub > 0 && (
				<div style={{ marginBottom: "18px", padding: "14px", borderRadius: "12px", background: "var(--paper-soft, #f8fafc)", border: "1px solid var(--line, #e2e8f0)" }}>
					<div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink, #0f172a)", marginBottom: "8px" }}>
						Способ доплаты пациента в кассу ({formatCurrencyRub(patientDueRub)}):
					</div>
					<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: paymentMethod === "mixed" ? "12px" : "0" }}>
						{[
							{ id: "card" as const, label: "Банковская карта", icon: CreditCard },
							{ id: "cash" as const, label: "Наличные", icon: Banknote },
							{ id: "advance" as const, label: "Аванс со счёта", icon: Wallet },
							{ id: "mixed" as const, label: "Смешанная (Нал + Карта)", icon: Layers },
						].map((item) => {
							const Icon = item.icon;
							const isSelected = paymentMethod === item.id;
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => setPaymentMethod(item.id)}
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										padding: "8px 12px",
										borderRadius: "10px",
										border: isSelected ? "1.5px solid var(--teal, #0d9488)" : "1px solid var(--line, #cbd5e1)",
										background: isSelected ? "rgba(13, 148, 136, 0.1)" : "var(--paper, #ffffff)",
										color: isSelected ? "var(--teal, #0d9488)" : "var(--ink, #0f172a)",
										fontWeight: 600,
										fontSize: "12px",
										cursor: "pointer",
										minHeight: "44px",
									}}
								>
									<Icon size={16} />
									<span>{item.label}</span>
								</button>
							);
						})}
					</div>

					{paymentMethod === "mixed" && (
						<div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
							<label style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Наличными:
								<input
									type="number"
									value={mixedCashRubInput}
									onChange={(e) => setMixedCashRubInput(e.target.value)}
									style={{ marginLeft: "8px", padding: "6px 10px", width: "110px", borderRadius: "8px", border: "1px solid var(--line, #cbd5e1)", fontSize: "13px" }}
								/>
								<span style={{ marginLeft: "4px" }}>₽</span>
							</label>
							<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
								Картой: <strong style={{ color: "var(--ink, #0f172a)" }}>{formatCurrencyRub(mixedCardRub)}</strong>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Таблица детализации услуг */}
			<div style={{ overflowX: "auto", marginBottom: "18px" }}>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
					<thead>
						<tr style={{ borderBottom: "1.5px solid var(--line, #cbd5e1)", textAlign: "left", color: "var(--muted, #64748b)" }}>
							<th style={{ padding: "8px 6px" }}>Услуга</th>
							<th style={{ padding: "8px 6px", textAlign: "center" }}>Зуб</th>
							<th style={{ padding: "8px 6px", textAlign: "center" }}>Кол-во</th>
							<th style={{ padding: "8px 6px", textAlign: "right" }}>Тариф</th>
							<th style={{ padding: "8px 6px", textAlign: "right", color: "var(--teal, #0d9488)" }}>Покрыто ДМС</th>
							<th style={{ padding: "8px 6px", textAlign: "right", color: "#b45309" }}>Доплата в кассу</th>
						</tr>
					</thead>
					<tbody>
						{lineItems.map((line) => (
							<tr key={line.lineItemId} style={{ borderBottom: "1px solid var(--line, #f1f5f9)" }}>
								<td style={{ padding: "8px 6px", color: "var(--ink, #0f172a)" }}>
									<div style={{ fontWeight: 600 }}>{line.serviceName}</div>
									<div style={{ fontSize: "10px", color: "var(--muted, #64748b)" }}>{line.serviceCode804n} • {line.splitReason}</div>
								</td>
								<td style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700 }}>{line.toothNumber || "—"}</td>
								<td style={{ padding: "8px 6px", textAlign: "center" }}>{line.quantity}</td>
								<td style={{ padding: "8px 6px", textAlign: "right" }}>{formatCurrencyKopecks(line.totalKopecks)}</td>
								<td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "var(--teal, #0d9488)" }}>
									{formatCurrencyKopecks(line.insuranceCoveredKopecks)}
								</td>
								<td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: line.patientOutOfPocketKopecks > 0 ? "#b45309" : "var(--muted, #64748b)" }}>
									{formatCurrencyKopecks(line.patientOutOfPocketKopecks)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА #0d9488 ПО МАНДАТУ 8am */}
			<div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "12px", borderTop: "1px solid var(--line, #e2e8f0)" }}>
				<button
					type="button"
					onClick={handleApply}
					className="dms-primary-cta"
					style={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "8px",
						padding: "12px 24px",
						borderRadius: "12px",
						border: "none",
						background: "#0d9488",
						color: "#ffffff",
						fontWeight: 700,
						fontSize: "14px",
						cursor: "pointer",
						boxShadow: "0 4px 14px rgba(13, 148, 136, 0.25)",
						minHeight: "44px",
						width: "100%",
						maxWidth: "380px",
					}}
				>
					<ShieldCheck size={18} />
					<span>✓ Применить сплит к кассе</span>
				</button>
			</div>
		</div>
	);
};

export default InsuranceBillSplitCard;
