/**
 * DENTE CRM — Clinical Guide Categories Registry
 * Authority: Mandate 8x (Clean Human Language), Mandate 8b (<= 120 lines)
 */

import type { ClinicalGuideCategory, ClinicalGuideCategoryMeta } from "./helpTypes";

export const GUIDE_CATEGORIES: readonly ClinicalGuideCategoryMeta[] = [
	{
		id: "clinical",
		label: "Приём врача",
		description: "Расписание, одонтограмма, дневник приёма и планы лечения",
	},
	{
		id: "finance",
		label: "Касса и чеки",
		description: "Приём оплаты, сплит, кассовые чеки и эквайринг, расчёт зарплат",
	},
	{
		id: "diagnostics",
		label: "Диагностика и снимки",
		description: "Снимки визиографа, 3D томография КЛКТ и замеры кости",
	},
	{
		id: "lab_warehouse",
		label: "Склад и стерилизация",
		description: "Зуботехнические наряды, шкала VITA и неблокируемый склад",
	},
	{
		id: "infrastructure",
		label: "Сеть и безопасность",
		description: "Журнал автоклавирования, этикетки крафт-пакетов и автономный LAN Mesh",
	},
];

export function getCategoryById(id: ClinicalGuideCategory): ClinicalGuideCategoryMeta | undefined {
	return GUIDE_CATEGORIES.find((cat) => cat.id === id);
}
