/**
 * forms/medicalCard/anamnesisConstants.ts
 * Status options for oral mucosa, moisture, papillae and bleeding PBI (Mandate 8b <= 120 lines, Mandate 8x)
 */

import type { OralMucosaStatus } from "@dental/shared";

export const ORAL_MUCOSA_COLORS: Array<{ value: OralMucosaStatus["color"]; label: string }> = [
	{ value: "pale_pink_normal", label: "Бледно-розовая, чистая (норма)" },
	{ value: "hyperemic_red", label: "Гиперемированная, яркая (воспаление)" },
	{ value: "cyanotic_bluish", label: "Цианотичная, синюшная (венозный застой)" },
	{ value: "anemic_pale", label: "Анемичная, бледная" },
];

export const ORAL_MUCOSA_MOISTURE: Array<{ value: OralMucosaStatus["moisture"]; label: string }> = [
	{ value: "normal", label: "Умеренно увлажнена (норма)" },
	{ value: "dry_xerostomia", label: "Сухая / ксеростомия" },
	{ value: "excessive_salivation", label: "Повышенное слюноотделение (гиперсаливация)" },
];

export const GINGIVAL_PAPILLAE_OPTIONS: Array<{ value: OralMucosaStatus["gingivalPapillae"]; label: string }> = [
	{ value: "normal_pointed", label: "Остроконечные, плотно прилежат к шейкам зубов (норма)" },
	{ value: "hypertrophic_swollen", label: "Гипертрофированы, отечны, цианотичны" },
	{ value: "atrophic_receded", label: "Атрофированы, рецессия десны" },
	{ value: "necrotic", label: "Некротизированы, изъязвлены" },
];

export const BLEEDING_PBI_OPTIONS: Array<{ value: OralMucosaStatus["bleedingPBI"]; label: string }> = [
	{ value: "grade_0", label: "Степень 0: Кровоточивость отсутствует (норма)" },
	{ value: "grade_1", label: "Степень I: Точечные кровоизлияния через 10–30 сек." },
	{ value: "grade_2", label: "Степень II: Линейное кровотечение по десневому краю" },
	{ value: "grade_3", label: "Степень III: Кровь заполняет межзубной треугольник" },
	{ value: "grade_4", label: "Степень IV: Профузное кровотечение сразу после зондирования" },
];
