import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	generatePrescriptionPayloadFromSoap,
	generateRadiologyReferralPayloadFromSoap,
	renderForm107_1uHtml,
	renderRadiologyReferralHtml,
} from "@dental/shared";

describe("Clinical Visit Integration — Form 107-1/u & Radiology Referrals", () => {
	const clinic = {
		fullName: 'ООО "Денте Премиум"',
		address: "г. Москва, ул. Профсоюзная, 45",
		phone: "+7 (495) 777-88-99",
		ogrn: "1027700132190",
		inn: "7728123456",
	};

	const patient = {
		fullName: "Сидорова Елена Васильевна",
		birthDate: "1985-04-12",
		phone: "+7 (916) 111-22-33",
		medicalCardNumber: "СТ-8842",
	};

	const doctor = {
		fullName: "Григорьев Максим Игоревич",
		specialty: "Врач-стоматолог-терапевт, эндодонтист",
	};

	describe("1. Auto-Generation of Prescription Form 107-1/u from SOAP Diary", () => {
		it("should auto-prescribe NSAID (Nimesulide) and Antibiotic (Amoxiclav) for Acute Pulpitis K04.0", () => {
			const prescription = generatePrescriptionPayloadFromSoap({
				clinic,
				patient,
				doctor,
				diagnosisIcd10: "K04.0",
				treatmentText:
					"Экстирпация пульпы, мех. обработка каналов NiTi, ирригация NaOCl 3%, временная паста Кальцепт.",
			});

			assert.equal(prescription.formNumber, "107-1/у");
			assert.equal(prescription.clinicLegalName, 'ООО "Денте Премиум"');
			assert.equal(prescription.patientFullName, "Сидорова Елена Васильевна");
			assert.equal(prescription.doctorFullName, "Григорьев Максим Игоревич");
			assert.equal(prescription.validityDays, "60");
			assert.ok(prescription.items.length >= 1 && prescription.items.length <= 3);

			const latinStrings = prescription.items.map((i) => i.latinName).join(" ");
			assert.ok(latinStrings.includes("Nimesulidi"));
		});

		it("should allow selecting custom medications from catalog for post-op surgical extraction", () => {
			const prescription = generatePrescriptionPayloadFromSoap({
				clinic,
				patient,
				doctor,
				diagnosisIcd10: "K08.1",
				explicitDrugIds: ["ketorolac_10", "amoxiclav_875_125", "loratadine_10"],
			});

			assert.equal(prescription.items.length, 3);
			assert.ok(prescription.items[0]?.latinName.includes("Ketorolaci"));
			assert.ok(prescription.items[1]?.latinName.includes("Amoxicillini 875 mg"));
			assert.ok(prescription.items[2]?.latinName.includes("Loratadini"));
		});

		it("should render compliant HTML according to Minzdrav Order 1094n", () => {
			const prescription = generatePrescriptionPayloadFromSoap({
				clinic,
				patient,
				doctor,
				diagnosisIcd10: "K04.0",
				explicitDrugIds: ["nimesulide_100", "amoxiclav_500_125"],
			});

			const html = renderForm107_1uHtml(prescription);
			assert.ok(html.includes("Форма бланка № 107-1/у"));
			assert.ok(html.includes("1094н"));
			assert.ok(html.includes("РЕЦЕПТ"));
			assert.ok(html.includes("Сидорова Елена Васильевна"));
			assert.ok(html.includes("Григорьев Максим Игоревич"));
			assert.ok(html.includes("Rp.: Nimesulidi 100 mg"));
			assert.ok(html.includes("Rp.: Amoxicillini 500 mg"));
			assert.ok(html.includes("Срок действия рецепта:"));
			assert.ok(html.includes("Печать медицинской организации «Для рецептов»"));
		});
	});

	describe("2. Auto-Generation of Dental Radiology Referral from SOAP Diary", () => {
		it("should auto-generate Segmented CBCT referral for Chronic Periodontitis K04.5 with tooth target", () => {
			const referral = generateRadiologyReferralPayloadFromSoap({
				clinic,
				patient,
				doctor,
				diagnosisIcd10: "K04.5",
				diagnosisTooth: "46",
				statusLocalis: "Периапикальный очаг разрежения костной ткани в области фуркации и дистального корня зуба 46.",
			});

			assert.equal(referral.formType, "radiology_referral");
			assert.equal(referral.studyType, "cbct_segment_5x5");
			assert.equal(referral.studyGoal, "periapical_cyst");
			assert.equal(referral.targetTeethFdi, "46");
			assert.ok(referral.clinicalJustification.includes("Периапикальный очаг"));
		});

		it("should auto-generate Full-Jaw CBCT referral for Implantology K08.1", () => {
			const referral = generateRadiologyReferralPayloadFromSoap({
				clinic,
				patient,
				doctor,
				diagnosisIcd10: "K08.1",
				diagnosisTooth: "16, 26, 36, 46",
				studyType: "cbct_jaw_8x8",
				studyGoal: "implantology",
			});

			assert.equal(referral.studyType, "cbct_jaw_8x8");
			assert.equal(referral.studyGoal, "implantology");
			assert.equal(referral.targetTeethFdi, "16, 26, 36, 46");
		});

		it("should render print-ready HTML with FDI matrix and legal regulatory markers", () => {
			const referral = generateRadiologyReferralPayloadFromSoap({
				clinic,
				patient,
				doctor,
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "24, 25",
			});

			const html = renderRadiologyReferralHtml(referral);
			assert.ok(html.includes("НАПРАВЛЕНИЕ"));
			assert.ok(html.includes("на рентгенологическое исследование"));
			assert.ok(html.includes("Сидорова Елена Васильевна"));
			assert.ok(html.includes("Зубная формула (FDI)"));
			assert.ok(html.includes("Отмеченные целевые зубы: 24, 25"));
			assert.ok(html.includes("СанПиН 2.6.1.1192-03"));
			assert.ok(html.includes("Врач-рентгенолог / Рентгенолаборант"));
		});
	});
});
