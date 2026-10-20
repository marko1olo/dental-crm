import type React from "react";
import { VisitDiaryModals } from "../VisitDiaryModals";
import { VisitDiaryPerioStudioModal } from "./VisitDiaryPerioStudioModal";

export interface VisitDiaryModalsHostProps {
	readonly modals: any;
	readonly logic: any;
	readonly patientInfo: any;
	readonly ctx: any;
	readonly icdEntry: any;
	readonly patientId?: string;
}

export const VisitDiaryModalsHost: React.FC<VisitDiaryModalsHostProps> = ({
	modals,
	logic,
	patientInfo,
	ctx,
	icdEntry,
	patientId,
}) => {
	const handleInsertPerioProtocol = (protocolText: string) => {
		logic.setDiary((prev: any) => ({
			...prev,
			statusLocalis: prev.statusLocalis
				? `${prev.statusLocalis}\n\n${protocolText}`
				: protocolText,
		}));
		logic.scheduleDebouncedSave();
		modals.setIsTier3PerioModalOpen(false);
		ctx.showToast?.("Пародонтограмма перенесена в дневник приёма", "success");
	};

	return (
		<>
			<VisitDiaryModals
				showSummaryModal={modals.showSummaryModal}
				setShowSummaryModal={modals.setShowSummaryModal}
				showPrescriptionModal={modals.showPrescriptionModal}
				setShowPrescriptionModal={modals.setShowPrescriptionModal}
				showRadiologyReferralModal={modals.showRadiologyReferralModal}
				setShowRadiologyReferralModal={modals.setShowRadiologyReferralModal}
				showEgiszModal={modals.showEgiszModal}
				setShowEgiszModal={modals.setShowEgiszModal}
				showTemplatesModal={modals.showTemplatesModal}
				setShowTemplatesModal={modals.setShowTemplatesModal}
				showBrandingCustomizer={modals.showBrandingCustomizer}
				setShowBrandingCustomizer={modals.setShowBrandingCustomizer}
				showPreview={logic.showPreview}
				setShowPreview={logic.setShowPreview}
				diary={logic.diary}
				setDiary={logic.setDiary}
				isLocked={logic.isLocked}
				isRevising={logic.isRevising}
				beginRevise={logic.beginRevise}
				scheduleDebouncedSave={logic.scheduleDebouncedSave}
				setIcdSearch={logic.setIcdSearch}
				doSave={logic.doSave}
				doctorName={patientInfo.doctorName}
				doctorSpecialty={patientInfo.doctorSpecialty}
				patientFullName={patientInfo.patientFullName}
				patientBirthDate={patientInfo.patientBirthDate}
				patientCardNumber={patientInfo.patientCardNumber}
				patientPassport={patientInfo.patientPassport}
				patientOms={patientInfo.patientOms}
				patientSnils={patientInfo.patientSnils}
				patientPhone={patientInfo.patientPhone}
				patientAddress={patientInfo.patientAddress}
				clinicName={patientInfo.clinicName}
				activePatient={ctx.activePatient}
				printPatient={patientInfo.printPatient}
				lockedAt={logic.lockedAt}
				diaryHash={logic.diaryHash}
				hasCryptoSignature={logic.hasCryptoSignature}
				activeTeeth={patientInfo.activeTeeth}
				radiologySnapshots={patientInfo.radiologySnapshots}
				lastSavedAt={logic.lastSavedAt}
				icdEntry={icdEntry}
				revisionCount={logic.revisionCount}
			/>

			<VisitDiaryPerioStudioModal
				isOpen={modals.isTier3PerioModalOpen}
				onClose={() => modals.setIsTier3PerioModalOpen(false)}
				patientId={patientId}
				patientFullName={patientInfo.patientFullName}
				doctorName={logic.diaryDoctorFullName || patientInfo.sessionDoctorName}
				onInsertProtocol={handleInsertPerioProtocol}
			/>
		</>
	);
};
