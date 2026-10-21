export const KIND_LABELS: Record<string, string> = {
	periapical: "Прицельный RVG",
	bitewing: "Интерпроксимальный",
	opg: "ОПТГ",
	ceph: "ТРГ",
	cbct: "КЛКТ 3D",
	photo: "Фотопротокол",
	other: "Снимок",
};

export const SOURCE_KIND_LABELS: Record<string, string> = {
	manual_upload: "Файл",
	dicom_file: "DICOM серия",
	dicomweb: "Архив PACS",
	pacs: "Архив PACS",
	twain_wia: "Сканер",
	sensor_bridge: "Датчик RVG",
	folder_watch: "Папка обмена",
	hot_folder: "Горячая папка",
	dicom_worklist: "Рабочий список",
	other: "Внешний файл",
};

export const REGION_LABELS: Record<string, string> = {
	maxilla_mandible: "Обе челюсти",
	maxilla: "Верхняя челюсть",
	mandible: "Нижняя челюсть",
	anterior: "Фронтальный отдел",
	posterior: "Жевательный отдел",
	tmj: "ВНЧС",
	sinus: "Пазухи",
};

export const SOURCE_NAME_LABELS: Record<string, string> = {
	manual: "Вручную",
	manual_upload: "Ручная загрузка",
	dicom_import: "Импорт DICOM",
	pacs: "PACS архив",
	sensor: "Датчик RVG",
};

export function formatStudyRegion(
	toothCode?: string | null,
	region?: string | null,
): string {
	if (toothCode) return `Зуб ${toothCode}`;
	if (!region) return "Область не указана";
	return REGION_LABELS[region] ?? region;
}

export function formatStudySourceName(sourceName?: string | null): string {
	if (!sourceName) return "Загружено";
	return SOURCE_NAME_LABELS[sourceName] ?? sourceName;
}
