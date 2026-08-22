import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	synthesizeClinicalDiary,
	synthesizeDiariesFromOdontogram,
	validateForm043uCompliance,
	getClinicalProtocolTemplate,
	deduceBlackClassFromSurfaces,
	isValidFdiToothNumber,
	type ClinicalDiarySynthesisRequest,
	type FdiToothRecord,
	type VisitDiaryEntry043,
	STATUTORY_EMR_PROTOCOL_CATALOG,
	anestheticDrugLabels,
	blackCavityClassLabels,
} from "../emr/index.js";

describe("Shared EMR Form 043/u Statutory Protocol Engine (Order № 834n)", () => {
	it("synthesizes therapy protocol for K02.1", () => {
		const diary = synthesizeClinicalDiary({
			toothNumber: 16,
			icd10Code: "K02.1",
			surfaces: ["occlusal"],
			doctorFullName: "Волкова Е.С.",
		});

		assert.strictEqual(diary.toothNumber, "16");
		assert.strictEqual(diary.assessmentIcd10Code, "K02.1");
		assert.match(diary.procedureProtocol, /коффердам/i);
		assert.match(diary.procedureProtocol, /37%/);
		assert.match(diary.procedureProtocol, /OptiBond/i);
		assert.match(diary.procedureProtocol, /Filtek|Estelite/i);
	});

	it("synthesizes endodontic protocol for K04.0 with apex locator and warm vertical condensation", () => {
		const diary = synthesizeClinicalDiary({
			toothNumber: 36,
			icd10Code: "K04.0",
			rootCanalsCount: 3,
			doctorFullName: "Смирнов А.В.",
		});

		assert.strictEqual(diary.toothNumber, "36");
		assert.strictEqual(diary.assessmentIcd10Code, "K04.0");
		assert.match(diary.procedureProtocol, /апекслокатор/i);
		assert.match(diary.procedureProtocol, /RVG/i);
		assert.match(diary.procedureProtocol, /WaveOne|ProTaper/i);
		assert.match(diary.procedureProtocol, /3% NaOCl/i);
		assert.match(diary.procedureProtocol, /AH Plus/i);
	});

	it("synthesizes surgical extraction protocol for K08.1", () => {
		const diary = synthesizeClinicalDiary({
			toothNumber: 48,
			icd10Code: "K08.1",
			doctorFullName: "Ковалев Д.И.",
		});

		assert.strictEqual(diary.toothNumber, "48");
		assert.strictEqual(diary.assessmentIcd10Code, "K08.1");
		assert.match(diary.procedureProtocol, /синдесмотомия/i);
		assert.match(diary.procedureProtocol, /кюретаж/i);
		assert.match(diary.procedureProtocol, /Альвостим|Spongostan/i);
		assert.match(diary.procedureProtocol, /Викрил 4-0|Vicryl/i);
	});

	it("validates compliance with 100% score for valid diary", () => {
		const validDiary = synthesizeClinicalDiary({
			toothNumber: 16,
			icd10Code: "K02.1",
			doctorFullName: "Волкова Е.С.",
		});

		const report = validateForm043uCompliance(validDiary);
		assert.strictEqual(report.isCompliant, true);
		assert.strictEqual(report.complianceScore, 100);
	});
});
