import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { translate804nToPatientDescription } from "../TreatmentPlanRoadmap";

describe("TreatmentPlanRoadmap — Nomenclature Translation to Patient Language", () => {
	it("1. Translates emergency codes to Stage 1 patient-friendly language", () => {
		const result = translate804nToPatientDescription("A16.07.007", "Наложение девитализирующей пасты при острой боли");
		assert.equal(result.stageKind, "stage_1_emergency");
		assert.equal(result.categoryCode, "1");
		assert.ok(result.friendlyTitle.includes("Купирование острой боли"));
	});

	it("2. Translates therapeutic caries and endodontics (A16.07.002, A16.07.030) to Stage 2", () => {
		const cariesRes = translate804nToPatientDescription("A16.07.002.001", "Наложение пломбы светового отверждения");
		assert.equal(cariesRes.stageKind, "stage_2_therapy");
		assert.equal(cariesRes.categoryCode, "1");
		assert.ok(cariesRes.friendlyTitle.includes("Лечение кариеса"));

		const endoRes = translate804nToPatientDescription("A16.07.030.001", "Инструментальная обработка корневого канала");
		assert.equal(endoRes.stageKind, "stage_2_therapy");
		assert.ok(endoRes.friendlyTitle.includes("Лечение корневых каналов"));
	});

	it("3. Translates surgical implantation (A16.07.054) to Stage 3 (Code 02 expensive treatment)", () => {
		const implantRes = translate804nToPatientDescription("A16.07.054.001", "Установка дентального имплантата Osstem TS III");
		assert.equal(implantRes.stageKind, "stage_3_surgery");
		assert.equal(implantRes.categoryCode, "2");
		assert.ok(implantRes.friendlyTitle.includes("премиум дентального имплантата"));
	});

	it("4. Translates prosthetic crowns (A16.07.004) to Stage 4 orthopedics", () => {
		const crownRes = translate804nToPatientDescription("A16.07.004.001", "Коронка из диоксида циркония Katana ML");
		assert.equal(crownRes.stageKind, "stage_4_orthopedics");
		assert.ok(crownRes.friendlyTitle.includes("коронкой"));
	});

	it("5. Translates professional hygiene (A16.07.051) to Stage 5 hygiene & prevention", () => {
		const hygieneRes = translate804nToPatientDescription("A16.07.051", "Комплексная гигиена AirFlow + ультразвук");
		assert.equal(hygieneRes.stageKind, "stage_5_hygiene_checkup");
		assert.equal(hygieneRes.categoryCode, "1");
		assert.ok(hygieneRes.friendlyTitle.includes("Комплексная гигиена"));
	});
});
