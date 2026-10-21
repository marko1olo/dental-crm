/**
 * types.ts — Контракты интерактивного калькулятора разделения счета за визит
 */

import type { DmsGuaranteeLetter, PatientPaymentMethod } from "../dmsSplitEngine.js";
import type { BillItemToSplit } from "../DmsGuaranteeLetterModal.js";

export interface DmsBillSplitCalculatorSectionProps {
	readonly letter: DmsGuaranteeLetter;
	readonly billItems?: readonly BillItemToSplit[] | undefined;
	readonly onApplySplitToPayment?: ((split: {
		totalDueRub: number;
		dmsRub: number;
		patientRub: number;
		patientMethod: PatientPaymentMethod;
		patientCashRub?: number | undefined;
		patientCardRub?: number | undefined;
		letterId?: string | undefined;
		letterNumber?: string | undefined;
		insurerName?: string | undefined;
	}) => void) | undefined;
}

export const DEMO_VISIT_BILL_ITEMS: readonly BillItemToSplit[] = [
	{
		id: "item-1",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой световой (I класс)",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 450000,
	},
	{
		id: "item-2",
		serviceCode804n: "A11.07.010",
		serviceName: "Инфильтрационная анестезия",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 95000,
	},
	{
		id: "item-3",
		serviceCode804n: "A16.07.050",
		serviceName: "Клиническое отбеливание зубов Zoom 4",
		toothNumber: undefined,
		quantity: 1,
		unitPriceKopecks: 2600000,
	},
];
