import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateForm107Prescription } from "../components/prescriptions/generator/prescriptionEngine";

describe("Form 107-1/u Statutory Prescription Engine", () => {
	it("should generate valid Form 107-1/u prescription document with Latin Rx", () => {
		const doc = generateForm107Prescription({
			prescriptionSeriesNumber: "РЕЦ-2026-01",
			dateIso: "2026-08-22",
			validityDays: 60,
			clinicName: "ООО Денте",
			clinicOgrn: "1207700123456",
			clinicAddress: "Москва",
			patientFullName: "Иванов И.И.",
			patientBirthDate: "1990-01-01",
			patientMedicalCardNumber: "043/у-01",
			doctorFullName: "Д-р Смирнов А.П.",
			doctorSpecialty: "Терапевт",
			selectedMedicationIds: ["amoxiclav_875", "nimesil_100"],
		});

		assert.equal(doc.header.seriesNumber, "РЕЦ-2026-01");
		assert.equal(doc.items.length, 2);
		assert.equal(doc.items[0]?.itemNumber, 1);
		assert.ok(doc.items[0]?.latinRp.includes("Amoxicillini"));
		assert.ok(doc.items[1]?.latinRp.includes("Nimesulidi"));
	});
});
