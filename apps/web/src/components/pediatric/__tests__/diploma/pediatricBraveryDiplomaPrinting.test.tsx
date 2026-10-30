import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitPediatricProtocolWidget } from "../../VisitPediatricProtocolWidget";
import { PatientCardModal } from "../../../patients/PatientCardModal";
import { PediatricBraveryDiplomaModal } from "../../PediatricBraveryDiplomaModal";

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("1-Tap Bravery Diploma Printing in Pediatric Workspace", () => {
	it("renders prominent 1-tap diploma button in VisitPediatricProtocolWidget top toolbar", () => {
		const html = renderToStaticMarkup(createElement(VisitPediatricProtocolWidget, {
			activeTooth: 54, initialFranklRating: 3,
		}));
		assert.ok(html.includes('data-testid="pediatric-toolbar-diploma-btn"'));
		assert.ok(html.includes("Диплом за храбрость"));
		assert.ok(!EMOJI_REGEX.test(html));
	});

	it("renders 1-tap diploma button in PatientCardModal for child patients", () => {
		const html = renderToStaticMarkup(createElement(PatientCardModal, {
			isOpen: true, onClose: () => {},
			patientData: { fullName: "Ваня Смирнов", birthDate: "2018-06-10", representativeType: "Мать" },
		}));
		assert.ok(html.includes('data-testid="btn-patient-card-diploma"'));
		assert.ok(!EMOJI_REGEX.test(html));
	});

	it("renders PediatricBraveryDiplomaModal with 'Распечатать диплом (Enter)' and formatted names", () => {
		const html = renderToStaticMarkup(createElement(PediatricBraveryDiplomaModal, {
			isOpen: true, onClose: () => {}, patientName: "Ваня", doctorName: "Иванов А. С.",
		}));
		assert.ok(html.includes('data-testid="btn-modal-print-diploma"'));
		assert.ok(html.includes("Распечатать диплом (Enter)"));
		assert.ok(html.includes('data-testid="btn-print-bravery-diploma"'));
		assert.ok(html.includes("Распечатать (Enter)"));
		assert.ok(html.includes("Герой: Ваня"));
		assert.ok(html.includes("Доктор: Иванов А. С."));
		assert.ok(html.includes('data-testid="diploma-certificate-preview"'));
	});
});
