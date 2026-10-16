/**
 * DENTE Dental CRM — Statutory Medical Prescription Module (Order 1094n)
 * Canonical Facade delegating to decomposed PrescriptionCockpitModal.
 */

import React from "react";
import type { DiaryState } from "../useVisitDiaryLogic";
import {
	detectPrescriptionAllergyConflicts,
	detectPrescriptionSomaticWarnings,
	type AllergyConflictDrugItem,
	type PrescriptionAllergyConflict,
	type PrescriptionSomaticWarning,
} from "./prescriptionAllergyChecker";
import {
	DENTAL_FAST_PRESCRIPTION_SETS,
	DENTAL_OUTPATIENT_EXTENDED_DRUGS,
	type DentalFastPrescriptionSet,
} from "./prescriptionDataSets";
import { PrescriptionModal } from "./PrescriptionModal";

export type PrescriptionFormType = "107-1u" | "148-1u-88";

export {
	detectPrescriptionAllergyConflicts,
	detectPrescriptionSomaticWarnings,
	DENTAL_FAST_PRESCRIPTION_SETS,
	DENTAL_OUTPATIENT_EXTENDED_DRUGS,
};
export type {
	AllergyConflictDrugItem,
	PrescriptionAllergyConflict,
	PrescriptionSomaticWarning,
	DentalFastPrescriptionSet,
};

export interface PrescriptionDrugItem {
	readonly id: string;
	readonly latinName: string;
	readonly tradeName: string;
	readonly form: string;
	readonly dosage: string;
	readonly quantity: string;
	readonly dispenseLatin: string;
	readonly signaRussian: string;
	readonly category?: string | undefined;
}

export interface PrescriptionPrintModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id?: string | null | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly cardNumber?: string | null | undefined;
		readonly medicalCardNumber?: string | null | undefined;
		readonly passport?: string | null | undefined;
		readonly address?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly gender?: string | null | undefined;
		readonly snils?: string | null | undefined;
		readonly omsPolicy?: string | null | undefined;
		readonly allergies?: readonly string[] | string[] | string | null | undefined;
		readonly weightKg?: number | null | undefined;
	} | null | undefined;
	readonly allergies?: readonly string[] | string[] | string | null | undefined;
	readonly diary?: (DiaryState | {
		readonly diagnosisIcd10?: string | null | undefined;
		readonly treatmentDescription?: string | null | undefined;
		readonly anamnesis?: string | null | undefined;
		readonly statusLocalis?: string | null | undefined;
	} | null) | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly doctorSnils?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly clinicPhone?: string | null | undefined;
	readonly clinicOgrn?: string | null | undefined;
	readonly clinicInn?: string | null | undefined;
	readonly medicalLicenseNumber?: string | null | undefined;
	readonly initialSelectedDrugIds?: readonly string[] | undefined;
	readonly patientName?: string | null | undefined;
	readonly disablePortal?: boolean | undefined;
	readonly onPrescriptionCreated?: ((prescription: any) => void) | undefined;
	readonly onInsertToDiary?: ((diaryText: string) => void) | undefined;
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({ patient, patientName: patientNameProp, ...rest }) => {
	const patientName = patient?.fullName || patientNameProp || "";
	return <PrescriptionModal {...rest} patient={patient} patientName={patientName} />;
};
