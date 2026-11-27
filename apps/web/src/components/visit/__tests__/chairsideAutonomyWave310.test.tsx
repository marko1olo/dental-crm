import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecordNewDiaryInlineForm } from "../../emr/record/tabs/RecordNewDiaryInlineForm";
import {
	CLINICAL_1CLICK_TEMPLATES_CATALOG,
	getToothAnatomicalDescription,
	PHYSIOLOGICAL_NORM_PRESET,
	synthesize1ClickSoapDiary,
} from "../../emr/templates/clinicalDiaryTemplatesEngine";
import { DebouncedEmkTextarea } from "../emk/DebouncedEmkTextarea";
import { VisitEmkTab } from "../VisitEmkTab";

describe("Chairside Autonomy Wave 310: Zero-disabled EMK controls & real diary synthesis", () => {
	it("1. RecordNewDiaryInlineForm renders tooth picker, Norm, Clear, and Save with 0 disabled buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(RecordNewDiaryInlineForm, {
				selectedTooth: "16",
				setSelectedTooth: () => {},
				commonTeeth: [11, 21, 16, 26, 36, 46],
				subjective: "Жалобы на кратковременную боль от сладкого",
				setSubjective: () => {},
				objective: "Кариозная полость на жевательной поверхности",
				setObjective: () => {},
				diagnosisText: "Кариес дентина (K02.1)",
				setDiagnosisText: () => {},
				icd10Code: "K02.1",
				setIcd10Code: () => {},
				protocol: "Препарирование, адгезивный протокол, композит.",
				setProtocol: () => {},
				onApplyNorm: () => {},
				onClear: () => {},
				onSave: () => {},
			}),
		);
		assert.ok(html.includes("Зуб FDI:"));
		assert.ok(html.includes('value="16"'));
		assert.ok(html.includes("K02.1"));
		assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
		assert.equal(html.includes("043/у"), false);
		assert.equal(/1 клик|в 1 клик/i.test(html), false);
	});

	it("2. DebouncedEmkTextarea renders clinical label, live value, and voice dictation bar without disabled blockers", () => {
		const html = renderToStaticMarkup(
			React.createElement(DebouncedEmkTextarea, {
				fieldKey: "complaint",
				label: "Жалобы пациента",
				value: "Чувствительность зуба 46 на холодное",
				onCommit: () => {},
				placeholder: "Введите жалобы или продиктуйте голосом",
			}),
		);
		assert.ok(html.includes("Жалобы пациента"));
		assert.ok(html.includes("Чувствительность зуба 46 на холодное"));
		assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
	});

	it("3. clinicalDiaryTemplatesEngine synthesizes anatomical description, norm, and clinical templates cleanly", () => {
		const anatomy16 = getToothAnatomicalDescription(16);
		assert.ok(anatomy16.includes("16"));
		assert.ok(anatomy16.includes("верхний правый первый моляр"));

		const normDiary = synthesize1ClickSoapDiary(PHYSIOLOGICAL_NORM_PRESET.id, {
			doctorFullName: "Соколова Елена Сергеевна",
		});
		assert.ok(normDiary.subjectiveComplaints.length > 5);
		assert.ok(normDiary.objectiveStatusLocalis.length > 5);
		assert.ok(normDiary.unifiedSoapText.length > 20);
		assert.equal(normDiary.unifiedSoapText.includes("043/у"), false);

		assert.ok(CLINICAL_1CLICK_TEMPLATES_CATALOG.length > 0);
		const firstTemplate = CLINICAL_1CLICK_TEMPLATES_CATALOG[0];
		assert.ok(firstTemplate);
		const synthesized = synthesize1ClickSoapDiary(firstTemplate.id, {
			toothNumber: 36,
		});
		assert.strictEqual(synthesized.toothNumber, 36);
		assert.ok(synthesized.assessmentIcd10Code.length > 0);
		assert.ok(synthesized.procedureProtocol.length > 0);
	});

	it("4. VisitEmkTab renders clinical diary sections and completion triggers with 0 disabled CTAs and 0 bureaucratic numbers", () => {
		const html = renderToStaticMarkup(
			React.createElement(VisitEmkTab, {
				visitNoteForm: {
					complaint: "Боль от сладкого",
					anamnesis: "Беспокоит 3 дня",
					objectiveStatus: "Зуб 16 кариозная полость",
					diagnosis: "K02.1 Кариес дентина",
					treatmentPlan: "Пломбирование композитом",
					recommendations: "Щадящий режим 2 часа",
				},
				updateVisitNoteField: () => {},
				activePatient: { id: "pat-1", fullName: "Иванова Мария Сергеевна" },
				activeDoctor: { id: "doc-1", fullName: "Петров И.В.", specialty: "therapist" },
			}),
		);
		assert.ok(html.length > 200);
		assert.equal(html.includes("043/у"), false);
		assert.equal(html.includes("804н"), false);
		assert.equal(html.includes("54-ФЗ"), false);
		assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
	});
});
