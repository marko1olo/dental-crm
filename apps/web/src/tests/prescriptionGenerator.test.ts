import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_MEDICATIONS_CATALOG,
	DENTAL_FAST_PRESCRIPTION_PACKAGES,
} from "../components/prescriptions/generator/prescriptionPresets";
import { auditClinicalDrugSafety } from "@dental/shared";
import {
	calculateMedicationDosage,
	formatPatientPrescriptionMemo,
	generateForm107Prescription,
} from "../components/prescriptions/generator/prescriptionEngine";

describe("Web Prescription Generator & Form 107/148 Engine (Order 1094n)", () => {
	it("1. Presets Catalog: contains rich dental presets with Latin & Russian signatures", () => {
		assert.ok(DENTAL_MEDICATIONS_CATALOG.length >= 6);
		const ids = DENTAL_MEDICATIONS_CATALOG.map((m) => m.id);
		assert.ok(ids.includes("amoxiclav_875"));
		assert.ok(ids.includes("nimesil_100"));
		assert.ok(ids.includes("chlorhexidine_005"));
		assert.ok(ids.includes("ketorolac_10"));
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
			selectedMedicationIds: ["ketorolac_10"],
		});

		assert.equal(doc.header.validityPeriodLabelRu, "15 дней (Срочный / ПКУ)");
		assert.equal(doc.items.length, 1);
		assert.ok(doc.items[0]?.latinRp.includes("Ketorolaci"));
	});

	it("5. Ketorolac 10mg: correctly registered in catalog for express pain relief", () => {
		const ketorolac = DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === "ketorolac_10");
		assert.ok(ketorolac, "ketorolac_10 must exist in catalog");
		assert.equal(ketorolac.dosageRu, "10 мг");
		assert.ok(ketorolac.latinRp.includes("Ketorolaci 10 mg"));
		assert.ok(ketorolac.tradeNameRu.includes("Кетанов"));
	});

	it("6. 1-Click Fast Clinical Packages (Order 1094n): all packages correctly defined and generate Form 107-1/u", () => {
		assert.ok(DENTAL_FAST_PRESCRIPTION_PACKAGES.length >= 6);

		// Package: Standard anti-inflammatory course
		const pkgStd = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "standard_anti_inflammatory_course");
		assert.ok(pkgStd);
		assert.deepEqual([...pkgStd.drugIds], ["amoxiclav_875_125", "nimesil_100", "chlorhexidine_005"]);

		// Package: Analgesia
		const pkgAnalgesia = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "analgesia_nimesil");
		assert.ok(pkgAnalgesia);
		assert.deepEqual([...pkgAnalgesia.drugIds], ["nimesil_100"]);

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

		// Package 4: Pericoronitis / Abscess (Cyfran ST)
		const pkg4 = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "cyfran_st_pericoronitis");
		assert.ok(pkg4);
		assert.deepEqual([...pkg4.drugIds], ["cyfran_st", "nimesil_100", "chlorhexidine_005"]);

		const doc4 = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-ПЕРИКОР-01",
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
			selectedMedicationIds: pkg4.drugIds,
		});
		assert.equal(doc4.items.length, 3);
		assert.ok(doc4.items[0]?.latinRp.includes("Ciprofloxacini"));
		assert.ok(doc4.items[1]?.latinRp.includes("Nimesulidi"));
		assert.ok(doc4.items[2]?.latinRp.includes("Chlorhexidini"));

		// Package 5: First-line Amoxiclav (Mandate 8i - dental outpatient standard)
		const pkgAmox = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "amoxiclav_first_line");
		assert.ok(pkgAmox, "amoxiclav_first_line must exist");
		assert.deepEqual([...pkgAmox.drugIds], ["amoxiclav_875"]);

		// Package 6: Clarithromycin reserve for penicillin allergy
		const pkgClari = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "clarithromycin_reserve");
		assert.ok(pkgClari, "clarithromycin_reserve must exist");
		assert.deepEqual([...pkgClari.drugIds], ["clarithromycin_500"]);

		// Package 7: Moderate pain Ibuprofen 400
		const pkgIbu = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "ibuprofen_moderate_pain");
		assert.ok(pkgIbu, "ibuprofen_moderate_pain must exist");
		assert.deepEqual([...pkgIbu.drugIds], ["ibuprofen_400"]);

		// Package 8: Antiseptic rinse Chlorhexidine 0.05%
		const pkgChx = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "chlorhexidine_antiseptic_rinse");
		assert.ok(pkgChx, "chlorhexidine_antiseptic_rinse must exist");
		assert.deepEqual([...pkgChx.drugIds], ["chlorhexidine_005"]);

		// Package 9: Dental anti-inflammatory gel
		const pkgGel = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "anti_inflammatory_dental_gel");
		assert.ok(pkgGel, "anti_inflammatory_dental_gel must exist");
		assert.deepEqual([...pkgGel.drugIds], ["holisal_gel"]);

		// Package 10: Suprastin antiallergic (Mandate 8e/8k)
		const pkgSuprastin = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "suprastin_antiallergic");
		assert.ok(pkgSuprastin, "suprastin_antiallergic must exist");
		assert.deepEqual([...pkgSuprastin.drugIds], ["suprastin_25"]);
	});

	it("7. Dosage Calculator (Mandate 8k): calculates pediatric vs adult dosages correctly", () => {
		// Adult Amoxiclav
		const adultAmox = calculateMedicationDosage({ drugId: "amoxiclav_875_125", patientAgeYears: 35 });
		assert.ok(adultAmox);
		assert.equal(adultAmox.isPediatric, false);
		assert.ok(adultAmox.recommendedDosageRu.includes("875/125"));

		// Child Amoxiclav (weight 20kg, age 6)
		const childAmox = calculateMedicationDosage({ drugId: "amoxiclav_875_125", patientAgeYears: 6, patientWeightKg: 20 });
		assert.ok(childAmox);
		assert.equal(childAmox.isPediatric, true);
		assert.ok(childAmox.recommendedDosageRu.includes("300 мг"));

		// Child Nimesulide (age 8) -> Contraindicated warning
		const childNimesil = calculateMedicationDosage({ drugId: "nimesil_100", patientAgeYears: 8 });
		assert.ok(childNimesil);
		assert.equal(childNimesil.isPediatric, true);
		assert.ok(childNimesil.warningRu?.includes("ПРОТИВОПОКАЗАН"));
		assert.ok(childNimesil.recommendedDosageRu.includes("ПРОТИВОПОКАЗАН"));

		// Adult Nimesulide (age 30)
		const adultNimesil = calculateMedicationDosage({ drugId: "nimesil_100", patientAgeYears: 30 });
		assert.ok(adultNimesil);
		assert.equal(adultNimesil.isPediatric, false);
		assert.ok(adultNimesil.recommendedDosageRu.includes("100 мг"));

		// Child Ibuprofen (age 5, weight 18kg)
		const childIbu = calculateMedicationDosage({ drugId: "ibuprofen_400", patientAgeYears: 5, patientWeightKg: 18 });
		assert.ok(childIbu);
		assert.equal(childIbu.isPediatric, true);
		assert.ok(childIbu.recommendedDosageRu.includes("180 мг"));
	});

	it("8. Aliases in catalog: nimesulide_100 and nimesil_100 both resolve cleanly", () => {
		const m1 = DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === "nimesil_100");
		const m2 = DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === "nimesulide_100");
		assert.ok(m1, "nimesil_100 must exist");
		assert.ok(m2, "nimesulide_100 must exist");
		assert.equal(m1.tradeNameRu.includes("Нимесил"), true);
		assert.equal(m2.tradeNameRu.includes("Нимесил"), true);
	});

	it("9. Mandate 8e & 8i: Form 107-1/u Statutory Core Drugs (Order 1094n)", () => {
		// Verify canonical dental medications: Amoxiclav, Nimesulide, Chlorhexidine 0.05%, Suprastin, Ibuprofen
		const requiredMedIds = [
			"amoxiclav_875_125",
			"nimesil_100",
			"chlorhexidine_005",
			"suprastin_25",
			"ibuprofen_400",
		];
		for (const id of requiredMedIds) {
			const med = DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === id);
			assert.ok(med, `Required statutory medication ${id} must exist in DENTAL_MEDICATIONS_CATALOG`);
			assert.ok(med.latinRp.startsWith("Rp.:"), `${id} must have Latin Rp`);
			assert.ok(med.dispenseLatin.startsWith("D.t.d."), `${id} must have Latin D.t.d.`);
			assert.ok(med.signaRu.startsWith("S."), `${id} must have Russian Signa`);
		}

		// Generate prescription with standard core drugs
		const doc = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-1094Н-01",
			dateIso: "2026-09-17",
			validityDays: 60,
			clinicName: "Стоматологическая клиника «Денте»",
			clinicOgrn: "1237700123456",
			clinicAddress: "г. Москва",
			patientFullName: "Соколов А.В.",
			patientBirthDate: "1988-04-12",
			patientMedicalCardNumber: "043/у-777",
			doctorFullName: "Д-р Смирнов А.П.",
			doctorSpecialty: "Врач-стоматолог",
			selectedMedicationIds: ["amoxiclav_875_125", "nimesil_100", "chlorhexidine_005"],
		});
		assert.equal(doc.items.length, 3);
		assert.ok(doc.items[0]?.latinRp.includes("Amoxicillini"));
		assert.ok(doc.items[1]?.latinRp.includes("Nimesulidi"));
		assert.ok(doc.items[2]?.latinRp.includes("Chlorhexidini"));
	});

	it("10. Mandate 8e: DDI Safety Audit detects interaction without blocking Form 107-1/u generation", () => {
		// Prescribing Ibuprofen to a patient taking Warfarin causes a severe DDI
		const ddiCheck = auditClinicalDrugSafety({
			proposedMedications: ["Ибупрофен 400 мг"],
			existingMedications: ["Варфарин 2.5 мг"],
		});
		assert.strictEqual(ddiCheck.isSafe, false);
		assert.strictEqual(ddiCheck.hasSevereDdi, true);
		assert.ok(ddiCheck.drugInteractions.length > 0);
		assert.ok(ddiCheck.drugInteractions[0]?.effectDescriptionRu.includes("кровотеч"));

		// Under Mandate 8e (Doctor Autonomy), DDI does NOT throw or block generation
		const doc = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-DDI-01",
			dateIso: "2026-09-17",
			validityDays: 60,
			clinicName: "Клиника",
			clinicOgrn: "1234567890123",
			clinicAddress: "Москва",
			patientFullName: "Пациент П.П.",
			patientBirthDate: "1975-01-01",
			patientMedicalCardNumber: "043/у-DDI",
			doctorFullName: "Д-р Смирнов",
			doctorSpecialty: "Стоматолог",
			selectedMedicationIds: ["ibuprofen_400"],
		});
		assert.equal(doc.items.length, 1);
		assert.ok(doc.items[0]?.latinRp.includes("Ibuprofeni"));
	});

	it("11. Mandate 8k: 1-Click Patient Memo formatting for WhatsApp/Telegram", () => {
		const med = DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === "nimesil_100")!;
		const memo = formatPatientPrescriptionMemo({
			clinicName: "ООО «Денте»",
			clinicPhone: "+7 (495) 999-88-77",
			patientName: "Алексей Владимирович",
			doctorName: "Д-р Смирнов А.П.",
			prescriptionDate: "2026-09-17",
			medications: [med],
		});
		assert.ok(memo.includes("ООО «Денте»"));
		assert.ok(memo.includes("Алексей Владимирович"));
		assert.ok(memo.includes("Нимесил"));
		assert.ok(memo.includes("+7 (495) 999-88-77"));
		assert.ok(memo.includes("Памятка:"));
	});
});


