/**
 * paidContract/types.ts
 *
 * Типы и интерфейсы Договора на оказание платных медицинских услуг
 * (Постановление Правительства РФ от 11.05.2023 № 736).
 */

export interface PaidContractClinicRequisites {
	fullName: string; // e.g. Общество с ограниченной ответственностью «Денте Стоматология»
	shortName: string; // ООО «Денте»
	brandName?: string | undefined;
	legalAddress: string;
	actualAddress: string; // Место осуществления медицинской деятельности
	inn: string;
	kpp: string;
	ogrn: string;
	licenseNumber: string; // e.g. Л041-01137-77/00584930
	licenseDate: string;
	licenseIssuer: string; // e.g. Департамент здравоохранения города Москвы
	bankName: string;
	bik: string;
	checkingAccount: string; // 20 цифр р/с
	correspondentAccount: string; // 20 цифр к/с
	phone: string;
	email: string;
	website?: string | undefined;
	directorTitle: string; // Генеральный директор / Главный врач
	directorFullName: string;
	actingOnBasis: string; // Устава / Доверенности №...
}

export interface PaidContractPatientRequisites {
	fullName: string;
	birthDate: string;
	gender?: string | undefined;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	snils: string;
	registrationAddress: string;
	actualAddress?: string | undefined;
	phone: string;
	email?: string | undefined;
	cardNumber?: string | undefined; // № медицинской карты 043/у
}

export interface PaidContractCustomerRequisites {
	isDifferentFromPatient: boolean;
	fullName: string;
	birthDate?: string | undefined;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	snils?: string | undefined;
	registrationAddress: string;
	actualAddress?: string | undefined;
	phone: string;
	email?: string | undefined;
}

export interface PaidContractRepresentativeRequisites {
	hasRepresentative: boolean;
	fullName: string;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	basisDocument: string; // e.g. Свидетельство о рождении серия... / Акт опеки
	phone: string;
}

export interface PaidContractServiceItem {
	id?: string | undefined;
	code?: string | undefined; // Код по Номенклатуре 804н (e.g. A16.07.002.001)
	name: string;
	toothOrArea?: string | undefined; // Зуб FDI (11-48) или сегмент
	quantity: number;
	unitPriceKopecks: number;
	discountKopecks: number;
	totalKopecks: number;
}

export interface PaidContractConfirmedDisclosures {
	clinicInfoConfirmed: boolean; // Сведения о клинике, лицензии и прейскуранте получены
	serviceListAndPriceConfirmed: boolean; // Перечень услуг и предварительная смета согласованы
	paidBasisUnderstood: boolean; // Платная основа лечения разъяснена
	writtenChangesConfirmed: boolean; // Изменения объема оформляются письменно доп. соглашением
	freeCareNoticeUnderstood: boolean; // Уведомлен о возможности получения помощи по ОМС
	recommendationsWarningUnderstood: boolean; // Предупрежден о последствиях несоблюдения назначений
}

export interface PaidContractSmsSignDetails {
	phone: string;
	code: string;
	sentAt: number;
	expiresAt: number;
	verifiedAt?: number | undefined;
	isVerified: boolean;
	smsSignHash?: string | undefined;
}

export interface PaidContractData {
	contractNumber: string; // e.g. ДПМУ-2026-001
	contractDate: string; // YYYY-MM-DD или DD.MM.YYYY
	city: string; // e.g. г. Москва
	clinic: PaidContractClinicRequisites;
	patient: PaidContractPatientRequisites;
	customer: PaidContractCustomerRequisites;
	representative: PaidContractRepresentativeRequisites;
	clinicalReason: string; // Основание обращения (жалобы, диагноз МКБ-10)
	serviceScopeSummary: string;
	services: PaidContractServiceItem[];
	serviceStart: string;
	serviceEndOrCondition: string;
	totalAmountKopecks: number;
	paymentTerms: string;
	priceChangeRules: string;
	freeCareNotice: string;
	medicalRecommendationWarning: string;
	refusalAndRefundTerms: string;
	warrantyTerms: string;
	disputeResolutionTerms: string;
	personalDataConsentRef: string;
	informedConsentRef: string;
	doctorFullName: string;
	doctorSpecialty?: string | undefined;
	signedAt?: string | undefined;
	signMethod: "paper" | "touch" | "sms_otp" | "manual" | "ukep";
	touchSignatureBase64?: string | undefined;
	smsSignDetails?: PaidContractSmsSignDetails | undefined;
	paperSignHash?: string | undefined;
	integrityHash?: string | undefined;
	confirmedDisclosures: PaidContractConfirmedDisclosures;
}

export interface PaidContractMissingField {
	section: string;
	field: string;
	label: string;
	hint: string;
}

export interface PaidContractValidationResult {
	isValid: boolean;
	missingFields: PaidContractMissingField[];
	warnings: string[];
}

export interface ValidatePaidContractOptions {
	/** Разрешить печать бланка договора при нулевой сумме или незаполненном паспорте */
	allowBlankForPrint?: boolean;
	/** Острая боль (CITO): не блокировать оказание экстренной помощи (Мандат 8n) */
	isCito?: boolean;
}
