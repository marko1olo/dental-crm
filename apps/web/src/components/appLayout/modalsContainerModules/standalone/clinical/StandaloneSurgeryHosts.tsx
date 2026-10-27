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
import { VisitSoapEditor } from "../../../../visit/VisitSoapEditor";
import { VisitSurgeryProtocolTab } from "../../../../visit/surgery/VisitSurgeryProtocolTab";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import StandaloneTreatmentPlanWorkspaceShell from "../StandaloneTreatmentPlanWorkspaceShell";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";

export const StandaloneAnesthesiaHost: React.FC<{ onClose?: () => void }> = () => {
	return (
		<div className="w-full min-h-screen bg-[var(--paper-soft)] p-4 sm:p-6" data-testid="anesthesia-standalone-host">
			<div className="max-w-5xl mx-auto bg-[var(--paper)] rounded-2xl shadow-sm border border-[var(--line)] overflow-hidden">
				<VisitSoapEditor
					patientName="Иванов Иван Иванович"
					doctorName="Д-р Воронов Алексей Владимирович"
					activeTooth={16}
				/>
			</div>
		</div>
	);
};

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

export const StandaloneSurgeryProtocolHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl() || "01a00000-0000-0000-0000-000000000001", []);
	const patientName = useLauncherPatientName(patientId) || "Смирнова Анна Сергеевна";
	return (
		<StandaloneTreatmentPlanWorkspaceShell title="Хирургический протокол и удаление зубов" onClose={onClose}>
			<div className="w-full p-3 sm:p-6 overflow-y-auto" data-testid="surgery-standalone-workspace">
				<div className="max-w-5xl mx-auto">
					<VisitSurgeryProtocolTab
						activeTooth={48}
						patientName={patientName}
						onAddToInvoice={(item) => console.log("Added to invoice:", item)}
					/>
				</div>
			</div>
		</StandaloneTreatmentPlanWorkspaceShell>
	);
};
