import React from "react";
import { PediatricBraveryDiplomaModal } from "../../pediatric/PediatricBraveryDiplomaModal";
import { TaxDeductionCertificateModal } from "../../finance/TaxDeductionCertificateModal";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";

const DmsGuaranteeLetterModal = React.lazy(() =>
	import("../../insurance/DmsGuaranteeLetterModal").then((m) => ({
		default: m.DmsGuaranteeLetterModal,
	})),
);

interface PatientCardModalSubModalsProps {
	readonly isDiplomaModalOpen: boolean;
	readonly setIsDiplomaModalOpen: (open: boolean) => void;
	readonly isDmsLetterModalOpen: boolean;
	readonly setIsDmsLetterModalOpen: (open: boolean) => void;
	readonly isTaxDeductionModalOpen: boolean;
	readonly setIsTaxDeductionModalOpen: (open: boolean) => void;
	readonly patientData: PatientGeneralInfo;
	readonly onUpdatePatientField: (field: keyof PatientGeneralInfo, value: any) => void;
}

export const PatientCardModalSubModals: React.FC<PatientCardModalSubModalsProps> = ({
	isDiplomaModalOpen,
	setIsDiplomaModalOpen,
	isDmsLetterModalOpen,
	setIsDmsLetterModalOpen,
	isTaxDeductionModalOpen,
	setIsTaxDeductionModalOpen,
	patientData,
	onUpdatePatientField,
}) => (
	<>
		{isDiplomaModalOpen && (
			<PediatricBraveryDiplomaModal
				isOpen={isDiplomaModalOpen}
				onClose={() => setIsDiplomaModalOpen(false)}
				patientName={patientData.fullName || undefined}
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
						insuranceCompany: patientData.dmsInsuranceCompany || undefined,
						phone: patientData.phone || undefined,
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
				patientId={patientData.id || undefined}
				patientName={patientData.fullName || ""}
				patientBirthDate={patientData.birthDate || ""}
				patientInn={patientData.inn || (patientData as { taxpayerInn?: string }).taxpayerInn || ""}
				patientSnils={patientData.snils || ""}
				autoFetchPayments={true}
			/>
		)}
	</>
);
