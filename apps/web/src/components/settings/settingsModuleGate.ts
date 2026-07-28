/**
 * Какая вкладка настроек каким признаком модуля закрыта — и что об этом сказать.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ СПИСОК. Признак, отсеивающий КНОПКУ вкладки, живёт в
 * SettingsView, а признак, закрывающий саму ПАНЕЛЬ, — в панели. Пока это два
 * места, они обязаны называть один и тот же признак; ровно на таких парах этот
 * раздел уже расходился (кнопка есть — панели нет, и наоборот). Здесь пара
 * записана явно, названия модулей взяты как в переключателях на вкладке
 * «Модули», а проверка сверяет, что признак существует.
 *
 * ЧТО НЕ НАДО ДЕЛАТЬ. Дописывать сюда строку «на будущее» под признак, которого
 * панель не спрашивает: список должен описывать то, что есть, иначе он
 * превращается в пожелания и ему перестают верить.
 */

import type { SettingsTab } from "../../AppHelpers";
import type { WorkspaceFeatureFlags } from "../../hooks/useWorkspaceProfile";

/** Вкладка, где модули включаются. Признаком не закрыта — попасть туда можно всегда. */
export const MODULES_SETTINGS_TAB: SettingsTab = "modules";

export interface SettingsModuleGate {
	/** Признак из useWorkspaceProfile(). Тип не даёт назвать несуществующий. */
	readonly flag: keyof WorkspaceFeatureFlags;
	/** Название модуля ровно как в переключателе на вкладке «Модули». */
	readonly moduleTitle: string;
	/** Что этот модуль делает — одним предложением, без слов «функционал» и «модуль». */
	readonly whatItDoes: string;
}

/**
 * «Правила» — клинические правила: подсказки и запреты по ходу лечения.
 *
 * Кнопку этой вкладки отсеивает `if (!flags.hasClinicalRules)` в SettingsView, а
 * панель до этой правки не спрашивала признак вовсе.
 */
export const CLINICAL_RULES_GATE: SettingsModuleGate = {
	flag: "hasClinicalRules",
	moduleTitle: "Клинические правила",
	whatItDoes:
		"Правила предупреждают врача по ходу приёма: например, что перед протезированием нужен снимок, а после удаления — контрольный осмотр.",
};

/**
 * «Страховые» — договоры ДМС и доля страховой в смете.
 *
 * Кнопку отсеивает `if (!flags.hasInsuranceCoPay)`; панель признак не спрашивала.
 */
export const INSURANCE_CONTRACTS_GATE: SettingsModuleGate = {
	flag: "hasInsuranceCoPay",
	moduleTitle: "Страховое со-платёж (ДМС)",
	whatItDoes:
		"Договоры ДМС задают процент, который платит страховая по каждой категории услуг, и добавляют в смету колонку «Оплачивает страховая».",
};

/** Все пары «вкладка — признак», которые проверяет сама панель. */
export const SETTINGS_MODULE_GATES: readonly (SettingsModuleGate & {
	readonly tab: SettingsTab;
})[] = [
	{ ...CLINICAL_RULES_GATE, tab: "rules" },
	{ ...INSURANCE_CONTRACTS_GATE, tab: "insurance" },
];
