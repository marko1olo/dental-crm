import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	forgetVisitFlowResultOwner,
	rememberVisitFlowResultOwner,
	visitFlowOwnerKey,
	visitFlowResultIsForeign,
} from "./visitFlowResultOwner";

/**
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. Панель «Ассистент обработки приема» показывала разбор
 * ПРЕДЫДУЩЕГО пациента: `visitFlowResult` лежит в общем хранилище визита и не
 * обнуляется ничем — ни сменой пациента, ни сменой приёма, ни сохранением
 * записи. Врач начинал приём пациента Б и видел под шапкой ЭМК диагноз «для
 * пациента», рекомендации после процедуры и предложенные документы пациента А.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/components/visit/visitFlowResultOwner.test.ts
 */

describe("привязка разбора приёма к пациенту", () => {
	beforeEach(() => {
		forgetVisitFlowResultOwner();
	});

	it("ключ владельца различает и пациента, и приём", () => {
		assert.notEqual(
			visitFlowOwnerKey("пациент-А", "приём-1"),
			visitFlowOwnerKey("пациент-Б", "приём-1"),
		);
		// Второй приём того же человека — другой разбор.
		assert.notEqual(
			visitFlowOwnerKey("пациент-А", "приём-1"),
			visitFlowOwnerKey("пациент-А", "приём-2"),
		);
		assert.equal(
			visitFlowOwnerKey("пациент-А", "приём-1"),
			visitFlowOwnerKey("  пациент-А  ", " приём-1 "),
		);
		// Ни пациента, ни приёма — ключ всё равно устойчивый, а не «undefined».
		assert.equal(visitFlowOwnerKey(null, undefined), "нет-пациента|нет-приёма");
	});

	it("разбор чужого приёма распознаётся как чужой", () => {
		const result = { draft: { status: "success" }, overallStatus: "success" };
		const patientA = visitFlowOwnerKey("пациент-А", "приём-1");
		const patientB = visitFlowOwnerKey("пациент-Б", "приём-2");

		rememberVisitFlowResultOwner(result, patientA);

		assert.equal(visitFlowResultIsForeign(result, patientA), false);
		assert.equal(visitFlowResultIsForeign(result, patientB), true);
	});

	it("повторный показ у другого пациента не переписывает владельца", () => {
		// Именно здесь ломалась бы защита: панель рисуется на каждый рендер, и
		// если «запомнить владельца» вызвать у пациента Б, чужой разбор станет
		// «своим» и останется на экране навсегда.
		const result = { overallStatus: "partial" };
		const patientA = visitFlowOwnerKey("пациент-А", "приём-1");
		const patientB = visitFlowOwnerKey("пациент-Б", "приём-2");

		rememberVisitFlowResultOwner(result, patientA);
		rememberVisitFlowResultOwner(result, patientB);
		rememberVisitFlowResultOwner(result, patientB);

		assert.equal(visitFlowResultIsForeign(result, patientB), true);
		assert.equal(visitFlowResultIsForeign(result, patientA), false);
	});

	it("свежий разбор текущего приёма чужим не считается и не скрывается", () => {
		const oldResult = { overallStatus: "success" };
		const freshResult = { overallStatus: "success" };
		const patientA = visitFlowOwnerKey("пациент-А", "приём-1");
		const patientB = visitFlowOwnerKey("пациент-Б", "приём-2");

		rememberVisitFlowResultOwner(oldResult, patientA);
		// Пациент Б собрал свой черновик — это новый объект ответа сервера.
		assert.equal(visitFlowResultIsForeign(freshResult, patientB), false);
		rememberVisitFlowResultOwner(freshResult, patientB);
		assert.equal(visitFlowResultIsForeign(freshResult, patientB), false);
		assert.equal(visitFlowResultIsForeign(freshResult, patientA), true);
	});

	it("пустой разбор и мусор вместо разбора чужими не считаются", () => {
		const patientA = visitFlowOwnerKey("пациент-А", "приём-1");
		assert.equal(visitFlowResultIsForeign(null, patientA), false);
		assert.equal(visitFlowResultIsForeign(undefined, patientA), false);
		assert.equal(visitFlowResultIsForeign("разбор", patientA), false);

		// Обнуление разбора снимает и привязку: иначе следующий ответ сервера
		// сравнивался бы с уже выброшенным объектом.
		const result = { overallStatus: "error" };
		rememberVisitFlowResultOwner(result, patientA);
		rememberVisitFlowResultOwner(null, patientA);
		assert.equal(visitFlowResultIsForeign(result, "пациент-Б|приём-2"), false);
	});
});
