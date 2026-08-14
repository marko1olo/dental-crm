import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DiaryState } from "../components/useVisitDiaryLogic";
import {
	formatSurfacesRu,
	generateSoapFromOdontogramFinding,
	getToothAnatomicalNameRu,
	mergeSoapDiaryState,
	normalizeFdiToothList,
} from "./clinicalProtocols043";

const EMPTY_DIARY: DiaryState = {
	anamnesis: "",
	statusLocalis: "",
	diagnosisIcd10: "",
	diagnosisTooth: "",
	treatmentDescription: "",
	complications: "",
	comorbidities: "",
};

describe("clinicalProtocols043 — FDI tooth naming and formatting", () => {
	it("correctly generates Russian anatomical name for permanent teeth", () => {
		assert.equal(
			getToothAnatomicalNameRu(16),
			"16 (верхний правый первый моляр)",
		);
		assert.equal(
			getToothAnatomicalNameRu(21),
			"21 (верхний левый центральный резец)",
		);
		assert.equal(getToothAnatomicalNameRu(33), "33 (нижний левый клык)");
		assert.equal(
			getToothAnatomicalNameRu(48),
			"48 (нижний правый третий моляр (зуб мудрости))",
		);
	});

	it("correctly generates Russian anatomical name for primary (milk) teeth", () => {
		assert.equal(
			getToothAnatomicalNameRu(54),
			"54 (верхний правый временный первый моляр)",
		);
		assert.equal(
			getToothAnatomicalNameRu(71),
			"71 (нижний левый временный центральный резец)",
		);
	});

	it("formats surfaces to readable Russian medical terms", () => {
		const str = formatSurfacesRu(["O", "M", "D"]);
		assert.equal(
			str,
			"окклюзионная (жевательная), мезиальная (медиальная), дистальная",
		);
	});

	it("normalizes, deduplicates and sorts FDI tooth list clinically", () => {
		const result = normalizeFdiToothList("36, 16, 26, 16, 46, 11");
		// Q1 (18->11): 16, 11; Q2 (21->28): 26; Q3 (38->31): 36; Q4 (41->48): 46
		assert.equal(result, "16, 11, 26, 36, 46");
	});
});

describe("clinicalProtocols043 — Protocol Generation (generateSoapFromOdontogramFinding)", () => {
	it("generates K02.1 Caries protocol with exact SOAP structure", () => {
		const finding = {
			toothNumber: 36,
			state: "Caries",
			surfaces: ["O", "M"],
		};
		const soap = generateSoapFromOdontogramFinding(finding);
		assert.equal(soap.diagnosisIcd10, "K02.1");
		assert.equal(soap.diagnosisTooth, "36");
		assert.ok(soap.anamnesis.includes("зубе 36"));
		assert.ok(soap.statusLocalis.includes("кариозная полость средней глубины"));
		assert.ok(
			soap.treatmentDescription.includes(
				"Препарирование кариозной полости зуба 36",
			),
		);
	});

	it("generates K04.0 Pulpitis protocol with emergency night pain description", () => {
		const finding = {
			toothNumber: 24,
			state: "Pulpitis",
			surfaces: ["O"],
		};
		const soap = generateSoapFromOdontogramFinding(finding);
		assert.equal(soap.diagnosisIcd10, "K04.0");
		assert.equal(soap.diagnosisTooth, "24");
		assert.ok(soap.anamnesis.includes("ночное время"));
		assert.ok(soap.statusLocalis.includes("Зондирование вскрытой точки"));
		assert.ok(soap.treatmentDescription.includes("Витальная экстирпация"));
	});

	it("generates K04.5 Periodontitis protocol with periapical pathology notes", () => {
		const finding = {
			toothNumber: 11,
			state: "Periodontitis",
		};
		const soap = generateSoapFromOdontogramFinding(finding);
		assert.equal(soap.diagnosisIcd10, "K04.5");
		assert.equal(soap.diagnosisTooth, "11");
		assert.ok(soap.statusLocalis.includes("периапикальный очаг"));
		assert.ok(soap.treatmentDescription.includes("гидроксида кальция"));
	});

	it("generates K05.1 Gingivitis protocol with pocket depth", () => {
		const finding = {
			toothNumber: 41,
			state: "Gingivitis",
			pocketDepthMm: 2,
		};
		const soap = generateSoapFromOdontogramFinding(finding);
		assert.equal(soap.diagnosisIcd10, "K05.1");
		assert.equal(soap.diagnosisTooth, "41");
		assert.ok(soap.statusLocalis.includes("зубного камня"));
		assert.ok(soap.treatmentDescription.includes("Air-Flow"));
	});
});

describe("clinicalProtocols043 — Non-Destructive Merge (mergeSoapDiaryState)", () => {
	it("fills empty diary cleanly without leading separators", () => {
		const finding = generateSoapFromOdontogramFinding({
			toothNumber: 16,
			state: "Caries",
		});
		const merged = mergeSoapDiaryState(EMPTY_DIARY, finding);
		assert.equal(merged.diagnosisTooth, "16");
		assert.equal(merged.diagnosisIcd10, "K02.1");
		assert.equal(merged.anamnesis, finding.anamnesis);
		assert.equal(merged.treatmentDescription, finding.treatmentDescription);
	});

	it("preserves doctor custom text and appends new tooth finding safely", () => {
		const existing: DiaryState = {
			...EMPTY_DIARY,
			anamnesis: "Пациент аллергик на пенициллин. Жалобы с вчерашнего дня.",
			statusLocalis: "Прикус ортогнатический.",
			diagnosisTooth: "16",
			diagnosisIcd10: "K02.1",
			treatmentDescription: "Проведена аппликация анестетика.",
		};

		const finding = generateSoapFromOdontogramFinding({
			toothNumber: 26,
			state: "Pulpitis",
		});

		const merged = mergeSoapDiaryState(existing, finding, {
			strategy: "smart_append",
		});

		assert.ok(
			merged.anamnesis.startsWith(
				"Пациент аллергик на пенициллин. Жалобы с вчерашнего дня.",
			),
		);
		assert.ok(merged.anamnesis.includes(finding.anamnesis));
		assert.equal(merged.diagnosisTooth, "16, 26");
	});
});
