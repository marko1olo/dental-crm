/**
 * Кнопка вкладки и панель под ней обязаны спрашивать ОДИН И ТОТ ЖЕ признак.
 *
 * Проверяется то, что было сломано: список вкладок в SettingsView отсеивал
 * «Правила» по `hasClinicalRules` и «Страховые» по `hasInsuranceCoPay`, а панели
 * под этими вкладками признака не спрашивали вовсе — и открывались по адресу при
 * выключенном модуле. Кнопки нет, а панель работает.
 *
 * Проверка читает исходник SettingsView и сверяет пары «вкладка — признак» с
 * тем, что панель спрашивает у себя. Это ратчет: расхождение назад не проедет.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { settingsTabs } from "../../AppHelpers";
import {
	MODULES_SETTINGS_TAB,
	SETTINGS_MODULE_GATES,
} from "./settingsModuleGate";

const webSrc = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const settingsViewSource = readFileSync(
	path.join(webSrc, "SettingsView.tsx"),
	"utf8",
);
/*
 * Набор признаков читается исходником, а не объектом со значениями по умолчанию:
 * тот из hooks/useWorkspaceProfile.ts не экспортируется, и тащить его наружу ради
 * одной проверки — менять чужой модуль под тест.
 */
const workspaceProfileSource = readFileSync(
	path.join(webSrc, "hooks", "useWorkspaceProfile.ts"),
	"utf8",
);

const knownTabIds = new Set<string>(settingsTabs.map((tab) => tab.id));

describe("пары «вкладка настроек — признак модуля»", () => {
	test("вкладка из пары есть в списке вкладок", () => {
		for (const gate of SETTINGS_MODULE_GATES) {
			assert.ok(
				knownTabIds.has(gate.tab),
				`вкладки «${gate.tab}» нет в settingsTabs`,
			);
		}
	});

	test("признак из пары объявлен в признаках рабочего профиля", () => {
		for (const gate of SETTINGS_MODULE_GATES) {
			assert.match(
				workspaceProfileSource,
				new RegExp(`\\b${String(gate.flag)}\\s*:`),
				`признака «${String(gate.flag)}» нет в hooks/useWorkspaceProfile.ts`,
			);
		}
	});

	/**
	 * Тот самый шаг, на котором кнопка и панель расходились. Строка вида
	 *   if (!flags.hasClinicalRules) typedSettingsTabs = ...filter(t => t.id !== "rules")
	 * должна называть ровно тот признак, который проверяет сама панель.
	 */
	test("кнопку вкладки отсеивает тот же признак, что проверяет панель", () => {
		for (const gate of SETTINGS_MODULE_GATES) {
			const filterLine = new RegExp(
				`!flags\\.${String(gate.flag)}\\b[^\\n]*t\\.id !== "${gate.tab}"`,
			);
			assert.match(
				settingsViewSource,
				filterLine,
				`В SettingsView кнопка вкладки «${gate.tab}» отсеивается не признаком «${String(gate.flag)}» — кнопка и панель разойдутся`,
			);
		}
	});

	test("вкладка «Модули» признаком не закрыта: иначе включить модуль будет негде", () => {
		assert.ok(knownTabIds.has(MODULES_SETTINGS_TAB));
		assert.doesNotMatch(
			settingsViewSource,
			new RegExp(`t\\.id !== "${MODULES_SETTINGS_TAB}"`),
			"вкладку «Модули» начали отсеивать по признаку — тогда переход «Включить» ведёт в никуда",
		);
	});
});

describe("тексты про выключенный модуль", () => {
	test("название модуля и объяснение заполнены и по-русски", () => {
		for (const gate of SETTINGS_MODULE_GATES) {
			assert.ok(gate.moduleTitle.length > 0);
			assert.ok(
				gate.whatItDoes.length > 40,
				`слишком коротко: «${gate.whatItDoes}»`,
			);
			assert.doesNotMatch(
				gate.whatItDoes,
				/[A-Za-z]/,
				`латиница в объяснении «${gate.whatItDoes}»`,
			);
		}
	});

	test("объяснение говорит о деле клиники, а не о программе", () => {
		for (const gate of SETTINGS_MODULE_GATES) {
			assert.doesNotMatch(
				gate.whatItDoes,
				/функционал|модуль|опция|фича/i,
				`жаргон в объяснении «${gate.whatItDoes}»`,
			);
		}
	});

	test("две пары, и они разные", () => {
		const flags = SETTINGS_MODULE_GATES.map((gate) => String(gate.flag));
		assert.equal(new Set(flags).size, flags.length);
		const tabs = SETTINGS_MODULE_GATES.map((gate) => gate.tab);
		assert.equal(new Set(tabs).size, tabs.length);
	});
});
