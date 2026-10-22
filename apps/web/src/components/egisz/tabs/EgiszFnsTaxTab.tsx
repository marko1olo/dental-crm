/**
 * EgiszFnsTaxTab.tsx
 *
 * Tab 2: FNS Tax Deduction Certificate Editor (КНД 1151156 / Приказ ЕД-7-11/755@).
 * Taxpayer, patient relationship, and payment vouchers with exact kopeck math.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import { FnsTaxMetaSection } from "./fnsTax/FnsTaxMetaSection";
import { FnsTaxPaymentsTable } from "./fnsTax/FnsTaxPaymentsTable";
import { FnsTaxpayerPatientSection } from "./fnsTax/FnsTaxpayerPatientSection";
import type { EgiszFnsTaxTabProps } from "./fnsTax/fnsTaxTabTypes";

export type { EgiszFnsTaxTabProps } from "./fnsTax/fnsTaxTabTypes";

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
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<FnsTaxMetaSection
				taxDocNumber={taxDocNumber}
				onTaxDocNumberChange={onTaxDocNumberChange}
				taxYear={taxYear}
				onTaxYearChange={onTaxYearChange}
				taxSignerName={taxSignerName}
				onTaxSignerNameChange={onTaxSignerNameChange}
			/>

			<FnsTaxpayerPatientSection
				taxpayerName={taxpayerName}
				onTaxpayerNameChange={onTaxpayerNameChange}
				taxpayerInn={taxpayerInn}
				onTaxpayerInnChange={onTaxpayerInnChange}
				taxpayerSnils={taxpayerSnils}
				onTaxpayerSnilsChange={onTaxpayerSnilsChange}
				taxPatientName={taxPatientName}
				onTaxPatientNameChange={onTaxPatientNameChange}
				taxRelCode={taxRelCode}
				onTaxRelCodeChange={onTaxRelCodeChange}
				taxPatientSnils={taxPatientSnils}
				onTaxPatientSnilsChange={onTaxPatientSnilsChange}
			/>

			<FnsTaxPaymentsTable
				taxPayments={taxPayments}
				onAddTaxPayment={onAddTaxPayment}
				onRemoveTaxPayment={onRemoveTaxPayment}
				onUpdateTaxPaymentDate={onUpdateTaxPaymentDate}
				onUpdateTaxPaymentServiceCode={onUpdateTaxPaymentServiceCode}
				onUpdateTaxPaymentDescription={onUpdateTaxPaymentDescription}
				onUpdateTaxPaymentAmount={onUpdateTaxPaymentAmount}
			/>
		</div>
	);
};
