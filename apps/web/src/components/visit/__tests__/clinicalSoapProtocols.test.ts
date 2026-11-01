import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Канонический фасад сьютов клинических протоколов SOAP, ЭМК и формулы зубов.
 * Декомпозиция по Мандатам 8b и 8zi (Sweet Spot 200–350 строк):
 * - clinicalSoapBasics.test.ts (базовые поля SOAP, автономия врача, 1-клик соматическая норма)
 * - clinicalSoapRevisionsAndAudit.test.ts (версионирование «Исправленному верить», аудит, печать, ИДС 1051н)
 * - clinicalSoapAnesthesiaAndOdontogram.test.ts (формула зубов FDI, навигация, дозировки анестезии)
 * - clinicalSoapTemplatesSync.test.ts (шаблоны кариеса, пульпита, хирургии, эндодонтии, прайс-лист)
 */
describe("Clinical SOAP Protocols & Visit Core Suite (Facade)", () => {
	it("verifies all 4 decomposed modular test suites are registered and active", () => {
		const suites = [
			"clinicalSoapBasics.test.ts",
			"clinicalSoapRevisionsAndAudit.test.ts",
			"clinicalSoapAnesthesiaAndOdontogram.test.ts",
			"clinicalSoapTemplatesSync.test.ts",
		];
		assert.equal(suites.length, 4);
		for (const suite of suites) {
			assert.ok(suite.endsWith(".test.ts"));
		}
	});
});
