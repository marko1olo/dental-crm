import assert from "node:assert/strict";
import test from "node:test";
import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	generatePrescriptionPayloadFromSoap,
	renderForm107_1uHtml,
} from "@dental/shared";
import { PrescriptionPrintModal } from "../components/prescriptions/PrescriptionPrintModal";

test("PrescriptionPrintModal component contract and drug catalog integrity", () => {
	assert.equal(typeof PrescriptionPrintModal, "function");

	// Catalog has standard items
	assert.ok(DENTAL_PRESCRIPTION_DRUG_CATALOG.length >= 10);
	const nimesil = DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === "nimesulide_100");
	assert.ok(nimesil);
	assert.equal(nimesil?.latinRp, "Rp.: Nimesulidi 100 mg");
	assert.equal(nimesil?.category, "nsaid");

	// Payload generator for Form 107-1/u
	const payload = generatePrescriptionPayloadFromSoap({
		clinic: { fullName: 'ООО "Денте Клиник"', address: "г. Москва, ул. Арбат, 10" },
		patient: { fullName: "Петров Петр Петрович", birthDate: "1985-04-12", medicalCardNumber: "043/у-100" },
		doctor: { fullName: "Д-р Смирнов А.П.", specialty: "Врач-стоматолог" },
		diagnosisIcd10: "K04.0",
	});

	assert.equal(payload.formNumber, "107-1/у");
	assert.equal(payload.patientFullName, "Петров Петр Петрович");
	assert.ok(payload.items.length >= 1 && payload.items.length <= 3);

	const html = renderForm107_1uHtml(payload);
	assert.ok(html.includes("Форма бланка № 107-1/у"));
	assert.ok(html.includes("Приказ МЗ РФ № 1094н") || html.includes("1094н"));
	assert.ok(html.includes("Петров Петр Петрович"));
});
