import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { EgiszCertificatesHubModal } from "../EgiszCertificatesHubModal";
import { EgiszBackgroundQueueTable } from "../EgiszBackgroundQueueTable";
import { TaxDeductionCertificateDrawer } from "../TaxDeductionCertificateDrawer";
import { MedicalRecordExtractDrawer } from "../MedicalRecordExtractDrawer";
import {
	generateMedicalRecordExtractPrintHtml,
	type MedicalRecordExtractPayload,
} from "../egiszRemdPrintTemplates";
import type { RemdDocumentRecord } from "../egiszJournalData";
import { setRuntimeDemoMode } from "../../../lib/demoMode.js";
import { InsuranceBillSplitCard } from "../../insurance/InsuranceBillSplitCard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const egiszDir = path.resolve(__dirname, "..");

describe("EGISZ & Official Certificates Hub Decomposition (Mandates 8e, 8n & Apple HIG)", () => {
	afterEach(() => {
		setRuntimeDemoMode(null);
	});

	it("1.1 File size constraint: all 4 decomposed modules are strictly <= 120 lines", () => {
		const files = [
			"EgiszCertificatesHubModal.tsx",
			"EgiszBackgroundQueueTable.tsx",
			"TaxDeductionCertificateDrawer.tsx",
			"MedicalRecordExtractDrawer.tsx",
		];
		for (const file of files) {
			const fullPath = path.join(egiszDir, file);
			assert.ok(fs.existsSync(fullPath), `File ${file} must exist at ${fullPath}`);
			const content = fs.readFileSync(fullPath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount <= 120,
				`File ${file} has ${lineCount} lines, but must be <= 120 lines (Paragraph 3 decomposer rule)`,
			);
		}
	});

	it("1.2 Zero Cartoon Emojis Audit (Mandate 8d pt 7)", () => {
		const files = [
			"EgiszCertificatesHubModal.tsx",
			"EgiszBackgroundQueueTable.tsx",
			"TaxDeductionCertificateDrawer.tsx",
			"MedicalRecordExtractDrawer.tsx",
		];
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		for (const file of files) {
			const fullPath = path.join(egiszDir, file);
			const content = fs.readFileSync(fullPath, "utf-8");
			assert.ok(!emojiRegex.test(content), `File ${file} contains forbidden cartoon emojis`);
		}
	});

	it("1.3 Doctor Autonomy (Mandate 8e): zero disabled buttons in new components", () => {
		const files = [
			"EgiszCertificatesHubModal.tsx",
			"EgiszBackgroundQueueTable.tsx",
			"TaxDeductionCertificateDrawer.tsx",
			"MedicalRecordExtractDrawer.tsx",
		];
		for (const file of files) {
			const fullPath = path.join(egiszDir, file);
			const content = fs.readFileSync(fullPath, "utf-8");
			assert.ok(
				!content.includes("disabled={true}"),
				`File ${file} must not contain disabled={true} (Mandate 8e)`,
			);
		}
	});

	it("2.1 EgiszCertificatesHubModal renders 3 statutory sections (Queue, Tax Deduction, Extracts)", () => {
		const html = renderToString(
			createElement(EgiszCertificatesHubModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Смирнова Елена Васильевна",
			}),
		);
		assert.ok(html.includes("ЕГИСЗ и официальные справки"));
		assert.ok(html.includes("Фоновый журнал"));
		assert.ok(html.includes("Справка для налогового вычета"));
		assert.ok(html.includes("Выписки и справки"));
		assert.ok(html.includes("egisz-mobile-drag-handle"), "Must contain Apple HIG drag handle for mobile bottom sheet");
	});

	it("2.2 EgiszBackgroundQueueTable renders badges for sent, error and queued records", () => {
		const records = [
			{ id: "1", docTitle: "СЭМД 105", patientFullName: "Иванов И.И.", status: "accepted_by_egisz" as const, createdAt: "2026-10-15T10:00:00Z" },
			{ id: "2", docTitle: "СЭМД 303", patientFullName: "Петров П.П.", status: "error" as const, createdAt: "2026-10-15T11:00:00Z" },
			{ id: "3", docTitle: "СЭМД 102", patientFullName: "Сидоров С.С.", status: "draft" as const, createdAt: "2026-10-15T12:00:00Z" },
		];
		const html = renderToString(
			createElement(EgiszBackgroundQueueTable, {
				records: records as unknown as readonly RemdDocumentRecord[],
				onRetryRecord: () => {},
				onDownloadZip: () => {},
			}),
		);
		assert.ok(html.includes("Отправлен"));
		assert.ok(html.includes("Ошибка"));
		assert.ok(html.includes("В очереди"));
		assert.ok(html.includes("Повторить"), "Must render retry button for failed/queued documents");
		assert.ok(html.includes("ZIP"), "Must render ZIP download button");
	});

	it("2.3 EgiszBackgroundQueueTable renders honest empty state when records array is empty", () => {
		const html = renderToString(
			createElement(EgiszBackgroundQueueTable, { records: [] }),
		);
		assert.ok(html.includes("Фоновая очередь чиста"));
		assert.ok(html.includes("egisz-empty-box"));
	});

	it("3.1 TaxDeductionCertificateDrawer calculates exact totals and renders payments without 54-FZ jargon", () => {
		const payments = [
			{ date: "2026-02-14", serviceCode: "1" as const, serviceDescription: "Лечение кариеса", amountKopecks: 1500000 },
			{ date: "2026-06-10", serviceCode: "2" as const, serviceDescription: "Имплантация", amountKopecks: 3500000 },
		];
		const html = renderToString(
			createElement(TaxDeductionCertificateDrawer, {
				patientName: "Кузнецов А.А.",
				patientInn: "770199887766",
				payments,
			}),
		);
		assert.ok(html.includes("50000.00 ₽"), "Total sum 50000.00 Rubles must be calculated exactly");
		assert.ok(html.includes("Оплачено за медицинские услуги"), "Clean Russian heading without 54-FZ jargon");
		assert.ok(!html.includes("по чекам 54-ФЗ"), "Must not contain raw 54-FZ jargon in client UI");
		assert.ok(html.includes("Печать бланка ФНС с QR-кодом"));
		assert.ok(html.includes("Кузнецов А.А."));
		assert.ok(html.includes("770199887766"));
	});

	it("3.2 TaxDeductionCertificateDrawer in production mode renders honest empty state without leaks (Mandate 8wy)", () => {
		setRuntimeDemoMode(false);
		const html = renderToString(
			createElement(TaxDeductionCertificateDrawer, {
				patientName: "Боевой Пациент",
				patientInn: "770100000000",
			}),
		);
		assert.ok(html.includes("Нет зарегистрированных оплат за выбранный период"), "Must show honest empty state in prod");
		assert.ok(html.includes("0.00 ₽"), "Amount must be 0.00 ₽ when no payments exist");
		assert.ok(!html.includes("97500.00"), "Must NOT leak demo 97 500 ₽ preset payments into production");
		assert.ok(!html.includes("Брекет-система"), "Must NOT contain fake sample services in production");
	});

	it("3.3 TaxDeductionCertificateDrawer in demo mode uses sample preset payments (Mandate 8wy)", () => {
		setRuntimeDemoMode(true);
		const html = renderToString(
			createElement(TaxDeductionCertificateDrawer, {
				patientName: "Демо Пациент",
			}),
		);
		assert.ok(html.includes("97500.50 ₽"), "Demo showcase must show demo preset sum");
		assert.ok(html.includes("Терапевтическое лечение"), "Demo showcase must render sample payment items");
		assert.ok(!html.includes("Нет зарегистрированных оплат за выбранный период"), "Demo mode must not show empty state");
	});

	it("3.4 EgiszCertificatesHubModal in production mode isolates tax deduction from demo leaks", () => {
		setRuntimeDemoMode(false);
		const html = renderToString(
			createElement(EgiszCertificatesHubModal, {
				isOpen: true,
				onClose: () => {},
				initialSection: "tax_deduction",
				patientName: "Боевой Пациент",
			}),
		);
		assert.ok(html.includes("Нет зарегистрированных оплат за выбранный период"), "Modal in prod must show empty payments state");
		assert.ok(!html.includes("97500.00"), "Modal in prod must NOT leak demo 97 500 ₽ preset");
	});

	it("4.1 MedicalRecordExtractDrawer renders statutory options and print button", () => {
		const html = renderToString(
			createElement(MedicalRecordExtractDrawer, {
				patientName: "Федорова М.С.",
				doctorName: "Д-р Васильев",
				clinicName: "ООО «ДЕНТЕ»",
			}),
		);
		assert.ok(html.includes("Справка о санации"));
		assert.ok(html.includes("Санаторно-курортная карта"));
		assert.ok(html.includes("Выписка из медицинской карты"), "Must use clean clinical language without 043/u order number");
		assert.ok(html.includes("Распечатать официальный бланк"));
	});

	it("4.2 generateMedicalRecordExtractPrintHtml produces valid statutory HTML without emojis", () => {
		const payload: MedicalRecordExtractPayload = {
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			patientFullName: "Алексеев Алексей Алексеевич",
			extractType: "sanitation",
			doctorFullName: "Смирнов В.В.",
			conclusionText: "Полость рта санирована. Очагов инфекции нет.",
		};
		const html = generateMedicalRecordExtractPrintHtml(payload);
		assert.ok(html.includes("СПРАВКА О САНАЦИИ ПОЛОСТИ РТА"));
		assert.ok(html.includes("Алексеев Алексей Алексеевич"));
		assert.ok(html.includes("Смирнов В.В."));
		assert.ok(html.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"));
	});

	it("5.1 InsuranceBillSplitCard in production mode renders honest empty state without leaks (Mandate 8wy)", () => {
		setRuntimeDemoMode(false);
		const html = renderToString(
			createElement(InsuranceBillSplitCard, {}),
		);
		assert.ok(html.includes("Нет позиций для распределения счёта"), "Must render honest empty state notice in production");
		assert.ok(html.includes("0 ₽"), "Amounts must be 0 ₽ when no bill items exist");
		assert.ok(!html.includes("22 250"), "Must NOT calculate total of 22 250 ₽ from demo items in prod");
	});

	it("5.2 InsuranceBillSplitCard in demo mode uses sample bill items (Mandate 8wy)", () => {
		setRuntimeDemoMode(true);
		const html = renderToString(
			createElement(InsuranceBillSplitCard, {}),
		);
		assert.ok(!html.includes("Нет позиций для распределения счёта"), "Demo mode must not show empty notice");
		assert.ok(html.includes("СТРАХОВАЯ") && html.includes("ПАЦИЕНТ"));
	});
});
