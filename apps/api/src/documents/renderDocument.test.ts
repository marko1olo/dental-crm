import assert from "node:assert";
import { describe, test } from "node:test";
import { documentHasUnresolvedPlaceholders } from "./renderDocument.js";

describe("documentHasUnresolvedPlaceholders", () => {
	test("returns false for HTML without placeholders", () => {
		const html = "<p>This is a normal document without placeholders.</p>";
		assert.strictEqual(documentHasUnresolvedPlaceholders(html), false);
	});

	/**
	 * Раньше тесты оперировали набором "{ ", " { ", " {_", "_} ", " }" —
	 * обрубками, которые не совпадают ни с одним признаком детектора. Он ищет
	 * маркеры [[{ и }]] плюс список русских заготовок (unresolvedPlaceholderPatterns:
	 * «заполнить», «________», «указать врачом», «указать по», «не указана»,
	 * «не указан»). Ни один обрубок туда не входит, поэтому два теста требовали
	 * срабатывания на строках, которые незаполненными местами не являются.
	 */
	test("returns true for various unresolved placeholders", () => {
		const placeholders = [
			"[[{patientFullName}]]",
			"[[{",
			"}]]",
			"заполнить",
			"________",
			"указать врачом",
			"указать по",
			"не указана",
			"не указан",
		];

		for (const text of placeholders) {
			const html = `<p>${text}</p>`;
			assert.strictEqual(
				documentHasUnresolvedPlaceholders(html),
				true,
				`Expected to return true for text containing: ${text}`,
			);
		}
	});

	test("поиск заготовок не зависит от регистра", () => {
		// Текст приводится к нижнему регистру по правилам ru-RU.
		assert.strictEqual(documentHasUnresolvedPlaceholders("<p>НЕ УКАЗАН</p>"), true);
	});

	test("ignores placeholders inside signatures block", () => {
		// Прочерк для подписи — это не незаполненное место: блок подписей
		// вырезается перед поиском русских заготовок.
		const html = `
      <p>Main document text.</p>
      <div class="signatures">
        Подпись врача: ________
      </div>
    `;
		assert.strictEqual(documentHasUnresolvedPlaceholders(html), false);
	});

	test("detects placeholders if present both inside and outside signatures block", () => {
		const html = `
      <p>Диагноз: не указан</p>
      <div class="signatures">
        Подпись врача: ________
      </div>
    `;
		assert.strictEqual(documentHasUnresolvedPlaceholders(html), true);
	});

	test("маркер [[{ находится даже внутри блока подписей", () => {
		// Скобочный маркер проверяется до вырезания блока подписей: шаблонная
		// вставка не должна попасть в документ ни в каком месте.
		const html = `
      <p>Main document text.</p>
      <div class="signatures">
        Подпись врача: [[{doctorFullName}]]
      </div>
    `;
		assert.strictEqual(documentHasUnresolvedPlaceholders(html), true);
	});
});
