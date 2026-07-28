/**
 * Кнопка из настроек обязана вести в существующую вкладку настроек.
 *
 * ЗАЧЕМ ЭТА ПРОВЕРКА. У раздела «Настройки» уже была системная болезнь:
 * «списки, которые обязаны совпадать и не совпадают». Семь готовых панелей были
 * смонтированы под идентификаторы, которых не было в списке вкладок, — попасть в
 * них было нельзя ниоткуда, включая ручной ввод адреса, потому что
 * `settingsTabFromHash` пропускает только перечисленное в `settingsTabs`
 * (разбор — в AppHelpers.tsx над объявлением списка). Обратная сторона той же
 * болезни: ссылка вида `settings/messengers`, ведущая в идентификатор, которого
 * в списке нет. Такой переход не сообщает ни об ошибке, ни о чём вообще —
 * `settingsTabFromHash` тихо отдаёт «clinic», и человек оказывается на
 * «Клинике», думая, что нажал не туда.
 *
 * Проверка читает исходники самих панелей, а не их разметку в браузере: обойти
 * её опечаткой в строке нельзя, а стоит она миллисекунды.
 *
 * ГРАНИЦА. Проверяются только файлы `components/settings`. Владелец раздела —
 * этот каталог; расширять охват на весь интерфейс здесь значило бы уронить
 * проверку на чужой правке, о которой владелец каталога не знает.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import { settingsTabs } from "../../AppHelpers";
import { appViews, viewLabels } from "../../workspaceShell";
import {
	MESSENGERS_SETTINGS_TAB,
	settingsTabHash,
	settingsTabTitle,
	workspaceViewTitle,
} from "./settingsDeepLink";

const settingsDir = path.dirname(fileURLToPath(import.meta.url));

function collectSourceFiles(directory: string): string[] {
	const collected: string[] = [];
	for (const entry of readdirSync(directory)) {
		const full = path.join(directory, entry);
		if (statSync(full).isDirectory()) {
			collected.push(...collectSourceFiles(full));
			continue;
		}
		if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
		collected.push(full);
	}
	return collected;
}

/**
 * Ровно два способа перейти на вкладку настроек, какими это делает сам продукт:
 * запись адреса (`window.location.hash = "settings/telegram"`, так устроен
 * SettingsView.selectSettingsTab) и ссылка (`href="#settings/telegram"`).
 *
 * ПОЧЕМУ ШАБЛОН УЗКИЙ. Первая версия искала просто `settings/<слово>` и нашла
 * пути импорта (`./settings/SettingsClinicTab`) и адреса сервера
 * (`/api/settings/catalog-import`). Проверка, которая падает на том, что
 * проверять не бралась, — это не строгость, а шум, от которого её однажды
 * выключат целиком.
 *
 * Шаблонные подстановки (`settings/${tabId}`) пропускаются намеренно: там
 * идентификатор приходит переменной и уже проверен типом `SettingsTab`.
 * Проверять надо ровно то, что написано буквами, — именно там опечатка молчит.
 */
const SETTINGS_TARGET_PATTERNS: readonly RegExp[] = [
	/hash\s*=\s*[`"']#?settings\/([a-z][a-z0-9_-]*)/gi,
	/[`"']#settings\/([a-z][a-z0-9_-]*)/gi,
];

function literalSettingsTargets(source: string): string[] {
	const found = new Set<string>();
	for (const pattern of SETTINGS_TARGET_PATTERNS) {
		for (const match of source.matchAll(pattern)) {
			const target = match[1];
			if (target) found.add(target);
		}
	}
	return [...found];
}

const knownTabIds = new Set<string>(settingsTabs.map((tab) => tab.id));

describe("типизированный переход на вкладку настроек", () => {
	test("вкладка настроек мессенджеров есть в списке вкладок", () => {
		assert.ok(
			knownTabIds.has(MESSENGERS_SETTINGS_TAB),
			`settingsTabs не знает «${MESSENGERS_SETTINGS_TAB}» — кнопка «Перейти» выкинет на «Клинику»`,
		);
	});

	test("адрес собирается так же, как его читает settingsTabFromHash", () => {
		assert.equal(settingsTabHash(MESSENGERS_SETTINGS_TAB), "settings/telegram");
	});

	test("подпись кнопки совпадает с подписью вкладки в меню", () => {
		const inMenu = settingsTabs.find((tab) => tab.id === MESSENGERS_SETTINGS_TAB);
		assert.equal(settingsTabTitle(MESSENGERS_SETTINGS_TAB), inMenu?.title);
		// Идентификатор исторический, а подпись давно другая: за вкладкой живут
		// ещё WhatsApp и MAX. Подпись в разметке писать руками нельзя.
		assert.notEqual(settingsTabTitle(MESSENGERS_SETTINGS_TAB), "ТГ-бот");
	});
});

describe("переход в раздел рабочего места", () => {
	test("«Аналитика» есть в списке разделов: иначе переход выкинет на «Смену»", () => {
		assert.ok(appViews.includes("analytics"));
	});

	test("подпись раздела совпадает с подписью в меню рабочего места", () => {
		// В тексте вкладки «Отчёты» раздел назван по этой подписи, а не словом
		// «Отчёты»: в меню он подписан иначе, и совет обязан называть его так же.
		assert.equal(workspaceViewTitle("analytics"), viewLabels.analytics);
		assert.equal(workspaceViewTitle("communications"), "Связь");
	});
});

describe("ссылки внутри раздела настроек", () => {
	test("каждый адрес settings/<вкладка> назван в списке вкладок", () => {
		const broken: string[] = [];
		for (const file of collectSourceFiles(settingsDir)) {
			const source = readFileSync(file, "utf8");
			for (const target of literalSettingsTargets(source)) {
				if (!knownTabIds.has(target)) {
					broken.push(`${path.basename(file)} → settings/${target}`);
				}
			}
		}
		assert.deepEqual(
			broken,
			[],
			`Ссылка ведёт в вкладку, которой нет в settingsTabs, — переход молча выкинет на «Клинику»:\n${broken.join("\n")}`,
		);
	});
});

/**
 * Адреса сервера, которых на сервере нет.
 *
 * Здесь перечислены только те, что уже разобраны в этом каталоге. Общая
 * проверка на все несуществующие адреса живёт на сервере
 * (`apps/api/src/tests/webCallsExistingRoutes.test.ts`) и терпит их как
 * известный долг; эта — не терпит возврата разобранного. Без неё правку
 * «верну форму, потом сделаю маршрут» никто не заметит: она выглядит как
 * улучшение.
 */
const RETIRED_MISSING_ROUTES: readonly string[] = [
	"/api/clinic/marketing-settings",
	"/api/clinic/reporting-settings",
	"/api/reporting/token/generate",
];

describe("разобранные несуществующие адреса не возвращаются", () => {
	test("ни одна панель настроек их больше не зовёт", () => {
		const offenders: string[] = [];
		for (const file of collectSourceFiles(settingsDir)) {
			const source = readFileSync(file, "utf8");
			for (const route of RETIRED_MISSING_ROUTES) {
				// Упоминание в комментарии законно: там объяснено, почему адреса нет.
				// Ищем только вызов — адрес в кавычках рядом с fetch.
				const called = new RegExp(
					`fetch\\(\\s*[\`"']${route.replace(/\//g, "\\/")}`,
				).test(source);
				if (called) offenders.push(`${path.basename(file)} → ${route}`);
			}
		}
		assert.deepEqual(
			offenders,
			[],
			`Адреса нет на сервере, ответ всегда 404:\n${offenders.join("\n")}`,
		);
	});
});
