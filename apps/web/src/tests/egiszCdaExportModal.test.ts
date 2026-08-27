/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEST: EGISZ REMD CDA EXPORT MODAL (FORM 043/U & FORM 043-1/U)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { EgiszCdaExportModal } from "../components/documents/egisz/EgiszCdaExportModal";

describe("EGISZ CDA Export Modal Component Tests", () => {
	it("renders Form 043/u modal in static markup without errors", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszCdaExportModal, {
				isOpen: true,
				onClose: () => {},
				initialFormType: "043u",
				visitId: "VISIT-2026-TEST-01",
				patient: {
					patientId: "PAT-TEST-100",
					name: { first: "Алиса", last: "Волкова", middle: "Сергеевна" },
					snils: "123-456-789 64",
					birthDate: "2012-05-14",
					gender: "female",
					polisOms: "1658493021948572",
				},
				doctor: {
					name: { first: "Елена", last: "Смирнова", middle: "Викторовна" },
					snils: "123-456-789 64",
					specialtyCode: "1.2.643.5.1.13.13.11.1066.31.08.77",
					specialtyName: "Стоматология терапевтическая",
					position: "Врач-стоматолог-терапевт",
					positionCode: "71",
				},
			}),
		);

		assert.ok(html.includes("Экспорт в ЕГИСЗ РЭМД &amp; УКЭП"));
		assert.ok(html.includes("Форма 043/у (СЭМД 101)"));
		assert.ok(html.includes("Форма 043-1/у (СЭМД 109)"));
		assert.ok(html.includes("Диагностика и реквизиты"));
		assert.ok(html.includes("Экспорт пакета (XML + .sig) в 1 клик"));
	});

	it("renders Form 043-1/u Orthodontics modal with Angle classifications", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszCdaExportModal, {
				isOpen: true,
				onClose: () => {},
				initialFormType: "043_1u",
				visitId: "VISIT-ORTHO-02",
				orthodonticDetails: {
					orthodonticDiagnosis: "Дистальная окклюзия зубных рядов",
					icd10Code: "K07.2",
					angleMolarClassRight: "class_2_sub_1",
					angleMolarClassLeft: "class_2_sub_1",
				},
			}),
		);

		assert.ok(html.includes("Форма 043-1/у (СЭМД 109)"));
		assert.ok(html.includes("1.2.643.5.1.13.13.11.109"));
		assert.ok(html.includes("Ортодонтия"));
	});

	it("returns empty string when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszCdaExportModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);

		assert.strictEqual(html, "");
	});
});
