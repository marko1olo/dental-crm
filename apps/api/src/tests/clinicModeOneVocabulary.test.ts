/**
 * Режим клиники — один словарь на всю программу.
 *
 * ЧТО ЭТОТ ТЕСТ ДЕРЖИТ. Модульность (§5: малая практика не видит лишнего) держится
 * на одной колонке — `organizations.clinic_mode`. На неё в проекте было ТРИ
 * несовпадающих словаря, и ни один не пересекался с остальными:
 *
 *   packages/shared/src/index.ts:797   solo_doctor | one_chair | small_clinic | network_clinic
 *   apps/api/src/db/schema.ts:228      DEFAULT 'demo', в комментарии «demo, single, network»
 *   routes/workspaceProfile.ts:684     мастер первого запуска писал 'single' / 'network'
 *
 * Расхождение не всплывало, потому что чтение молча подменяло непрошедшее значение
 * (`clinicModeSchema.catch("one_chair")`, db/domainStateHydration.ts:350). Замер на
 * живой базе: 2 организации из 2, то есть ВСЕ, лежали со значением 'demo' — вне
 * перечисления, причём по УМОЛЧАНИЮ КОЛОНКИ, а не из старых данных.
 *
 * ПОЧЕМУ ТЕСТ ЖИВЁТ В apps/api И ИМПОРТИРУЕТ МОДУЛЬ ИЗ apps/web. Проверяемое
 * свойство — «словарь один» — по своей природе лежит на границе двух пакетов:
 * пишет значение сервер, а решает по нему состав разделов интерфейс. Тест,
 * проверяющий только одну сторону, пропустил бы ровно тот дефект, который тут был.
 * Сторона выбрана apps/api, потому что зеркальный тест в apps/web затянул бы в его
 * программу схему drizzle и типы node, которых у веба в `types: ["vite/client"]`
 * нет, и уронил бы веб-гейт. `lib/clinicCapabilities.ts` не тянет ни React, ни
 * CSS — только `@dental/shared`.
 *
 * ЗДЕСЬ РАНЬШЕ СТОЯЛО ДРУГОЕ ОБОСНОВАНИЕ, и оно опиралось на дефект: «сторона
 * выбрана apps/api, потому что apps/api/tsconfig.json исключает тесты из
 * компиляции». Исключение действительно было, и из-за него ни один из 129 тестовых
 * файлов apps/api не проходил проверку типов. Дыра закрыта: тесты проверяет
 * `apps/api/tsconfig.tests.json` (`npm run typecheck:tests -w @dental/api`), и этот
 * файл вместе с импортированным модулем apps/web входит в её программу. Опираться
 * на отсутствие проверки при выборе места для теста больше нельзя.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { clinicModeSchema } from "@dental/shared";

import { DEFAULT_CLINIC_MODE, organizations } from "../db/schema.js";
/*
 * Таблица «режим → набор возможностей». Единственный модуль, отвечающий на вопрос
 * «что видно при этом режиме», и он же — потребитель словаря на стороне веба.
 */
import { clinicCapabilities, clinicModes } from "../../../web/src/lib/clinicCapabilities.js";

const MIGRATION_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "drizzle", "0140_clinic_mode_one_vocabulary.sql");

/** Словарь-эталон. Всё остальное в программе обязано лежать внутри него. */
const VOCABULARY: readonly string[] = clinicModeSchema.options;

test("умолчание колонки clinic_mode лежит внутри перечисления режимов", () => {
	/*
	 * Проверяется не константа, а МЕТАДАННЫЕ КОЛОНКИ drizzle — то самое значение,
	 * которое уедет в CREATE TABLE и которым база заполнит поле новой организации.
	 * Сверка с константой доказывала бы только то, что константа равна себе; здесь
	 * же ломается ровно тот случай, который был: `.default("demo")` мимо словаря.
	 */
	const columnDefault = organizations.clinicMode.default;

	assert.equal(
		typeof columnDefault,
		"string",
		"у колонки clinic_mode пропало значение по умолчанию — организация родится с пустым режимом",
	);
	assert.ok(
		VOCABULARY.includes(columnDefault as string),
		`умолчание колонки «${String(columnDefault)}» вне словаря режимов [${VOCABULARY.join(", ")}] — ` +
			"каждая новая клиника рождается вне контракта, ровно как со значением 'demo'",
	);
	assert.equal(columnDefault, DEFAULT_CLINIC_MODE, "умолчание колонки разошлось с DEFAULT_CLINIC_MODE");

	/* Разбор проходит без подмены: `.parse`, а не `.catch(...).parse`. */
	assert.equal(clinicModeSchema.parse(columnDefault), DEFAULT_CLINIC_MODE);
});

/*
 * ЗДЕСЬ СТОЯЛА ПРОВЕРКА ВЫВОДА РЕЖИМА ИЗ ОТВЕТОВ МАСТЕРА ПЕРВОГО ЗАПУСКА, и она
 * снята вместе со своей целью. Функция clinicModeFromOnboarding жила в
 * routes/workspaceProfile.ts ради единственного вызова — маршрута
 * POST /api/workspace/onboarding/complete, у которого не осталось ни одного
 * писателя после удаления недостижимого семишагового мастера. Маршрут удалён,
 * разбор стоит на его месте; держать протестированную функцию без вызова значило
 * бы охранять фасад.
 *
 * Инвариант при этом НЕ ослаблен, он переехал ближе к живому коду: у колонок
 * clinic_mode и clinic_schedule должно быть по одному писателю, и словарь
 * проверяется у него. Держит это tests/clinicScheduleSingleWriter.test.ts.
 * Два оставшихся здесь утверждения — умолчание колонки внутри словаря и запрет
 * миграции 0140 на всё вне словаря — закрывают базу, а не писателя, и остаются.
 */

test("миграция 0140 запрещает базе хранить что-либо вне словаря", () => {
	/*
	 * ЗАЧЕМ ЧИТАТЬ SQL ТЕКСТОМ. Молчаливая подмена при чтении
	 * (`clinicModeSchema.catch("one_chair")`) — единственное, что прятало дефект всю
	 * кампанию, и подмена никуда не денется, пока колонка остаётся свободным text.
	 * Ограничение в базе делает эту ветку НЕДОСТИЖИМОЙ: значение вне словаря падает
	 * в момент записи и с именем виноватого. Проверять надо, что список в
	 * ограничении СОВПАДАЕТ со словарём, иначе появится четвёртый словарь — уже в
	 * SQL, где ни один тип его не поймает.
	 */
	const sql = readFileSync(MIGRATION_PATH, "utf8");

	const check = /CHECK\s*\(\s*"clinic_mode"\s+IN\s*\(([^)]*)\)/i.exec(sql);
	assert.ok(check, "в миграции 0140 нет ограничения CHECK на clinic_mode — колонка остаётся свободным text");

	/* Список внутри IN(...) — группа 1; без проверки она имеет тип string | undefined. */
	const constrainedList = check[1];
	assert.ok(constrainedList, "в ограничении CHECK на clinic_mode пустой список значений");

	const constrained = [...constrainedList.matchAll(/'([^']+)'/g)].map((match) => {
		const value = match[1];
		assert.ok(value, "в списке значений ограничения CHECK нашлась пустая кавычка");
		return value;
	});
	assert.deepEqual(
		[...constrained].sort(),
		[...VOCABULARY].sort(),
		"список значений в ограничении базы разошёлся со словарём clinicModeSchema",
	);

	const migratedDefault = /ALTER\s+COLUMN\s+"clinic_mode"\s+SET\s+DEFAULT\s+'([^']+)'/i.exec(sql);
	assert.ok(migratedDefault, "миграция 0140 не переставляет умолчание колонки — оно осталось 'demo'");
	assert.equal(migratedDefault[1], DEFAULT_CLINIC_MODE, "умолчание в миграции разошлось с DEFAULT_CLINIC_MODE");
	assert.ok(VOCABULARY.includes(migratedDefault[1]), "умолчание в миграции вне словаря");

	/*
	 * Правило переноса существующих строк обязано присваивать только значения из
	 * словаря. Разбирается CASE, а не весь файл: в пояснении сверху словари-предки
	 * ('demo', 'single', 'network') упомянуты намеренно, и запрет на них в тексте
	 * комментария сделал бы тест неверным.
	 */
	const updateCase = /SET\s+clinic_mode\s*=\s*CASE([\s\S]*?)END/i.exec(sql);
	assert.ok(updateCase, "в миграции 0140 нет правила переноса существующих строк");

	/* Тело CASE — группа 1; проверяется отдельно, иначе тип остаётся string | undefined. */
	const caseBody = updateCase[1];
	assert.ok(caseBody, "правило переноса существующих строк в миграции 0140 пустое");

	for (const [, assigned] of caseBody.matchAll(/THEN\s+'([^']+)'/g)) {
		assert.ok(assigned, "в ветке THEN правила переноса не разобралось присваиваемое значение");
		assert.ok(VOCABULARY.includes(assigned), `правило переноса присваивает «${assigned}» вне словаря`);
	}
	for (const [, assigned] of caseBody.matchAll(/ELSE\s+'([^']+)'/g)) {
		assert.ok(assigned, "в ветке ELSE правила переноса не разобралось присваиваемое значение");
		assert.ok(VOCABULARY.includes(assigned), `ветка ELSE правила переноса присваивает «${assigned}» вне словаря`);
	}
});

test("состав разделов сужается от сети к отдельному врачу, а не наоборот", () => {
	const solo = clinicCapabilities("solo_doctor");
	const network = clinicCapabilities("network_clinic");

	/*
	 * ОБА СПИСКА ПЕЧАТАЮТСЯ — они и есть доказательство того, что режим наконец
	 * что-то значит. До правки любая организация читалась как один и тот же режим,
	 * поэтому разница между этими списками не наступала ни у кого.
	 */
	console.log("    Отдельный врач видит  :", solo.join(", "));
	console.log("    Сеть клиник видит     :", network.join(", "));
	console.log("    Скрыто у одного врача :", network.filter((capability) => !solo.includes(capability)).join(", "));

	const networkSet = new Set(network);
	for (const capability of solo) {
		assert.ok(networkSet.has(capability), `у отдельного врача есть «${capability}», которого нет у сети — режимы не упорядочены`);
	}
	assert.ok(solo.length < network.length, "отдельный врач видит столько же разделов, сколько сеть — режим ничего не скрывает");

	/* Каждый режим обязан быть описан: неизвестный режим не должен появиться. */
	for (const mode of clinicModes) {
		assert.ok(VOCABULARY.includes(mode), `в таблице возможностей режим «${mode}» вне словаря`);
		assert.ok(clinicCapabilities(mode).length > 0, `режим «${mode}» не показывает ни одного раздела`);
	}

	/*
	 * Умолчание колонки — не самый узкий режим, и это условие продуктовое, а не
	 * стилистическое: его получает клиника, про которую ещё ничего не известно
	 * (мастер не пройден, миграция не смогла отличить кабинет от клиники). Отнять
	 * разделы по ОТСУТСТВИЮ данных значит заставить человека искать пропавшее меню.
	 */
	assert.ok(
		clinicCapabilities(DEFAULT_CLINIC_MODE).length > solo.length,
		`умолчание «${DEFAULT_CLINIC_MODE}» скрывает не меньше, чем самый узкий режим — новая клиника лишится разделов молча`,
	);
});
