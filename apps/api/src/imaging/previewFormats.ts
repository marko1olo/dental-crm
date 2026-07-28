import path from "node:path";

/**
 * Может ли браузер показать этот файл снимка сам.
 *
 * Правило нужно в двух слоях сразу: маршрут решает, отдавать ли файл, а
 * построитель ссылок решает, куда вести `previewUrl`. Держать его в маршруте
 * нельзя — слой базы импортировал бы маршрут и получился бы цикл, поэтому
 * правило живёт отдельно.
 *
 * DICOM, архивы и всё неизвестное сюда не попадают намеренно: подсунуть их в
 * `<img>` значит показать сломанную картинку вместо честного объяснения, что
 * предпросмотра нет и снимок надо открыть в просмотрщике DICOM.
 */
export function browserRenderableImageMimeType(storagePath: string | null | undefined): string | null {
	if (!storagePath) return null;
	const extension = path.extname(storagePath).toLowerCase();
	if (extension === ".png") return "image/png";
	if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
	if (extension === ".webp") return "image/webp";
	if (extension === ".gif") return "image/gif";
	if (extension === ".bmp") return "image/bmp";
	return null;
}
