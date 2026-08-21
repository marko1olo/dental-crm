import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	form107_1uPayloadSchema,
	generatePrescriptionPayloadFromSoap,
	renderForm107_1uHtml,
} from "../documents/index.js";

describe("Form 107-1/u Prescription Engine (Приказ Минздрава РФ № 1094н)", () => {
	const clinic = {
		fullName: 'ООО "Денте Клиник"',
		address: "г. Москва, ул. Стоматологов, д. 10",
		phone: "+7 (495) 123-45-67",
		ogrn: "1234567890123",
		inn: "7701234567",
	};

	const patient = {
		fullName: "Иванов Иван Иванович",
		birthDate: "1988-05-14",
		medicalCardNumber: "СТ-2026/043",
	};

	const doctor = {
		fullName: "Смирнова Анна Сергеевна",
		specialty: "Врач-стоматолог-терапевт",
	};

	it("should contain standard dental prescription drug catalog with valid dosages and Latin Rp", () => {
		assert.ok(DENTAL_PRESCRIPTION_DRUG_CATALOG.length >= 8);
		const ids = DENTAL_PRESCRIPTION_DRUG_CATALOG.map((d) => d.id);
		assert.ok(ids.includes("nimesulide_100"));
		assert.ok(ids.includes("ibuprofen_400"));
		assert.ok(ids.includes("amoxiclav_875_125"));
		assert.ok(ids.includes("chlorhexidine_005"));
		assert.ok(ids.includes("metrogyl_denta"));

		for (const drug of DENTAL_PRESCRIPTION_DRUG_CATALOG) {
			assert.ok(drug.latinRp.startsWith("Rp.:"));
			assert.ok(drug.dispenseLatin.startsWith("D.t.d."));
			assert.ok(drug.signaRu.startsWith("S."));
			assert.ok(drug.recommendedForIcd10.length > 0);
		}
	});

	it("should auto-generate prescription payload for K04.0 Pulpitis (NSAID + Antibiotic)", () => {
		const payload = generatePrescriptionPayloadFromSoap({
			clinic,
			patient,
			doctor,
			diagnosisIcd10: "K04.0",
		});

		const validated = form107_1uPayloadSchema.parse(payload);
		assert.equal(validated.formNumber, "107-1/у");
		assert.equal(validated.clinicLegalName, 'ООО "Денте Клиник"');
		assert.equal(validated.patientFullName, "Иванов Иван Иванович");
		assert.equal(validated.doctorFullName, "Смирнова Анна Сергеевна");
		assert.equal(validated.validityDays, "60");
		assert.ok(validated.items.length >= 1 && validated.items.length <= 3);

		const tradeNames = validated.items.map((i) => i.tradeName);
		assert.ok(
			tradeNames.some((t) => t.includes("Нимесил") || t.includes("Ибупрофен")),
		);
	});

	it("should auto-generate prescription for K08.1 Tooth Extraction with explicit drug list", () => {
		const payload = generatePrescriptionPayloadFromSoap({
			clinic,
			patient,
			doctor,
			diagnosisIcd10: "K08.1",
			explicitDrugIds: ["nimesulide_100", "amoxiclav_875_125", "chlorhexidine_005"],
		});

		const validated = form107_1uPayloadSchema.parse(payload);
		assert.equal(validated.items.length, 3);
		assert.equal(validated.items[0]?.tradeName, "Нимесил (Нимесулид)");
		assert.ok(validated.items[1]?.tradeName.includes("Амоксиклав"));
		assert.ok(validated.items[2]?.tradeName.includes("Хлоргексидин"));
	});

	it("should render print-ready HTML for Form 107-1/u with all legal requisites", () => {
		const payload = generatePrescriptionPayloadFromSoap({
			clinic,
			patient,
			doctor,
			diagnosisIcd10: "K04.5",
			explicitDrugIds: ["nimesulide_100", "amoxiclav_875_125"],
		});

		const html = renderForm107_1uHtml(payload);
		assert.ok(html.includes("Форма бланка № 107-1/у"));
		assert.ok(html.includes("1094н"));
		assert.ok(html.includes("РЕЦЕПТ"));
		assert.ok(html.includes("ООО &quot;Денте Клиник&quot;"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("Смирнова Анна Сергеевна"));
		assert.ok(html.includes("Rp.: Nimesulidi 100 mg"));
		assert.ok(html.includes("Rp.: Amoxicillini 875 mg"));
		assert.ok(html.includes("Срок действия рецепта:"));
		assert.ok(html.includes("Печать медицинской организации"));
	});
});
