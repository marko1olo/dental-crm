import assert from "node:assert";
import { describe, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const webSrcDir = path.resolve(__dirname, "../../..");

	const TARGET_FILES = [
		{
			name: "PrescriptionPrintModal.tsx",
			relativePath: "components/prescriptions/PrescriptionPrintModal.tsx",
			description: "Рецептурный бланк 107-1/у (Приказ Минздрава 1094н)",
		},
		{
			name: "paidContractEngine.ts",
			relativePath: "components/documents/paidContractEngine.ts",
			description: "Договор возмездного оказания стоматологических услуг (ПП РФ № 736)",
		},
		{
			name: "DailyDentistWorkSheet037uForm.tsx",
			relativePath: "components/documents/forms/DailyDentistWorkSheet037uForm.tsx",
			description: "Листок ежедневного учета работы врача-стоматолога Форма 037/у",
		},
		{
			name: "SettingsTelegramTab.tsx",
			relativePath: "components/settings/SettingsTelegramTab.tsx",
			description: "Шаблоны превью уведомлений Telegram",
		},
	];

	const SYNTHETIC_MOCK_NAME = "Иванов Иван Иванович";

	for (const target of TARGET_FILES) {
		test(`Absence of synthetic mock name '${SYNTHETIC_MOCK_NAME}' in ${target.name} (${target.description})`, () => {
			const fullPath = path.join(webSrcDir, target.relativePath);
			assert.ok(fs.existsSync(fullPath), `Файл должен существовать: ${target.relativePath}`);
			const content = fs.readFileSync(fullPath, "utf-8");

			assert.ok(
				!content.includes(SYNTHETIC_MOCK_NAME),
				`Файл ${target.name} не должен содержать синтетический мок '${SYNTHETIC_MOCK_NAME}'`,
			);
		});
	}

	test("Functional verification: PrescriptionPrintModal defaults patientName to empty string instead of mock", () => {
		const fullPath = path.join(webSrcDir, "components/prescriptions/PrescriptionPrintModal.tsx");
		const content = fs.readFileSync(fullPath, "utf-8");

		assert.ok(
			content.includes('const patientName = patient?.fullName || "";') ||
				content.includes('const patientName = patient?.fullName || patientNameProp || "";'),
			"В PrescriptionPrintModal patientName должен иметь дефолтное значение пустой строки",
		);
	});

	test("Functional verification: createDefaultPaidContract defaults patient.fullName to empty string for blank underlines (Mandate 8e)", () => {
		const defaultContract = createDefaultPaidContract({});
		assert.equal(
			defaultContract.patient.fullName,
			"",
			"В договоре по умолчанию patient.fullName обязан быть пустой строкой, а не фейковым ФИО",
		);
	});

	test("Functional verification: DailyDentistWorkSheet037uForm defaults doctorFullName to empty string", () => {
		const fullPath = path.join(
			webSrcDir,
			"components/documents/forms/DailyDentistWorkSheet037uForm.tsx",
		);
		const content = fs.readFileSync(fullPath, "utf-8");

		assert.ok(
			content.includes('initialPayload?.doctorFullName ?? ""'),
			"В DailyDentistWorkSheet037uForm doctorFullName обязан инициализироваться пустой строкой",
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

	test("StomX documentPrintFormatters: exact sum in words and safe rubles formatting", () => {
		assert.equal(
			formatRublesExactRu(15450.5).replace(/\u00a0/g, " "),
			"15 450,50 ₽",
			"formatRublesExactRu must format numbers to exact rubles and kopecks",
		);
		assert.equal(
			formatRublesExactRu(null),
			"0,00 ₽",
			"formatRublesExactRu must safely handle null without NaN",
		);
		assert.equal(
			formatRublesExactRu(undefined),
			"0,00 ₽",
			"formatRublesExactRu must safely handle undefined without NaN",
		);
		assert.equal(
			kopecksToWordsRu(1545050),
			"Пятнадцать тысяч четыреста пятьдесят рублей 50 копеек",
			"kopecksToWordsRu must decline rubles and kopecks properly",
		);
	});

	test("StomX clinicalPackagePrintEngine: signatures-grid has break-inside avoid protection", () => {
		const html = generateClinicalPackageHtml({
			patient: { fullName: "Петров Петр Петрович" },
			clinic: { fullName: "ДЕНТЕ Клиника" },
		});
		assert.ok(html.includes("break-inside: avoid;"), "signatures-grid must include break-inside: avoid;");
		assert.ok(html.includes("page-break-inside: avoid;"), "signatures-grid must include page-break-inside: avoid;");
	});

	test("StomX primaryIntakePackagePrintEngine: no double underline when patient name is empty", () => {
		const html = generatePrimaryIntakePackageHtml({
			clinic: { fullName: "ДЕНТЕ Клиника" },
			patient: { fullName: "" },
		});
		assert.ok(!html.includes("________________ / ________________"), "Must never leak double underline artifact");
		assert.ok(html.includes("break-inside: avoid;"), "signatures-row must include break-inside: avoid;");
	});

	test("StomX warrantyCertificateHtml: zero undefined leaks and signature break-inside protection", () => {
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

	test("StomX treatmentPlanActFormatters: numberToWordsRu delegates accurately to SSOT", () => {
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

	test("StomX TreatmentPlanActSignatures: break-inside avoid and print:grid-cols-2 protection", () => {
		const actSignaturesPath = path.join(
			webSrcDir,
			"components/treatment-plans/TreatmentPlanActSignatures.tsx",
		);
		const content = fs.readFileSync(actSignaturesPath, "utf-8");
		assert.ok(
			content.includes('breakInside: "avoid"') || content.includes("break-inside-avoid"),
			"TreatmentPlanActSignatures must have breakInside avoid",
		);
		assert.ok(
			content.includes("print:grid-cols-2"),
			"TreatmentPlanActSignatures must enforce print:grid-cols-2 to keep doctor and patient on one row",
		);
	});

	test("StomX TreatmentPlanContractPrint: sum in words banner and print:grid-cols-3 protection", () => {
		const contractPrintPath = path.join(
			webSrcDir,
			"components/treatment-plans/TreatmentPlanContractPrint.tsx",
		);
		const content = fs.readFileSync(contractPrintPath, "utf-8");
		assert.ok(
			content.includes("Сумма сметы прописью:"),
			"TreatmentPlanContractPrint must display official sum in words banner",
		);
		assert.ok(
			content.includes("print:grid-cols-3"),
			"TreatmentPlanContractPrint must enforce print:grid-cols-3 to prevent collapsing in print engine",
		);
		assert.ok(
			content.includes('breakInside: "avoid"'),
			"TreatmentPlanContractPrint signatures must have breakInside: 'avoid'",
		);
	});

	test("StomX PremiumDocumentPrintSheet: break-inside avoid and standard signature slashes", () => {
		const sheetPath = path.join(
			webSrcDir,
			"components/documents/PremiumDocumentPrintSheet.tsx",
		);
		const content = fs.readFileSync(sheetPath, "utf-8");
		assert.ok(
			content.includes('breakInside: "avoid"'),
			"PremiumDocumentPrintSheet signatures must have breakInside: 'avoid'",
		);
		assert.ok(
			content.includes('Врач-стоматолог: ____________________ / {doctorName || "____________________"} /'),
			"PremiumDocumentPrintSheet doctor signature must have standard opening and closing slashes",
		);
		assert.ok(
			content.includes('Пациент: ____________________ / {patient?.fullName || "____________________"} /'),
			"PremiumDocumentPrintSheet patient signature must have standard opening and closing slashes",
		);
	});
});
