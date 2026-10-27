/**
 * DENTE CRM — Chairside Clinical Hotkeys Catalog
 * Authority: Mandate 8e (Doctor Autonomy & Speed), Mandate 8b (<= 120 lines)
 */

import type { ClinicalHotkeyMeta } from "./helpTypes";

export const CLINICAL_HOTKEYS_REGISTRY: readonly ClinicalHotkeyMeta[] = [
	{
		id: "help-hub",
		keyCombination: "F1 / ?",
		title: "База знаний и справка",
		description: "Открыть справочник у кресла врача и гид по функциям",
		category: "global",
	},
	{
		id: "global-search",
		keyCombination: "Ctrl+K / Cmd+K",
		title: "Поиск пациента",
		description: "Мгновенный переход к карте любого пациента клиники",
		category: "global",
	},
	{
		id: "toggle-visit",
		keyCombination: "Space / Enter",
		title: "Старт / завершение визита",
		description: "Начать или закончить активный приём пациента",
		category: "chairside",
		targetView: "schedule",
	},
	{
		id: "autonorm-odontogram",
		keyCombination: "Shift+N",
		title: "Норма формулы в 1 клик",
		description: "Заполнить всю зубную формулу физиологической нормой",
		category: "chairside",
		targetView: "visit",
	},
	{
		id: "fdi-teeth-keys",
		keyCombination: "1..8",
		title: "Выбор зуба по FDI",
		description: "Быстрый выбор зуба активного сегмента зубной дуги",
		category: "chairside",
		targetView: "visit",
	},
	{
		id: "save-diary",
		keyCombination: "Ctrl+S",
		title: "Автосохранение дневника",
		description: "Мгновенное сохранение протокола визита в защищенный локальный черновик",
		category: "records",
		targetView: "visit",
	},
	{
		id: "print-consent",
		keyCombination: "F12",
		title: "Печать карты и согласий",
		description: "Быстрая печать медицинской карты приёма и бланков согласий",
		category: "records",
		targetView: "visit",
	},
	{
		id: "fast-cashier",
		keyCombination: "F9",
		title: "Касса и оплата",
		description: "Перейти к расчёту стоимости приёма и кассовым чекам",
		category: "billing",
		targetView: "finance",
	},
	{
		id: "imaging-viewer",
		keyCombination: "F7",
		title: "Снимки и КЛКТ",
		description: "Открыть снимки визиографа и 3D срезы томографии",
		category: "imaging",
		targetView: "imaging",
	},
	{
		id: "warehouse-inventory",
		keyCombination: "F8",
		title: "Склад и материалы",
		description: "Просмотр остатков анестетиков и расходных материалов",
		category: "chairside",
		targetView: "settings",
	},
	{
		id: "dismiss-overlay",
		keyCombination: "Esc",
		title: "Закрыть шторку / окно",
		description: "Безопасное закрытие текущей шторки или модального окна",
		category: "global",
	},
];

export function getHotkeysByCategory(
	category: ClinicalHotkeyMeta["category"],
): readonly ClinicalHotkeyMeta[] {
	return CLINICAL_HOTKEYS_REGISTRY.filter((h) => h.category === category);
}
