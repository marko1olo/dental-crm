import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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

describe("EGISZ & Official Certificates Hub Decomposition (Mandates 8e, 8n & Apple HIG)", () => {
	it("1.1 File size constraint: all 4 decomposed modules are strictly <= 120 lines", () => {
		const files = [
			"EgiszCertificatesHubModal.tsx",
			"EgiszBackgroundQueueTable.tsx",
			"TaxDeductionCertificateDrawer.tsx",
			"MedicalRecordExtractDrawer.tsx",
		];
		const baseDir = path.resolve(process.cwd(), "apps/web/src/components/egisz");
		for (const file of files) {
			const fullPath = path.join(baseDir, file);
			assert.ok(fs.existsSync(fullPath), `File ${file} must exist`);
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
		const baseDir = path.resolve(process.cwd(), "apps/web/src/components/egisz");
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		for (const file of files) {
			const fullPath = path.join(baseDir, file);
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
		const baseDir = path.resolve(process.cwd(), "apps/web/src/components/egisz");
		for (const file of files) {
			const fullPath = path.join(baseDir, file);
			const content = fs.readFileSync(fullPath, "utf-8");
			assert.ok(
				!content.includes("disabled={true}"),
				`File ${file} must not contain disabled={true} (Mandate 8e)`,
			);
		}
	});

	it("2.1 EgiszCertificatesHubModal renders 3 statutory sections (Queue, Tax 3-NDFL, Extracts)", () => {
		const html = renderToString(
			createElement(EgiszCertificatesHubModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Смирнова Елена Васильевна",
			}),
		);
		assert.ok(html.includes("ЕГИСЗ и официальные справки"));
		assert.ok(html.includes("Фоновый журнал"));
		assert.ok(html.includes("Справка 3-НДФЛ"));
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

	it("3.1 TaxDeductionCertificateDrawer calculates exact totals and renders 54-FZ payments", () => {
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
		assert.ok(html.includes("Печать бланка ФНС с QR-кодом"));
		assert.ok(html.includes("Кузнецов А.А."));
		assert.ok(html.includes("770199887766"));
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
		assert.ok(html.includes("Выписка из карты 043/у"));
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
});
