import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildFnsKnd1151156Xml } from "../fnsKnd1151156Builder.js";
import { renderDocumentHtml } from "../../../documents/renderDocument.js";
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

	it("documentTemplates.ts does not contain hardcoded mock INN or address", () => {
		const repoRoot = process.cwd().includes("apps")
			? path.resolve(process.cwd(), "../..")
			: process.cwd();
		const filePath = path.resolve(
			repoRoot,
			"apps/api/src/routes/documentTemplates.ts",
		);
		const content = fs.readFileSync(filePath, "utf-8");
		assert(
			!content.includes("7701234567"),
			"documentTemplates.ts must not contain hardcoded INN 7701234567",
		);
		assert(
			!content.includes("ул. Стоматологов"),
			"documentTemplates.ts must not contain mock address 'ул. Стоматологов'",
		);
		assert(
			content.includes("organizations.id"),
			"documentTemplates.ts must query organizations table dynamically",
		);
	});

	it("publicEstimatesService.ts does not contain synthetic demo patient Алексей with PIN 1234", () => {
		const repoRoot = process.cwd().includes("apps")
			? path.resolve(process.cwd(), "../..")
			: process.cwd();
		const filePath = path.resolve(
			repoRoot,
			"apps/api/src/services/publicEstimatesService.ts",
		);
		const content = fs.readFileSync(filePath, "utf-8");
		assert(
			!content.includes('patientFirstName: "Алексей"'),
			"publicEstimatesService.ts must not contain synthetic demo patient 'Алексей'",
		);
		assert(
			!content.includes('pin: "1234"'),
			"publicEstimatesService.ts must not contain synthetic PIN '1234'",
		);
	});

	it("sberPosWebhookRoute.ts does not contain hardcoded clinic INN or address", () => {
		const repoRoot = process.cwd().includes("apps")
			? path.resolve(process.cwd(), "../..")
			: process.cwd();
		const filePath = path.resolve(
			repoRoot,
			"apps/api/src/routes/payments/sberPosWebhookRoute.ts",
		);
		const content = fs.readFileSync(filePath, "utf-8");
		assert(
			!content.includes('clinicInn: "7701234567"'),
			"sberPosWebhookRoute.ts must not contain hardcoded clinic INN",
		);
		assert(
			!content.includes("Ломоносовский пр-т, 24"),
			"sberPosWebhookRoute.ts must not contain hardcoded Lomonosovsky address",
		);
		assert(
			content.includes("eq(organizations.id, orgId)"),
			"sberPosWebhookRoute.ts must query organizations table dynamically",
		);
	});

	it("renderDocument.ts has purged Form 025/u hospital bloat and enforces dental sovereignty notice (Mandate 8i)", () => {
		const repoRoot = process.cwd().includes("apps")
			? path.resolve(process.cwd(), "../..")
			: process.cwd();
		const filePath = path.resolve(
			repoRoot,
			"apps/api/src/documents/renderDocument.ts",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert(
			!content.includes("hospitalizationRows"),
			"renderDocument.ts must not contain hospitalizationRows",
		);
		assert(
			!content.includes("departmentHeadConsultations"),
			"renderDocument.ts must not contain departmentHeadConsultations",
		);
		assert(
			!content.includes("stayUrbanRuralCode"),
			"renderDocument.ts must not contain stayUrbanRuralCode",
		);
		assert(
			content.includes("dental-sovereignty-notice"),
			"renderDocument.ts must include outpatient dental sovereignty notice",
		);

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

		const doc025u = {
			id: "b0000000-0000-0000-0000-000000000001",
			organizationId: "o0000000-0000-0000-0000-000000000001",
			kind: "outpatient_medical_card_025u",
			patientId: mockPatient.id,
			title: "Медицинская карта 025/у",
			status: "draft",
			totalAmountRub: 0,
			payload: {
				outpatientMedicalCard025u: {
					formNumber: "025/у",
					sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н",
					medicalOrganizationName: "Стоматологическая Клиника Денте",
					medicalCardNumber: "СТ-1049",
					openedAt: "2026-03-01",
					periodStart: "2026-03-01",
					periodEnd: "2026-03-01",
					sourceVisitIds: ["v-1"],
					patientFullName: "Тестовый Пациент Амбулаторный",
					patientBirthDate: "1988-04-12",
					specialistVisitRecords: [
						{
							sourceVisitId: "v-1",
							visitDate: "2026-03-01",
							doctorFullName: "Врач-Стоматолог Соло И.И.",
							doctorPosition: "Врач-стоматолог-терапевт",
							doctorSpecialty: "Стоматология терапевтическая",
							firstOrRepeat: "first",
							complaints: "Боль в зубе 16 при накусывании",
							anamnesis: "Соматически здоров",
							objectiveData: "Зуб 16: глубокая кариозная полость",
							primaryDiagnosis: "К04.0 Начальный пульпит",
							primaryDiagnosisIcd10: "K04.0",
							orders: "Эндодонтическое лечение",
							treatmentProvided: "Экстирпация пульпы",
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
					],
				} as any,
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const html = renderDocumentHtml(
			doc025u as unknown as GeneratedDocument,
			mockPatient,
		);
		assert(
			html.includes("dental-sovereignty-notice"),
			"Rendered HTML must include dental sovereignty notice",
		);
		assert(
			html.includes("Форма 043/у"),
			"Rendered HTML must reference Form 043/u standard",
		);
		assert(
			html.includes("К04.0 Начальный пульпит"),
			"Rendered HTML must preserve outpatient clinical diagnosis",
		);
	});
});
