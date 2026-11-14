/**
 * Constants and reference dictionaries for insurance and VHI/DMS routes
 */

import { DMS_INSURANCE_COMPANIES_CATALOG } from "@dental/shared";

/**
 * Название страховой компании — единственное обязательное поле договора ДМС.
 *
 * Поле названо ровно так, как подписано в форме («Страховая компания»,
 * InsuranceContractsPanel.tsx:496), а не именем колонки базы: администратор ищет
 * на экране подпись, а `companyName` ему ни о чём не говорит.
 *
 * Один текст на создание и на изменение: раньше проверка стояла только при
 * создании, и это была не косметика, а утрата данных (см. PUT ниже).
 */
export const INSURANCE_COMPANY_NAME_REQUIRED =
	"Не заполнено поле «Страховая компания» — по договору ДМС это единственное обязательное поле, и один пробел в нём не считается названием. Впишите название страховой компании и сохраните снова: остальные заполненные поля остались на экране.";

/** Договора нет: причина и оба действия, доступных администратору. */
export const INSURANCE_CONTRACT_NOT_FOUND =
	"Этот договор ДМС в вашей клинике не найден: возможно, его уже убрали из работы с другого рабочего места. Обновите список договоров — если договор нужен, добавьте его заново.";

/**
 * Справочник страховых компаний ДМС (SSOT: DMS_INSURANCE_COMPANIES_CATALOG из @dental/shared)
 */
export const INSURER_DIRECTORY: Record<string, { name: string; inn: string }> = (() => {
	const dir: Record<string, { name: string; inn: string }> = {};
	for (const comp of DMS_INSURANCE_COMPANIES_CATALOG) {
		dir[comp.id] = { name: comp.shortNameRu, inn: comp.inn };
	}
	// Historical short aliases for backward compatibility
	if (dir.reso_garantiya) dir.reso = dir.reso_garantiya;
	if (dir.alfastrakhovanie) dir.alfastrakh = dir.alfastrakhovanie;
	return dir;
})();

export const INSURER_NAMES: Record<string, string> = (() => {
	const names: Record<string, string> = {};
	for (const [k, v] of Object.entries(INSURER_DIRECTORY)) {
		names[k] = v.name;
	}
	return names;
})();
