/**
 * waitlistTypes.ts — Type definitions, demo items, and error text helpers for waitlist drawer.
 */

import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { actionFailureToast, type PanelSubject } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { TargetSlotInfo, WaitlistCandidateItem } from "../waitlistCancellationEngine";

export const DEMO_SHOWCASE_WAITLIST_CANDIDATES: WaitlistCandidateItem[] = [
	{
		id: "demo-waitlist-cand-1",
		patientId: "demo-patient-volkov",
		patientName: "Волков Сергей Николаевич",
		patientPhone: "+7 (916) 111-22-33",
		preferredDoctorId: "doc-smirnov",
		preferredDoctorName: "Д-р Смирнов А.П.",
		priorityLevel: "high",
		urgency: "acute_pain",
		treatmentCategory: "Терапия",
		notes: "Острая боль в области 4.6, просит ближайшее окно к Смирнову",
		status: "waiting",
		createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
	},
	{
		id: "demo-waitlist-cand-2",
		patientId: "demo-patient-morozova",
		patientName: "Морозова Елена Викторовна",
		patientPhone: "+7 (926) 444-55-66",
		preferredDoctorId: "doc-smirnov",
		preferredDoctorName: "Д-р Смирнов А.П.",
		priorityLevel: "medium",
		urgency: "ortho_endo",
		treatmentCategory: "Ортодонтия",
		notes: "Активация дуги, готова подойти день-в-день",
		status: "waiting",
		createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
	},
];

export function waitlistWriteHeaders(): Record<string, string> {
	return denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
}

export async function writeFailureText(
	response: Response,
	action: string,
): Promise<string> {
	// biome-ignore lint/suspicious/noExplicitAny: error body parsing
	const body = await response.json().catch((err: any) => {
		logger.error(err);
		showToast(
			actionFailureToast(
				"Ошибка чтения ответа",
				(err as { status?: number })?.status ?? null,
			),
			"error",
		);
		return null;
	});
	const serverMessage =
		body && typeof body.message === "string" ? body.message.trim() : "";
	if (serverMessage) return serverMessage;
	if (response.status === 401 || response.status === 403) {
		return `Не удалось ${action}: требуется вход сотрудника клиники.`;
	}
	if (response.status === 404) {
		return `Не удалось ${action}: запись уже изменена или удалена.`;
	}
	if (response.status >= 500) {
		return `Не удалось ${action}: сервер клиники ответил отказом. Повторите попытку.`;
	}
	return `Не удалось ${action}. Повторите попытку.`;
}

export const WAITLIST_SUBJECT: PanelSubject = {
	notLoadedTitle: "Очередь ожидания не прочитана",
	accusative: "очередь ожидания",
	emptyTitle: "В листе ожидания никто не ждёт",
	emptyHint:
		"Пациентов в очереди нет. Добавьте пациента формой ниже за 5 секунд, и при отмене чужой записи система сама предложит его на освободившееся окно.",
	failureConsequence:
		"Список ожидания не прочитан. Освободившееся окно можно отдать мимо тех, кто его ждёт.",
};

export interface ServerWaitlistMatch {
	entryId: string;
	patientId: string;
	score?: number;
	matchReasons?: string[];
	reason?: string;
	sameDoctor?: boolean;
	timeFits?: boolean;
	alreadyBooked?: boolean;
	waitingDays?: number;
}

export interface UseWaitlistDrawerOperationsProps {
	readonly isOpen: boolean;
	readonly targetSlot?: TargetSlotInfo | null | undefined;
	readonly onBookSlot?:
		| ((patient: WaitlistCandidateItem, slot: TargetSlotInfo) => Promise<void> | void)
		| undefined;
	// biome-ignore lint/suspicious/noExplicitAny: draft updater
	readonly updateNewAppointmentDraft?: ((key: any, value: any) => void) | undefined;
	readonly focusNewAppointmentEditor?: (() => void) | undefined;
	readonly onAppointmentCreated?: (() => void) | undefined;
	readonly onClose: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: dashboard & auth models
	readonly dashboard?: any;
	// biome-ignore lint/suspicious/noExplicitAny: auth model
	readonly auth?: any;
}
