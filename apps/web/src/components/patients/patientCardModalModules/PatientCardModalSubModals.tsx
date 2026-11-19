import React from "react";
import { PediatricBraveryDiplomaModal } from "../../pediatric/PediatricBraveryDiplomaModal";
import { TaxDeductionCertificateModal } from "../../documents/DocumentsStudioModal";
import { ClinicalPhotoProtocolModal } from "../../photography/ClinicalPhotoProtocolModal";
import { MedicalRecordStudioModal } from "../../emr/MedicalRecordStudioModal";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { PatientGeneralInfo, PatientGeneralInfoFieldValue } from "../tabs/PatientGeneralInfoTab";

const DmsGuaranteeLetterModal = React.lazy(() =>
	import("../../insurance/DmsGuaranteeLetterModal").then((m) => ({
		default: m.DmsGuaranteeLetterModal,
	})),
);

export interface PatientCardModalSubModalsProps {
	readonly isDiplomaModalOpen: boolean;
	readonly setIsDiplomaModalOpen: (open: boolean) => void;
	readonly isDmsLetterModalOpen: boolean;
	readonly setIsDmsLetterModalOpen: (open: boolean) => void;
	readonly isTaxDeductionModalOpen: boolean;
	readonly setIsTaxDeductionModalOpen: (open: boolean) => void;
	readonly initialTaxTab?: "form" | "checks" | "family" | "xml" | "registry" | undefined;
	readonly isPhotoModalOpen?: boolean | undefined;
	readonly setIsPhotoModalOpen?: ((open: boolean) => void) | undefined;
	readonly isMedicalRecordStudioOpen?: boolean | undefined;
	readonly setIsMedicalRecordStudioOpen?: ((open: boolean) => void) | undefined;
	readonly patientData: PatientGeneralInfo;
	readonly onUpdatePatientField: (field: keyof PatientGeneralInfo, value: PatientGeneralInfoFieldValue) => void;
	readonly onSave?: (() => Promise<void>) | undefined;
}

export const PatientCardModalSubModals: React.FC<PatientCardModalSubModalsProps> = ({
	isDiplomaModalOpen,
	setIsDiplomaModalOpen,
	isDmsLetterModalOpen,
	setIsDmsLetterModalOpen,
	isTaxDeductionModalOpen,
	setIsTaxDeductionModalOpen,
	initialTaxTab,
	isPhotoModalOpen = false,
	setIsPhotoModalOpen,
	isMedicalRecordStudioOpen = false,
	setIsMedicalRecordStudioOpen,
	patientData,
	onUpdatePatientField,
	onSave,
}) => (
	<>
		{isDiplomaModalOpen && (
			<PediatricBraveryDiplomaModal
				isOpen={isDiplomaModalOpen}
				onClose={() => setIsDiplomaModalOpen(false)}
				patientId={patientData.id || undefined}
				patientName={patientData.fullName || undefined}
				patientPhone={patientData.phone || undefined}
			/>
		)}
		{isDmsLetterModalOpen && (
			<React.Suspense fallback={null}>
				<DmsGuaranteeLetterModal
					isOpen={isDmsLetterModalOpen}
					onClose={() => setIsDmsLetterModalOpen(false)}
					patient={{
						id: patientData.id || "",
						fullName: patientData.fullName || "",
						birthDate: patientData.birthDate || undefined,
						policyNumber: patientData.dmsPolicyNumber || undefined,
						cardNumber: patientData.cardNumber || undefined,
					}}
					onSave={async (letter) => {
						if (letter.policyNumber && !patientData.dmsPolicyNumber) {
							onUpdatePatientField("dmsPolicyNumber", letter.policyNumber);
						}
						if (letter.insurerName && !patientData.dmsInsuranceCompany) {
							onUpdatePatientField("dmsInsuranceCompany", letter.insurerName);
						}
						if (letter.letterNumber && !patientData.dmsGuaranteeLetterNumber) {
							onUpdatePatientField("dmsGuaranteeLetterNumber", letter.letterNumber);
						}
						if (letter.maxCoverageRub && !patientData.dmsCoverageLimitRub) {
							onUpdatePatientField("dmsCoverageLimitRub", letter.maxCoverageRub);
							onUpdatePatientField("dmsCoverageLimitKopecks", Math.round(letter.maxCoverageRub * 100));
						}
						if (patientData.id) {
							try {
								await fetch("/api/insurance/guarantee-letters", {
									method: "POST",
									headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
									body: JSON.stringify({ ...letter, patientId: patientData.id }),
								});
							} catch {
								// Offline fallback
							}
						}
					}}
				/>
			</React.Suspense>
		)}
		{isTaxDeductionModalOpen && (
			<TaxDeductionCertificateModal
				isOpen={isTaxDeductionModalOpen}
				onClose={() => setIsTaxDeductionModalOpen(false)}
				initialTab={initialTaxTab}
				patientId={patientData.id || undefined}
				patientName={patientData.fullName || ""}
				patientBirthDate={patientData.birthDate || ""}
				patientInn={patientData.inn || patientData.taxpayerInn || ""}
				patientSnils={patientData.snils || ""}
				autoFetchPayments={true}
			/>
		)}
		{isPhotoModalOpen && setIsPhotoModalOpen && (
			<ClinicalPhotoProtocolModal
				isOpen={isPhotoModalOpen}
				onClose={() => setIsPhotoModalOpen(false)}
				patientId={patientData.id ?? undefined}
				patientName={patientData.fullName ?? undefined}
				patientCardNumber={patientData.cardNumber || patientData.medicalCardNumber || undefined}
			/>
		)}
		{isMedicalRecordStudioOpen && setIsMedicalRecordStudioOpen && (
			<MedicalRecordStudioModal
				isOpen={isMedicalRecordStudioOpen}
				onClose={() => setIsMedicalRecordStudioOpen(false)}
				patientId={patientData.id ?? undefined}
				onSave={async (updatedCard) => {
					if (updatedCard.passport.patientPhone && updatedCard.passport.patientPhone !== patientData.phone) {
						onUpdatePatientField("phone", updatedCard.passport.patientPhone);
					}
					if (updatedCard.passport.patientAddressRegistration && updatedCard.passport.patientAddressRegistration !== patientData.address) {
						onUpdatePatientField("address", updatedCard.passport.patientAddressRegistration);
					}
					if (onSave) {
						await onSave();
					}
					showToast("Медицинская карта приёма сохранена в базу данных", "success", 3000);
				}}
				initialData={{
					passport: {
						patientFullName: patientData.fullName || "",
						patientBirthDate: patientData.birthDate || "",
						patientPhone: patientData.phone || "",
						patientSex: patientData.gender === "female" ? "female" : "male",
						patientAddressRegistration: patientData.address || "",
						patientAddressResidence: patientData.address || "",
						medicalCardNumber: patientData.cardNumber || patientData.medicalCardNumber || "",
						cardOpenedDate: patientData.createdAt ? String(patientData.createdAt).slice(0, 10) : "",
					},
				}}
			/>
		)}
	</>
);
