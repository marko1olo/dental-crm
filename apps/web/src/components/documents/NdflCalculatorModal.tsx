/**
 * apps/web/src/components/documents/NdflCalculatorModal.tsx
 *
 * DENTE Dental CRM — 1-Click NDFL 13% Tax Calculator (КНД 1151156 / Приказ ФНС ЕА-7-11/824@).
 * Transparent delegate to canonical TaxDeductionCertificateModal engine.
 */

import React from "react";
import { useAppLogic } from "../../useAppLogic";
import { TaxDeductionCertificateModal } from "../finance/TaxDeductionCertificateModal";

export interface NdflCalculatorModalProps {
	readonly onClose: () => void;
	readonly isOpen?: boolean | undefined;
	readonly initialPatientId?: string | undefined;
}

export function NdflCalculatorModal({
	onClose,
	isOpen = true,
	initialPatientId,
}: NdflCalculatorModalProps) {
	const { patientId: contextPatientId, dashboard } = useAppLogic();
	const targetPatientId = initialPatientId || contextPatientId || dashboard?.patients?.[0]?.id || "";
	const targetPatient = dashboard?.patients?.find((p) => p.id === targetPatientId);

	return (
		<TaxDeductionCertificateModal
			isOpen={isOpen}
			onClose={onClose}
			patientId={targetPatientId}
			patientName={targetPatient?.fullName}
			patientBirthDate={targetPatient?.birthDate}
		/>
	);
}

export default NdflCalculatorModal;
