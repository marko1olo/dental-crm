/**
 * StandaloneSurgeryHosts — честные хосты ИДС и фотопротокола по deep-link (Мандат 8b).
 *
 * Пациент — только из ?patientId= и базы (GET /api/patients/:id). Вбитые
 * «Ковалёв…» с паспортом, диагноз K02.1 «для красоты» и вымышленный врач
 * выжжены: ИДС и фотопротокол оформляются на реального пациента.
 */

import type React from "react";
import { useMemo } from "react";
import { InformedConsentModal } from "../../../../consents/InformedConsentModal";
import { ClinicalPhotoProtocolModal } from "../../../../photography/ClinicalPhotoProtocolModal";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";

function MissingPatientGuard({ testId, onClose, message }: { testId: string; onClose: () => void; message: string }): React.ReactElement {
	return (
		<StandaloneDeepLinkMissingState
			title="Пациент не указан"
			message={message}
			testId={testId}
			onClose={onClose}
		/>
	);
}

export const StandaloneConsentHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	if (!patientId) {
		return (
			<MissingPatientGuard
				testId="standalone-consent-missing-state"
				onClose={onClose}
				message="Информированное согласие подписывается конкретным пациентом. Откройте его из визита или добавьте ?patientId= в ссылку."
			/>
		);
	}
	return (
		<InformedConsentModal
			isOpen={true}
			onClose={onClose}
			initialMode="packages"
			initialPackageKey="PACKAGE_PRIMARY_VISIT"
			initialVerificationMethod="tablet_stylus"
			patientId={patientId}
		/>
	);
};

export const StandalonePhotoProtocolHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const patientName = useLauncherPatientName(patientId);
	if (!patientId) {
		return (
			<MissingPatientGuard
				testId="standalone-photo-missing-state"
				onClose={onClose}
				message="Фотопротокол ведётся по конкретному пациенту. Откройте его из визита или добавьте ?patientId= в ссылку."
			/>
		);
	}
	if (patientName === null) return null;
	return <ClinicalPhotoProtocolModal isOpen={true} onClose={onClose} patientName={patientName} />;
};
