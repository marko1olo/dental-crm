import assert from "node:assert";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import { buildFnsKnd1151156Xml } from "../fnsKnd1151156Builder.js";
import { renderDocumentHtml } from "../../../documents/renderDocument.js";
import { parsePassportFromString } from "../../../routes/documentTemplatesModules/defaultStatutoryTemplates.js";
import { PublicEstimatesService, type StoredPublicEstimate } from "../../publicEstimatesService.js";
import { verifySberPosWebhookChecksum } from "../../../routes/payments/sberPosWebhookRoute.js";
import type { GeneratedDocument, Patient } from "@dental/shared";

describe("Wave 108 — API Mock Purity & Outpatient Sovereignty Gates", () => {
	it("buildFnsKnd1151156Xml throws explicit error when IP full name is missing instead of using synthetic Иванов Иван", () => {
		const baseParams = {
			documentNumber: "00000001",
			documentDate: "2026-03-01",
			taxYear: "2025",
			clinic: {
				name: "ИП Петров П.П.",
				inn: "770198765432",
				ogrn: "321774600000000",
				isIndividualEntrepreneur: true,
			},
			patient: {
				fullName: { family: "Сидорова", given: "Анна", patronymic: "Сергеевна" },
				patientKinshipCode: "1" as const,
			},
			payer: {
				fullName: { family: "Сидорова", given: "Анна", patronymic: "Сергеевна" },
				inn: "770111223344",
				birthDate: "1990-05-15",
			},
			expenses: {
				code1AmountRub: 15000,
				code2AmountRub: 0,
			},
			signatory: {
				signatoryRole: "1" as const,
				snils: "98765432100",
				fullName: {
					family: "Смирнов",
					given: "Алексей",
					patronymic: "Петрович",
				},
			},
		};

		assert.throws(
			() => {
				buildFnsKnd1151156Xml(baseParams);
			},
			(err: unknown) => {
				assert(err instanceof Error);
				assert(
					err.message.includes(
						"Не указано ФИО индивидуального предпринимателя",
					),
					`Expected error message about missing IP full name, got: ${err.message}`,
				);
				return true;
			},
		);

		// With valid IP full name it must succeed without mock Иванов
		const { xmlContent } = buildFnsKnd1151156Xml({
			...baseParams,
			clinic: {
				...baseParams.clinic,
				ipFullName: { family: "Петров", given: "Петр", patronymic: "Петрович" },
			},
		});
		assert(!xmlContent.includes("Иванов"), "XML must not contain mock 'Иванов'");
		assert(xmlContent.includes('Фамилия="Петров"'), "XML must contain real IP surname");
		assert(xmlContent.includes('Имя="Петр"'), "XML must contain real IP given name");
		assert(xmlContent.includes('Отчество="Петрович"'), "XML must contain real IP patronymic");
	});

	it("parsePassportFromString dynamically parses series and number without hardcoded mocks", () => {
		const parsed1 = parsePassportFromString("Паспорт РФ 4510 №123456 выдан ТП №1");
		assert.equal(parsed1.series, "4510");
		assert.equal(parsed1.number, "123456");

		const parsed2 = parsePassportFromString("45 15 987654");
		assert.equal(parsed2.series, "4515");
		assert.equal(parsed2.number, "987654");

		const parsedEmpty = parsePassportFromString("");
		assert.deepEqual(parsedEmpty, {});
	});

	it("PublicEstimatesService registers and returns realistic estimate metadata in runtime", () => {
		const testToken = "test-token-wave108-" + Date.now();
		const estimate: StoredPublicEstimate = {
			id: "est-108",
			organizationId: "org-108",
			patientId: "pat-108",
			publicToken: testToken,
			estimateNumber: "СМ-2026-0042",
			status: "pending",
			validFrom: "2026-03-01",
			validUntil: null,
			clinicName: "Клиника Денте",
			clinicPhone: "+7 (495) 123-45-67",
			clinicEmail: "info@dente.ru",
			clinicAddress: "Москва, ул. Ленина, 1",
			clinicCurrency: "RUB",
			patientFirstName: "Елена",
			failedAttempts: 0,
			totalFailures: 0,
			isLocked: false,
			patientNotes: null,
			items: [],
		};

		PublicEstimatesService.registerEstimate(estimate);
		const meta = PublicEstimatesService.getMeta(testToken);

		assert(meta !== null, "Meta must be returned for registered estimate");
		assert.equal(meta.patient_first_name, "Елена");
		assert.equal(meta.estimate_number, "СМ-2026-0042");
		assert.equal(meta.clinic_name, "Клиника Денте");
	});

	it("verifySberPosWebhookChecksum validates HMAC-SHA256 signatures in runtime without disk regex", () => {
		const secret = "secret-key-sber-12345";
		const payload = {
			orderNumber: "ORD-999",
			amount: "15000",
			status: "deposited",
		};

		// Standard format: orderNumber;ORD-999;amount;15000;status;deposited;
		const sorted = "amount;15000;orderNumber;ORD-999;status;deposited;";
		const validHmac = crypto.createHmac("sha256", secret).update(sorted).digest("hex");

		const isValid = verifySberPosWebhookChecksum(payload, secret, validHmac);
		assert.equal(isValid, true, "Valid HMAC must be accepted");

		const isInvalid = verifySberPosWebhookChecksum(payload, secret, "invalid-hmac-hash");
		assert.equal(isInvalid, false, "Invalid HMAC must be rejected");

		const isEmpty = verifySberPosWebhookChecksum({}, secret, validHmac);
		assert.equal(isEmpty, false, "Empty payload must be rejected");
	});

	it("renderDocumentHtml enforces dental Form 043/u outpatient sovereignty (Mandate 8i)", () => {
		const mockPatient = {
			id: "a0000000-0000-0000-0000-000000000001",
			organizationId: "o0000000-0000-0000-0000-000000000001",
			status: "active",
			fullName: "Тестовый Пациент Амбулаторный",
			birthDate: "1988-04-12",
			phone: "+7 (999) 000-11-22",
			email: null,
			passportSeries: null,
			passportNumber: null,
			passportIssuedBy: null,
			passportIssuedDate: null,
			snils: null,
			insurancePolicy: null,
			discountPercent: 0,
			totalSpentRub: 0,
			balanceRub: 0,
			bonusBalanceRub: 0,
			notes: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		} as unknown as Patient;

		const doc043u = {
			id: "b0000000-0000-0000-0000-000000000001",
			organizationId: "o0000000-0000-0000-0000-000000000001",
			kind: "dental_medical_card_043u",
			patientId: mockPatient.id,
			title: "Медицинская карта 043/у",
			status: "draft",
			totalAmountRub: 0,
			payload: {
				dentalMedicalCard043u: {
					formNumber: "043/у",
					organization: {
						fullName: "Стоматологическая Клиника Денте",
						shortName: null,
						address: null,
						phone: null,
						ogrn: null,
						inn: null,
						licenseNumber: null,
						licenseIssueDate: null,
						licenseAuthority: null,
					},
					patient: {
						fullName: "Тестовый Пациент Амбулаторный",
						birthDate: "1988-04-12",
						sex: null,
						phone: "+7 (999) 000-11-22",
						address: null,
						documentSeriesNumber: null,
						snils: null,
						medicalCardNumber: "СТ-1049",
					},
					doctor: {
						fullName: "Врач-Стоматолог Соло И.И.",
						specialty: "Стоматология терапевтическая",
						position: "Врач-стоматолог-терапевт",
					},
					visitDate: "2026-03-01",
					complaint: "Боль в зубе 16 при накусывании",
					anamnesis: "Соматически здоров",
					objectiveStatus: "Зуб 16: глубокая кариозная полость",
					diagnosisText: "К04.0 Начальный пульпит",
					diagnosisIcd10: "K04.0",
					treatmentPlan: "Эндодонтическое лечение",
					treatmentDescription: "Экстирпация пульпы",
					clinicalToothRows: [
						{
							toothOrArea: "16",
							surfaces: ["occlusal"],
							status: "caries",
							diagnosisOrFinding: "Кариес дентина глубокий",
							indication: "Пломбирование",
							plannedAction: "Препарирование и композитная реставрация",
							prognosis: "благоприятный",
							periodontalStatus: "норма",
							implantOrProstheticNotes: null,
							orthodonticNotes: null,
						},
					],
				},
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const html = renderDocumentHtml(
			doc043u as unknown as GeneratedDocument,
			mockPatient,
		);
		assert(
			html.includes("Форма 043/у"),
			"Rendered HTML must reference Form 043/u standard",
		);
		assert(
			html.includes("К04.0 Начальный пульпит"),
			"Rendered HTML must preserve outpatient clinical diagnosis",
		);
		// Enforce no hospital inpatient bloat in rendered output
		assert(!html.includes("Госпитализация"), "Must not contain hospital admission rows");
		assert(!html.includes("Отделение стационара"), "Must not contain hospital department rows");
	});
});
