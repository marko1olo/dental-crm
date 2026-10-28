import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createQuickCarpuleWriteoffDocument,
	createQuickVisitWriteoffDocument,
} from "../writeoff/clinicalWriteoffQuickDocuments.js";
import { validateWriteoffDocument } from "../writeoff/clinicalWriteoffEngine.js";
import {
	generateAct0504230Html,
	generateTorg16Html,
} from "../writeoff/clinicalWriteoffPrintForms.js";

describe("Single-Signatory Quick Carpule & Visit Writeoff", () => {
	it("createQuickCarpuleWriteoffDocument создает валидный акт экспресс-списания карпул", () => {
		const doc = createQuickCarpuleWriteoffDocument({
			cabinetId: "cab-01",
			nurseFullName: "Смирнова А.В.",
			nurseRole: "Старшая медицинская сестра",
			count: 3,
			materialId: "mat_articaine_ultracain",
		});
		assert.ok(doc.isQuickCarpuleWriteoff === true);
		assert.equal(doc.lines.length, 1);
		assert.equal(doc.lines[0]?.actualQuantity, 3);
		assert.equal(doc.writtenOffByRole, "Старшая медицинская сестра");
		assert.ok(doc.actNumber.startsWith("КАРП-"));

		const validation = validateWriteoffDocument(doc);
		assert.ok(validation.isValid, `Валидация: ${validation.errors.join(", ")}`);
		assert.equal(validation.errors.length, 0);
	});

	it("generateAct0504230Html формирует единоличную подпись медсестры без комиссии", () => {
		const doc = createQuickCarpuleWriteoffDocument({
			cabinetId: "cab-01",
			nurseFullName: "Смирнова А.В.",
			nurseRole: "Старшая медицинская сестра",
			count: 2,
		});
		const html = generateAct0504230Html(doc);
		assert.ok(html.includes("СПИСАНИЕ ПРОИЗВЕЛ (ЕДИНОЛИЧНО)"));
		assert.ok(html.includes("Смирнова А.В."));
		assert.ok(!html.includes("ПРЕДСЕДАТЕЛЬ КОМИССИИ"));
		assert.ok(html.includes("упрощенном порядке (без созыва комиссии)"));
	});

	it("generateTorg16Html формирует единоличное списание старшей медсестрой без комиссии", () => {
		const doc = createQuickCarpuleWriteoffDocument({
			cabinetId: "cab-01",
			nurseFullName: "Смирнова А.В.",
			count: 5,
		});
		const html = generateTorg16Html(doc);
		assert.ok(html.includes("Списание произведено единолично"));
		assert.ok(!html.includes("Член комиссии:"));
	});

	it("createQuickVisitWriteoffDocument (Терапия) формирует комплект без комиссии", () => {
		const doc = createQuickVisitWriteoffDocument({
			visitType: "therapy",
			doctorFullName: "Кузнецов М.С.",
		});
		assert.ok(doc.actNumber.startsWith("ВИЗИТ-"));
		assert.equal(doc.lines.length, 6);
		assert.ok(doc.isSingleSigner);

		const names = doc.lines.map((l) => l.nameRu.toLowerCase());
		assert.ok(names.some((n) => n.includes("артикаин") || n.includes("анестетик")));
		assert.ok(names.some((n) => n.includes("игла")));
		assert.ok(names.some((n) => n.includes("перчатки")));
		assert.ok(names.some((n) => n.includes("слюноотсос")));
		assert.ok(names.some((n) => n.includes("валик")));
		assert.ok(names.some((n) => n.includes("нагрудник") || n.includes("салфетка")));

		const html0504230 = generateAct0504230Html(doc);
		assert.ok(html0504230.includes("СПИСАНИЕ ПРОИЗВЕЛ (ЕДИНОЛИЧНО)"));
		assert.ok(!html0504230.includes("ПРЕДСЕДАТЕЛЬ КОМИССИИ"));
	});

	it("createQuickVisitWriteoffDocument (Хирургия) формирует комплект", () => {
		const doc = createQuickVisitWriteoffDocument({
			visitType: "surgery",
			doctorFullName: "Петров И.В.",
		});
		assert.ok(doc.actNumber.startsWith("ВИЗИТ-"));
		assert.equal(doc.lines.length, 5);

		const names = doc.lines.map((l) => l.nameRu.toLowerCase());
		assert.ok(names.some((n) => n.includes("артикаин") || n.includes("анестетик")));
		assert.ok(names.some((n) => n.includes("игла")));
		assert.ok(names.some((n) => n.includes("скальпел") || n.includes("лезвие")));
		assert.ok(names.some((n) => n.includes("шовн")));
		assert.ok(names.some((n) => n.includes("губка") || n.includes("альвостаз")));

		const validation = validateWriteoffDocument(doc);
		assert.ok(validation.isValid, `Валидация: ${validation.errors.join(", ")}`);
	});
});
