import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { generateFnsTaxCertificateData } from "../../../components/portal/patientPortalEngine.js";
import type { PatientPortalProfile } from "../../../components/portal/patientPortalTypes.js";
import { DEFAULT_CLINIC_CREDENTIALS, DEFAULT_DOCTOR_SIGNATURE } from "../../../components/visiograph/VisiographLegalWatermark.js";

describe("Wave 109: Fast Checkout, Requisites and Watermark Mock Purity", () => {
	it("FastCheckoutModal.tsx has eradicated synthetic patient and monetary defaults", () => {
		const repoRoot = process.cwd().includes("apps") ? path.resolve(process.cwd(), "../..") : process.cwd();
		const content = fs.readFileSync(path.resolve(repoRoot, "apps/web/src/components/finance/FastCheckoutModal.tsx"), "utf-8");

		assert(!content.includes('"Смирнова Екатерина Васильевна"'), "Must not contain mock patient name");
		assert(!content.includes("patientDepositRub = 85000"), "Must not default to 85000 rub deposit");
		assert(!content.includes("advanceAlreadyPaidRub = 15000"), "Must not default to 15000 rub advance");
		assert(!content.includes("1960000"), "Must not default to 1960000 kopecks");
		assert(!content.includes('placeholder="7701234567"'), "Must not use 7701234567 as placeholder");
	});

	it("generateFnsTaxCertificateData does not hardcode fake clinic INN 7701234567", () => {
		const res = generateFnsTaxCertificateData(
			{
				patientId: "p-1",
				fullName: "Пациент Тестовый",
				birthDate: "1990-01-01",
				phone: "+79991112233",
			} as unknown as PatientPortalProfile,
			[],
			2026,
		);
		assert.strictEqual(res.clinicInn, "");
		assert.strictEqual(res.clinicKpp, "");
		assert(!JSON.stringify(res).includes("7701234567"), "Certificate must not contain 7701234567");
	});

	it("DEFAULT_CLINIC_CREDENTIALS in VisiographLegalWatermark does not contain fake INN or OGRN", () => {
		assert.strictEqual(DEFAULT_CLINIC_CREDENTIALS.inn, "");
		assert.strictEqual(DEFAULT_CLINIC_CREDENTIALS.ogrn, "");
		assert.strictEqual(DEFAULT_CLINIC_CREDENTIALS.licenseNumber, "");
		assert.strictEqual(DEFAULT_DOCTOR_SIGNATURE.certificateOrSnils, "");
	});

	it("TreatmentPlanCompletedActPrint and TreatmentPlanContractPrint do not fallback to 7701234567", () => {
		const repoRoot = process.cwd().includes("apps") ? path.resolve(process.cwd(), "../..") : process.cwd();
		const actContent = fs.readFileSync(path.resolve(repoRoot, "apps/web/src/components/treatment-plans/TreatmentPlanCompletedActPrint.tsx"), "utf-8");
		const contractContent = fs.readFileSync(path.resolve(repoRoot, "apps/web/src/components/treatment-plans/TreatmentPlanContractPrint.tsx"), "utf-8");

		assert(!actContent.includes('"7701234567"'), "CompletedActPrint must not contain 7701234567");
		assert(!contractContent.includes('"7701234567"'), "ContractPrint must not contain 7701234567");
	});

	it("medicalWasteEngine and PrescriptionPrintModal do not fallback to 7701234567", () => {
		const repoRoot = process.cwd().includes("apps") ? path.resolve(process.cwd(), "../..") : process.cwd();
		const wasteContent = fs.readFileSync(path.resolve(repoRoot, "apps/web/src/components/sanpin/waste/medicalWasteEngine.ts"), "utf-8");
		const rxContent = fs.readFileSync(path.resolve(repoRoot, "apps/web/src/components/prescriptions/PrescriptionPrintModal.tsx"), "utf-8");

		assert(!wasteContent.includes('"7701234567"'), "medicalWasteEngine must not contain 7701234567");
		assert(!rxContent.includes('"7701234567"'), "PrescriptionPrintModal must not contain 7701234567");
	});
});
