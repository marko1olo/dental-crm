/**
 * paidContract/blankContractTypes.ts
 * Types and legal clauses for blank contract & consent generation (Mandate 8b <= 120 lines)
 */

export interface BlankContractPatientInfo {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | null | undefined;
	email?: string | null | undefined;
	administrativeProfile?: {
		identityDocument?: string | null | undefined;
		registrationAddress?: string | null | undefined;
		residentialAddress?: string | null | undefined;
		snils?: string | null | undefined;
		taxpayerInn?: string | null | undefined;
		email?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
		legalRepresentativeRelationship?: string | null | undefined;
		legalRepresentativeIdentityDocument?: string | null | undefined;
		legalRepresentativePhone?: string | null | undefined;
	} | null | undefined;
}

export interface BlankContractOptions {
	clinicName?: string | undefined;
	clinicAddress?: string | undefined;
	clinicInn?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicKpp?: string | undefined;
	clinicPhone?: string | undefined;
	clinicWebsite?: string | undefined;
	medicalLicenseNumber?: string | undefined;
	medicalLicenseDate?: string | undefined;
	medicalLicenseIssuer?: string | undefined;
	contractNumber?: string | undefined;
	contractDate?: string | undefined;
	doctorName?: string | undefined;
}

export const LEGAL_CLAUSES = {
	plannedCareReason: "Первичный осмотр, комплексная диагностика и санация полости рта",
	serviceScopeSummary: "Стоматологические медицинские услуги по согласованному плану лечения",
	paymentTerms: "Оплата производится в день оказания услуги наличными денежными средствами или банковской картой",
	priceChangeRules: "Изменение согласованного объема и стоимости услуг оформляется дополнительным соглашением",
	freeCareAvailabilityNotice: "Пациент уведомлен о программе государственных гарантий бесплатной медицинской помощи по полису ОМС",
	medicalRecommendationWarning: "Несоблюдение назначений врача может снизить качество предоставляемой медицинской услуги",
	refusalAndRefundTerms: "При досрочном отказе от лечения заказчик оплачивает фактически понесенные клиникой расходы",
	warrantyAndClaimsTerms: "Гарантийные обязательства исполняются в соответствии с Положением о гарантиях клиники",
} as const;
