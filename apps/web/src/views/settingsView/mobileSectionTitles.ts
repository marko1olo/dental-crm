/**
 * @file apps/web/src/views/settingsView/mobileSectionTitles.ts
 * @description Clean human-readable titles for mobile settings sections (Apple HIG).
 * Strictly concise (<= 14 chars) to eliminate any ellipsis truncation on 390px screens.
 */

export const MOBILE_SECTION_TITLES: Record<string, string> = {
	preferences: "Пресеты врача",
	clinic: "Клиника",
	prices: "Прейскурант",
	staff: "Сотрудники",
	hardware: "Оборудование",
	imports: "Импорт",
	modules: "Модули",
	commissions: "Комиссии и ЗП",
	access: "Доступы",
	telegram: "Мессенджеры",
	protocols: "Протоколы",
	rules: "Правила",
	"procedure-boms": "Техкарты",
	ai: "ИИ-ассистент",
	insurance: "Страхование",
	marketing: "Маркетинг",
	bpmn: "Процессы",
	sources: "Источники",
	reporting: "Отчёты",
	audit: "Журнал аудита",
	profile: "Мой профиль",
};

export function getMobileSectionTitle(sectionId: string): string {
	return MOBILE_SECTION_TITLES[sectionId] || "Настройки";
}
