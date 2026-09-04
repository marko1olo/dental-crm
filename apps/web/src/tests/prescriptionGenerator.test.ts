import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_MEDICATIONS_CATALOG,
	DENTAL_FAST_PRESCRIPTION_PACKAGES,
} from "../components/prescriptions/generator/prescriptionPresets";
import {
	generateForm107Prescription,
} from "../components/prescriptions/generator/prescriptionEngine";

describe("Web Prescription Generator & Form 107/148 Engine (Order 1094n)", () => {
	it("1. Presets Catalog: contains rich dental presets with Latin & Russian signatures", () => {
		assert.ok(DENTAL_MEDICATIONS_CATALOG.length >= 6);
		const ids = DENTAL_MEDICATIONS_CATALOG.map((m) => m.id);
		assert.ok(ids.includes("amoxiclav_875"));
		assert.ok(ids.includes("nimesil_100"));
		assert.ok(ids.includes("chlorhexidine_005"));
		assert.ok(ids.includes("tramadol_50"));
		assert.ok(ids.includes("tranexamic_500"));

		for (const med of DENTAL_MEDICATIONS_CATALOG) {
			assert.ok(med.latinRp.startsWith("Rp.:"));
			assert.ok(med.dispenseLatin.startsWith("D.t.d."));
			assert.ok(med.signaRu.startsWith("S."));
		}
	});

	it("2. Form 107-1/u Document: generates complete prescription with expiration date and clinic requisites", () => {
		const doc = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-2026-01",
			dateIso: "2026-08-22",
			validityDays: 60,
			clinicName: "ООО «Денте»",
			clinicOgrn: "1207700123456",
			clinicAddress: "г. Москва, ул. Стоматологов, 10",
			clinicInn: "7701234567",
			medicalLicenseNumber: "ЛО-77-01-019845",
			patientFullName: "Иванов И.И.",
			patientBirthDate: "1990-01-01",
			patientMedicalCardNumber: "043/у-01",
			doctorFullName: "Д-р Смирнов А.П.",
			doctorSpecialty: "Врач-стоматолог-терапевт",
			doctorSnils: "123-456-789 00",
			selectedMedicationIds: ["amoxiclav_875", "nimesil_100"],
			ukepSignature: {
				certificateSerialNumber: "7700B891A40098F2104",
				certificateIssuer: "УЦ Минцифры",
				signedAt: "2026-08-22T10:00:00.000Z",
				cryptoSignaturePkcs7: "MIIEVw...",
			},
		});

		assert.equal(doc.header.seriesNumber, "РЕЦ-2026-01");
		assert.equal(doc.header.expiresAtIso, "2026-10-21");
		assert.equal(doc.header.validityPeriodLabelRu, "60 дней (Стандарт)");
		assert.equal(doc.items.length, 2);
		assert.equal(doc.items[0]?.itemNumber, 1);
		assert.ok(doc.items[0]?.latinRp.includes("Amoxicillini"));
		assert.ok(doc.items[1]?.latinRp.includes("Nimesulidi"));
		assert.equal(doc.ukepSignature?.certificateSerialNumber, "7700B891A40098F2104");
	});

	it("3. Chronic Prescriptions (1 year): generates special care flag and periodicity", () => {
		const doc = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-ХРОН-01",
			dateIso: "2026-08-22",
			validityDays: 365,
			clinicName: "ООО «Денте»",
			clinicOgrn: "1207700123456",
			clinicAddress: "Москва",
			patientFullName: "Сидоров С.С.",
			patientBirthDate: "1960-05-12",
			patientMedicalCardNumber: "043/у-99",
			doctorFullName: "Д-р Кузнецова Е.В.",
			doctorSpecialty: "Врач-стоматолог",
			selectedMedicationIds: ["nimesil_100"],
			isChronicSpecialCare: true,
			chronicPeriodicity: "ежемесячно (1 раз в 30 дней)",
		});

		assert.equal(doc.header.validityPeriodLabelRu, "1 год (Хронические / По спец. назначению)");
		assert.equal(doc.isChronicSpecialCare, true);
		assert.equal(doc.chronicPeriodicity, "ежемесячно (1 раз в 30 дней)");
	});

	it("4. Controlled Drug (15 days): generates urgent/controlled label", () => {
		const doc = generateForm107Prescription({
			prescriptionSeriesNumber: "ПКУ-2026-991",
			dateIso: "2026-08-22",
			validityDays: 15,
			clinicName: "ООО «Денте»",
			clinicOgrn: "1207700123456",
			clinicAddress: "Москва",
			patientFullName: "Петров П.П.",
			patientBirthDate: "1985-02-15",
			patientMedicalCardNumber: "043/у-15",
			doctorFullName: "Д-р Смирнов А.П.",
			doctorSpecialty: "Хирург-стоматолог",
			selectedMedicationIds: ["tramadol_50"],
		});

		assert.equal(doc.header.validityPeriodLabelRu, "15 дней (Срочный / ПКУ)");
		assert.equal(doc.items.length, 1);
		assert.ok(doc.items[0]?.latinRp.includes("Tramadoli"));
	});

	it("5. Ketorolac 10mg: correctly registered in catalog for express pain relief", () => {
		const ketorolac = DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === "ketorolac_10");
		assert.ok(ketorolac, "ketorolac_10 must exist in catalog");
		assert.equal(ketorolac.dosageRu, "10 мг");
		assert.ok(ketorolac.latinRp.includes("Ketorolaci 10 mg"));
		assert.ok(ketorolac.tradeNameRu.includes("Кетанов"));
	});

	it("6. 1-Click Fast Clinical Packages (Order 1094n): all 3 packages correctly defined and generate Form 107-1/u", () => {
		assert.equal(DENTAL_FAST_PRESCRIPTION_PACKAGES.length, 3);

		// Package 1: Post-extraction / implant
		const pkg1 = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "post_extraction_implant");
		assert.ok(pkg1);
		assert.deepEqual([...pkg1.drugIds], ["nimesil_100", "chlorhexidine_005", "amoxiclav_875_125"]);

		const doc1 = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-ХИР-01",
			dateIso: "2026-08-22",
			validityDays: 60,
			clinicName: "ООО «Денте»",
			clinicOgrn: "1207700123456",
			clinicAddress: "Москва",
			patientFullName: "Иванов И.И.",
			patientBirthDate: "1990-01-01",
			patientMedicalCardNumber: "043/у-01",
			doctorFullName: "Д-р Смирнов А.П.",
			doctorSpecialty: "Хирург-стоматолог",
			selectedMedicationIds: pkg1.drugIds,
		});
		assert.equal(doc1.items.length, 3);
		assert.ok(doc1.items[0]?.latinRp.includes("Nimesulidi"));
		assert.ok(doc1.items[1]?.latinRp.includes("Chlorhexidini"));
		assert.ok(doc1.items[2]?.latinRp.includes("Amoxicillini"));

		// Package 2: Endodontics / Periodontitis
		const pkg2 = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "endo_periodontitis");
		assert.ok(pkg2);
		assert.deepEqual([...pkg2.drugIds], ["ibuprofen_400", "suprastin_25"]);

		const doc2 = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-ЭНДО-01",
			dateIso: "2026-08-22",
			validityDays: 60,
			clinicName: "ООО «Денте»",
			clinicOgrn: "1207700123456",
			clinicAddress: "Москва",
			patientFullName: "Иванов И.И.",
			patientBirthDate: "1990-01-01",
			patientMedicalCardNumber: "043/у-01",
			doctorFullName: "Д-р Смирнов А.П.",
			doctorSpecialty: "Терапевт-эндодонтист",
			selectedMedicationIds: pkg2.drugIds,
		});
		assert.equal(doc2.items.length, 2);
		assert.ok(doc2.items[0]?.latinRp.includes("Ibuprofeni"));
		assert.ok(doc2.items[1]?.latinRp.includes("Chloropyramini"));

		// Package 3: Acute pain express
		const pkg3 = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "acute_pain_express");
		assert.ok(pkg3);
		assert.deepEqual([...pkg3.drugIds], ["ketorolac_10"]);

		const doc3 = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-БОЛЬ-01",
			dateIso: "2026-08-22",
			validityDays: 60,
			clinicName: "ООО «Денте»",
			clinicOgrn: "1207700123456",
			clinicAddress: "Москва",
			patientFullName: "Иванов И.И.",
			patientBirthDate: "1990-01-01",
			patientMedicalCardNumber: "043/у-01",
			doctorFullName: "Д-р Смирнов А.П.",
			doctorSpecialty: "Стоматолог общей практики",
			selectedMedicationIds: pkg3.drugIds,
		});
		assert.equal(doc3.items.length, 1);
		assert.ok(doc3.items[0]?.latinRp.includes("Ketorolaci 10 mg"));
	});
});
