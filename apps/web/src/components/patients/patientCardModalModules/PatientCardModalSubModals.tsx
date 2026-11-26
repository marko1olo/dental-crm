import React from "react";
import { PediatricBraveryDiplomaModal } from "../../pediatric/PediatricBraveryDiplomaModal";
import { TaxDeductionCertificateModal } from "../../documents/DocumentsStudioModal";
import { ClinicalPhotoProtocolModal } from "../../photography/ClinicalPhotoProtocolModal";
import { MedicalRecordStudioModal } from "../../emr/MedicalRecordStudioModal";
import { showToast } from "../../GlobalToast";
import type { PatientGeneralInfo, PatientGeneralInfoFieldValue } from "../tabs/PatientGeneralInfoTab";

const DmsStudioModal = React.lazy(() =>
	import("../../insurance/DmsStudioModal").then((m) => ({
		default: m.DmsStudioModal,
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
				key={patientData.id || "card-diploma-modal"}
				isOpen={isDiplomaModalOpen}
				onClose={() => setIsDiplomaModalOpen(false)}
				patientId={patientData.id || undefined}
				patientName={patientData.fullName || undefined}
				patientPhone={patientData.phone || undefined}
			/>
		)}
		{isDmsLetterModalOpen && (
			<React.Suspense fallback={null}>
				<DmsStudioModal
					key={patientData.id || "card-dms"}
					isOpen={isDmsLetterModalOpen}
					onClose={() => setIsDmsLetterModalOpen(false)}
					initialTab="policies"
					patient={{
						id: patientData.id || "",
						fullName: patientData.fullName || "",
						birthDate: patientData.birthDate || undefined,
						policyNumber: patientData.dmsPolicyNumber || undefined,
						cardNumber: patientData.cardNumber || undefined,
					}}
				/>
			</React.Suspense>
		)}
		{isTaxDeductionModalOpen && (
			<TaxDeductionCertificateModal
				key={patientData.id || "card-tax-deduction"}
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
				key={patientData.id || "emr-modal"}
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
