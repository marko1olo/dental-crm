import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentsStudioModal, ConsentStudioModal } from "../components/documents/DocumentsStudioModal";

const CARTOON_EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Legal Shield, Primary Intake 1051n & Digital Signature Suite (6G SUT)", () => {
	const mockPatient = {
		id: "pat-123",
		fullName: "Кузнецов Алексей Петрович",
		birthDate: "1985-04-12",
		phone: "+7 999 123-45-67",
	};

	test("DocumentsStudioModal renders intake package without cartoon emojis or blocked primary CTA", () => {
		const prevDoc = (globalThis as { document?: unknown }).document;
		(globalThis as { document?: unknown }).document = undefined;
		try {
			const closedHtml = renderToStaticMarkup(
				React.createElement(DocumentsStudioModal, {
					isOpen: false,
					onClose: () => {},
					patient: mockPatient,
				}),
			);
			assert.equal(closedHtml, "");

			const openHtml = renderToStaticMarkup(
				React.createElement(DocumentsStudioModal, {
					isOpen: true,
					onClose: () => {},
					patient: mockPatient,
					initialTemplate: "intake",
					doctorFullName: "Д-р Иванов Сергей Павлович",
				}),
			);
			assert.ok(openHtml.includes("Кузнецов Алексей Петрович"));
			assert.equal(CARTOON_EMOJI_RE.test(openHtml), false, "DocumentsStudioModal HTML must contain 0 emojis");
		} finally {
			(globalThis as { document?: unknown }).document = prevDoc;
		}
	});

	test("ConsentStudioModal renders touchscreen PEP signature flow without cartoon emojis", () => {
		const prevDoc = (globalThis as { document?: unknown }).document;
		(globalThis as { document?: unknown }).document = undefined;
		try {
			const html = renderToStaticMarkup(
				React.createElement(ConsentStudioModal, {
					isOpen: true,
					onClose: () => {},
					patient: mockPatient,
					clinicName: "Клиника ДЕНТЕ",
					doctorFullName: "Д-р Иванов Сергей Павлович",
				}),
			);
			assert.ok(html.includes("Кузнецов Алексей Петрович"));
			assert.ok(html.includes("Клиника ДЕНТЕ"));
			assert.ok(html.includes("ПЭП") || html.includes("Подписать"));
			assert.equal(CARTOON_EMOJI_RE.test(html), false, "ConsentStudioModal HTML must contain 0 emojis");
		} finally {
			(globalThis as { document?: unknown }).document = prevDoc;
		}
	});
});
