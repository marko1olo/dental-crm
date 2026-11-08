import type { ProcedureSpecificConsentProcedure } from "../legalContractsAndConsents.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CLINICAL CONSENTS & DOCUMENT REGISTRY CONTRACTS (LAYER 0)
 *
 * Канонические TypeScript-интерфейсы и типы данных для специализированных
 * стоматологических ИДС клиники DENTE, контекста подстановки переменных и реестра документов.
 * Соответствие: 323-ФЗ ст. 20, СанПиН 2.6.1.1192-03, Мандаты 8e, 8k, 8n, 8x, 8ap.
 * ══════════════════════════════════════════════════════════════════════════════
 */

export type ClinicalConsentCategory =
	| "therapy"
	| "surgery"
	| "prosthetics"
	| "orthodontics"
	| "hygiene"
	| "periodontics"
	| "radiology"
	| "legal";

/** @deprecated Use ClinicalConsentCategory (Mandate 8x/8ap) */
export type StomxConsentCategory = ClinicalConsentCategory;

export interface ClinicalLegalConsentTemplateMetadata {
	id: number;
	systemAlias: string;
	name: string;
	procedureType: ProcedureSpecificConsentProcedure;
	category: ClinicalConsentCategory;
	categoryLabel: string;
	statutoryBasis: string;
	isEgisz: boolean;
	esiaRequired: boolean;
	isXrayIds: boolean;
	standardDoseMsv?: number;
	keyVariables: readonly string[];
}

/** @deprecated Use ClinicalLegalConsentTemplateMetadata (Mandate 8x/8ap) */
export type StomxLegalConsentTemplateMetadata = ClinicalLegalConsentTemplateMetadata;

export interface ClinicalVariableContext {
	patient?: {
		id?: string | number | null;
		fullName?: string | null;
		lastName?: string | null;
		firstName?: string | null;
		middleName?: string | null;
		birthDate?: string | null;
		age?: number | string | null;
		gender?: "male" | "female" | string | null;
		phone?: string | null;
		email?: string | null;
		address?: string | null;
		registrationAddress?: string | null;
		passport?: string | null;
		passportSeries?: string | null;
		passportNumber?: string | null;
		passportSeriesNumber?: string | null;
		passportIssuedBy?: string | null;
		passportIssuedDate?: string | null;
		passportDepartmentCode?: string | null;
		inn?: string | null;
		snils?: string | null;
		cardNumber?: string | null;
		omsPolicy?: string | null;
		representativeFullName?: string | null;
		representativePassport?: string | null;
		representativeIssuedBy?: string | null;
		representativeRelation?: string | null;
	} | null;
	clinic?: {
		legalName?: string | null;
		name?: string | null;
		actualAddress?: string | null;
		address?: string | null;
		inn?: string | null;
		kpp?: string | null;
		ogrn?: string | null;
		phone?: string | null;
		email?: string | null;
		licenseNumber?: string | null;
		licenseDate?: string | null;
		licenseIssuer?: string | null;
		directorFullName?: string | null;
		directorTitle?: string | null;
		bankName?: string | null;
		bik?: string | null;
		checkingAccount?: string | null;
		corrAccount?: string | null;
	} | null;
	doctor?: {
		fullName?: string | null;
		specialty?: string | null;
		position?: string | null;
		phone?: string | null;
	} | null;
	visit?: {
		date?: string | null;
		time?: string | null;
		diagnosis?: string | null;
		diagnosisIcd10?: string | null;
		teeth?: string | number | null;
		tooth?: string | number | null;
		anesthesia?: string | null;
		complaint?: string | null;
		anamnesis?: string | null;
		studyType?: string | null;
		effectiveDoseMsv?: number | null;
	} | null;
	contract?: {
		number?: string | null;
		date?: string | null;
		totalAmountRub?: number | string | null;
		totalAmountWords?: string | null;
	} | null;
	custom?: Record<string, string | number | null | undefined>;
}

/** @deprecated Use ClinicalVariableContext (Mandate 8x/8ap) */
export type StomxVariableContext = ClinicalVariableContext;

export type ClinicalDocumentCategory =
	| "clinical"
	| "legal"
	| "financial"
	| "orthodontics"
	| "radiology"
	| "analytics"
	| "warehouse";

/** @deprecated Use ClinicalDocumentCategory (Mandate 8x/8ap) */
export type StomxDocumentCategory = ClinicalDocumentCategory;

export type DenteAppModule =
	| "legal"
	| "emr"
	| "billing"
	| "schedule"
	| "orthodontics"
	| "radiology"
	| "lab"
	| "warehouse"
	| "analytics";

/** @deprecated Use DenteAppModule (Mandate 8x/8ap) */
export type StomxDenteModule = DenteAppModule;

export interface DenteDocumentRegistryItem {
	id: number;
	name: string;
	category: ClinicalDocumentCategory;
	categoryLabel: string;
	statutoryBasis: string;
	targetDenteModule: DenteAppModule;
	isConsentOrLegalContract: boolean;
	inSharedCatalog: boolean;
}

export type ClinicalDocumentRegistryItem = DenteDocumentRegistryItem;

/** @deprecated Use DenteDocumentRegistryItem (Mandate 8x/8ap) */
export type StomxDocumentRegistryItem = DenteDocumentRegistryItem;
