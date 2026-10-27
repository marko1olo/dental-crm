/**
 * omnichannelContactTypes.ts — Контакты пациентов, расписание визитов и шаблоны.
 * Строго <= 120 строк по Мандату 8b.
 */

import type {
	InteractiveButtonPayload,
	OmnichannelChannel,
	OmnichannelChannelFilter,
	TemplateCategory,
} from "./omnichannelMessageTypes.js";

export interface PatientNextAppointment {
	readonly date: string;
	readonly time: string;
	readonly doctorName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly cabinet?: string | undefined;
	readonly reason?: string | undefined;
	readonly address?: string | undefined;
}

export interface PatientActiveTreatmentPlan {
	readonly id: string;
	readonly title: string;
	readonly teethFdi: readonly number[];
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly pdfUrl?: string | undefined;
	readonly stagesCount?: number | undefined;
}

export interface PatientOmnichannelContact {
	readonly id: string;
	readonly fullName: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly preferredChannel: OmnichannelChannel;
	readonly telegramUsername?: string | undefined;
	readonly telegramChatId?: string | undefined;
	readonly whatsappNumber?: string | undefined;
	readonly avatarColor?: string | undefined;
	readonly nextAppointment?: PatientNextAppointment | undefined;
	readonly activeTreatmentPlan?: PatientActiveTreatmentPlan | undefined;
	readonly unreadCount: number;
	readonly lastActivity: string;
	readonly lastMessageSnippet?: string | undefined;
}

export interface OmnichannelTemplate {
	readonly id: string;
	readonly name: string;
	readonly category: TemplateCategory;
	readonly channel: OmnichannelChannelFilter;
	readonly title: string;
	readonly description: string;
	readonly templateText: string;
	readonly interactiveButtons?: readonly InteractiveButtonPayload[] | undefined;
	readonly variables: readonly string[];
}
