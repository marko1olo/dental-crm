/**
 * types.ts — Типы данных, интерфейсы и константы модуля гарантийных писем ДМС (Layer 0).
 * Охватывает страховые компании РФ (СОГАЗ, Ингосстрах, РЕСО-Гарантия, АльфаСтрахование, ВСК, Согласие),
 * реквизиты гарантийного письма, лимиты покрытия, франшизу, одобренные зубы и услуги.
 */

import type { DmsGuaranteeLetter, DmsInsurerItem } from "../insuranceMath";
import type { DmsGuaranteeLetter as SplitEngineGuaranteeLetter } from "../dmsSplitEngine";
import {
	type PatientGuaranteeLetter,
	type BillItemToSplit,
	type ExpressDmsGuaranteePreset,
	COMMON_DENTAL_ICD10_DIAGNOSES,
	FDI_ADULT_TEETH_UPPER,
	FDI_ADULT_TEETH_LOWER,
	DEFAULT_BILL_ITEMS_TO_SPLIT,
	EXPRESS_GUARANTEE_LETTER_PRESETS,
	getActiveBillItemsToSplit,
	fetchPatientGuaranteeLettersFromApi,
	saveGuaranteeLetterToApi,
	mapBackendLetterToPatientGuaranteeLetter,
} from "../dmsInsurancePresets";

export type {
	DmsGuaranteeLetter,
	DmsInsurerItem,
	SplitEngineGuaranteeLetter,
	PatientGuaranteeLetter,
	BillItemToSplit,
	ExpressDmsGuaranteePreset,
};

export {
	COMMON_DENTAL_ICD10_DIAGNOSES,
	FDI_ADULT_TEETH_UPPER,
	FDI_ADULT_TEETH_LOWER,
	DEFAULT_BILL_ITEMS_TO_SPLIT,
	EXPRESS_GUARANTEE_LETTER_PRESETS,
	getActiveBillItemsToSplit,
	fetchPatientGuaranteeLettersFromApi,
	saveGuaranteeLetterToApi,
	mapBackendLetterToPatientGuaranteeLetter,
};

export type DmsLetterLifecycleStatus = "active" | "expired" | "exhausted" | "cancelled";
export type DmsFranchiseKind = "percent" | "fixed_rub";

export interface QuickInsurerChipItem {
	readonly key: string;
	readonly name: string;
}

export const QUICK_RUSSIAN_DMS_INSURER_CHIPS: readonly QuickInsurerChipItem[] = [
	{ key: "sogaz", name: "СОГАЗ" },
	{ key: "ingosstrakh", name: "Ингосстрах" },
	{ key: "reso", name: "РЕСО-Гарантия" },
	{ key: "alfastrakh", name: "АльфаСтрахование" },
	{ key: "vsk", name: "ВСК" },
	{ key: "soglasie", name: "Согласие" },
];

export interface PatientDmsProfile {
	readonly id: string;
	readonly fullName: string;
	readonly birthDate?: string | undefined;
	readonly policyNumber?: string | undefined;
	readonly insuranceCompany?: string | undefined;
	readonly phone?: string | undefined;
}

export interface DmsGuaranteeLetterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: PatientDmsProfile | undefined;
	readonly initialLetter?: DmsGuaranteeLetter | null | undefined;
	readonly billItems?: readonly BillItemToSplit[] | undefined;
	readonly onSave?: ((letter: DmsGuaranteeLetter) => void) | undefined;
}
