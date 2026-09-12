/**
 * apps/web/src/components/billing/tax/FnsTaxDeductionModal.tsx
 *
 * DENTE Dental CRM — Transparent delegate of canonical TaxDeductionCertificateModal.
 * Consolidates duplicate monolith into apps/web/src/components/finance/TaxDeductionCertificateModal.tsx.
 */

import React from "react";
import {
	TaxDeductionCertificateModal,
	type TaxDeductionCertificateModalProps,
} from "../../finance/TaxDeductionCertificateModal";

export type FnsTaxDeductionModalProps = TaxDeductionCertificateModalProps;

export const FnsTaxDeductionModal: React.FC<FnsTaxDeductionModalProps> = (props) => {
	return <TaxDeductionCertificateModal {...props} />;
};

export default FnsTaxDeductionModal;
