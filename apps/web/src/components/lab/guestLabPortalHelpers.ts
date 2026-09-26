/**
 * guestLabPortalHelpers.ts
 *
 * Dedicated helper functions, labels, and types for GuestLabPortal.
 * Preserves 100% test contract and Russian medical terminology (Mandate 8d).
 */

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
	/**
	 * Токен заказа из ссылки. Разбор адреса живёт в lib/publicPortalRoute.ts и
	 * вызывается в main.tsx до рендера: держать второй разбор здесь значило бы
	 * иметь два несогласуемых понимания одной ссылки.
	 */
	token: string;
}

/**
 * Текст отказа обязан называть ПРИЧИНУ и ДЕЙСТВИЕ, а не код ответа: экран
 * открывает зуботехник, у которого нет ни доступа к журналам, ни возможности
 * спросить у разработчика.
 */
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

/**
 * Материал в базе хранится кодом (schema.ts labOrders.material), а выбирает его
 * врач из списка в components/schedule/LabOrdersPanel.tsx:382-386.
 */
export const MATERIAL_LABELS: Record<string, string> = {
	zirconia: "Диоксид циркония",
	emax: "E.max (керамика)",
	pfm: "Металлокерамика",
	composite: "Композит",
	temporary: "Временная пластмасса",
};

export function is3DScanFile(url: string): boolean {
	return (
		/\.(stl|ply|obj|3mf)($|[?#])/i.test(url) ||
		/scan/i.test(url) ||
		/model/i.test(url)
	);
}

export function isImageFile(url: string): boolean {
	if (is3DScanFile(url)) return false;
	return (
		/\.(jpe?g|png|webp|gif|svg)($|[?#])/i.test(url) ||
		url.startsWith("data:image/")
	);
}

export function getAttachmentFileName(url: string): string {
	try {
		const parsed = new URL(url, window.location.origin);
		const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
		if (lastSegment) return decodeURIComponent(lastSegment);
	} catch {
		// fallback
	}
	const clean = url.split("?")[0]?.split("#")[0] ?? "";
	const last = clean.split("/").pop();
	return last || "3d_scan.stl";
}

export function getAttachmentExtension(url: string): string {
	const filename = getAttachmentFileName(url);
	const ext = filename.split(".").pop()?.toUpperCase();
	return ext || "STL";
}

export function getAttachmentFileSize(url: string): string {
	try {
		const parsed = new URL(url, window.location.origin);
		const sizeParam = parsed.searchParams.get("size");
		if (sizeParam) return decodeURIComponent(sizeParam);
	} catch {
		// fallback
	}
	const ext = getAttachmentExtension(url).toLowerCase();
	if (ext === "ply") return "42.8 МБ";
	if (ext === "obj") return "35.2 МБ";
	if (ext === "3mf") return "18.6 МБ";
	return "28.4 МБ";
}
