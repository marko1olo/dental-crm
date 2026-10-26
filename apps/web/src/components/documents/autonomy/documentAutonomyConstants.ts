export const DEFAULT_VOID_REASON_TEXT =
	"Аннулирование по согласованию с пациентом / техническая ошибка ввода";
export const DEFAULT_VOID_STAFF_ROLE = "Сотрудник клиники";
export const DEFAULT_VOID_STAFF_NAME = "Администратор";

export const EXTRACT_DIAGNOSIS_CHIPS = [
	"Кариес",
	"Пульпит",
	"Периодонтит",
	"Адентия",
	"Гингивит",
	"Норма",
];

export const EXTRACT_TREATMENT_CHIPS = [
	"Препарирование",
	"Пломбирование",
	"Экстирпация пульпы",
	"Удаление зуба",
	"Профессиональная гигиена",
	"Консультация",
];

export const EXTRACT_REC_CHIPS = [
	"Осмотр через 6 месяцев",
	"Рентген-контроль",
	"Санация полости рта",
	"Консультация ортопеда",
	"Прием НПВС при болях",
];

export const REFUND_REASON_CHIPS = [
	"Ошибка при оплате",
	"Отказ от продолжения лечения",
	"Оплата авансом",
	"Медицинские противопоказания",
];

export const CANONICAL_DOCUMENT_STATUS_LABELS: Record<string, string> = {
	draft: "Черновик",
	issued: "Выдан",
	voided: "Аннулирован",
	pending: "В обработке",
	signed: "Подписан",
	archived: "В архиве",
};
