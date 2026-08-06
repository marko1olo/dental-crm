import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Денежные и импортные поля обязаны начинаться пустыми.
 *
 * В начальном состоянии хранилищ лежали демонстрационные данные, и они
 * подставлялись пользователю как уже введённые:
 *  - сумма оплаты «3800» — касса открывалась с готовой суммой при нулевом
 *    остатке по пациенту;
 *  - сумма возврата «3800» — форма возврата с готовым возвратом;
 *  - выгрузка пациентов и прайс из десяти позиций с ценами до 160 000 ₽ — в
 *    полях импорта, откуда одно нажатие заносит их в базу настоящей клиники.
 *
 * Отличить подставленное от своего невозможно: поле выглядит заполненным
 * человеком. Пример должен быть подсказкой в пустом поле, а не текстом.
 *
 * Проверка читает исходники хранилищ: значение по умолчанию задаётся там, и
 * поймать его надёжнее статически, чем поднимая браузер.
 */
const here = dirname(fileURLToPath(import.meta.url));
const webSrc = join(here, "..");

const read = (relativePath: string) =>
	readFileSync(join(webSrc, relativePath), "utf8");

/** Начальное значение поля в объекте хранилища. */
function initialValueOf(source: string, field: string): string | null {
	const match = new RegExp(
		`^\\s{2}${field}\\s*:\\s*(".*?"|'.*?'|[^,\\n]+),`,
		"m",
	).exec(source);
	if (!match) return null;
	return match[1]!.trim();
}

describe("денежные и импортные поля начинаются пустыми", () => {
	const documentStore = read("store/documentStore.ts");
	const appStore = read("store/appStore.ts");

	it("сумма оплаты не подставлена", () => {
		assert.equal(initialValueOf(documentStore, "paymentAmount"), '""');
	});

	it("сумма возврата не подставлена", () => {
		assert.equal(initialValueOf(documentStore, "refundAmountRub"), '""');
	});

	it("выгрузка пациентов для импорта не подставлена", () => {
		assert.equal(initialValueOf(appStore, "importText"), '""');
	});

	it("смешанная выгрузка для умного разбора не подставлена", () => {
		assert.equal(initialValueOf(appStore, "smartImportText"), '""');
	});

	it("прайс для импорта не подставлен", () => {
		assert.equal(initialValueOf(appStore, "pricelistText"), '""');
	});

	it("в хранилищах не осталось выдуманных цен и телефонов", () => {
		for (const [name, source] of [
			["documentStore", documentStore],
			["appStore", appStore],
		] as const) {
			assert.ok(
				!/\+7 9\d\d \d\d\d-\d\d-\d\d/.test(source),
				`${name}: остался выдуманный телефон`,
			);
			assert.ok(
				!/\d{2} \d{3} руб/.test(source),
				`${name}: осталась выдуманная цена`,
			);
		}
	});
});
