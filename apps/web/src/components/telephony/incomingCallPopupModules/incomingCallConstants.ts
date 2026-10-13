import type { QuickSlotType } from "../IncomingCallQuickBooking";

export const DEFAULT_TELEPHONY_WS_URL = "ws://localhost:4100/api/ws/schedule";

export const DEFAULT_CLINIC_BRAND_NAME = "DENTE";

export const DEFAULT_DOCTOR_FALLBACK_ID = "doc-1";

export const QUICK_BOOKING_REASON_BY_SLOT: Record<QuickSlotType, string> = {
	today_cito: "Неотложный приём CITO / Острая боль",
	today_urgent: "Неотложная помощь / Острая боль",
	today_standard: "Первичный осмотр и консультация",
	tomorrow: "Первичный осмотр и консультация",
};

export const QUICK_BOOKING_TOAST_LABEL_BY_SLOT: Record<QuickSlotType, string> = {
	today_cito: "CITO (Острая боль)",
	today_urgent: "Острая боль",
	today_standard: "Сегодня",
	tomorrow: "На завтра",
};
