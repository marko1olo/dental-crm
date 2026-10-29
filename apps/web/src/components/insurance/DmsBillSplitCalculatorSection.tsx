/**
 * DmsBillSplitCalculatorSection.tsx — Facade for InsuranceBillSplitCard.
 */

import React from "react";
import { InsuranceBillSplitCard } from "./InsuranceBillSplitCard.js";
import type { DmsBillableItem, DmsGuaranteeLetter, PatientPaymentMethod } from "./insuranceData.js";

export interface DmsBillSplitCalculatorSectionProps {
	readonly letter?: DmsGuaranteeLetter;
	readonly billItems?: readonly DmsBillableItem[];
	readonly onApplySplitToPayment?: (splitData: {
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

export const DEMO_VISIT_BILL_ITEMS: readonly DmsBillableItem[] = [
	{ id: "bill-1", serviceCode: "A16.07.002.001", serviceCode804n: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (световой композит)", toothNumber: "16", quantity: 1, unitPriceKopecks: 450000 },
	{ id: "bill-2", serviceCode: "A16.07.030.002", serviceCode804n: "A16.07.030.002", serviceName: "Эндодонтическое лечение (2 канала)", toothNumber: "16", quantity: 1, unitPriceKopecks: 580000 },
];

export function DmsBillSplitCalculatorSection({
	letter,
	billItems,
	onApplySplitToPayment,
}: DmsBillSplitCalculatorSectionProps) {
	return (
		<InsuranceBillSplitCard
			letter={letter}
			billItems={billItems}
			onApplySplitToCashbox={onApplySplitToPayment}
		/>
	);
}

export default DmsBillSplitCalculatorSection;
