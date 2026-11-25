import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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

const readDirRecursive = (dirPath: string): string => {
	const chunks: string[] = [];
	for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
		const fullPath = join(dirPath, entry.name);
		if (entry.isDirectory()) {
			chunks.push(readDirRecursive(fullPath));
		} else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
			chunks.push(readFileSync(fullPath, "utf8"));
		}
	}
	return chunks.join("\n");
};

/** Начальное значение поля в объекте хранилища. */
function initialValueOf(source: string, field: string): string | null {
	const match = new RegExp(
		`^\\s+${field}\\s*:\\s*(".*?"|'.*?'|[^,\\n]+),`,
		"m",
	).exec(source);
	if (!match) return null;
	const val = match[1];
	return val ? val.trim() : null;
}

describe("денежные и импортные поля начинаются пустыми", () => {
	const documentStore = read("store/documentStore.ts") + "\n" + readDirRecursive(join(webSrc, "store/documentStore"));
	const appStore = read("store/appStore.ts") + "\n" + readDirRecursive(join(webSrc, "store/appStoreModules"));
	const appStoreInitial = read("store/appStoreModules/initialAppState.ts");

	it("сумма оплаты не подставлена", () => {
		assert.equal(initialValueOf(documentStore, "paymentAmount"), '""');
	});

	it("сумма возврата не подставлена", () => {
		assert.equal(initialValueOf(documentStore, "refundAmountRub"), '""');
	});

	it("выгрузка пациентов для импорта не подставлена", () => {
		assert.equal(initialValueOf(appStoreInitial, "importText"), '""');
	});

	it("смешанная выгрузка для умного разбора не подставлена", () => {
		assert.equal(initialValueOf(appStoreInitial, "smartImportText"), '""');
	});

	it("прайс для импорта не подставлен", () => {
		assert.equal(initialValueOf(appStoreInitial, "pricelistText"), '""');
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
