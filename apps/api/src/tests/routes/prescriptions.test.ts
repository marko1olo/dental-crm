import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG,
	PRESCRIPTION_DOSAGE_FORMS_CATALOG,
	PRESCRIPTION_VALIDITY_RULES,
	calculatePrescriptionExpiration,
	renderPrescriptionUniversalHtml,
	verifyPrescriptionStatutoryValidity,
} from "@dental/shared";
import {
	FORBIDDEN_NARCOTIC_INN_PATTERNS,
	registerPrescriptionRoutes,
} from "../../routes/prescriptions.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";

const ORG_ID = "cc550000-0000-4000-8000-000000000001";
const PATIENT_ID = "cc550000-0000-4000-8000-000000000002";
const DOCTOR_ID = "cc550000-0000-4000-8000-000000000003";
const RECEPTIONIST_ID = "cc550000-0000-4000-8000-000000000004";
const TEST_SECRET = "prescription-test-secret-key-32ch!".padEnd(48, "p");

describe("API Prescriptions Routes & Fastify Real Injects (Order 1094n)", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;
	let doctorToken = "";
	let receptionistToken = "";

	function doctorHeaders() {
		return {
			[CLINIC_TOKEN_HEADER]: doctorToken,
			[STAFF_TOKEN_HEADER]: doctorToken,
		};
	}

	function receptionistHeaders() {
		return {
			[CLINIC_TOKEN_HEADER]: receptionistToken,
			[STAFF_TOKEN_HEADER]: receptionistToken,
		};
	}

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		doctorToken = signToken(
			{
				organizationId: ORG_ID,
				userId: DOCTOR_ID,
				role: "doctor",
				type: "staff",
			},
			TEST_SECRET,
			3600,
		);

		receptionistToken = signToken(
			{
				organizationId: ORG_ID,
				userId: RECEPTIONIST_ID,
				role: "receptionist",
				type: "staff",
			},
			TEST_SECRET,
			3600,
		);

		app = Fastify({ logger: false });
		await registerPrescriptionRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
		process.env = { ...originalEnv };
		resetAuthSecretCacheForTests();
	});

	it("1. Statutory Reference Catalog and Dictionaries Integrity", () => {
		assert.ok(PRESCRIPTION_DOSAGE_FORMS_CATALOG.length >= 10);
		assert.ok(PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG.length >= 4);
		assert.ok(DENTAL_PRESCRIPTION_DRUG_CATALOG.length >= 15);
		assert.equal(PRESCRIPTION_VALIDITY_RULES["148-1u-88"].defaultValidityPeriod, "15");
		assert.equal(PRESCRIPTION_VALIDITY_RULES["107-1u"].defaultValidityPeriod, "60");
	});

	it("2. GET /api/prescriptions/reference-catalog returns 200 with full pharmacopeia", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/prescriptions/reference-catalog",
			headers: doctorHeaders(),
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.ok(Array.isArray(json.dosageForms));
		assert.ok(Array.isArray(json.catalog));
		assert.ok(json.validityRules);
	});

	it("3. GET /api/prescriptions/reference-catalog without auth returns 401", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/prescriptions/reference-catalog",
		});

		assert.equal(res.statusCode, 401);
	});

	it("4. POST /api/prescriptions/preview-html generates statutory HTML preview", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/prescriptions/preview-html",
			headers: {
				"content-type": "application/json",
				...doctorHeaders(),
			},
			payload: {
				formNumber: "107-1/у",
				clinicLegalName: "ООО «Денте Клиника»",
				clinicAddress: "г. Москва, ул. Клиническая, д. 1",
				clinicPhone: "+7 (495) 123-45-67",
				clinicOgrn: "1234567890123",
				prescriptionSeriesNumber: "107-0001",
				prescriptionDate: "2026-11-21",
				patientFullName: "Иванов Иван Иванович",
				patientBirthDate: "1985-05-15",
				medicalCardNumber: "043/у-001",
				doctorFullName: "Д-р Петров П. П.",
				validityDays: "60",
				items: [
					{
						latinName: "Rp.: Tab. Nimesulidi 100 mg",
						tradeName: "Нимесил",
						form: "таблетки",
						dosage: "100 мг",
						quantity: "N. 20",
						dispenseLatin: "D.t.d. N 20 in tab.",
						signaRussian: "По 1 таблетке 2 раза в день после еды",
					},
				],
			},
		});

		assert.equal(res.statusCode, 200);
		assert.ok(res.headers["content-type"]?.includes("text/html"));
		assert.ok(res.body.includes("107-1/у"));
		assert.ok(res.body.includes("ООО «Денте Клиника»"));
		assert.ok(res.body.includes("Nimesulidi"));
	});

	it("5. POST /api/prescriptions/validate performs statutory check and detects narcotic drugs", async () => {
		// Non-narcotic prescription passes
		const validRes = await app.inject({
			method: "POST",
			url: "/api/prescriptions/validate",
			headers: {
				"content-type": "application/json",
				...doctorHeaders(),
			},
			payload: {
				formType: "107-1u",
				prescriptionDate: "2026-11-21",
				validityDays: "60",
				items: [
					{ latinName: "Rp.: Nimesulidi 100 mg", tradeName: "Нимесил" },
				],
			},
		});

		assert.equal(validRes.statusCode, 200);
		const validJson = JSON.parse(validRes.body);
		assert.equal(validJson.success, true);
		assert.equal(validJson.validation.isValid, true);

		// Narcotic drug prescription fails validation with strict warning
		const narcoticRes = await app.inject({
			method: "POST",
			url: "/api/prescriptions/validate",
			headers: {
				"content-type": "application/json",
				...doctorHeaders(),
			},
			payload: {
				formType: "148-1u-88",
				prescriptionDate: "2026-11-21",
				validityDays: "15",
				items: [
					{ latinName: "Rp.: Sol. Morphini 1%", tradeName: "Морфин" },
				],
			},
		});

		assert.equal(narcoticRes.statusCode, 200);
		const narcoticJson = JSON.parse(narcoticRes.body);
		assert.equal(narcoticJson.validation.isValid, false);
		assert.ok(narcoticJson.validation.errors.some((e: string) => e.includes("наркотическим средствам")));
	});

	it("6. POST /api/prescriptions rejects creation with Schedule II/III narcotic analgesics", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/prescriptions",
			headers: {
				"content-type": "application/json",
				...doctorHeaders(),
			},
			payload: {
				patientId: PATIENT_ID,
				formType: "form_148_1_u_88",
				validityPeriod: "days_15",
				items: [
					{
						innLatin: "Morphine hydrochloride",
						tradeName: "Морфин",
						dosageFormLatin: "solutio",
						dosageDoseConcentration: "10 mg/ml",
						dispenseInstructionLatin: "D.t.d. N 5 in amp.",
						signatureDirectionRussian: "По 1 мл п/к при сильных болях",
						quantityPackages: 1,
					},
				],
			},
		});

		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
		assert.ok(json.message.includes("Некорректные параметры рецепта"));
	});

	it("7. POST /api/prescriptions rejects non-clinical roles (403 PermissionDenied)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/prescriptions",
			headers: {
				"content-type": "application/json",
				...receptionistHeaders(),
			},
			payload: {
				patientId: PATIENT_ID,
				formType: "form_107_1_u",
				validityPeriod: "days_60",
				items: [
					{
						innLatin: "Nimesulide",
						tradeName: "Нимесил",
						dosageFormLatin: "granules",
						dosageDoseConcentration: "100 mg",
						dispenseInstructionLatin: "D.t.d. N 10 in gran.",
						signatureDirectionRussian: "По 1 пакетику 2 раза в день",
						quantityPackages: 1,
					},
				],
			},
		});

		assert.equal(res.statusCode, 403);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "PermissionDenied");
		assert.equal(json.permission, "clinical.prescription.write");
	});

	it("8. POST /api/prescriptions/:id/sign-ukep rejects non-clinical roles (403 PermissionDenied)", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/prescriptions/${PATIENT_ID}/sign-ukep`,
			headers: {
				"content-type": "application/json",
				...receptionistHeaders(),
			},
			payload: {
				pkcs7Signature: "MIIBogYJKoZIhvcNAQcCoIIBkzCCAZMCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BBwGg...",
			},
		});

		assert.equal(res.statusCode, 403);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "PermissionDenied");
		assert.equal(json.permission, "clinical.prescription.sign_ukep");
	});

	it("9. GET /api/prescriptions/:id/print-html without existing prescription returns 404", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/prescriptions/00000000-0000-0000-0000-000000000099/print-html`,
			headers: doctorHeaders(),
		});

		assert.equal(res.statusCode, 404);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "PrescriptionNotFound");
	});
});
