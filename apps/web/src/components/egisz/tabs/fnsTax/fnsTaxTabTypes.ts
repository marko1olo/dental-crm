/**
 * fnsTaxTabTypes.ts — Props and types for EgiszFnsTaxTab
 */

import type { FnsTaxPaymentItem } from "../../egiszRemdEngine";

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
