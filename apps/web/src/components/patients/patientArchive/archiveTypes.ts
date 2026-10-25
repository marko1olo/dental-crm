import type { PanelSubject } from "../../../lib/panelStateText";

export interface ArchiveReasonItem {
	id: string;
	organizationId: string;
	reasonName: string;
	isBookingBlocked: boolean;
	allowRebooking: boolean;
	notes?: string | null;
	createdAt: string;
}

export const BLACKLIST_SUBJECT: PanelSubject = {
	notLoadedTitle: "Статус блокировки записи не прочитан",
	accusative: "статус блокировки записи",
	emptyTitle: "Пациент не в архиве, запрет записи не установлен",
	emptyHint:
		"Блокировка нужна, когда записывать пациента нельзя: долг, агрессия, отказ от лечения. Она действует во всех клиниках сети.",
	failureConsequence:
		"Не считайте пациента разблокированным по этому экрану: статус не прочитан. Обновите его перед записью на приём.",
};
