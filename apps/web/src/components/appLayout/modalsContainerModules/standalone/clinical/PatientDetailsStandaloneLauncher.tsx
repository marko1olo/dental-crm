/**
 * PatientDetailsStandaloneLauncher.tsx
 * Standalone лаунчер фасадной модалки медицинской карты пациента (PatientDetailsModal).
 * Честный режим: ?patient_details + ?patientId= → реальная карточка из базы;
 * вымышленная «Иванова Марина Викторовна» с фейковым балансом выжжена.
 * Соответствует Mandate 8b (Layer 5 Facade, <= 120 строк) и Mandate 8aq.
 */

import type React from "react";
import { useMemo } from "react";
import { PatientDetailsModal } from "../../../../patient/PatientDetailsModal";
import { clearUrlTokens, hasUrlToken } from "../deepLinkUrl";
import { readPatientIdFromUrl } from "../useLauncherPatientDebt";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";

export function renderPatientDetailsLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	if (!hasUrlToken(["patient_details"])) return null;

	return <StandalonePatientDetailsHost />;
}

function StandalonePatientDetailsHost(): React.ReactElement {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const onClose = () => clearUrlTokens(["patient_details"]);

	if (!patientId) {
		return (
			<StandaloneDeepLinkMissingState
				title="Пациент не указан"
				message="Медицинская карта открывается по конкретному пациенту. Откройте её из картотеки или добавьте ?patientId= в ссылку."
				testId="standalone-patient-details-missing-state"
				onClose={onClose}
			/>
		);
	}

	return <PatientDetailsModal isOpen={true} onClose={onClose} patientId={patientId} />;
}
