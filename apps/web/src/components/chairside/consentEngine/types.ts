/**
 * ============================================================================
 * CHAIRSIDE CONSENT ENGINE - DOMAIN TYPES & DATA CONTRACTS (LAYER 0)
 * 323-ФЗ ст. 20 / 63-ФЗ / 1051н / 152-ФЗ / 804н / ПП РФ № 736
 * ============================================================================
 */

export type ChairsideDocumentType = "ids_1051n" | "pdn_152fz" | "treatment_estimate";

export interface ChairsideTreatmentItem {
	id: string;
	serviceCode: string; // Номенклатура 804н e.g. "A16.07.002.001"
	title: string;
	toothNumber?: string | undefined; // FDI e.g. "16", "24", "46"
	stageTitle?: string | undefined; // Клинический этап e.g. "Этап 1: Санация и терапия"
	quantity: number; // Целое число >= 1
	unitPriceKopecks: number; // Целочисленные копейки >= 0
	discountPercent?: number | undefined; // 0..100
	totalKopecks: number; // Целочисленные копейки с учетом скидки и количества
}

export interface ChairsidePatientProfile {
	fullName: string;
	birthDate: string;
	passport?: string | undefined;
	phone?: string | undefined;
	snils?: string | undefined;
	address?: string | undefined;
	cardNumber?: string | undefined; // № медицинской карты 043/у
}

export interface ChairsideDoctorProfile {
	fullName: string;
	specialty: string;
	licenseNumber?: string | undefined;
}

export interface ChairsideClinicProfile {
	legalName: string;
	brandName: string;
	ogrn: string;
	inn: string;
	address: string;
	licenseNumber: string;
	licenseDate: string;
	licenseIssuer: string;
}

export interface ChairsideClinicalContext {
	diagnosisIcd: string; // e.g. "K04.0 Пульпит", "K02.1 Кариес дентина"
	teeth: string[]; // e.g. ["16", "17"]
	anamnesisAllergies?: string | undefined;
	specialNotes?: string | undefined;
}

export interface ChairsideDocumentSection {
	id: string;
	title: string;
	content: string;
	bullets?: readonly string[] | undefined;
}

export interface ChairsideDocument {
	type: ChairsideDocumentType;
	code: string;
	title: string;
	statutoryBasis: string;
	sections: readonly ChairsideDocumentSection[];
	isSigned: boolean;
	signedAt?: string | undefined;
	integrityHash?: string | undefined;
}

export interface ChairsideSmsOtpState {
	code: string; // 4-значный OTP код (1000..9999)
	phone: string; // Исходный номер телефона
	phoneMasked: string; // Маскированный телефон e.g. "+7 (***) ***-**-12"
	sentAt: number; // Таймштамп отправки (ms)
	expiresAt: number; // Таймштамп истечения (ms, sentAt + 5 минут)
	attemptsCount: number; // Количество совершенных попыток ввода
	maxAttempts: number; // Максимально допустимое число попыток (3)
	isVerified: boolean; // Флаг успешной верификации
}

export interface ChairsidePepSignatureRecord {
	verificationMethod:
		| "sms_63fz_pep"
		| "touch_tablet_signature"
		| "chairside_in_person_confirmation"
		| "paper_physical";
	phone: string;
	phoneMasked: string;
	otpCodeConfirmed: string; // e.g. "****" или фактический проверенный 4-значный код
	timestamp: number;
	signedAtIso: string;
	signedAtFormatted: string; // DD.MM.YYYY HH:mm
	signedByFullName: string;
	form043uRecordId: string;
	integrityHash: string; // SHA-256 отпечаток документа
	legalStampText: string; // Текст юридического штампа 63-ФЗ
	legalBasis: string; // Ссылка на законодательную базу
	documentsDigest: string;
}

export type ChairsidePackageStatus =
	| "draft"
	| "ready_for_patient"
	| "patient_reviewing"
	| "sms_sent"
	| "signed"
	| "rejected";

export interface ChairsideConsentPackage {
	packageId: string;
	createdAt: string; // ISO
	patient: ChairsidePatientProfile;
	doctor: ChairsideDoctorProfile;
	clinic: ChairsideClinicProfile;
	clinicalContext: ChairsideClinicalContext;
	treatmentItems: ChairsideTreatmentItem[];
	totalEstimateKopecks: number;
	totalEstimateWords: string;
	documents: ChairsideDocument[];
	smsOtp?: ChairsideSmsOtpState | undefined;
	signature?: ChairsidePepSignatureRecord | undefined;
	status: ChairsidePackageStatus;
	exitPinHash?: string | undefined; // Doctor exit PIN SHA-256
}

export interface CreateChairsidePackageParams {
	packageId?: string | undefined;
	patient: ChairsidePatientProfile;
	doctor: ChairsideDoctorProfile;
	clinic?: Partial<ChairsideClinicProfile> | undefined;
	clinicalContext?: Partial<ChairsideClinicalContext> | undefined;
	treatmentItems?: ChairsideTreatmentItem[] | undefined;
	exitPin?: string | undefined; // e.g. "1234"
}

/**
 * Векторные точки и штрихи стилуса для планшета у кресла (touch_tablet_signature)
 */
export interface SignatureVectorPoint {
	x: number;
	y: number;
	pressure?: number | undefined;
	time?: number | undefined;
}

export interface SignatureStroke {
	points: SignatureVectorPoint[];
	color?: string | undefined;
	width?: number | undefined;
}

export interface SignatureExportResult {
	svgData: string;
	pngDataUrl?: string;
	vectorHash: string;
	strokeCount: number;
	pointCount: number;
}
