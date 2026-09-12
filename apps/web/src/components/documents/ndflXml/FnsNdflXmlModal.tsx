/**
 * apps/web/src/components/documents/ndflXml/FnsNdflXmlModal.tsx
 *
 * DENTE Dental CRM — Touch-First FNS NDFL XML Export HUD Modal (Приказ ФНС № ЕД-7-11/755@ / БВ-7-11/824@).
 * Transparent delegate to canonical TaxDeductionCertificateModal engine.
 */

import React, { useMemo } from "react";
import { useAppLogic } from "../../../useAppLogic";
import {
	TaxDeductionCertificateModal,
} from "../../finance/TaxDeductionCertificateModal";
import type { SupportedTaxYear } from "./fnsNdflXmlPresets";

export interface FnsNdflXmlModalProps {
	readonly onClose: () => void;
	readonly isOpen?: boolean | undefined;
	readonly initialPatientId?: string | undefined;
	readonly initialTaxYear?: SupportedTaxYear | number | undefined;
}

export function FnsNdflXmlModal({
	initialPatientId,
	initialTaxYear = 2025,
	isOpen = true,
	onClose,
}: FnsNdflXmlModalProps) {
	const { dashboard, patientId: activePatientId } = useAppLogic();

	const selectedPatient = useMemo(() => {
		const targetId = initialPatientId || activePatientId;
		return (
			dashboard?.patients?.find((p) => p.id === targetId) ||
			dashboard?.patients?.[0] || {
				id: "sample-patient-1",
				fullName: "",
				birthDate: "",
				phone: "",
			}
		);
	}, [dashboard?.patients, initialPatientId, activePatientId]);

	return (
		<TaxDeductionCertificateModal
			isOpen={isOpen}
			onClose={onClose}
			patientId={selectedPatient.id}
			patientName={selectedPatient.fullName}
			patientBirthDate={selectedPatient.birthDate}
			selectedYear={typeof initialTaxYear === "number" ? initialTaxYear : undefined}
		/>
	);
}

export default FnsNdflXmlModal;
