import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { PediatricHeroDiplomaModal } from "../../PediatricHeroDiplomaModal";
import { generateHeroDiplomaHtml } from "../../pediatricHeroDiplomaPrint";
import { calculatePediatricAnesthesia, PEDIATRIC_ANESTHETIC_SPECS } from "../../PediatricAnesthesiaCalculator";

describe("1-Click Hero Diploma Generation (A5 Landscape)", () => {
	it("generates beautiful A5 Hero Diploma HTML with patient name, clinic and doctor", () => {
		const html = generateHeroDiplomaHtml({
			heroName: "Артём Смирнов",
			doctorName: "Д-р Иванов А.С.",
			clinicName: "Клиника DENTE",
			visitDate: "25 октября 2026",
			diplomaNumber: "042",
		});

		assert.ok(html.includes("ДИПЛОМ ЗА ХРАБРОСТЬ"));
		assert.ok(html.includes("Герой: Артём Смирнов"));
		assert.ok(html.includes("Клиника DENTE"));
		assert.ok(html.includes("Д-р Иванов А.С."));
		assert.ok(html.includes("size: A5 landscape"));
		assert.ok(html.includes("window.print()"));
	});

	it("renders PediatricHeroDiplomaModal with zero nested modals and accessible actions", () => {
		const html = renderToString(createElement(PediatricHeroDiplomaModal, {
			isOpen: true,
			onClose: () => {},
			patientName: "София Лебедева",
			patientAgeYears: 5,
			doctorName: "Д-р Петрова",
			clinicName: "Дентал Сити",
		}));

		assert.ok(html.includes('data-testid="pediatric-hero-diploma-modal"'));
		assert.ok(html.includes('data-testid="diploma-preview-card"'));
		assert.ok(html.includes("София Лебедева"));
		assert.ok(html.includes('data-testid="btn-modal-print-diploma"'));
		assert.ok(html.includes('data-testid="btn-copy-diploma-text"'));
		assert.ok(!html.includes("disabled"));
	});
});

describe("Zero Soviet Bureaucracy in Clinical SOAP Notes (Mandate 8x)", () => {
	it("verifies formatted note uses clean clinical Russian instead of Soviet order numbers", () => {
		const calc = calculatePediatricAnesthesia({
			drug: PEDIATRIC_ANESTHETIC_SPECS.articaine_4,
			selectedDrugId: "articaine_4",
			weightKg: 22,
			carpules: 0.5,
			patientAgeYears: 7,
			articaineContraindicated: false,
			mepivacaineContraindicated: false,
		});

		const note = calc.formattedClinicalNote;
		assert.ok(!note.includes("043/у"), "Clinical note must NOT contain 043/у (Mandate 8x)");
		assert.ok(!note.includes("804н"), "Clinical note must NOT contain 804н (Mandate 8x)");
		assert.ok(note.includes("Анестезиологическое пособие"));
		assert.ok(note.includes("Вес ребенка: 22 кг"));
		assert.ok(note.includes("ДОЗА БЕЗОПАСНА"));
	});
});
