import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createQuickAnesthesiaPackageWriteoffDocument } from "../writeoff/clinicalWriteoffQuickDocuments.js";
import { validateWriteoffDocument } from "../writeoff/clinicalWriteoffEngine.js";
import { generateAct0504230Html } from "../writeoff/clinicalWriteoffPrintForms.js";

describe("Single-Signatory Quick Anesthesia Package Writeoff", () => {
	it("createQuickAnesthesiaPackageWriteoffDocument формирует стандартный пакет анестезии", () => {
		const doc = createQuickAnesthesiaPackageWriteoffDocument({
			cabinetId: "cab_01_therapy",
			doctorFullName: "Соло-Врач А.С.",
			patientName: "Тестовый Пациент",
		});

		assert.ok(doc.actNumber.startsWith("АНЕСТ-"));
		assert.equal(doc.lines.length, 3);
		assert.ok(doc.isSingleSigner);
		assert.ok(doc.isQuickCarpuleWriteoff);

		const materialIds = doc.lines.map((l) => l.materialId);
		assert.ok(materialIds.includes("mat_articaine_ultracain"));
		assert.ok(materialIds.includes("mat_dental_needle_30g"));
		assert.ok(materialIds.includes("mat_antiseptic_chlorhexidine"));

		const validation = validateWriteoffDocument(doc);
		assert.ok(validation.isValid, `Валидация: ${validation.errors.join(", ")}`);
		assert.equal(validation.errors.length, 0);

		const html0504230 = generateAct0504230Html(doc);
		assert.ok(html0504230.includes("СПИСАНИЕ ПРОИЗВЕЛ (ЕДИНОЛИЧНО)"));
		assert.ok(!html0504230.includes("ПРЕДСЕДАТЕЛЬ КОМИССИИ"));
	});
});
