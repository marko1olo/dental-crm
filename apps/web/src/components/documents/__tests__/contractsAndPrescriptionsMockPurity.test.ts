import assert from "node:assert";
import { describe, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	PrescriptionPrintModal,
	resolvePrescriptionPatientName,
} from "../../prescriptions/PrescriptionPrintModal";
import {
	createDefaultPaidContract,
	generatePaidContractText,
	generatePaidContractHtml,
} from "../paidContractEngine";
import { generatePrimaryIntakePackageHtml } from "../primaryIntakePackagePrintEngine";
import { generateClinicalPackageHtml } from "../clinicalPackagePrintEngine";
import { formatRublesExactRu, kopecksToWordsRu } from "../documentPrintFormatters";
import {
	generateWarrantyCertificateHtml,
	generateWarrantyRemediationActHtml,
} from "../../warranty/warrantyCertificateHtml";
import { numberToWordsRu } from "../../treatment-plans/treatmentPlanActFormatters";
import {
	DEFAULT_TELEGRAM_PREVIEW_PATIENT,
	buildDefaultTelegramPreview,
} from "../../settings/SettingsTelegramTab";

describe("Contracts, Prescriptions and Forms Mock Purity (Wave 107 - THE HAMMER, Mandates 8b & 8e)", () => {
	const TARGET_FILES = [
		{
			name: "PrescriptionPrintModal.tsx",
			description: "Рецептурный бланк 107-1/у (Приказ Минздрава 1094н)",
		},
		{
			name: "paidContractEngine.ts",
			description: "Договор возмездного оказания стоматологических услуг (ПП РФ № 736)",
		},
		{
			name: "SettingsTelegramTab.tsx",
			description: "Шаблоны превью уведомлений Telegram",
		},
	];

	const SYNTHETIC_MOCK_NAME = "Иванов Иван Иванович";

	for (const target of TARGET_FILES) {
		test(`Absence of synthetic mock name '${SYNTHETIC_MOCK_NAME}' in ${target.name} (${target.description})`, () => {
			if (target.name === "PrescriptionPrintModal.tsx") {
				const html = renderToStaticMarkup(
					React.createElement(PrescriptionPrintModal, { isOpen: true, onClose: () => {} }),
				);
				assert.equal(html.includes(SYNTHETIC_MOCK_NAME), false);
			} else if (target.name === "paidContractEngine.ts") {
				const html = generatePaidContractHtml(createDefaultPaidContract({}));
				assert.equal(html.includes(SYNTHETIC_MOCK_NAME), false);
			} else {
				const preview = buildDefaultTelegramPreview("appointment_confirmation");
				assert.equal(preview.text.includes(SYNTHETIC_MOCK_NAME), false);
			}
		});
	}

	test("Functional verification: PrescriptionPrintModal defaults patientName to empty string instead of mock", () => {
		assert.equal(resolvePrescriptionPatientName(undefined, undefined), "");
		const html = renderToStaticMarkup(
			React.createElement(PrescriptionPrintModal, { isOpen: true, onClose: () => {} }),
		);
		assert.equal(html.includes(SYNTHETIC_MOCK_NAME), false);
	});

	test("Functional verification: createDefaultPaidContract defaults patient.fullName to empty string for blank underlines (Mandate 8e)", () => {
		const defaultContract = createDefaultPaidContract({});
		assert.equal(
			defaultContract.patient.fullName,
			"",
			"В договоре по умолчанию patient.fullName обязан быть пустой строкой, а не фейковым ФИО",
		);
	});

	test("Functional verification: SettingsTelegramTab DEFAULT_TELEGRAM_PREVIEW_PATIENT has empty fullName and buildDefaultTelegramPreview runs cleanly", () => {
		assert.equal(
			DEFAULT_TELEGRAM_PREVIEW_PATIENT.fullName,
			"",
			"DEFAULT_TELEGRAM_PREVIEW_PATIENT.fullName обязан быть пустой строкой",
		);

		const preview = buildDefaultTelegramPreview("appointment_confirmation");
		assert.ok(preview.text.length > 20, "Превью должно формироваться корректно");
		assert.ok(
			!preview.text.includes(SYNTHETIC_MOCK_NAME),
			"Текст превью не должен содержать синтетический мок ФИО",
		);
	});

	test("Dual-mode zero-mock (Mandate 8y): paidContractEngine defaults doctor and director to empty string in production with underlines in signatures", () => {
		const contract = createDefaultPaidContract({});
		assert.equal(contract.doctorFullName, "", "Doctor full name must default to empty in production");
		assert.equal(contract.clinic.directorFullName, "", "Director full name must default to empty in production");

		const text = generatePaidContractText(contract);
		assert.ok(text.includes("/ ________________________ /"), "Must output underlines for empty doctor and director signatures in text");

		const html = generatePaidContractHtml(contract);
		assert.ok(html.includes("/ ________________________ /"), "Must output underlines for empty doctor and director signatures in HTML");
	});

	test("Dual-mode zero-mock (Mandate 8y): primaryIntakePackagePrintEngine defaults director to underlines in production", () => {
		const html = generatePrimaryIntakePackageHtml({
			clinic: {
				fullName: "ООО Стоматология",
			},
			patient: {
				fullName: "Тестовый Пациент",
			},
		});
		assert.ok(!html.includes("Иванов И.И."), "Production primary intake package must not render synthetic Ivanov I.I.");
		assert.ok(html.includes("________________________"), "Production primary intake package must render signature underline for missing director");
	});

	test("DENTE documentPrintFormatters: exact sum in words and safe rubles formatting", () => {
		assert.equal(
			formatRublesExactRu(15450.5).replace(/\u00a0/g, " "),
			"15 450,50 ₽",
			"formatRublesExactRu must format numbers to exact rubles and kopecks",
		);
		assert.equal(
			formatRublesExactRu(null).replace(/\u00a0/g, " "),
			"0,00 ₽",
			"formatRublesExactRu must safely handle null without NaN",
		);
		assert.equal(
			formatRublesExactRu(undefined).replace(/\u00a0/g, " "),
			"0,00 ₽",
			"formatRublesExactRu must safely handle undefined without NaN",
		);
		assert.equal(
			kopecksToWordsRu(1545050),
			"Пятнадцать тысяч четыреста пятьдесят рублей 50 копеек",
			"kopecksToWordsRu must decline rubles and kopecks properly",
		);
	});

	test("DENTE clinicalPackagePrintEngine: signatures-grid has break-inside avoid protection", () => {
		const html = generateClinicalPackageHtml({
			patient: { fullName: "Петров Петр Петрович" },
			clinic: { fullName: "ДЕНТЕ Клиника" },
		});
		assert.ok(html.includes("break-inside: avoid;"), "signatures-grid must include break-inside: avoid;");
		assert.ok(html.includes("page-break-inside: avoid;"), "signatures-grid must include page-break-inside: avoid;");
	});

	test("DENTE primaryIntakePackagePrintEngine: no double underline when patient name is empty", () => {
		const html = generatePrimaryIntakePackageHtml({
			clinic: { fullName: "ДЕНТЕ Клиника" },
			patient: { fullName: "" },
		});
		assert.ok(!html.includes("________________ / ________________"), "Must never leak double underline artifact");
		assert.ok(html.includes("break-inside: avoid;"), "signatures-row must include break-inside: avoid;");
	});

	test("DENTE warrantyCertificateHtml: zero undefined leaks and signature break-inside protection", () => {
		const htmlCert = generateWarrantyCertificateHtml({
			certificateId: "WAR-2026-001",
			issueDate: "2026-09-29",
			clinic: { name: "ДЕНТЕ" } as any,
			doctor: { fullName: "" } as any,
			patient: { fullName: "" } as any,
			items: [],
			calculation: {
				adjustedWarrantyMonths: 12,
				adjustedServiceLifeMonths: 24,
				totalRiskMultiplier: 1.0,
				checkupSchedule: [],
			} as any,
			qrCodeSvg: "<svg></svg>",
			integrityHash: "abc123hash",
		} as any);
		assert.ok(!htmlCert.includes("undefined •"), "Warranty certificate must never leak raw undefined in clinic header");
		assert.ok(!htmlCert.includes("Тел: undefined"), "Warranty certificate must never leak undefined phone");
		assert.ok(htmlCert.includes("break-inside: avoid;"), "signatures-block must include break-inside: avoid;");

		const htmlAct = generateWarrantyRemediationActHtml({
			orderNumber: "ACT-001",
			performedAtIso: "2026-09-29T10:00:00Z",
			defectType: "chipping",
			defectTitle: "Скол композита",
			clinicalFinding: "Дефект пломбы",
			remediationAction: "Шлифовка и реставрация",
			toothNumber: 16,
			certificateId: "WAR-2026-001",
			materialsDeducted: [],
		} as any);
		assert.ok(!htmlAct.includes("undefined •"), "Remediation act must not leak undefined");
		assert.ok(htmlAct.includes("break-inside: avoid;"), "signatures in remediation act must include break-inside: avoid;");
	});

	test("DENTE treatmentPlanActFormatters: numberToWordsRu delegates accurately to SSOT", () => {
		assert.equal(
			numberToWordsRu(19600, 0),
			"Девятнадцать тысяч шестьсот рублей 00 копеек",
			"numberToWordsRu must produce standard accounting text",
		);
		assert.equal(
			numberToWordsRu(0, 50),
			"Ноль рублей 50 копеек",
			"numberToWordsRu must handle fractional kopecks correctly",
		);
	});

	test("DENTE TreatmentPlanActSignatures: break-inside avoid and print:grid-cols-2 protection", async () => {
		const [{ renderToStaticMarkup }, React, { TreatmentPlanActSignatures }, { BRAND_COLOR_PALETTES }] =
			await Promise.all([
				import("react-dom/server"),
				import("react"),
				import("../../treatment-plans/actSignatures/TreatmentPlanActSignatures"),
				import("../../../store/documentBrandingStore"),
			]);
		const html = renderToStaticMarkup(
			React.createElement(TreatmentPlanActSignatures, {
				actData: {
					actNumber: "АКТ-2026/1",
					actDate: "27.11.2026",
					contractNumber: "ДОГ-2026/1",
					patientId: "p-1",
					patientName: "Петров Алексей",
					doctorFullName: "Др. Смирнов",
					clinicName: "ООО «Денте»",
					stageNumber: 1,
					stageTitle: "Терапия",
					completedProcedures: [],
					writtenOffMaterials: [],
					totalServiceRub: 5000,
					totalServiceKopecks: 500000 as never,
					totalMaterialCostRub: 500,
					totalMaterialCostKopecks: 50000 as never,
					marginRub: 4500,
					marginPercent: 90,
					status: "signed",
					createdAtIso: "2026-11-27T10:00:00.000Z",
				},
				palette: BRAND_COLOR_PALETTES.deep_teal,
				legalName: "ООО «Денте»",
				showDoctorStampFrame: true,
				showQrVerification: false,
				verificationHash: "hash-1",
			}),
		);
		assert.ok(html.includes("break-inside:avoid") || html.includes("break-inside-avoid"));
		assert.ok(html.includes("print:grid-cols-2"));
	});

	test("DENTE TreatmentPlanContractPrint: sum in words banner and print:grid-cols-3 protection", async () => {
		const [{ renderToStaticMarkup }, React, { TreatmentPlanContractPrint }] = await Promise.all([
			import("react-dom/server"),
			import("react"),
			import("../../treatment-plans/TreatmentPlanContractPrint"),
		]);
		const html = renderToStaticMarkup(
			React.createElement(TreatmentPlanContractPrint, {
				isOpen: true,
				tier: {
					id: "optimum",
					title: "Оптимум",
					subtitle: "Комплексное лечение",
					warrantyYears: 3,
					estimatedDurationRu: "2 недели",
					badgeColor: "teal",
					clinicalPros: [],
					items: [
						{
							id: "item-1",
							serviceId: "srv-1",
							serviceName: "Лечение кариеса",
							code804n: "A16.07.002",
							toothNumber: 16,
							priceRub: 5000,
							priceKopecks: 500000 as never,
							quantity: 1,
							discountRub: 0,
							stageNumber: 1,
						},
					],
				},
				stages: [],
				patientName: "Петров Алексей",
				patientId: "p-1",
				doctorFullName: "Др. Смирнов",
				clinicName: "ООО «Денте»",
				onClose: () => {},
			}),
		);
		assert.ok(html.includes("Сумма сметы прописью:"));
		assert.ok(html.includes("print:grid-cols-3"));
		assert.ok(html.includes("break-inside:avoid") || html.includes("break-inside-avoid"));
	});

	test("DENTE ProfessionalDocumentA4Sheet: signature slashes rendered on ContractSheetPage3", async () => {
		const [{ renderToStaticMarkup }, React, { ContractSheetPage3 }, { buildA4ClinicRequisites }] =
			await Promise.all([
				import("react-dom/server"),
				import("react"),
				import("../professionalA4/ContractSheetPage3"),
				import("../professionalA4/a4ClinicPatientDefaults"),
			]);
		const clinic = buildA4ClinicRequisites({ clinicName: "ООО «Денте»", licenseNumber: "ЛО-77-01" });
		const html = renderToStaticMarkup(
			React.createElement(ContractSheetPage3, {
				cl: clinic,
				contractData: {
					contractNumber: "ДОГ-2026/01",
					contractDate: "27.11.2026",
					clinic,
					patient: {
						fullName: "Сидоров Павел",
						birthDate: "1990-01-01",
						phone: "+79001112233",
						address: "Москва",
					},
					estimatedTotalRub: 5000,
					doctorFullName: "",
				},
			}),
		);
		assert.ok(html.includes("________________________"));
		assert.ok(html.includes("/ Сидоров Павел /"));
	});

	test("Mandate 8y & 8z: Absence of Soviet ciphers in DocumentsStudio package selector UI", async () => {
		const [{ renderToStaticMarkup }, React, { DocumentsPackageSelector }] = await Promise.all([
			import("react-dom/server"),
			import("react"),
			import("../studio/DocumentsPackageSelector"),
		]);
		const html = renderToStaticMarkup(
			React.createElement(DocumentsPackageSelector, {
				activePackage: "informed_consent",
				onSelectPackage: () => {},
				activeConsentSubKind: "therapy",
				onSelectConsentSubKind: () => {},
			}),
		);
		assert.equal(html.includes("Форма 257/у"), false);
		assert.equal(html.includes("Форма 043/у"), false);
	});

	test("Mandate 8y: PrimaryIntakePackagePrintEngine zero-mock clinic requisites in production", () => {
		const html = generatePrimaryIntakePackageHtml({
			clinic: null,
			patient: { fullName: "Петров Василий" },
		});
		assert.ok(
			!html.includes("7701987654"),
			"Must not leak mock INN 7701987654 in production primary intake package",
		);
		assert.ok(
			!html.includes("ЛО41-01137-77/00584930"),
			"Must not leak mock license ЛО41-01137-77/00584930 in production primary intake package",
		);
		assert.ok(
			html.includes("«______________»"),
			"Must output clean underline for missing clinic INN in production",
		);
		assert.ok(
			html.includes("«________________________________________»"),
			"Must output clean underline for missing clinic license in production",
		);
	});

	test("Mandate 8d & 8e: PrimaryIntakePackagePrintEngine renders Legal Representative across all 4 blanks for minors", () => {
		const html = generatePrimaryIntakePackageHtml({
			clinic: {
				legalName: "ООО Стоматология ДЕНТЕ",
				inn: "7801234567",
				licenseNumber: "ЛО-78-01-011223",
				address: "г. Санкт-Петербург, Невский пр., 1",
			},
			patient: {
				fullName: "Смирнов Миша (7 лет)",
				birthDate: "2019-06-15",
				phone: "+7 999 000-11-22",
				cardNumber: "Д-451",
			},
			representative: {
				fullName: "Смирнова Анна Сергеевна",
				relationship: "Мать",
				phone: "+7 999 555-44-33",
				passportSeries: "40 15",
				passportNumber: "654321",
				passportIssuedBy: "ТП №1 УФМС по СПб",
				passportIssuedDate: "2015-08-20",
				passportDepartmentCode: "780-001",
				basisDocument: "Свидетельство о рождении серия I-АК № 123456",
			},
			doctorFullName: "Д-р Васильев В. В.",
		});

		// Бланк 1: Договор возмездного оказания услуг
		assert.ok(
			html.includes("Заказчик (Законный представитель):"),
			"Blank 1 must designate representative as customer",
		);
		assert.ok(
			html.includes("Смирнова Анна Сергеевна"),
			"Blank 1 must include representative full name",
		);
		assert.ok(
			html.includes("Мать"),
			"Blank 1 must specify relationship",
		);
		assert.ok(
			html.includes("Свидетельство о рождении серия I-АК № 123456"),
			"Blank 1 must specify basis document",
		);
		assert.ok(
			html.includes("ЗАКОННЫЙ ПРЕДСТАВИТЕЛЬ (Мать):"),
			"Blank 1 signature box must be labeled for legal representative",
		);

		// Бланк 2: ИДС (Приказ 1051н)
		assert.ok(
			html.includes("являясь законным представителем (основание: Свидетельство о рождении"),
			"Blank 2 must state legal representation basis",
		);
		assert.ok(
			html.includes("Законный представитель (Мать):"),
			"Blank 2 signature box must be labeled for legal representative",
		);

		// Бланк 3: 152-ФЗ Согласие на обработку ПДн
		assert.ok(
			html.includes("в интересах подопечного даю согласие Оператору"),
			"Blank 3 must declare consent in interests of ward",
		);
		assert.ok(
			html.includes("Законный представитель (Мать) в интересах несовершеннолетнего:"),
			"Blank 3 signature must be for representative in interests of minor",
		);

		// Бланк 4: Анкета о состоянии здоровья
		assert.ok(
			html.includes("Представитель: <strong>Смирнова Анна Сергеевна</strong> (Мать)"),
			"Blank 4 must render representative banner",
		);
		assert.ok(
			html.includes("Заявление законного представителя:"),
			"Blank 4 must adapt statement for legal representative",
		);
	});

	test("Mandate 8y: createDefaultPaidContract zero-mock in production with customer & representative pass-through", () => {
		const contract = createDefaultPaidContract({
			patientFullName: "Иванов Ребёнок",
			representative: {
				fullName: "Иванова Мама",
				basisDocument: "Свидетельство о рождении",
			},
		});

		assert.ok(
			!contract.clinic.inn.includes("7704123456"),
			"createDefaultPaidContract must not leak mock INN 7704123456 in production",
		);
		assert.ok(
			!contract.clinic.licenseNumber.includes("Л041-01137-77/00584930"),
			"createDefaultPaidContract must not leak mock license in production",
		);
		assert.equal(contract.representative.hasRepresentative, true);
		assert.equal(contract.representative.fullName, "Иванова Мама");
		assert.equal(contract.representative.basisDocument, "Свидетельство о рождении");
	});
});
