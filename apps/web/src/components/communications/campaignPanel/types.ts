import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";

export type CampaignCriteria = {
	status?: "active" | "archived";
	lastVisitBefore?: string;
	neverVisited?: boolean;
	hasFutureAppointment?: boolean;
	debtAtLeastRub?: number;
	birthdayWithinDays?: number;
};

export type CampaignItem = {
	id: string;
	title: string;
	channel: string;
	scope: string;
	status: string;
	criteria: CampaignCriteria;
	scheduledAt: string | null;
	launchedAt: string | null;
	completedAt: string | null;
	createdAt: string;
};

export type TemplateOption = {
	id: string;
	title: string;
	channel: string;
	intent: string;
	isActive: boolean;
};

export type TemplateVariable = {
	key: string;
	label: string;
	example: string;
	phi: boolean;
};

export type CampaignPreview = {
	criteria: string[];
	audience: {
		matched: number;
		deliverable: number;
		excluded: {
			no_contact: number;
			no_consent: number;
			excluded_by_criteria: number;
		};
		candidates: { patientId: string; fullName: string }[];
		notes: string[];
	};
	cost: {
		recipients: number;
		segmentsPerMessage: number | null;
		billableUnits: number;
		note: string;
	};
	sampleText: string | null;
	problems: string[];
};

/**
 * Ход рассылки после запуска: сколько сообщений в каком состоянии очереди.
 */
export type CampaignProgress = {
	byStatus: Record<string, number>;
	total: number;
};

export type CampaignPanelProps = {
	initialTemplates?: TemplateOption[];
	initialCampaigns?: CampaignItem[];
};

/** Подписи статусов очереди — те же, что в MessageDeliveryConsole. */
export const outboxStatusLabels: Record<string, string> = {
	queued: "В очереди",
	sending: "Отправляется",
	sent: "Отправлено",
	delivered: "Доставлено",
	failed: "Не удалось",
	cancelled: "Снято",
	suppressed: "Задержано",
};

export const campaignStatusLabels: Record<string, string> = {
	draft: "Черновик",
	scheduled: "Запланирована",
	running: "Выполняется",
	completed: "Завершена",
	cancelled: "Отменена",
};

export const channelLabels: Record<string, string> = {
	sms: "SMS",
	email: "Почта",
	whatsapp: "WhatsApp",
	telegram: "Телеграм",
};

export async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch((err) => {
		showToast(
			actionFailureToast(
				"Ошибка ответа сервера",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	})) as unknown;
	if (!response.ok) {
		const message =
			payload &&
			typeof payload === "object" &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}
