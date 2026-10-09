import type { ProcedureSpecificConsentProcedure } from "../legalContractsAndConsents.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * STOMX CONSENTS & DOCUMENT REGISTRY CONTRACTS (LAYER 0)
 *
 * Чистые TypeScript-интерфейсы и типы данных для специализированных
 * стоматологических ИДС StomX, контекста подстановки переменных и реестра документов.
 * Соответствие: 323-ФЗ ст. 20, СанПиН 2.6.1.1192-03, Мандаты 8e, 8k, 8n.
 * ══════════════════════════════════════════════════════════════════════════════
 */

export type StomxConsentCategory =
	| "therapy"
	| "surgery"
	| "prosthetics"
	| "orthodontics"
	| "hygiene"
	| "periodontics"
	| "radiology"
	| "legal";

export interface StomxLegalConsentTemplateMetadata {
	id: number;
	systemAlias: string;
	name: string;
	procedureType: ProcedureSpecificConsentProcedure;
	category: StomxConsentCategory;
	categoryLabel: string;
	statutoryBasis: string;
	isEgisz: boolean;
	esiaRequired: boolean;
	isXrayIds: boolean;
	standardDoseMsv?: number;
	keyVariables: readonly string[];
}

export interface StomxVariableContext {
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

export type StomxDocumentCategory =
	| "clinical"
	| "legal"
	| "financial"
	| "orthodontics"
	| "radiology"
	| "analytics"
	| "warehouse";

export type StomxDenteModule =
	| "legal"
	| "emr"
	| "billing"
	| "schedule"
	| "orthodontics"
	| "radiology"
	| "lab"
	| "warehouse"
	| "analytics";

export interface StomxDocumentRegistryItem {
	id: number;
	name: string;
	category: StomxDocumentCategory;
	categoryLabel: string;
	statutoryBasis: string;
	targetDenteModule: StomxDenteModule;
	isConsentOrLegalContract: boolean;
	inSharedCatalog: boolean;
}
