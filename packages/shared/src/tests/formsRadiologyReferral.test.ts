import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	generateRadiologyReferralPayloadFromSoap,
	radiologyReferralGoalLabels,
	radiologyReferralPayloadSchema,
	renderRadiologyReferralHtml,
} from "../documents/index.js";

describe("Dental Radiology Referral Engine (КЛКТ / ОПТГ / ТРГ / Визиография)", () => {
	const clinic = {
		fullName: 'ООО "Денте Клиник"',
		address: "г. Москва, ул. Стоматологов, д. 10",
		phone: "+7 (495) 123-45-67",
	};

	const patient = {
		fullName: "Петров Петр Петрович",
		birthDate: "1992-11-20",
		phone: "+7 (999) 555-44-33",
		medicalCardNumber: "СТ-2026/099",
	};

	const doctor = {
		fullName: "Кузнецов Дмитрий Павлович",
		specialty: "Врач-стоматолог-хирург-имплантолог",
	};

	it("should have comprehensive clinical goals dictionary", () => {
		assert.ok(Object.keys(radiologyReferralGoalLabels).length >= 8);
		assert.ok(radiologyReferralGoalLabels.endodontics.includes("Эндодонтическое"));
		assert.ok(radiologyReferralGoalLabels.implantology.includes("имплантации"));
		assert.ok(radiologyReferralGoalLabels.surgery_extraction.includes("ретинированных"));
	});

	it("should auto-generate CBCT referral for K08.1 Implantology with target teeth", () => {
		const payload = generateRadiologyReferralPayloadFromSoap({
			clinic,
			patient,
			doctor,
			diagnosisIcd10: "K08.1",
			diagnosisTooth: "16, 26, 36",
			statusLocalis: "Отсутствие зубов 16, 26, 36. Планирование дентальной имплантации.",
		});

		const validated = radiologyReferralPayloadSchema.parse(payload);
		assert.equal(validated.formType, "radiology_referral");
		assert.equal(validated.studyType, "cbct_jaw_8x8");
		assert.equal(validated.studyGoal, "implantology");
		assert.equal(validated.targetTeethFdi, "16, 26, 36");
		assert.equal(validated.patientFullName, "Петров Петр Петрович");
		assert.equal(validated.doctorFullName, "Кузнецов Дмитрий Павлович");
	});

	it("should auto-generate segmented CBCT for K04.5 Periodontitis / Cyst", () => {
		const payload = generateRadiologyReferralPayloadFromSoap({
			clinic,
			patient,
			doctor,
			diagnosisIcd10: "K04.5",
			diagnosisTooth: "36",
			statusLocalis: "Периапикальный очаг деструкции у верхушки медиального корня зуба 36.",
		});

		const validated = radiologyReferralPayloadSchema.parse(payload);
		assert.equal(validated.studyType, "cbct_segment_5x5");
		assert.equal(validated.studyGoal, "periapical_cyst");
		assert.equal(validated.targetTeethFdi, "36");
	});

	it("should render print-ready HTML with FDI dental formula highlighting", () => {
		const payload = generateRadiologyReferralPayloadFromSoap({
			clinic,
			patient,
			doctor,
			diagnosisIcd10: "K04.0",
			diagnosisTooth: "16, 36",
		});

		const html = renderRadiologyReferralHtml(payload);
		assert.ok(html.includes("НАПРАВЛЕНИЕ"));
		assert.ok(html.includes("на рентгенологическое исследование"));
		assert.ok(html.includes("Петров Петр Петрович"));
		assert.ok(html.includes("Кузнецов Дмитрий Павлович"));
		assert.ok(html.includes("Зубная формула (FDI)"));
		assert.ok(html.includes("Отмеченные целевые зубы: 16, 36"));
		assert.ok(html.includes("Компьютерная томография (КЛКТ 3D)"));
		assert.ok(html.includes("Принцип ALARA / СанПиН 2.6.1.1192-03"));
	});
});
