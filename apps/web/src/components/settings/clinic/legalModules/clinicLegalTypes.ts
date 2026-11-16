/**
 * apps/web/src/components/settings/clinic/legalModules/clinicLegalTypes.ts
 *
 * Types, interfaces, and constants for Russian Federation legal requisites.
 */

import type {
	ClinicPublicLookupResponse,
	ClinicPublicLookupSuggestion,
	OdontogramViewMode,
} from "@dental/shared";
import type { UiPreferences, UiPreferencesInput } from "../../../../utils/preferencesUtils";

export type ClinicLegalEntityType = "ooo" | "ip" | "ao" | "self_employed";

export type ClinicProfileDraftValue =
	| string
	| number
	| boolean
	| string[]
	| number[]
	| Record<string, unknown>
	| null
	| undefined;

export interface ClinicLegalProfile {
	clinicName?: string;
	phone?: string;
	address?: string;
	legalName?: string;
	entityType?: ClinicLegalEntityType;
	inn?: string;
	kpp?: string;
	ogrn?: string;
	email?: string;
	website?: string;
	logoUrl?: string;
	stampUrl?: string;
	medicalLicenseNumber?: string;
	medicalLicenseIssuedAt?: string;
	medicalLicenseIssuer?: string;
	medicalLicenseActivities?: string[];
	signatoryName?: string;
	signatoryTitle?: string;
	bankDetails?: string;
	bik?: string;
	checkingAccount?: string;
	corrAccount?: string;
	bankName?: string;
	egiszEnabled?: boolean;
	egiszOid?: string;
	egiszTestMode?: boolean;
	egiszCertThumbprint?: string;
	egiszAutonomousMode?: boolean;
	[key: string]: ClinicProfileDraftValue | unknown;
}

export type ClinicProfileDraft = ClinicLegalProfile;

export type UpdateClinicProfileDraftFn = (
	field: string,
	value: ClinicProfileDraftValue | unknown,
) => void;

export interface RequisiteValidationResult {
	isValid: boolean;
	message?: string;
	type?: string;
}

export type LicenseValidationResult = RequisiteValidationResult;

export interface SettingsClinicLegalSectionProps {
	clinicProfileDraft: ClinicProfileDraft | Record<string, unknown>;
	updateClinicProfileDraft: UpdateClinicProfileDraftFn;
	saveClinicProfileFromDraft: () => Promise<void> | void;
	clinicProfileSaveState: string;
	lookupClinicPublicProfile: () => Promise<void> | void;
	isClinicPublicLookupLoading: boolean;
	clinicPublicLookup: ClinicPublicLookupResponse | null | undefined;
	applyClinicLookupSuggestion: (
		fields: Record<string, unknown> | Partial<ClinicLegalProfile>,
	) => void;
	legalReadinessPercent?: number | undefined;
	legalMissingFields?: string[] | undefined;
	humanizeMigrationText: (txt: string) => string;
	clinicLookupSuggestionFieldEntries: (
		fields: unknown,
	) => [string, unknown][];
	clinicPublicLookupFieldLabels: Record<string, string>;
	clinicPublicLookupWarningText?: ((warning: string) => string) | undefined;
	clinicLookupSuggestionApplySummary?: ((fields: unknown) => string) | undefined;
	uiLanguage?: string | undefined;
	setUiLanguage?: ((lang: string) => void) | undefined;
	normalizeUiLanguageInput?: ((input: string) => string) | undefined;
	typedUiLanguageOptions?: Array<{ value: string; label: string; detail: string }> | undefined;
	selectedUiLanguageOption?: { detail: string } | undefined;
	odontogramViewMode?: OdontogramViewMode | undefined;
	setOdontogramViewMode?: ((mode: OdontogramViewMode) => void) | undefined;
	odontogramViewModeOptions?: ReadonlyArray<{ value: OdontogramViewMode; label: string; detail: string }> | undefined;
	selectedOdontogramOption?: { detail: string } | undefined;
	artSettings?: { enabled: boolean; pack: "nature" | "dental-epic" | "abstract" | "all"; dynamicByTimeOfDay: boolean } | undefined;
	updateArtSettings?: ((partial: Partial<{ enabled: boolean; pack: "nature" | "dental-epic" | "abstract" | "all"; dynamicByTimeOfDay: boolean }>) => void) | undefined;
	saveUiPreferences?: ((prefs: UiPreferencesInput) => UiPreferences | null | void) | ((prefs: Record<string, unknown>) => void) | undefined;
	loadUiPreferences?: (() => UiPreferences | Record<string, unknown> | null | undefined) | undefined;
	showToast?: ((msg: string, type?: "info" | "success" | "warning" | "error") => void) | undefined;
}

export const CLINICAL_LICENSE_ACTIVITIES = [
	{ id: "therapy", label: "Стоматология терапевтическая", code: "stoma_therapy" },
	{ id: "surgery", label: "Стоматология хирургическая", code: "stoma_surgery" },
	{ id: "orthopedics", label: "Стоматология ортопедическая", code: "stoma_orthopedics" },
	{ id: "orthodontics", label: "Ортодонтия", code: "stoma_orthodontics" },
	{ id: "pediatric", label: "Стоматология детская", code: "stoma_pediatric" },
	{ id: "hygiene", label: "Стоматология общей практики / Гигиена", code: "stoma_general" },
	{ id: "radiology", label: "Рентгенология (прицельные снимки, ОПТГ, КЛКТ)", code: "stoma_xray" },
	{ id: "anesthesiology", label: "Анестезиология и реаниматология", code: "stoma_anesthesia" },
] as const;

export {
	validateInn,
	validateKpp,
	validateOgrn,
	validateBik,
	validateCheckingAccount,
	validateMedicalLicense,
	validateEgiszOid,
} from "./clinicLegalValidators";
