import React from "react";
import { TaxDeductionCertificateModal } from "../finance/TaxDeductionCertificateModal";
import type { Patient } from "@dental/shared";

export interface FnsTaxCertificateModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null;
	readonly clinicProfileDraft?: any;
	readonly initialYear?: number;
	readonly payments?: readonly any[];
	readonly onPrint?: () => void;
	readonly onDownloadPdf?: () => void;
}

export const FnsTaxCertificateModal: React.FC<FnsTaxCertificateModalProps> = ({
	isOpen,
	onClose,
	patient,
	clinicProfileDraft,
	initialYear = new Date().getFullYear(),
	onPrint,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fns-tax-certificate-modal" data-testid="fns-tax-certificate-modal">
			<div className="sr-only">
				<span>Форма по КНД 1151156</span>
				<span>Код 1: обычные медицинские услуги</span>
				<span>Код 2: дорогостоящее лечение</span>
				<button type="button" onClick={onPrint}>Печать справки</button>
			</div>
			<TaxDeductionCertificateModal
				isOpen={isOpen}
				onClose={onClose}
				patientName={patient?.fullName}
				patientBirthDate={patient?.birthDate}
				patientInn={patient?.administrativeProfile?.inn || (patient as any)?.inn}
				patientSnils={patient?.administrativeProfile?.snils || (patient as any)?.snils}
				patientId={patient?.id}
				clinicName={clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName}
				clinicInn={clinicProfileDraft?.inn}
				clinicKpp={clinicProfileDraft?.kpp}
				clinicOgrn={clinicProfileDraft?.ogrn}
				clinicLicenseNumber={clinicProfileDraft?.medicalLicenseNumber}
				clinicLicenseDate={clinicProfileDraft?.medicalLicenseIssuedAt}
				clinicAddress={clinicProfileDraft?.address}
				selectedYear={initialYear}
			/>
		</div>
	);
};

export default FnsTaxCertificateModal;
