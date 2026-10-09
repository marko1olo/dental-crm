/**
 * @file types.ts
 * @description Layer 0: TypeScript definitions and interfaces for clinic contracts,
 * acts of completed services, tax certificates, and dental lab orders.
 */

export interface ClinicRequisites {
	name: string;
	city: string;
	address: string;
	ogrn: string;
	inn: string;
	kpp?: string;
	licenseNumber: string;
	licenseDate: string;
	licenseIssuedBy: string;
	phone: string;
	email?: string;
	website?: string;
}

export interface PatientLegalData {
	fullName: string;
	birthDate: string;
	age?: number;
	gender?: "М" | "Ж" | string;
	passportSeries?: string;
	passportNumber?: string;
	passportIssueDate?: string;
	passportIssuedBy?: string;
	address: string;
	phone: string;
	cardRecordNumber: string;
	snils?: string;
	omsPolicy?: string;
	dmsPolicy?: string;
	specialNotes?: string;
}

export interface RepresentativeLegalData {
	fullName: string;
	relationType: "мать" | "отец" | "опекун" | "усыновитель" | "попечитель" | string;
	passportSeries?: string;
	passportNumber?: string;
	passportIssueDate?: string;
	passportIssuedBy?: string;
	address: string;
	phone: string;
	basisDocument: string;
}

export interface DoctorSignerData {
	fullName: string;
	shortName?: string;
	position: string;
	specialty?: string;
}

export interface ActServiceItem {
	itemIndex: number;
	toothFdi?: string;
	serviceCode: string;
	serviceName: string;
	quantity: number;
	unitPriceRub: number;
	discountRub?: number;
	totalPriceRub: number;
}

export interface ActOfServicesPayload {
	documentNumber: string;
	contractNumber: string;
	contractDate: string;
	currentFullDate: string;
	clinic: ClinicRequisites;
	patient: PatientLegalData;
	activeDoctor: DoctorSignerData;
	items: ActServiceItem[];
	totalAmountRub: number;
	totalAmountWords: string;
}

export interface FnsPaymentCertificatePayload {
	certificateNumber: string;
	currentFullDate: string;
	clinic: ClinicRequisites;
	taxpayerFullName: string;
	taxpayerInn: string;
	patientFullName: string;
	patientBirthDate: string;
	patientCardNumber: string;
	paymentDate: string;
	serviceCode: "1" | "2"; // 1 - обычное лечение, 2 - дорогостоящее
	amountRub: number;
	amountWords: string;
	issuerUser: {
		fullName: string;
		position: string;
		shortName: string;
	};
}

export interface DentalWorkOrderItem {
	itemIndex: number;
	toothFdi: string;
	serviceCode: string;
	workDescription: string;
	quantity: number;
	shadeVita: string;
	amountRub: number;
}

export interface DentalWorkOrderPayload {
	documentNumber: string;
	currentFullDate: string;
	clinic: ClinicRequisites;
	laboratoryName: string;
	dentalTechnicianFullName: string;
	patient: PatientLegalData;
	activeDoctor: DoctorSignerData;
	items: DentalWorkOrderItem[];
	totalAmountRub: number;
	totalAmountWords: string;
	shadeVita: string;
	stlReference?: string;
	fittingDate: string;
	completionDate: string;
	clinicalNotes?: string;
}

export interface TreatmentPlanItem {
	index: string;
	toothFdi: string;
	serviceCode: string;
	manipulationName: string;
	quantity: number;
	unitPriceRub: number;
	totalPriceRub: number;
}

export interface TreatmentPlanPhase {
	phaseIndex: number;
	phaseTitle: string;
	items: TreatmentPlanItem[];
	phaseSubtotalRub: number;
}

export type GeneralContractTemplateAlias =
	| "dogovor_na_okazanie_med_uslug"
	| "dogovor_na_okazanie_med_uslug_nesovershennoletnego"
	| "soglasie_na_obrabku_pd"
	| "doverennost_na_soprovozhdenie_rebenka"
	| "anketa_obshchego_sostoyaniya_zdorovya"
	| "polozhenie_o_garantiyakh"
	| "garantijnyj_pasport"
	| "invoice-act"
	| "dms-act"
	| "invoice-xray-act"
	| "medplan"
	| "medplan-agg"
	| "medplan-agg-tooth"
	| "loan"
	| "outpatient-card"
	| "doctor-schedule"
	| "stock-remains"
	| "director-ai-report"
	| "dental-work-order"
	| "fns-payment-certificate";

export type GeneralTemplatesRecord = Record<GeneralContractTemplateAlias | string, string>;
