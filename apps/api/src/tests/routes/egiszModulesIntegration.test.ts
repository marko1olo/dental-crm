import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	resolveEgiszIntegrationStatus,
	validateGostCertificate,
	verifyDoctorFrmrProfile,
	verifyDoctorSnilsForFrmr,
} from "../../routes/egiszModules/egiszAuthService.js";
import {
	generateSemd101Xml,
	validateCdaParams,
} from "@dental/shared/cda";
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

	it("canonical CDA R2 engine builds deterministic SEMD 043/u with clinical fields", () => {
		const xml = generateSemd101Xml({
			docKind: "101",
			documentId: "00000000-0000-4000-8000-000000000001",
			visitDate: new Date("2026-10-12T10:00:00.000Z"),
			patient: {
				patientId: "patient-1",
				snils: "11223344595",
				name: { last: "Смирнов", first: "Алексей", middle: "Петрович" },
				birthDate: "1988-04-15",
				gender: "male",
			},
			doctor: {
				snils: "11223344595",
				name: { last: "Кузнецова", first: "Анна", middle: "Сергеевна" },
				specialtyName: "Врач-стоматолог-терапевт",
			},
			clinic: {
				oid: "1.2.643.5.1.13.13.12.2.77.8432",
				name: 'ООО "Стоматология ДЕНТЕ"',
			},
			complaints: "Боли в зубе 1.6 при приеме сладкого",
			diagnoses: [
				{
					icd10Code: "K02.1",
					diagnosisText: "Кариес дентина (средний)",
					isPrimary: true,
					tooth: "16",
				},
			],
			services: [
				{
					code: "A16.07.002",
					name: "Восстановление зуба пломбой (зуб 16)",
					quantity: 1,
					tooth: "16",
				},
			],
		});

		assert.ok(xml.includes("<ClinicalDocument"));
		assert.ok(xml.includes("Смирнов"));
		assert.ok(xml.includes("Кузнецова"));
		assert.ok(xml.includes("K02.1"));
		assert.ok(xml.includes("A16.07.002"));
		assert.ok(xml.includes("11223344595"));
	});

	it("canonical CDA R2 validator catches incomplete clinical data", () => {
		const validation = validateCdaParams({
			docKind: "101",
			documentId: "visit-1",
			visitDate: "2026-10-12T10:00:00.000Z",
			patient: {
				snils: "12345", // Bad SNILS
				fullName: "Тестов Тест",
				birthDate: "1990-01-01",
				gender: "male",
			},
			doctor: {
				snils: "12345", // Bad SNILS
				fullName: "Врач Врач",
			},
			clinic: {
				oid: "1.2.643.5.1.13.13.12.2.77.8432",
				name: "Клиника",
			},
			diagnoses: [], // Missing
		});

		assert.equal(validation.valid, false);
		assert.ok(validation.errors.length >= 1);
	});

	it("egiszVimisSender decodes statutory FLC errors", () => {
		const decoded = parseFlkErrors(["FLK-001", "FLK-002", "Custom error"]);
		assert.equal(decoded.length, 3);
		assert.equal(decoded[0], STATUTORY_FLK_ERROR_DICTIONARY["FLK-001"]);
		assert.equal(decoded[1], STATUTORY_FLK_ERROR_DICTIONARY["FLK-002"]);
		assert.equal(decoded[2], "Custom error");
	});

	it("[EGI-02] verifyDoctorFrmrProfile checks real DB users profile instead of offline regex", async () => {
		const createMockDb = (usersList: any[]) => ({
			select: () => ({
				from: () => ({
					where: () => ({
						limit: () => usersList,
					}),
				}),
			}),
		});

		// 1. Врач не найден
		const notFound = await verifyDoctorFrmrProfile(createMockDb([]), { doctorId: "00000000-0000-0000-0000-000000000001" });
		assert.equal(notFound.valid, false);
		assert.equal(notFound.status, "doctor_not_found");
		assert.ok(notFound.message?.includes("не найден в штатном расписании"));

		// 2. Врач деактивирован
		const inactive = await verifyDoctorFrmrProfile(
			createMockDb([{ id: "d1", fullName: "Иванов И.И.", role: "doctor", isActive: false, snils: "11223344595", specialties: ["Стоматология"] }]),
			{ doctorId: "d1" },
		);
		assert.equal(inactive.valid, false);
		assert.equal(inactive.status, "inactive");
		assert.ok(inactive.message?.includes("деактивирован"));

		// 3. У врача отсутствует СНИЛС в БД
		const missingSnils = await verifyDoctorFrmrProfile(
			createMockDb([{ id: "d2", fullName: "Петров П.П.", role: "doctor", isActive: true, snils: null, specialties: ["Стоматология"] }]),
			{ doctorId: "d2" },
		);
		assert.equal(missingSnils.valid, false);
		assert.equal(missingSnils.status, "needs_doctor_profile");
		assert.equal(missingSnils.error, "DoctorProfileIncomplete");
		assert.ok(missingSnils.message?.includes("не указан СНИЛС"));

		// 4. У врача не указана специальность в БД
		const missingSpec = await verifyDoctorFrmrProfile(
			createMockDb([{ id: "d3", fullName: "Сидоров С.С.", role: "doctor", isActive: true, snils: "11223344595", specialties: [] }]),
			{ doctorId: "d3" },
		);
		assert.equal(missingSpec.valid, false);
		assert.equal(missingSpec.status, "needs_doctor_profile");
		assert.equal(missingSpec.error, "DoctorProfileIncomplete");
		assert.ok(missingSpec.message?.includes("не указана специальность"));

		// 5. Полноценный профиль врача в БД
		const verified = await verifyDoctorFrmrProfile(
			createMockDb([{
				id: "d4",
				fullName: "Смирнова Елена Викторовна",
				role: "doctor",
				isActive: true,
				snils: "11223344595",
				specialties: ["Стоматология терапевтическая"],
				canSignMedicalRecords: true,
			}]),
			{ doctorId: "d4" },
		);
		assert.equal(verified.valid, true);
		assert.equal(verified.status, "verified");
		assert.equal(verified.doctor?.fullName, "Смирнова Елена Викторовна");
		assert.equal(verified.doctor?.snilsFormatted, "112-233-445 95");
	});

	it("[EGI-03] egiszVimisSender does not reject empty patient SNILS with false FLK-001 checksum error", async () => {
		// Создаем пакет СЭМД без СНИЛС пациента (например, ребенок или пациент с паспортом)
		const pkgWithoutSnils = {
			documentId: "VISIT-TEST-001",
			documentVersion: 1,
			xmlCanonicalPayload: "<ClinicalDocument xmlns=\"urn:hl7-org:v3\"><recordTarget/></ClinicalDocument>",
			doctorSignature: {
				signatureBase64: Buffer.alloc(64, 0x55).toString("base64"),
				certificateSerialNumber: "01ABCDEF",
				certificateSubject: "Врач",
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
			},
			metadata: {
				patientSnils: "", // СНИЛС не указан
				clinicOid: "1.2.643.5.1.13.13.12.2.77.1001",
				docTypeNsiCode: "108",
			},
		};

		// Пакет с невалидным СНИЛС обязан быть отклонен по FLK-001
		const pkgWithBadSnils = {
			...pkgWithoutSnils,
			metadata: {
				...pkgWithoutSnils.metadata,
				patientSnils: "12345678901", // Неверная контрольная сумма
			},
		};

		const resBad = await dispatchPackageToVimis({
			organizationId: "org-1",
			patientId: "patient-1",
			visitId: "visit-1",
			doctorId: "doctor-1",
			pkg: pkgWithBadSnils as any,
		});
		assert.equal(resBad.success, false);
		assert.equal(resBad.status, "Rejected");
		const flk001Error = STATUTORY_FLK_ERROR_DICTIONARY["FLK-001"];
		assert.ok(flk001Error && resBad.flkErrors?.includes(flk001Error));
	});
});
