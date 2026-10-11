import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	resolveEgiszIntegrationStatus,
	validateGostCertificate,
	verifyDoctorSnilsForFrmr,
} from "../../routes/egiszModules/egiszAuthService.js";
import {
	buildSemd043uPackage,
	validateSemdCompleteness,
} from "../../routes/egiszModules/egiszSemdBuilder.js";
import {
	dispatchPackageToVimis,
	parseFlkErrors,
	STATUTORY_FLK_ERROR_DICTIONARY,
} from "../../routes/egiszModules/egiszVimisSender.js";
import {
	DENTAL_NOMENCLATURE_804N,
	STATUTORY_SEMD_CATALOG,
} from "../../routes/egiszModules/egiszTypes.js";

describe("EGISZ Modular Architecture — Unit & Integration Tests", () => {
	it("STATUTORY_SEMD_CATALOG defines clinical dental document kinds", () => {
		assert.ok(STATUTORY_SEMD_CATALOG.length >= 6);
		const semd043 = STATUTORY_SEMD_CATALOG.find((s) => s.kind === "043/u");
		assert.ok(semd043);
		assert.equal(semd043?.nsiCode, "108");
		assert.equal(semd043?.requiresDoctorSignature, true);
		assert.equal(semd043?.requiresMoSignature, true);
	});

	it("DENTAL_NOMENCLATURE_804N defines key statutory Minzdrav dental codes", () => {
		assert.ok(DENTAL_NOMENCLATURE_804N.length >= 10);
		const filling = DENTAL_NOMENCLATURE_804N.find((s) => s.code === "A16.07.002");
		assert.ok(filling);
		assert.equal(filling?.section, "терапия");
	});

	it("egiszAuthService validates GOST R 34.10-2012 certificates", () => {
		const validRes = validateGostCertificate({
			thumbprint: "a1b2c3d4e5f678901234567890abcdef12345678",
			subjectName: "Иванов Иван Иванович",
			validFrom: new Date(Date.now() - 86400000).toISOString(),
			validTo: new Date(Date.now() + 86400000 * 300).toISOString(),
			hasDigitalSignatureUsage: true,
		});
		assert.equal(validRes.valid, true);
		assert.ok(validRes.certificateInfo);

		const expiredRes = validateGostCertificate({
			thumbprint: "a1b2c3d4e5f678901234567890abcdef12345678",
			validTo: new Date(Date.now() - 86400000).toISOString(),
		});
		assert.equal(expiredRes.valid, false);
		assert.match(expiredRes.reason || "", /истёк/);

		const badThumbprint = validateGostCertificate({
			thumbprint: "short",
		});
		assert.equal(badThumbprint.valid, false);
		assert.match(badThumbprint.reason || "", /40-значный/);
	});

	it("egiszAuthService verifies doctor SNILS for FRMR", () => {
		const valid = verifyDoctorSnilsForFrmr("11223344595");
		assert.equal(valid.valid, true);
		assert.equal(valid.snilsFormatted, "112-233-445 95");

		const badCheck = verifyDoctorSnilsForFrmr("12345678901");
		assert.equal(badCheck.valid, false);
		assert.equal(badCheck.error, "InvalidSnilsChecksum");

		const badLength = verifyDoctorSnilsForFrmr("12345");
		assert.equal(badLength.valid, false);
		assert.equal(badLength.error, "InvalidSnilsFormat");
	});

	it("egiszAuthService resolves integration status dynamically", () => {
		const status = resolveEgiszIntegrationStatus({
			baseUrl: "https://hub.n3health.ru",
			guid: "guid-123",
			lpuId: "lpu-456",
			frmoId: "frmo-789",
			clinicOid: "1.2.643.5.1.13.13.12.2.77.8432",
		});
		assert.equal(status.ok, true);
		assert.equal(status.configured, true);
		assert.equal(status.frmoStatus, "CONNECTED");
		assert.equal(status.frmrStatus, "CONNECTED");
		assert.equal(status.remdStatus, "CONNECTED");
		assert.equal(status.vimisStatus, "CONNECTED");
		assert.equal(status.missingConfiguration.length, 0);
	});

	it("egiszSemdBuilder builds deterministic SEMD 043/u with clinical fields", () => {
		const built = buildSemd043uPackage({
			visitId: "00000000-0000-4000-8000-000000000001",
			visitDate: "2026-10-12T10:00:00.000Z",
			patient: {
				id: "patient-1",
				fullName: "Смирнов Алексей Петрович",
				snils: "11223344595",
				birthDate: "1988-04-15",
				gender: "male",
			},
			doctor: {
				id: "doctor-1",
				fullName: "Кузнецова Анна Сергеевна",
				snils: "11223344595",
				specialty: "терапевт",
			},
			complaints: "Боли в зубе 1.6 при приеме сладкого",
			diagnoses: [
				{
					icd10Code: "K02.1",
					title: "Кариес дентина (средний)",
					isPrimary: true,
				},
			],
			servicesRendered: [
				{
					code804n: "A16.07.002",
					title: "Восстановление зуба пломбой (зуб 16)",
					toothNumber: 16,
					quantity: 1,
					priceKopecks: 450000,
				},
			],
		});

		assert.ok(built.canonicalXml.includes("<ClinicalDocument"));
		assert.ok(built.canonicalXml.includes("Смирнов"));
		assert.ok(built.canonicalXml.includes("Кузнецова"));
		assert.ok(built.canonicalXml.includes("K02.1"));
		assert.ok(built.canonicalXml.includes("A16.07.002"));
		assert.ok(built.canonicalXml.includes("11223344595"));
		assert.equal(built.remdPackage.documentId, "00000000-0000-4000-8000-000000000001");
		assert.equal(built.validationIssues.length, 0);
	});

	it("egiszSemdBuilder catches incomplete clinical data", () => {
		const issues = validateSemdCompleteness({
			visitId: "visit-1",
			visitDate: "2026-10-12T10:00:00.000Z",
			patient: {
				id: "p1",
				fullName: "Тестов Тест",
				snils: "12345", // Bad SNILS
			},
			doctor: {
				id: "d1",
				fullName: "Врач Врач",
				snils: "12345", // Bad SNILS
			},
			diagnoses: [], // Missing
			servicesRendered: [], // Missing
		});

		assert.ok(issues.length >= 3);
	});

	it("egiszVimisSender decodes statutory FLC errors", () => {
		const decoded = parseFlkErrors(["FLK-001", "FLK-002", "Custom error"]);
		assert.equal(decoded.length, 3);
		assert.equal(decoded[0], STATUTORY_FLK_ERROR_DICTIONARY["FLK-001"]);
		assert.equal(decoded[1], STATUTORY_FLK_ERROR_DICTIONARY["FLK-002"]);
		assert.equal(decoded[2], "Custom error");
	});
});
