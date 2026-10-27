import React from "react";
import { PatientTreatmentPlanDrawerModal } from "../../workspace/PatientTreatmentPlanDrawerModal";

const TaxDeductionCertificateModal = React.lazy(() =>
	import("../../../finance/TaxDeductionCertificateModal").then((m) => ({
		default: m.TaxDeductionCertificateModal,
	})),
);

export interface PatientWorkspaceAdministrativeModalsProps {
	patientId: string;
	patientName?: string | null | undefined;
	logic: any;
}

export const PatientWorkspaceAdministrativeModals: React.FC<PatientWorkspaceAdministrativeModalsProps> = ({
	patientId,
	patientName,
	logic,
}) => {
	return (
		<>
			{logic.isPlanModalOpen && (
				<PatientTreatmentPlanDrawerModal
					isOpen={logic.isPlanModalOpen}
					onClose={() => {
						logic.setIsPlanModalOpen(false);
						logic.setSelectedPlanIdForModal(null);
					}}
					patientId={patientId}
					activePatient={logic.currentPatient}
					organizationId={(logic.dashboard as any)?.organizationId}
					initialPlanId={logic.selectedPlanIdForModal}
				/>
			)}

			{logic.isTaxCertificateOpen && (
				<React.Suspense fallback={null}>
					<TaxDeductionCertificateModal
						isOpen={logic.isTaxCertificateOpen}
						onClose={() => logic.setIsTaxCertificateOpen(false)}
						patientId={patientId}
						patientName={patientName || logic.currentPatient?.fullName}
						patientBirthDate={logic.currentPatient?.birthDate}
						patientInn={logic.currentPatient?.inn}
						patientSnils={logic.currentPatient?.snils}
						autoFetchPayments={true}
						clinicName={
							logic.dashboard?.clinicSettings?.profile?.legalName ||
							logic.dashboard?.clinicSettings?.profile?.brandName ||
							logic.dashboard?.organization?.name ||
							"Медицинская организация"
						}
						clinicInn={logic.dashboard?.clinicSettings?.profile?.inn || logic.dashboard?.organization?.inn || ""}
						clinicKpp={logic.dashboard?.clinicSettings?.profile?.kpp || logic.dashboard?.organization?.kpp || ""}
						clinicOgrn={logic.dashboard?.clinicSettings?.profile?.ogrn || logic.dashboard?.organization?.ogrn || ""}
						clinicLicenseNumber={
							logic.dashboard?.clinicSettings?.profile?.medicalLicenseNumber ||
							logic.dashboard?.organization?.medicalLicenseNumber ||
							""
						}
						clinicLicenseDate={logic.dashboard?.clinicSettings?.profile?.medicalLicenseDate}
						clinicAddress={logic.dashboard?.clinicSettings?.profile?.address}
						chiefDoctorName={logic.dashboard?.clinicSettings?.profile?.chiefDoctor}
					/>
				</React.Suspense>
			)}
		</>
	);
};
