import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Страж экрана «Смена» и карточки пациента.
 *
 * ЗАЧЕМ ОН НУЖЕН. «Смена» — экран, который клиника открывает первым каждое утро,
 * и его собственный подзаголовок обещает «что делать сейчас». В нём подряд
 * нашлись и починены вручную десять мест, где на экран попадал не текст для
 * человека, а внутренний ключ или сокращение из накладной: статус приёма
 * латиницей, роль сотрудника как `admin`, счётчик «дел: 3», «3 шт.», выдуманный
 * номер карты «1042». Ручная правка без стража живёт до первой невнимательной
 * замены — этот файл и есть та цена, которую платят один раз.
 *
 * Одиннадцатым нашёлся дефект другого рода: оформление среднего уровня риска
 * выбиралось сравнением `riskLevel === "medium"`, а такого значения в контракте
 * нет вовсе. Ветка не выполнялась ни разу, средний уровень рисовался как
 * спокойный, и экран выглядел готовым, скрывая ровно тот случай, ради которого
 * его и открывают. Поэтому здесь же сверяются перечисление контракта и
 * сравнения в разметке: расхождение перечислений глазами не видно, а
 * компилятору его должно быть видно всегда.
 *
 * Проверки текстовые: полноценного рендера в проекте нет, а `ShiftView.tsx`
 * через `AppHelpers` тянет за собой таблицы стилей и в node не загружается.
 */

const webSource = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webSource, "../../..");

const SHIFT_VIEW = "ShiftView.tsx";
const HELPERS = "AppHelpers.tsx";
const SHARED_CONTRACT = path.join(repoRoot, "packages/shared/src/index.ts");

function readWeb(relativePath: string): string {
	return readFileSync(path.join(webSource, relativePath), "utf8");
}

/**
 * Убрать комментарии перед поиском.
 *
 * БЕЗ ЭТОГО СТРАЖ НАКАЗЫВАЛ БЫ ЗА ОБЪЯСНЕНИЕ ПРАВКИ. В `ShiftView.tsx` рядом с
 * каждым исправленным местом стоит комментарий, который называет прежний текст:
 * «Было «3 шт. по визиту»», «подставлялся номер карты «1042»». Проверено: обе
 * строки есть в файле и обе — только в комментариях. Сторож, краснеющий на
 * верном коде, учит себя выключать, а здесь он ещё и требовал бы стереть
 * единственную часть файла, которая рассказывает, почему литерала быть не должно.
 *
 * `//` вырезается только когда перед ним НЕ двоеточие: иначе `https://…`
 * съедал бы остаток строки вместе с настоящим нарушением. Правило и его причина
 * взяты из operationsPanelsStyling.test.ts — второго разбора комментариев в
 * проекте заводить не стали, но и общий модуль ради четырёх строк не нужен.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/*
 * САМОПРОВЕРКА ВЫРЕЗАНИЯ. Без неё «нарушений не найдено» означало бы что угодно,
 * включая «вырезание съело весь файл».
 */
test("вырезание комментариев не мешает ловить настоящее нарушение", () => {
	const inBlockComment = stripComments('{/* было «3 шт.» */}\n<p>{countLabel(n, "документ", "документа", "документов")}</p>');
	assert.ok(!inBlockComment.includes("шт."), "сокращение из комментария принято за нарушение");

	const inCode = stripComments('{/* пояснение про 1042 */}\n<p>карта № 1042</p>');
	assert.ok(inCode.includes("1042"), "нарушение в коде потерялось после вырезания");

	const afterUrl = stripComments('const doc = "https://example.ru/x"; const bad = "шт.";');
	assert.ok(afterUrl.includes("шт."), "адрес со слэшами спрятал нарушение за собой");

	const lineComment = stripComments("const a = 1; // тут было шт.\nconst b = 'шт.';");
	assert.equal(lineComment.split("шт.").length - 1, 1, "строчный комментарий обработан неверно");
});

/**
 * Возвраты к внутренним ключам и сокращениям.
 *
 * Каждая строка — конкретное место, которое уже показывали администратору. Ключ
 * приёма и роли попадал на экран через `?? app.status` и `?? queue.role`: там,
 * где не нашлось подписи, на экран отдавали сам ключ, то есть латиницу вместо
 * русского слова. Поэтому запрещено именно такое запасное значение, а не
 * обращение к полю.
 */
const FORBIDDEN_IN_SHIFT_VIEW: ReadonlyArray<readonly [string, string]> = [
	["?? app.status", "ключ статуса приёма нельзя показывать вместо подписи — нужен словарь"],
	["?? action.priority", "ключ приоритета нельзя показывать вместо подписи — нужен словарь"],
	["?? queue.role", "ключ роли нельзя показывать вместо подписи — нужен словарь"],
	["дел: ${", "счётчик без согласованного счётного слова: «дел: 1» читается неверно"],
	["шт.", "сокращение из накладной: у документов и снимков есть свои счётные слова"],
	["1042", "выдуманный номер карты: администратор пойдёт искать по нему бумажную карту"]
];

test("на «Смене» нет внутренних ключей и сокращений вместо текста для человека", () => {
	const source = stripComments(readWeb(SHIFT_VIEW));
	for (const [needle, why] of FORBIDDEN_IN_SHIFT_VIEW) {
		assert.ok(!source.includes(needle), `${SHIFT_VIEW}: найдено «${needle}» — ${why}`);
	}
});

/** Значения перечисления риска берутся из контракта, а не переписываются здесь. */
function contractRiskLevels(): string[] {
	const contract = readFileSync(SHARED_CONTRACT, "utf8");
	const declaration = /patientInsightRiskSchema\s*=\s*z\.enum\(\[([^\]]*)\]\)/.exec(contract);
	assert.ok(declaration, "в контракте не нашлось patientInsightRiskSchema — проверка потеряла опору");
	const levels = [...declaration[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
	assert.ok(levels.length >= 2, "перечисление риска разобрано пустым");
	return levels;
}

test("сравнения уровня риска ссылаются только на значения контракта", () => {
	// Здесь и жил дефект: сравнение с «medium» при перечислении low | watch | high.
	const levels = contractRiskLevels();
	const source = stripComments(readWeb(SHIFT_VIEW));
	const compared = [...source.matchAll(/riskLevel\s*===\s*"([^"]+)"/g)].map((match) => match[1]);
	assert.ok(compared.length > 0, `${SHIFT_VIEW}: сравнений уровня риска не найдено — проверка ослепла`);
	for (const value of compared) {
		assert.ok(
			levels.includes(value),
			`${SHIFT_VIEW}: сравнение с «${value}», которого нет в контракте (${levels.join(" | ")}) — ветка мертва`
		);
	}
});

test("средний уровень риска отличается от спокойного на вид", () => {
	// Недостаточно, чтобы сравнение было корректным: у среднего уровня должно быть
	// собственное оформление, иначе «контроль» снова сольётся со «спокойно».
	const source = stripComments(readWeb(SHIFT_VIEW));
	assert.ok(
		source.includes('riskLevel === "watch"'),
		`${SHIFT_VIEW}: у среднего уровня риска нет своей ветки оформления`
	);
	assert.ok(
		source.includes("var(--warn-bg)") && source.includes("var(--warn-fg)"),
		`${SHIFT_VIEW}: средний уровень риска не берёт предупреждающие цвета темы`
	);
});

test("у каждого уровня риска есть русская подпись", () => {
	const levels = contractRiskLevels();
	const helpers = readWeb(HELPERS);
	const block = /patientInsightRiskLabels[^=]*=\s*\{([\s\S]*?)\n\};/.exec(helpers);
	assert.ok(block, `${HELPERS}: не нашёлся словарь patientInsightRiskLabels`);
	for (const level of levels) {
		assert.ok(
			new RegExp(`\\b${level}\\s*:`).test(block[1]),
			`${HELPERS}: у уровня «${level}» нет подписи — на экран попадёт пустота или ключ`
		);
	}
});

test("пропсы карточки пациента типизированы, а не any", () => {
	// Именно `any` позволил мёртвому сравнению дожить до сдачи: компилятор не
	// видел, что у riskLevel нет варианта «medium».
	const source = readWeb(SHIFT_VIEW);
	const signature = /export function PatientCockpit\(\{[\s\S]*?\}:\s*([A-Za-z][\w<>[\]"|\s.]*)\)/.exec(source);
	assert.ok(signature, `${SHIFT_VIEW}: не разобрана сигнатура PatientCockpit`);
	assert.ok(
		!/\bany\b/.test(signature[1]),
		`${SHIFT_VIEW}: пропсы PatientCockpit снова any — расхождение с контрактом станет невидимым`
	);
	assert.ok(
		source.includes('Dashboard["patientInsights"][number]'),
		`${SHIFT_VIEW}: тип сводки пациента переписан рядом вместо формы Dashboard — он снова разойдётся с контрактом`
	);
});
