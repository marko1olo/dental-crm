/**
 * staffCockpit/types.ts
 *
 * Layer 0: Доменные контракты, интерфейсы и типы для мобильного кокпита персонала в Telegram.
 * Чистые типы без рантайм-зависимостей.
 */

// ============================================================================
// РОЛЕВАЯ МОДЕЛЬ ПЕРСОНАЛА
// ============================================================================

export type StaffCockpitRole =
	| "chief_doctor"   // Главврач / Владелец
	| "dentist"        // Врач-стоматолог
	| "assistant"      // Ассистент врача
	| "administrator"  // Администратор ресепшена
	| "manager";       // Управляющий

// ============================================================================
// САНИТАЙЗЕР 323-ФЗ И 152-ФЗ
// ============================================================================

export interface MedicalSecrecySanitizeResult {
	safeText: string;
	isCompliant: boolean;
	strippedItems: string[];
}

// ============================================================================
// ТОКЕНЫ АВТОРИЗАЦИИ ПЕРСОНАЛА
// ============================================================================

export interface StaffAuthTokenRecord {
	token: string;
	staffUserId: string;
	organizationId: string;
	clinicId: string | null;
	role: string;
	fullName: string;
	expiresAt: Date;
	usedAt: Date | null;
}

// ============================================================================
// СОБЫТИЯ И ДАЙДЖЕСТЫ ВРАЧА
// ============================================================================

export type DoctorEventType =
	| "patient_arrived"
	| "appointment_cancelled"
	| "cito_acute_pain"
	| "lab_work_delivered";

export interface DoctorEventPushParams {
	eventType: DoctorEventType;
	doctorUserId: string;
	appointmentId?: string;
	patientFullName: string;
	patientPhone?: string | null;
	time: string;
	chairName?: string;
	note?: string;
	tooth?: string | number;
	labOrderNumber?: string | number;
	labItemName?: string;
	crmBaseUrl?: string;
}

export interface DoctorEventPushResult {
	text: string;
	safeText: string;
	replyMarkup: {
		inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
	};
	sanitization: MedicalSecrecySanitizeResult;
}

export interface DoctorMorningDigestResult {
	text: string;
	patientCount: number;
	firstAppointmentTime: string | null;
	complexCasesCount: number;
	replyMarkup: {
		inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
	};
}

// ============================================================================
// ОТЧЕТЫ РУКОВОДСТВА И СКЛАДСКИЕ АЛЕРТЫ
// ============================================================================

export interface ExecutiveEveningReportResult {
	text: string;
	totalRevenueRub: number;
	cashRevenueRub: number;
	cardRevenueRub: number;
	sbpRevenueRub: number;
	chairOccupancyPercent: number;
	confirmationRatePercent: number;
	replyMarkup: {
		inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
	};
}

export interface InventoryShortageItem {
	name: string;
	category: string;
	currentQty: number;
	minQty: number;
	unit: string;
}

export interface LowInventoryAlertResult {
	text: string;
	isShortage: boolean;
	anestheticsCount: number;
	consumablesCount: number;
	replyMarkup: {
		inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
	};
}
