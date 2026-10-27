import React from "react";
import type { Patient, DentalSsotMedicationItem } from "@dental/shared";
import { getDentalSsotMedicationById } from "@dental/shared";
import { PrescriptionModal } from "../prescriptions/PrescriptionModal";
import type { PrescriptionPrescribedDrug, PrescriptionClinicInfo } from "./prescriptionPrintEngine";

export type { PrescriptionPrescribedDrug, PrescriptionClinicInfo };

function toPrescribedDrug(item: DentalSsotMedicationItem): PrescriptionPrescribedDrug {
	return {
		mnnLatin: item.innLatin,
		dosage: item.dosageRu,
		formAndDispenseLatin: item.dispenseLatin,
		signaRu: item.signaRu.replace(/^S\.\s*/, ""),
		tradeNameRu: item.tradeNameRu,
	};
}

const defaultAmoxi = getDentalSsotMedicationById("amoxiclav_875_125");
const defaultNsaid = getDentalSsotMedicationById("nimesil_100_sachet");
const defaultChx = getDentalSsotMedicationById("chlorhexidine_005_sol");

export const CANONICAL_PRESCRIPTION_DEFAULT_DRUGS: readonly PrescriptionPrescribedDrug[] = [
	defaultAmoxi ? toPrescribedDrug(defaultAmoxi) : null,
	defaultNsaid ? toPrescribedDrug(defaultNsaid) : null,
	defaultChx ? toPrescribedDrug(defaultChx) : null,
].filter((d): d is PrescriptionPrescribedDrug => d !== null);

export interface PrescriptionBlankModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: Clinic profile draft object
	readonly clinicProfileDraft?: any | undefined;
	readonly initialMedicationId?: string | undefined;
	readonly disablePortal?: boolean | undefined;
}

/**
 * Рецептурный бланк врача (PrescriptionBlankModal)
 * Канонический доменный компонент выписки рецептов и памяток пациенту без бюрократического канцелярита.
 */
export const PrescriptionBlankModal: React.FC<PrescriptionBlankModalProps> = ({
	isOpen,
	onClose,
	patient,
	doctorName: propDoctorName,
	doctorFullName,
	doctorSpecialty,
	clinicProfileDraft,
	initialMedicationId,
	disablePortal,
}) => {
	const doctorName = propDoctorName ?? doctorFullName;
	if (!isOpen) return null;
	const draft = clinicProfileDraft || {};

	return (
		<PrescriptionModal
			isOpen={isOpen}
			onClose={onClose}
			patient={patient}
			disablePortal={disablePortal ?? true}
			doctorName={doctorName || "Смирнов Алексей Владимирович"}
			doctorSpecialty={doctorSpecialty || "Врач-стоматолог хирург"}
			clinicName={String(draft.legalName || draft.clinicName || 'ООО "Стоматологическая клиника ДЕНТЕ"')}
			clinicAddress={String(draft.legalAddress || draft.address || "127006, г. Москва, ул. Тверская, д. 12, стр. 2")}
			clinicPhone={draft.phone ? String(draft.phone) : "+7 (495) 123-45-67"}
			clinicInn={draft.inn ? String(draft.inn) : "7710984521"}
			clinicOgrn={draft.ogrn ? String(draft.ogrn) : "1217700456123"}
			medicalLicenseNumber={draft.medicalLicenseNumber || draft.licenseNumber || "ЛО41-01137-77/00645892"}
			initialSelectedDrugIds={initialMedicationId ? [initialMedicationId] : undefined}
		/>
	);
};

PrescriptionBlankModal.displayName = "PrescriptionBlankModal";
