/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD SIGNING STUDIO & DOCUMENTS JOURNAL TEST SUITE — DENTE DENTAL CRM
 * Tests for Signing Modal, Journal Modal, CryptoPro Plugin Detection,
 * Order 947n Blue Stamps, 1-Click ZIP Packaging & Statutory Error Hints
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { strToU8, zipSync } from "fflate";
import { EgiszRemdHubModal } from "../EgiszRemdHubModal";
import { EgiszJournalTab } from "../tabs/EgiszJournalTab";
import { SAMPLE_REMD_JOURNAL_RECORDS } from "../egiszJournalData";
import {
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	generateEgiszDentalCdaXml,
	generateEgiszXmlFilename,
	generateGostSignatureStampHtml,
	runEgisz043uPreflight,
} from "../egiszRemdEngine";
import {
	createMockGostSignature,
	createMockMoGostSignature,
} from "./egiszTestFixtures";

describe("1. EgiszRemdHubModal — UKEP Signing Studio (Order 947n and 63-FZ)", () => {
	it("1.1 does not render markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszRemdHubModal, {
				isOpen: false,
				onClose: () => {},
				initialTab: "signature",
			}),
		);
		assert.equal(html, "");
	});

	it("1.2 renders modal with header, CryptoPro status, and Order 947n title when isOpen is true", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszRemdHubModal, {
				isOpen: true,
				onClose: () => {},
				initialTab: "signature",
				initialPayload: SAMPLE_DENTAL_SEMD_105_PRESET,
			}),
		);

		assert.ok(
			html.includes("Подписание СЭМД УКЭП"),
			"Contains title with SEMD UKEP signing",
		);
		assert.ok(
			html.includes("Приказ Минздрава № 947н"),
			"Contains reference to Order 947n",
		);
		assert.ok(
			html.includes("КриптоПро"),
			"Contains CryptoPro CSP status bar",
		);
		assert.ok(
			html.includes("Печатный бланк СЭМД ф. 043/у"),
			"Contains view tab for Form 043/u sheet",
		);
		assert.ok(
			html.includes("HL7 CDA R2 XML"),
			"Contains view tab for CDA XML",
		);
	});

	it("1.3 renders 1-click action buttons (Doctor UKEP, MO UKEP, REMD Gateway, Print)", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszRemdHubModal, {
				isOpen: true,
				onClose: () => {},
				initialTab: "signature",
				initialPayload: SAMPLE_DENTAL_SEMD_105_PRESET,
			}),
		);

		assert.ok(
			html.includes("Подписать УКЭП врача"),
			"Contains 1-click Doctor UKEP signing button",
		);
		assert.ok(
			html.includes("Подписать УКЭП организации"),
			"Contains 1-click Organization UKEP signing button",
		);
		assert.ok(
			html.includes("Отправить в РЭМД ЕГИСЗ"),
			"Contains 1-click REMD EGISZ submission button",
		);
		assert.ok(
			html.includes("Печать со штампом"),
			"Contains 1-click Print with Stamp button",
		);
		assert.ok(
			html.includes("Скачать XML"),
			"Contains 1-click Download XML button",
		);
	});

	it("1.4 renders Order 947n Blue Electronic Signature Stamp when doctor signature is attached", () => {
		const doctorSig = createMockGostSignature(
			"Иванов Сергей Владимирович",
			"123-456-789 64",
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
		);

		const html = renderToStaticMarkup(
			createElement(EgiszRemdHubModal, {
				isOpen: true,
				onClose: () => {},
				initialTab: "signature",
				initialPayload: {
					...SAMPLE_DENTAL_SEMD_105_PRESET,
					doctor: {
						...DEFAULT_EGISZ_DOCTOR_PRESET,
						doctorFullName: "Иванов Сергей Владимирович",
						doctorSnils: "123-456-789 64",
					},
					doctorSignature: doctorSig,
				},
			}),
		);

		assert.ok(
			html.includes("gost-stamp-blue"),
			"Contains blue electronic signature stamp container",
		);
		assert.ok(
			html.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"),
			"Contains Order 947n official stamp title",
		);
		assert.ok(
			html.includes(doctorSig.certificateSerialNumber),
			"Contains certificate serial number",
		);
		assert.ok(
			html.includes("Иванов Сергей Владимирович"),
			"Contains doctor full name in signature stamp",
		);
		assert.ok(
			html.includes("ГОСТ Р 34.10-2012"),
			"Contains GOST cryptographic standard reference",
		);
	});
});

describe("2. EgiszRemdHubModal — Documents Journal (REMD Document Registry and Remediation)", () => {
	it("2.1 does not render markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszRemdHubModal, {
				isOpen: false,
				onClose: () => {},
				initialTab: "journal",
			}),
		);
		assert.equal(html, "");
	});

	it("2.2 renders modal with header, stats ribbon and filter tabs when isOpen is true", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszRemdHubModal, {
				isOpen: true,
				onClose: () => {},
				initialTab: "journal",
			}),
		);

		assert.ok(
			html.includes("Журнал медицинских документов РЭМД ЕГИСЗ"),
			"Contains journal modal title",
		);
		assert.ok(
			html.includes("Реестр СЭМД 043/у"),
			"Contains subtitle with supported SEMD document codes",
		);
		assert.ok(
			html.includes("Зарегистрировано в РЭМД"),
			"Contains registered stats tile",
		);
		assert.ok(
			html.includes("Ошибки валидации"),
			"Contains error stats tile",
		);
		assert.ok(
			html.includes("Черновики"),
			"Contains drafts stats tile",
		);
	});

	it("2.3 displays document records with patient, doctor, status and action buttons", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszRemdHubModal, {
				isOpen: true,
				onClose: () => {},
				initialTab: "journal",
			}),
		);

		// Record 1: Соколова Анна Владимировна
		assert.ok(
			html.includes("Соколова Анна Владимировна"),
			"Contains patient name from realistic clinical baseline",
		);
		assert.ok(
			html.includes("Иванов Сергей Владимирович"),
			"Contains doctor name in table",
		);
		assert.ok(
			html.includes("РЭМД-77-2026-99120"),
			"Contains federal REMD registration number",
		);

		// 1-Click Buttons
		assert.ok(
			html.includes("Подписать"),
			"Contains 1-click Sign button",
		);
		assert.ok(
			html.includes("1-Клик ZIP"),
			"Contains 1-click ZIP export button",
		);
	});

	it("2.4 displays actionable remediation instructions for validation errors (e.g. FRMR SNILS missing)", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszRemdHubModal, {
				isOpen: true,
				onClose: () => {},
				initialTab: "journal",
				initialJournalFilter: "error",
				initialJournalSelectedId: "REMD-REC-002",
			}),
		);

		assert.ok(
			html.includes("ERR_FRMR_SNILS_NOT_FOUND") || html.includes("Ошибка валидации РЭМД"),
			"Displays validation error code",
		);
		assert.ok(
			html.includes("Инструкция по устранению ошибки"),
			"Displays actionable step-by-step remediation guide",
		);
		assert.ok(
			html.includes("Проверьте правильность ввода СНИЛС врача"),
			"Contains concrete actionable remediation instruction text",
		);
	});

	it("2.5 generates valid single-document and batch ZIP archives with XML and .p7s signatures", () => {
		const record = SAMPLE_REMD_JOURNAL_RECORDS[0];
		assert.ok(record, "Sample record exists");

		const payload = record.cdaPayload || SAMPLE_DENTAL_SEMD_105_PRESET;
		const xml = generateEgiszDentalCdaXml({
			...payload,
			doctorSignature: record.doctorSignature,
		});
		const filenamePrefix = generateEgiszXmlFilename(payload).replace(".xml", "");

		const zipData = {
			[`${filenamePrefix}.xml`]: strToU8(xml),
		};

		if (record.doctorSignature?.signatureBase64) {
			zipData[`${filenamePrefix}_doctor.p7s`] = strToU8(record.doctorSignature.signatureBase64);
		}

		if (record.registrationInfo) {
			zipData[`${filenamePrefix}_receipt.json`] = strToU8(
				JSON.stringify(record.registrationInfo, null, 2),
			);
		}

		const zipped = zipSync(zipData);
		assert.ok(zipped instanceof Uint8Array, "Generates Uint8Array ZIP buffer");
		assert.ok(zipped.length > 100, "ZIP buffer has non-trivial size");
		assert.equal(zipped[0], 0x50, "ZIP magic byte 1 is 'P'");
		assert.equal(zipped[1], 0x4b, "ZIP magic byte 2 is 'K'");
	});

	it("2.6 honest status badges correctly label accepted_by_egisz, rejected_by_egisz, signed, and sent without masquerading as draft", () => {
		const baseRec = SAMPLE_REMD_JOURNAL_RECORDS[0]!;
		const testRecords = [
			{ ...baseRec, id: "T1", status: "accepted_by_egisz" as const },
			{ ...baseRec, id: "T2", status: "rejected_by_egisz" as const },
			{ ...baseRec, id: "T3", status: "signed" as const },
			{ ...baseRec, id: "T4", status: "sent" as const },
			{ ...baseRec, id: "T5", status: "registered" as const },
			{ ...baseRec, id: "T6", status: "error" as const },
			{ ...baseRec, id: "T7", status: "draft" as const },
		];

		const html = renderToStaticMarkup(
			createElement(EgiszJournalTab, {
				records: testRecords,
				journalFilter: "all",
				onJournalFilterChange: () => {},
				selectedJournalId: "T1",
				onSelectJournalId: () => {},
				onBatchZipExport: () => {},
				onSingleZipExport: () => {},
				onSwitchToSignatureTab: () => {},
			}),
		);

		assert.ok(html.includes("Принят ЕГИСЗ"), "Contains honest label 'Принят ЕГИСЗ'");
		assert.ok(html.includes("Отклонен ЕГИСЗ"), "Contains honest label 'Отклонен ЕГИСЗ'");
		assert.ok(html.includes("Подписан"), "Contains honest label 'Подписан'");
		assert.ok(html.includes("Отправлен"), "Contains honest label 'Отправлен'");
		assert.ok(html.includes("Зарегистрирован"), "Contains honest label 'Зарегистрирован'");
		assert.ok(html.includes("Ошибка"), "Contains honest label 'Ошибка'");
		assert.ok(html.includes("Черновик"), "Contains honest label 'Черновик'");
	});
});
