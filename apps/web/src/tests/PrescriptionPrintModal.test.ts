import assert from "node:assert/strict";
import test from "node:test";
import {
	DENTAL_DRUG_DOSAGE_LIMITS,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	generatePrescriptionPayloadFromSoap,
	renderForm107_1uHtml,
} from "@dental/shared";
import {
	DENTAL_FAST_PRESCRIPTION_SETS,
	PrescriptionPrintModal,
} from "../components/prescriptions/PrescriptionPrintModal";

test("PrescriptionPrintModal component contract and drug catalog integrity", () => {
	assert.equal(typeof PrescriptionPrintModal, "function");

	// Catalog has standard items
	assert.ok(DENTAL_PRESCRIPTION_DRUG_CATALOG.length >= 10);
	const nimesil = DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === "nimesulide_100");
	assert.ok(nimesil);
	assert.equal(nimesil?.latinRp, "Rp.: Nimesulidi 100 mg");
	assert.equal(nimesil?.category, "nsaid");

	// Verify suprastin_25 and stomatophyt_100 in catalog
	const suprastin = DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === "suprastin_25");
	assert.ok(suprastin, "suprastin_25 must exist in DENTAL_PRESCRIPTION_DRUG_CATALOG");
	assert.equal(suprastin?.dosageRu, "25 мг");
	assert.equal(suprastin?.category, "antihistamine");

	const stomatophyt = DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === "stomatophyt_100");
	assert.ok(stomatophyt, "stomatophyt_100 must exist in DENTAL_PRESCRIPTION_DRUG_CATALOG");
	assert.equal(stomatophyt?.dosageRu, "100 мл");
	assert.equal(stomatophyt?.category, "antiseptic");

	// Verify dosage limit for suprastin
	assert.ok(DENTAL_DRUG_DOSAGE_LIMITS.suprastin_25, "suprastin_25 must exist in DENTAL_DRUG_DOSAGE_LIMITS");
	assert.equal(DENTAL_DRUG_DOSAGE_LIMITS.suprastin_25.maxSingleDoseMg, 25);
	assert.equal(DENTAL_DRUG_DOSAGE_LIMITS.suprastin_25.maxDailyDoseMg, 100);

	// Verify 3 1-click canonical dental packages in DENTAL_FAST_PRESCRIPTION_SETS
	const postSurgerySet = DENTAL_FAST_PRESCRIPTION_SETS.find((s) => s.id === "post_extraction_surgery");
	assert.ok(postSurgerySet, "Package 'После удаления / хирургии' must exist");
	assert.deepEqual(postSurgerySet?.drugIds, ["amoxiclav_875_125", "nimesulide_100", "suprastin_25"]);

	const antiInflammatorySet = DENTAL_FAST_PRESCRIPTION_SETS.find((s) => s.id === "anti_inflammatory");
	assert.ok(antiInflammatorySet, "Package 'Противовоспалительный' must exist");
	assert.deepEqual(antiInflammatorySet?.drugIds, ["ibuprofen_400", "chlorhexidine_005"]);

	const antisepticSet = DENTAL_FAST_PRESCRIPTION_SETS.find((s) => s.id === "antiseptic_rinsing");
	assert.ok(antisepticSet, "Package 'Антисептический / полоскания' must exist");
	assert.deepEqual(antisepticSet?.drugIds, ["miramistin_001", "stomatophyt_100"]);

	const periostitisSet = DENTAL_FAST_PRESCRIPTION_SETS.find((s) => s.id === "periostitis_osteotropic");
	assert.ok(periostitisSet, "Package 'Периостит / Остеотропный комплекс' must exist");
	assert.deepEqual(periostitisSet?.drugIds, ["lincomycin_500", "metronidazole_500"]);

	const pediatricSet = DENTAL_FAST_PRESCRIPTION_SETS.find((s) => s.id === "pediatric_analgesic");
	assert.ok(pediatricSet, "Package 'Детский / Стоматит & Боль' must exist");
	assert.deepEqual(pediatricSet?.drugIds, ["ibuprofen_400", "cholisal_gel"]);

	// Payload generator for Form 107-1/u preserves drug order and sets withStampAndSignature
	const payload = generatePrescriptionPayloadFromSoap({
		clinic: { fullName: 'ООО "Денте Клиник"', address: "г. Москва, ул. Арбат, 10" },
		patient: { fullName: "Петров Петр Петрович", birthDate: "1985-04-12", medicalCardNumber: "043/у-100" },
		doctor: { fullName: "Д-р Смирнов А.П.", specialty: "Врач-стоматолог" },
		diagnosisIcd10: "K04.0",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "suprastin_25"],
		withStampAndSignature: true,
	});

	assert.equal(payload.formNumber, "107-1/у");
	assert.equal(payload.patientFullName, "Петров Петр Петрович");
	assert.equal(payload.items.length, 3);
	assert.ok(payload.items[0]?.latinName.includes("Amoxicillini"));
	assert.ok(payload.items[1]?.latinName.includes("Nimesulidi"));
	assert.ok(payload.items[2]?.latinName.includes("Chloropyramini"));
	assert.equal(payload.withStampAndSignature, true);

	const html = renderForm107_1uHtml(payload);
	assert.ok(html.includes("Форма бланка № 107-1/у"));
	assert.ok(html.includes("Приказ МЗ РФ № 1094н") || html.includes("1094н"));
	assert.ok(html.includes("Петров Петр Петрович"));
	assert.ok(html.includes("★ ШТАМП МЕДИЦИНСКОЙ ОРГАНИЗАЦИИ ★"));
	assert.ok(html.includes("Для<br>рецептов"));
	assert.ok(html.includes("М.П."));
	assert.ok(html.includes("Смирнов А.П."));
});
