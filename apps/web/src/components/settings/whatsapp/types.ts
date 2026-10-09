import type { useWhatsappSettings, WhatsappStaffRouting } from "../../../hooks/useWhatsappSettings.js";

export interface StaffOption {
	id: string;
	fullName: string;
}

export interface WhatsappSettingsPanelProps {
	staffOptions: StaffOption[];
	serverBaseUrl?: string | undefined;
	useSettingsHook?: typeof useWhatsappSettings | undefined;
}

export type GatewayMode = "cloud_api" | "qr_gateway";
export type QrProvider = "green_api" | "wappi" | "local_baileys";

export interface WabaTestResult {
	ok: boolean;
	verifiedName?: string | null;
	displayPhoneNumber?: string | null;
	qualityRating?: string | null;
	message?: string | null;
}

export interface WhatsappNotificationTemplate {
	id: string;
	title: string;
	timing: "24h_before" | "2h_before" | "post_visit" | "custom";
	content: string;
	variables: string[];
	interactiveButtonsEnabled: boolean;
	isActive: boolean;
}

export interface WhatsappAntiBanLimits {
	minDelaySeconds: number;
	maxDelaySeconds: number;
	dailyMessageLimit: number;
	warmupModeEnabled: boolean;
	warmupCurrentDailySent: number;
	warmupTargetLimit: number;
	pauseAfterBatchCount: number;
	pauseDurationMinutes: number;
}

export interface WhatsappTestMessageState {
	phoneNumber: string;
	messageText: string;
	isSending: boolean;
	result: { ok: boolean; message: string } | null;
}

export const WHATSAPP_FEATURE_LABELS: Record<string, string> = {
	appointment_reminders: "Напоминания о записи",
	appointment_confirmation: "Подтверждение записи",
	document_ready_notice: "Готовность документов",
	payment_reminders: "Напоминания об оплате",
	post_visit_instructions: "Инструкции после приёма",
	recalls: "Отзывы после лечения",
	callback_requests: "Заявки на обратный звонок",
};

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsappNotificationTemplate[] = [
	{
		id: "reminder_24h",
		title: "Напоминание о приёме за 24 часа",
		timing: "24h_before",
		content:
			"Здравствуйте, {{patient_name}}! Напоминаем о вашем визите в клинику DENTE завтра в {{time}} к врачу {{doctor}}.",
		variables: ["{{patient_name}}", "{{doctor}}", "{{time}}"],
		interactiveButtonsEnabled: true,
		isActive: true,
	},
	{
		id: "reminder_2h",
		title: "Срочное подтверждение за 2 часа",
		timing: "2h_before",
		content:
			"Уважаемый(ая) {{patient_name}}, ждём вас на приём сегодня в {{time}} (врач {{doctor}}). Подтвердите, пожалуйста, визит.",
		variables: ["{{patient_name}}", "{{doctor}}", "{{time}}"],
		interactiveButtonsEnabled: true,
		isActive: true,
	},
	{
		id: "post_visit",
		title: "Инструкции и памятка после лечения",
		timing: "post_visit",
		content:
			"Здравствуйте, {{patient_name}}! Спасибо за визит к врачу {{doctor}}. Ознакомьтесь с рекомендациями по уходу после процедуры.",
		variables: ["{{patient_name}}", "{{doctor}}"],
		interactiveButtonsEnabled: false,
		isActive: true,
	},
];

export const DEFAULT_ANTIBAN_LIMITS: WhatsappAntiBanLimits = {
	minDelaySeconds: 15,
	maxDelaySeconds: 40,
	dailyMessageLimit: 200,
	warmupModeEnabled: true,
	warmupCurrentDailySent: 28,
	warmupTargetLimit: 150,
	pauseAfterBatchCount: 15,
	pauseDurationMinutes: 5,
};
