/**
 * guestLabPortalHelpers.ts
 * Dedicated helper functions, labels, and types for GuestLabPortal.
 * Preserves 100% test contract and Russian medical terminology (Mandate 8d).
 */

export {
	is3DScanFile,
	isImageFile,
	getAttachmentFileName,
	getAttachmentExtension,
	getAttachmentFileSize,
} from "./guestPortalModules/guestLabAttachmentHelpers";

export interface LabOrderData {
	id: string;
	patientFullName: string | null;
	toothFdi: string | null;
	material: string | null;
	colorVita: string | null;
	status: string;
	clinicalNotes: string | null;
	attachedImageUrl: string | null;
	dueDate?: string | null;
	createdAt: string;
}

export interface GuestLabPortalProps {
	token: string;
}

export function labOrderLoadFailureText(status: number): string {
	if (status === 404) {
		return (
			"Заказ по этой ссылке не найден: ссылка скопирована не целиком либо клиника удалила заказ. " +
			"Откройте ссылку из сообщения клиники ещё раз целиком — от «http» до последнего символа — " +
			"или запросите новую."
		);
	}
	if (status === 400) {
		return (
			"В ссылке нет номера заказа, открывать нечего. Скопируйте ссылку из сообщения клиники " +
			"целиком: у неё обрезан конец."
		);
	}
	return (
		"Сервер клиники не смог отдать заказ. Обновите страницу через минуту; если повторится — " +
		"сообщите в клинику, что портал лаборатории отвечает ошибкой."
	);
}

export function statusSaveFailureText(status: number): string {
	if (status === 404) {
		return (
			"Заказ по этой ссылке больше не доступен: клиника его удалила. Статус НЕ сохранён — " +
			"уточните заказ в клинике."
		);
	}
	if (status === 400) {
		return (
			"Клиника не приняла этот статус. Статус НЕ сохранён — обновите страницу: набор действий " +
			"по заказу мог измениться."
		);
	}
	return (
		"Сервер клиники не сохранил статус. Нажмите кнопку ещё раз через минуту — до этого " +
		"клиника видит прежний статус."
	);
}

export const NETWORK_FAILURE_TEXT =
	"Нет связи с сервером клиники. Проверьте интернет и обновите страницу — данные заказа не загружены.";

export const MATERIAL_LABELS: Record<string, string> = {
	zirconia: "Диоксид циркония",
	emax: "E.max (керамика)",
	pfm: "Металлокерамика",
	composite: "Композит",
	temporary: "Временная пластмасса",
};
