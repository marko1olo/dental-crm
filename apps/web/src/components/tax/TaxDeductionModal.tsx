/**
 * apps/web/src/components/tax/TaxDeductionModal.tsx
 *
 * DENTE Dental CRM — 1-Click 13% NDFL Tax Deduction Certificate (КНД 1151156).
 * Transparent delegate to canonical TaxDeductionCertificateModal engine.
 * Compliant with Order of FNS Russia No. БВ-7-11/824@ / ЕД-7-11/755@ and Art. 219 of Tax Code RF.
 */

import React from "react";
import {
	TaxDeductionCertificateModal,
	type TaxDeductionCertificateModalProps,
} from "../finance/TaxDeductionCertificateModal";
import type { TaxDeductionPaymentItem } from "../finance/taxDeductionEngine";

export type TaxDeductionModalProps = TaxDeductionCertificateModalProps;

export const TaxDeductionModal: React.FC<TaxDeductionModalProps> = (props) => {
	return <TaxDeductionCertificateModal {...props} />;
};

export default TaxDeductionModal;
export type { TaxDeductionPaymentItem };
