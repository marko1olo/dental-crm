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
			getToothAnatomicalNameRu(34),
			"34 (нижний левый первый премоляр)",
		);
		assert.equal(
			getToothAnatomicalNameRu(45),
			"45 (нижний правый второй премоляр)",
		);
		assert.equal(
			getToothAnatomicalNameRu(48),
			"48 (нижний правый третий моляр (зуб мудрости))",
		);
	});

	it("correctly generates Russian anatomical name for primary (milk) teeth", () => {
		assert.equal(
			getToothAnatomicalNameRu(51),
			"51 (верхний правый временный центральный резец)",
		);
		assert.equal(
			getToothAnatomicalNameRu(54),
			"54 (верхний правый временный первый моляр)",
		);
		assert.equal(
			getToothAnatomicalNameRu(55),
			"55 (верхний правый временный второй моляр)",
		);
		assert.equal(
			getToothAnatomicalNameRu(61),
			"61 (верхний левый временный центральный резец)",
		);
		assert.equal(
			getToothAnatomicalNameRu(71),
			"71 (нижний левый временный центральный резец)",
		);
		assert.equal(
			getToothAnatomicalNameRu(85),
			"85 (нижний правый временный второй моляр)",
		);
	});

	it("handles non-FDI invalid tooth numbers safely", () => {
		assert.equal(getToothAnatomicalNameRu(0), "Зуб 0");
		assert.equal(getToothAnatomicalNameRu(99), "Зуб 99");
	});

	it("formats surfaces to readable Russian medical terms", () => {
		const str = formatSurfacesRu(["O", "M", "D"]);
		assert.equal(
			str,
			"окклюзионная (жевательная), мезиальная (медиальная), дистальная",
		);
		assert.equal(
			formatSurfacesRu(["B", "V", "L", "P"]),
			"вестибулярная (щечная), вестибулярная (щечная/губная), язычная, нёбная",
		);
		assert.equal(formatSurfacesRu([]), "коронковой части");
		assert.equal(formatSurfacesRu(undefined), "коронковой части");
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
		assert.equal(soap.diagnosisIcd10Label, "Кариес дентина (средний)");
		assert.ok(soap.anamnesis.includes("36 (нижний левый первый моляр)"));
		assert.ok(soap.statusLocalis.includes("кариозная полость средней глубины"));
		assert.ok(
			soap.treatmentDescription.includes(
				"Препарирование кариозной полости зуба 36",
			),
		);
	});

	it("generates K02.0 Initial Caries and K02.2 Root Caries correctly", () => {
		const initial = generateSoapFromOdontogramFinding({
			toothNumber: 11,
			state: "Caries",
			subType: "initial",
		});
		assert.equal(initial.diagnosisIcd10, "K02.0");
		assert.equal(initial.diagnosisIcd10Label, "Кариес эмали");
		assert.ok(initial.statusLocalis.includes("матовое меловидное пятно"));

		const root = generateSoapFromOdontogramFinding({
			toothNumber: 23,
			state: "Caries",
			subType: "root",
		});
		assert.equal(root.diagnosisIcd10, "K02.2");
		assert.equal(root.diagnosisIcd10Label, "Кариес цемента / корня");
		assert.ok(root.statusLocalis.includes("пришеечной зоне"));
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
		assert.ok(
			soap.statusLocalis.includes("зубные отложения") ||
				soap.statusLocalis.includes("зубной налет"),
		);
		assert.ok(soap.treatmentDescription.includes("Air-Flow"));
	});

	it("generates Filled (пломба / вторичный кариес) protocol", () => {
		const soap = generateSoapFromOdontogramFinding({
			toothNumber: 15,
			state: "Filled",
			surfaces: ["O", "D"],
		});
		assert.equal(soap.diagnosisIcd10, "K02.1");
		assert.equal(soap.diagnosisTooth, "15");
		assert.ok(soap.anamnesis.includes("скол края старой пломбы"));
		assert.ok(soap.statusLocalis.includes("старая композитная реставрация"));
		assert.ok(soap.treatmentDescription.includes("Снятие несостоятельной пломбы"));
	});

	it("generates Crown (коронка / ортопедия Z51.8) protocol", () => {
		const soap = generateSoapFromOdontogramFinding({
			toothNumber: 26,
			state: "Crown",
		});
		assert.equal(soap.diagnosisIcd10, "Z51.8");
		assert.equal(soap.diagnosisTooth, "26");
		assert.equal(soap.diagnosisIcd10Label, "Ортопедическое лечение (коронка)");
		assert.ok(soap.anamnesis.includes("ортопедического лечения"));
		assert.ok(
			soap.statusLocalis.includes("Коронковая часть зуба значительно разрушена"),
		);
		assert.ok(soap.treatmentDescription.includes("Препарирование культи зуба"));
	});

	it("generates Implant and Planned_Implant protocols", () => {
		const implant = generateSoapFromOdontogramFinding({
			toothNumber: 36,
			state: "Implant",
		});
		assert.equal(implant.diagnosisIcd10, "Z51.8");
		assert.equal(implant.diagnosisTooth, "36");
		assert.ok(implant.anamnesis.includes("установки дентального имплантата"));
		assert.ok(implant.statusLocalis.includes("Формирователь десны"));

		const planned = generateSoapFromOdontogramFinding({
			toothNumber: 46,
			state: "Planned_Implant",
		});
		assert.equal(planned.diagnosisIcd10, "K08.1");
		assert.equal(planned.diagnosisTooth, "46");
		assert.ok(planned.anamnesis.includes("планирования дентальной имплантации"));
		assert.ok(planned.statusLocalis.includes("Альвеолярный гребень"));
	});

	it("generates Missing (K08.1) and Extraction protocols", () => {
		const missing = generateSoapFromOdontogramFinding({
			toothNumber: 25,
			state: "Missing",
		});
		assert.equal(missing.diagnosisIcd10, "K08.1");
		assert.equal(missing.diagnosisTooth, "25");
		assert.ok(missing.anamnesis.includes("отсутствие зуба"));
		assert.ok(missing.statusLocalis.includes("Отсутствует"));

		const extraction = generateSoapFromOdontogramFinding({
			toothNumber: 48,
			state: "Extraction",
		});
		assert.equal(extraction.diagnosisIcd10, "K08.1");
		assert.equal(extraction.diagnosisTooth, "48");
		assert.ok(extraction.treatmentDescription.includes("Синдесмотомия"));
	});

	it("generates Healthy (Z01.2) protocol", () => {
		const healthy = generateSoapFromOdontogramFinding({
			toothNumber: 11,
			state: "Healthy",
		});
		assert.equal(healthy.diagnosisIcd10, "Z01.2");
		assert.equal(healthy.diagnosisTooth, "11");
		assert.equal(healthy.diagnosisIcd10Label, "Стоматологическое обследование");
		assert.ok(healthy.anamnesis.includes("Жалоб со стороны зуба 11"));
		assert.ok(healthy.statusLocalis.includes("Интактен"));
		assert.ok(healthy.treatmentDescription.includes("Профилактический осмотр"));
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
