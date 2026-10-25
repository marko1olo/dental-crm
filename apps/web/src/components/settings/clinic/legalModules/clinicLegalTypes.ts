/**
 * apps/web/src/components/settings/clinic/legalModules/clinicLegalTypes.ts
 *
 * Types, interfaces, and constants for Russian Federation legal requisites.
 */

export type ClinicLegalEntityType = "ooo" | "ip" | "ao" | "self_employed";

export interface ClinicLegalProfile {
	legalName?: string;
	entityType?: ClinicLegalEntityType;
	inn?: string;
	kpp?: string;
	ogrn?: string;
	email?: string;
	website?: string;
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
	[key: string]: any;
}

export type ClinicProfileDraft = ClinicLegalProfile;

export interface RequisiteValidationResult {
	isValid: boolean;
	message?: string;
	type?: string;
}

export type LicenseValidationResult = RequisiteValidationResult;

export interface SettingsClinicLegalSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
	saveClinicProfileFromDraft: () => Promise<void> | void;
	clinicProfileSaveState: string;
	lookupClinicPublicProfile: () => Promise<void> | void;
	isClinicPublicLookupLoading: boolean;
	clinicPublicLookup: any;
	applyClinicLookupSuggestion: (fields: any) => void;
	legalReadinessPercent?: number;
	legalMissingFields?: string[];
	humanizeMigrationText: (txt: string) => string;
	clinicLookupSuggestionFieldEntries: (fields: any) => [string, any][];
	clinicPublicLookupFieldLabels: Record<string, string>;
	clinicPublicLookupWarningText?: (warning: string) => string;
	clinicLookupSuggestionApplySummary?: (fields: any) => string;
	uiLanguage?: string;
	setUiLanguage?: (lang: string) => void;
	normalizeUiLanguageInput?: (input: string) => string;
	typedUiLanguageOptions?: Array<{ value: string; label: string; detail: string }>;
	selectedUiLanguageOption?: { detail: string };
	odontogramViewMode?: any;
	setOdontogramViewMode?: (mode: any) => void;
	odontogramViewModeOptions?: ReadonlyArray<{ value: any; label: string; detail: string }>;
	selectedOdontogramOption?: { detail: string };
	artSettings?: { enabled: boolean; pack: "nature" | "dental-epic" | "abstract" | "all"; dynamicByTimeOfDay: boolean };
	updateArtSettings?: (partial: Partial<{ enabled: boolean; pack: "nature" | "dental-epic" | "abstract" | "all"; dynamicByTimeOfDay: boolean }>) => void;
	saveUiPreferences?: (prefs: any) => void;
	loadUiPreferences?: () => any;
	showToast?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
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
