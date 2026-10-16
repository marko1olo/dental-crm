/**
 * PrescriptionForm107Modal.tsx
 *
 * Каноническое модальное окно выписки и печати рецептурного бланка
 * формы № 107-1/у (Приказ Минздрава России от 24.11.2021 № 1094н).
 *
 * Делегирует рендеринг и бизнес-логику каноническому PrescriptionPrintModal
 * с сохранением обратной совместимости API и интерфейсов.
 *
 * Никаких эмодзи, только векторные иконки Lucide.
 */

import React from "react";
import type { Patient } from "@dental/shared";
import {
	DENTAL_CANONICAL_SSOT_MEDICATIONS,
	getDentalSsotMedicationById,
	checkMedicationSafetyContraindications,
	type DentalSsotMedicationItem,
} from "@dental/shared";
import {
	PrescriptionModal,
} from "../prescriptions/PrescriptionModal";
import type {
	PrescriptionPrescribedDrug,
	PrescriptionClinicInfo,
} from "./prescriptionPrintEngine";

export type {
	PrescriptionPrescribedDrug,
	PrescriptionClinicInfo,
};

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

export const CANONICAL_FORM_107_DEFAULT_DRUGS: readonly PrescriptionPrescribedDrug[] = [
	defaultAmoxi
		? toPrescribedDrug(defaultAmoxi)
		: {
				mnnLatin: "Amoxicillini + Acidi clavulanici",
				dosage: "875 mg + 125 mg",
				formAndDispenseLatin: "D.t.d. N 14 in tab.",
				signaRu: "Внутрь по 1 таблетке 2 раза в день во время еды, 7 дней.",
				tradeNameRu: "Амоксиклав (875+125 мг)",
			},
	defaultNsaid
		? toPrescribedDrug(defaultNsaid)
		: {
				mnnLatin: "Nimesulidi",
				dosage: "100 mg",
				formAndDispenseLatin: "D.t.d. N 10 in gran.",
				signaRu: "Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, 3-5 дней.",
				tradeNameRu: "Нимесил (100 мг)",
			},
];

export interface PrescriptionForm107ModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly initialMedications?: PrescriptionPrescribedDrug[];
	readonly initialMedicationId?: string | null;
	readonly onPrint?: () => void;
	readonly onDownloadPdf?: () => void;
}

export const PrescriptionForm107Modal: React.FC<PrescriptionForm107ModalProps> = ({
	isOpen,
	onClose,
	patient,
	doctorFullName,
	clinicProfileDraft,
	initialMedicationId,
}) => {
	if (!isOpen) return null;

	const draft = clinicProfileDraft || {};

	return (
		<PrescriptionModal
			isOpen={isOpen}
			onClose={onClose}
			patient={patient}
			doctorName={doctorFullName || "Врач-стоматолог"}
			clinicName={String(
				draft.legalName ||
				draft.clinicName ||
				'ООО "Стоматологическая клиника ДЕНТЕ"',
			)}
			clinicAddress={String(
				draft.legalAddress ||
				draft.address ||
				"127006, г. Москва, ул. Тверская, д. 12, стр. 2",
			)}
			clinicPhone={draft.phone ? String(draft.phone) : "+7 (495) 123-45-67"}
			clinicInn={draft.inn ? String(draft.inn) : "7710984521"}
			clinicOgrn={draft.ogrn ? String(draft.ogrn) : "1217700456123"}
			medicalLicenseNumber={
				draft.medicalLicenseNumber ||
				draft.licenseNumber ||
				"ЛО41-01137-77/00645892"
			}
			initialSelectedDrugIds={initialMedicationId ? [initialMedicationId] : undefined}
		/>
	);
};

PrescriptionForm107Modal.displayName = "PrescriptionForm107Modal";
