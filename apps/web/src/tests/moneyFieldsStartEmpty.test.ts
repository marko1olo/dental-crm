import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentFormInitialValues } from "../store/documentStore.js";
import { initialAppState } from "../store/appStoreModules/initialAppState.js";

/**
 * Денежные и импортные поля обязаны начинаться пустыми.
 * Проверяем реальные инициализаторы сторов (без fs.readFileSync/regex).
 */
describe("денежные и импортные поля начинаются пустыми", () => {
	const docsInitial = documentFormInitialValues();

	it("сумма оплаты не подставлена", () => {
		assert.equal(docsInitial.paymentAmount, "");
	});

	it("сумма возврата не подставлена", () => {
		assert.equal(docsInitial.refundAmountRub, "");
	});

	it("выгрузка пациентов для импорта не подставлена", () => {
		assert.equal(initialAppState.importText, "");
	});

	it("смешанная выгрузка для умного разбора не подставлена", () => {
		assert.equal(initialAppState.smartImportText, "");
	});

	it("прайс для импорта не подставлен", () => {
		assert.equal(initialAppState.pricelistText, "");
	});

	it("в начальных состояниях сторов нет выдуманных телефонов и цен", () => {
		const serialized = JSON.stringify({
			docsInitial,
			importText: initialAppState.importText,
			smartImportText: initialAppState.smartImportText,
			pricelistText: initialAppState.pricelistText,
			recognitionText: initialAppState.recognitionText,
			releaseProtectionNote: initialAppState.releaseProtectionNote,
			communicationNote: initialAppState.communicationNote,
		});
		assert.equal(/\+7 9\d\d \d\d\d-\d\d-\d\d/.test(serialized), false);
		assert.equal(/\d{2} \d{3} руб/.test(serialized), false);
	});
});
