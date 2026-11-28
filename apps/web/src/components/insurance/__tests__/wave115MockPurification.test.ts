import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DmsStudioModal } from "../DmsStudioModal";
import { PrescriptionModal } from "../../prescriptions/PrescriptionModal";
import { PublicBookingWidget } from "../../booking/PublicBookingWidget";

const CARTOON_EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Wave 115: Mock Purification & Zero Cartoon Emojis (Live 6G SUT)", () => {
	it("1. DmsStudioModal omits synthetic fallback names and INN 7701234567 in production SSR mode", () => {
		const prevDoc = (globalThis as { document?: unknown }).document;
		(globalThis as { document?: unknown }).document = undefined;
		try {
			const htmlWithRealPatient = renderToStaticMarkup(
				React.createElement(DmsStudioModal, {
					isOpen: true,
					onClose: () => {},
					patient: {
						id: "pat-real-1",
						fullName: "Королёв Андрей Олегович",
						birthDate: "1986-04-12",
					},
				}),
			);
			assert.ok(htmlWithRealPatient.includes("Королёв Андрей Олегович"));
			assert.equal(htmlWithRealPatient.includes("Иванова Елена"), false);
			assert.equal(htmlWithRealPatient.includes("Иванов И.И."), false);
			assert.equal(htmlWithRealPatient.includes("Иванов Сергей Александрович"), false);
			assert.equal(htmlWithRealPatient.includes("7701234567"), false);
			assert.equal(CARTOON_EMOJI_RE.test(htmlWithRealPatient), false);

			const htmlEmptyPatient = renderToStaticMarkup(
				React.createElement(DmsStudioModal, {
					isOpen: true,
					onClose: () => {},
					patient: { id: "", fullName: "" },
				}),
			);
			assert.equal(htmlEmptyPatient.includes("Иванов Сергей Александрович"), false);
			assert.equal(htmlEmptyPatient.includes("Иванова Елена"), false);
			assert.equal(htmlEmptyPatient.includes("7701234567"), false);
		} finally {
			(globalThis as { document?: unknown }).document = prevDoc;
		}
	});

	it("2. PrescriptionModal renders clinical drug list with zero cartoon emojis", () => {
		const html = renderToStaticMarkup(
			React.createElement(PrescriptionModal, {
				isOpen: true,
				onClose: () => {},
				disablePortal: true,
				patientName: "Белова Мария Игоревна",
				doctorName: "Соколов А. В.",
			}),
		);
		assert.ok(html.includes("Белова Мария Игоревна"));
		assert.equal(CARTOON_EMOJI_RE.test(html), false);
	});

	it("3. PublicBookingWidget renders booking interface without synthetic phone +7 (999) 123-45-67", () => {
		const html = renderToStaticMarkup(
			React.createElement(PublicBookingWidget, {
				clinicId: "org-test-1",
				title: "Онлайн-запись",
			}),
		);
		assert.ok(html.includes("Онлайн-запись"));
		assert.equal(html.includes("+7 (999) 123-45-67"), false);
		assert.equal(CARTOON_EMOJI_RE.test(html), false);
	});
});
