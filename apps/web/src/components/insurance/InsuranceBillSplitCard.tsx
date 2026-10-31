/**
 * InsuranceBillSplitCard.tsx — Ergonomic Visit Bill Split Payment Calculator.
 * Mandates: 8e (Doctor Autonomy), 8wy/8l (Integer kopeck math), 8am (One CTA).
 */

import React, { useMemo, useState } from "react";
import { Check, Split } from "lucide-react";
import {
	calculateDmsCoPaymentSplit,
	formatCurrencyKopecks,
	kopecksToRub,
	type DmsBillableItem,
	type DmsGuaranteeLetter,
	type PatientPaymentMethod,
} from "./dmsCatalogData.js";

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
	{ id: "bill-1", serviceCode: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (световой композит)", toothNumber: "16", quantity: 1, unitPriceKopecks: 450000 },
	{ id: "bill-2", serviceCode: "A16.07.030.002", serviceName: "Эндодонтическое лечение (2 канала)", toothNumber: "16", quantity: 1, unitPriceKopecks: 580000 },
	{ id: "bill-3", serviceCode: "A11.07.010", serviceName: "Анестезия проводниковая артикаин", toothNumber: "16", quantity: 2, unitPriceKopecks: 95000 },
	{ id: "bill-4", serviceCode: "A06.07.012", serviceName: "Прицельная контрольная радиовизиография", toothNumber: "16", quantity: 1, unitPriceKopecks: 80000 },
	{ id: "bill-5", serviceCode: "A16.07.051", serviceName: "Профессиональная гигиена Air-Flow", quantity: 1, unitPriceKopecks: 650000, isExcluded: false },
];

export const InsuranceBillSplitCard: React.FC<InsuranceBillSplitCardProps> = ({
	letter,
	billItems = DEFAULT_SAMPLE_BILL_ITEMS,
	onApplySplitToCashbox,
}) => {
	const [franchisePercent, setFranchisePercent] = useState<number>(letter?.franchisePercent ?? 0);
	const [paymentMethod, setPaymentMethod] = useState<PatientPaymentMethod>("card");

	const splitResult = useMemo(() => {
		return calculateDmsCoPaymentSplit(billItems, { guaranteeLetter: letter, franchisePercent });
	}, [billItems, letter, franchisePercent]);

	const { totalBillKopecks, totalInsuranceCoveredKopecks, totalPatientOutOfPocketKopecks, lineItems, remainingLimitKopecks } = splitResult;
	const patientDueRub = kopecksToRub(totalPatientOutOfPocketKopecks);

	const handleApply = () => {
		if (onApplySplitToCashbox) {
			onApplySplitToCashbox({
				totalDueRub: kopecksToRub(totalBillKopecks),
				dmsRub: kopecksToRub(totalInsuranceCoveredKopecks),
				patientRub: patientDueRub,
				patientMethod,
				patientCashRub: paymentMethod === "cash" ? patientDueRub : 0,
				patientCardRub: paymentMethod === "card" ? patientDueRub : 0,
				letterId: letter?.id,
				letterNumber: letter?.letterNumber,
				insurerName: letter?.insurerName,
			});
		}
	};

	return (
		<div className="dms-card dms-split-card" style={{ background: "var(--paper, #fff)", border: "1px solid var(--line, #e2e8f0)", borderRadius: "16px", padding: "18px" }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(13,148,136,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--teal, #0d9488)" }}>
						<Split size={18} />
					</div>
					<div>
						<h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>Сплит оплаты (страховая + пациент)</h3>
						<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>{letter?.insurerName || "Прямой расчет"} • Остаток лимита: {formatCurrencyKopecks(remainingLimitKopecks)}</div>
					</div>
				</div>
				<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
					<span style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontWeight: 600 }}>Франшиза:</span>
					{[0, 10, 20, 30, 50].map((p) => (
						<button key={p} type="button" onClick={() => setFranchisePercent(p)} style={{ minWidth: "38px", minHeight: "38px", borderRadius: "8px", border: "1px solid", borderColor: franchisePercent === p ? "var(--teal, #0d9488)" : "var(--line, #cbd5e1)", background: franchisePercent === p ? "var(--teal, #0d9488)" : "transparent", color: franchisePercent === p ? "#fff" : "var(--ink, #0f172a)", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{p}%</button>
					))}
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
				<div style={{ background: "rgba(13,148,136,0.08)", padding: "12px", borderRadius: "10px" }}>
					<div style={{ fontSize: "11px", color: "var(--teal, #0d9488)", fontWeight: 700 }}>СТРАХОВАЯ</div>
					<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--teal, #0d9488)" }}>{formatCurrencyKopecks(totalInsuranceCoveredKopecks)}</div>
				</div>
				<div style={{ background: "rgba(245,158,11,0.08)", padding: "12px", borderRadius: "10px" }}>
					<div style={{ fontSize: "11px", color: "var(--amber-ink, #b45309)", fontWeight: 700 }}>ПАЦИЕНТ</div>
					<div style={{ fontSize: "18px", fontWeight: 800, color: "var(--amber-ink, #b45309)" }}>{formatCurrencyKopecks(totalPatientOutOfPocketKopecks)}</div>
				</div>
			</div>

			<button type="button" onClick={handleApply} style={{ width: "100%", minHeight: "44px", borderRadius: "10px", border: "none", background: "var(--teal, #0d9488)", color: "#fff", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" }}>
				<Check size={16} /> ✓ Утвердить ДМС-сплит
			</button>
		</div>
	);
};

InsuranceBillSplitCard.displayName = "InsuranceBillSplitCard";
export default InsuranceBillSplitCard;
