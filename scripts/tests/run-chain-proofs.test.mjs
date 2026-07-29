/**
 * САМОПРОВЕРКА ОПОЗНАВАТЕЛЯ НАРУШЕНИЙ В ПРОГОНЕ СКВОЗНЫХ СЦЕНАРИЕВ.
 *
 * ЗАЧЕМ. `scripts/run-chain-proofs.mjs` решает, сошёлся сценарий или заявил
 * нарушение, по тексту его вывода — потому что коду возврата верить нельзя:
 * разведочные сценарии печатают найденные нарушения и выходят с нулём. Именно
 * так и нашлась межклиничная утечка: `crossTenantReconProof` печатал
 * «НАРУШЕНИЙ: 4» и получал «сошлось».
 *
 * ЧТО СЛУЧИЛОСЬ БЕЗ ЭТОЙ ПРОВЕРКИ. В шаблоне стояло `(?!0\b)`, но в файле на
 * месте `\b` лежал НАСТОЯЩИЙ байт 0x08 (backspace). Просмотр `(?!0<BS>)` не
 * срабатывает никогда, поэтому «НАРУШЕНИЙ: 0» — заявление о том, что всё чисто —
 * читалось как заявленное нарушение, и сценарий попадал в «разошлось» при нуле
 * расхождений. Символ невидим во всех инструментах чтения: и редактор, и вывод
 * поиска показывают ровно `(?!0)`. Глазами такую опечатку не находят никогда.
 *
 * Ловушка стояла заряженной и молчала лишь потому, что единственный сценарий со
 * счётчиком при нуле писал «НАРУШЕНИЙ НЕ НАЙДЕНО» — без двоеточия и цифры.
 *
 * ПОЧЕМУ ПРОВЕРКИ ДВЕ. Первая проверяет ПОВЕДЕНИЕ: ноль — это чисто, больше нуля
 * — нарушение. Вторая проверяет ФОРМУ исходника: в опознавателе не должно быть
 * управляющих символов вовсе. Первая поймала бы этот дефект, вторая ловит весь
 * его класс — любой невидимый байт, попавший в код при копировании из вывода
 * терминала или из чужого сообщения.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { declaresViolationsIn } from "../run-chain-proofs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const runnerPath = path.join(here, "..", "run-chain-proofs.mjs");

test("ноль нарушений — это чисто, а не нарушение", () => {
	assert.equal(declaresViolationsIn("НАРУШЕНИЙ: 0"), false, "«НАРУШЕНИЙ: 0» прочитано как нарушение");
	assert.equal(declaresViolationsIn("итог\nНАРУШЕНИЙ: 0\nконец"), false, "то же в середине вывода");
	assert.equal(declaresViolationsIn("НАРУШЕНИЙ:0"), false, "то же без пробела");
	assert.equal(declaresViolationsIn("НАРУШЕНИЙ НЕ НАЙДЕНО"), false, "словесная форма без цифры");
	assert.equal(declaresViolationsIn("ВСЕ СВЕРКИ СОШЛИСЬ"), false, "обычный успешный итог");
});

test("нарушение больше нуля опознаётся при любом числе разрядов", () => {
	assert.equal(declaresViolationsIn("НАРУШЕНИЙ: 1"), true);
	assert.equal(declaresViolationsIn("НАРУШЕНИЙ: 4"), true, "именно так была найдена межклиничная утечка");
	assert.equal(declaresViolationsIn("НАРУШЕНИЙ: 12"), true, "двузначное: шаблон не должен смотреть только на первую цифру");
	assert.equal(declaresViolationsIn("НАРУШЕНИЙ: 100"), true);
	assert.equal(declaresViolationsIn("НАРУШЕНИЙ:   7"), true, "пробелы после двоеточия");
});

test("ноль в одном месте не заглушает нарушение в другом", () => {
	assert.equal(
		declaresViolationsIn("ПУНКТ 1: НАРУШЕНИЙ: 0\nПУНКТ 2: НАРУШЕНИЙ: 3"),
		true,
		"первый ноль погасил найденное нарушение: опознаватель смотрит только на первое совпадение",
	);
	assert.equal(
		declaresViolationsIn("ПУНКТ 1: НАРУШЕНИЙ: 2\nИТОГ: НАРУШЕНИЙ: 0"),
		true,
		"нулевой ИТОГ погасил нарушение из середины прогона",
	);
});

test("маркер утечки — нарушение сам по себе, без счётчика", () => {
	assert.equal(declaresViolationsIn("[УТЕЧКА] чужой пациент в расписании"), true);
	assert.equal(declaresViolationsIn("НАРУШЕНИЙ: 0\n[УТЕЧКА] и всё же утечка"), true, "счётчик ноль не отменяет маркер");
	assert.equal(declaresViolationsIn("слово утечка в прозе, без скобок"), false, "прозаическое упоминание не маркер");
});

test("прозаические расхождения прогон не валят", () => {
	// `chainWeldProof` печатает «РАСХОЖДЕНИЕ ФОРМУЛ ДОЛГА» и ТУТ ЖЕ его сводит.
	// Страж, кричащий на верном коде, будет выключен: в этом дереве так уже
	// случилось трижды.
	assert.equal(
		declaresViolationsIn("РАСХОЖДЕНИЕ ФОРМУЛ ДОЛГА: 53000 − 3100.5 = 49899.5, долг главного экрана = 49899.5"),
		false,
	);
	assert.equal(declaresViolationsIn("РАЗРЫВ ШВА «счёт → сумма счёта»"), false, "разрыв шва — это карта, а не гейт");
});

test("в опознавателе нарушений нет невидимых управляющих символов", () => {
	const source = readFileSync(runnerPath, "utf8");
	const lines = source.split(/\r?\n/);
	const offenders = [];

	for (const [index, line] of lines.entries()) {
		for (const [column, character] of [...line].entries()) {
			const code = character.codePointAt(0);
			// Табуляция допустима как отступ; всё остальное ниже пробела — нет.
			if (code < 0x20 && character !== "\t") {
				offenders.push(`строка ${index + 1}, позиция ${column + 1}: U+${code.toString(16).padStart(4, "0")}`);
			}
			// U+00A0 и U+200B тоже невидимы и тоже ломают шаблоны и отступы.
			if (code === 0x00a0 || code === 0x200b || code === 0xfeff) {
				offenders.push(`строка ${index + 1}, позиция ${column + 1}: U+${code.toString(16).padStart(4, "0")}`);
			}
		}
	}

	assert.deepEqual(
		offenders,
		[],
		`в исходнике прогона есть невидимые символы — именно так «НАРУШЕНИЙ: 0» читалось как нарушение:\n${offenders.join("\n")}`,
	);
});
