/**
 * Patient Mobile Portal & Online Booking Types
 * (DOMAIN: PATIENT PORTAL, FORM 043/U PROTOCOLS, RADIOLOGY & ONLINE BOOKING)
 */

export interface PatientPortalProfile {
	patientId: string;
	fullName: string;
	phone: string;
	email: string;
	birthDate: string;
	cardNumber: string; // e.g. "043/у-2026/891"
	curatingDoctor: string;
	curatingDoctorName?: string;
	curatingDoctorSpecialty: string;
	curatingDoctorAvatar?: string;
	depositBalanceRub: number;
	loyaltyBonusRub: number;
	loyaltyTier: string;
	cashbackPercent: number;
	dmsPolicy?: {
		insurerName: string;
		policyNumber: string;
		coverageLimitRub: number;
		validUntilIso: string;
	};
}

export interface VisitProtocol043 {
	id: string;
	dateIso: string;
	timeRu: string;
	doctorId: string;
	doctorName: string;
	doctorSpecialty: string;
	branchName: string;
	cabinetNumber: string;
	toothFdi: string; // e.g. "1.6" or "2.4, 2.5"
	diagnosisIcd10: string; // e.g. "K04.0"
	diagnosisText: string; // e.g. "Острый очаговый пульпит"
	complaints: string;
	anamnesis: string;
	statusLocalis: string;
	treatmentProtocol: string;
	anesthesia: {
		anestheticName: string; // e.g. "Sol. Ultracaini DS Forte (Артикаин 4% + Эпинефрин 1:100 000)"
		volumeMl: number;
		method: string; // e.g. "Инфильтрационная" | "Проводниковая"
	};
	materialsUsed: Array<{
		name: string;
		quantity: number;
		unit: string;
	}>;
	postOpRecommendations: string[];
	nextVisitRecommendedIso?: string;
	status: "completed" | "scheduled" | "cancelled";
}

export interface RadiologyScanItem {
	id: string;
	studyDateIso: string;
	modality: "rvg" | "optg" | "cbct" | "photo";
	modalityLabel: string; // e.g. "Прицельная радиовизиография RVG"
	toothFdi: string[]; // e.g. ["16"]
	effectiveDoseMicrosv: number; // e.g. 3.0
	imageUrl: string;
	diagnosticConclusion: string;
	doctorName: string;
	clinicName: string;
	apparatusModel?: string; // e.g. "Vatech EzSensor Classic"
	metadata?: {
		kv?: number;
		ma?: number;
		exposureSec?: number;
		resolution?: string;
	};
}

export interface FiscalReceipt54Fz {
	receiptNumber: string;
	dateIso: string;
	fnNumber: string; // Фискальный накопитель (ФН)
	fdNumber: string; // Фискальный документ (ФД)
	fpdNumber: string; // Фискальный признак документа (ФПД)
	ofdName: string;
	fnsUrl: string;
	totalAmountRub: number;
	vatRateRu: string;
	paymentMethod: "sbp" | "pos" | "cash" | "deposit";
	fiscalQrData: string;
	items: Array<{
		titleRu: string;
		quantity: number;
		priceRub: number;
		totalRub: number;
		toothFdi?: string;
		code804n?: string;
	}>;
}

export interface PortalInvoiceItem {
	id: string;
	invoiceNumber: string;
	issueDateIso: string;
	dueDateIso: string;
	titleRu: string;
	totalAmountRub: number;
	paidAmountRub: number;
	remainingAmountRub: number;
	status: "paid" | "unpaid" | "partial";
	paymentMethod?: "sbp" | "pos" | "cash" | "deposit";
	paidAtIso?: string;
	fiscalReceipt?: FiscalReceipt54Fz;
	items: Array<{
		code: string;
		titleRu: string;
		quantity: number;
		priceRub: number;
		totalRub: number;
		toothFdi?: string;
	}>;
}

export interface PortalTreatmentProcedure {
	id: string;
	code804n?: string;
	nameRu: string;
	toothFdi?: string;
	priceRub: number;
	status: "completed" | "in_progress" | "planned";
	doctorName?: string;
}

export interface PortalTreatmentStage {
	id: string;
	stageNumber: number;
	titleRu: string;
	descriptionRu?: string;
	status: "completed" | "in_progress" | "planned";
	teethFdi: string[];
	totalAmountRub: number;
	completedAmountRub: number;
	remainingAmountRub: number;
	targetDateRu?: string;
	procedures: PortalTreatmentProcedure[];
}

export interface PortalTreatmentPlan {
	id: string;
	planNumber: string;
	titleRu: string;
	createdDateIso: string;
	curatingDoctorName: string;
	totalAmountRub: number;
	completedAmountRub: number;
	remainingAmountRub: number;
	progressPercent: number;
	teethFdiSummary: string[];
	stages: PortalTreatmentStage[];
}

export interface PortalDocumentItem {
	id: string;
	titleRu: string;
	category: "consent" | "contract" | "warranty" | "tax_deduction" | "extract_043";
	dateIso: string;
	status: "signed" | "pending" | "ready";
	signMethod?: "sms_otp" | "eds" | "paper";
	signedAtIso?: string;
	pdfUrl?: string;
	details?: string;
	codeOrderRu?: string; // e.g. "Приказ МЗ РФ № 1051н"
}

// Online Booking Types
export interface BookingBranch {
	id: string;
	nameRu: string;
	addressRu: string;
	metroStationRu: string;
	metroLineColor: string; // e.g. "#10b981", "#3b82f6", "#ef4444"
	phone: string;
	workHoursRu: string;
	imageUrl?: string;
	parkingInfoRu?: string;
}

export type SpecialtyCategory =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "orthodontics"
	| "hygiene"
	| "periodontics";

export interface BookingDoctor {
	id: string;
	fullName: string;
	specialtyRu: string;
	specialtyCategory: "therapy" | "surgery" | "orthopedics" | "orthodontics" | "hygiene" | "periodontics";
	avatarUrl?: string;
	experienceYears: number;
	rating: number; // e.g. 4.96
	reviewsCount: number; // e.g. 142
	nextSlotTextRu: string; // e.g. "Сегодня, 16:30"
	branchIds: string[];
	priceFromRub: number;
	educationRu?: string;
}

export interface BookingService {
	id: string;
	code804n?: string;
	titleRu: string;
	specialtyCategory: "therapy" | "surgery" | "orthopedics" | "orthodontics" | "hygiene" | "periodontics";
	durationMinutes: number;
	priceRub: number;
	isFreeConsultation: boolean;
	descriptionRu: string;
	badgeRu?: string;
}

export interface BookingTimeSlot {
	id: string;
	doctorId: string;
	branchId: string;
	dateIso: string; // YYYY-MM-DD
	timeRu: string; // HH:MM
	timePeriod: "morning" | "afternoon" | "evening";
	isOccupied: boolean;
}

export interface OnlineBookingFormData {
	branchId: string;
	specialtyCategory: SpecialtyCategory;
	doctorId: string;
	serviceId: string;
	dateIso: string;
	slotId: string;
	timeRu: string;
	patientFullName: string;
	patientPhone: string;
	patientBirthDate: string;
	patientComment: string;
	consentPersonalData152Fz: boolean;
	smsOtpCode: string;
	smsVerified: boolean;
	requiresPrepayment: boolean;
	prepaymentAmountRub: number;
	isPrepaid: boolean;
	bookingConfirmationNumber?: string;
}
