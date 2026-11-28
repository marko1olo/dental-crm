import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";

const { MobileSelfCheckinModal } = await import("../MobileSelfCheckinModal");
const { SelfCheckinTicketSection } = await import("../SelfCheckinTicketSection");
import {
	createPhysiologicalNormSomaticQuestionnaire,
	evaluateSomaticRisks,
	INITIAL_SOMATIC_QUESTIONNAIRE,
} from "../SomaticQuestionnaireEngine";

describe("SelfCheckinAutonomyInquisition — Mandates 8c, 8d, 8e, 8s Audit", () => {
	it("1. Mandate 8e (Doctor & Patient Autonomy): Zero disabled buttons across all steps (phone_auth, consents, somatic, completed)", () => {
		const steps = ["phone_auth", "consents", "somatic", "completed"] as const;

		for (const step of steps) {
			const html = renderToStaticMarkup(
				createElement(MobileSelfCheckinModal, {
					isOpen: true,
					onClose: () => {},
					initialPhone: "+7 (913) 770-41-99",
					patientName: "Смирнова Анна Викторовна",
					doctorName: "Д-р Воронова Е. С.",
					appointmentTime: "Сегодня в 14:30 (Кабинет 3)",
					queueTicket: "Талон № А-07",
					initialStep: step,
				}),
			);

			const hasDisabledButton =
				html.includes("<button disabled") ||
				html.includes('disabled=""') ||
				html.includes("<button disabled>");
			assert.equal(hasDisabledButton, false, `Step '${step}' must contain zero disabled buttons`);
		}
	});

	it("2. Mandate 8d pt 7 (Zero Cartoon Emojis): Vector Lucide icons used for close, navigation, and allergy controls", () => {
		const steps = ["phone_auth", "consents", "somatic", "completed"] as const;
		const emojiRegex = /\p{Extended_Pictographic}/u;

		for (const step of steps) {
			const html = renderToStaticMarkup(
				createElement(MobileSelfCheckinModal, {
					isOpen: true,
					onClose: () => {},
					initialPhone: "+7 (913) 770-41-99",
					patientName: "Кузнецов Игорь Павлович",
					doctorName: "Д-р Смирнова А. В.",
					appointmentTime: "Сегодня в 16:00 (Кабинет 3)",
					queueTicket: "Талон № А-07",
					initialStep: step,
				}),
			);

			assert.equal(emojiRegex.test(html), false, `Step '${step}' contains 0 raw unicode cartoon emojis`);
			assert.equal(
				html.includes(">✕<") || html.includes(" ✕ "),
				false,
				`Step '${step}' uses vector Lucide icons instead of raw unstyled cross symbols`,
			);
		}
	});

	it("3. Mandate 8s (Scale Sovereignty): Solo 1-chair clinic instant self-checkin works out of the box", () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				initialPhone: "+7 (999) 123-45-67",
				patientName: "Самохвалов Олег Дмитриевич",
				doctorName: "Д-р Петров В. И.",
				appointmentTime: "Сегодня в 10:00 (Кабинет 1)",
				onCheckinSuccess: () => {},
				initialStep: "phone_auth",
			}),
		);

		assert.ok(html.includes("kiosk-express-norm-btn"));
		assert.ok(html.includes("one-touch-phone-input"));
		assert.ok(html.includes("one-touch-checkin-btn"));
	});

	it("4. Mandate 8e: Somatic Questionnaire Engine physiological norm and allergy sensitivity", () => {
		const normData = createPhysiologicalNormSomaticQuestionnaire();
		const normResult = evaluateSomaticRisks(normData);
		assert.equal(normResult.riskLevel, "low");
		assert.equal(normResult.alerts.length, 0);

		const sulfiteData = {
			...INITIAL_SOMATIC_QUESTIONNAIRE,
			allergies: {
				...INITIAL_SOMATIC_QUESTIONNAIRE.allergies,
				hasAllergies: true,
				sulfiteAllergy: true,
			},
		};
		const sulfiteResult = evaluateSomaticRisks(sulfiteData);
		assert.equal(sulfiteResult.riskLevel, "high");
		assert.ok(sulfiteResult.alerts.some((a) => a.id === "alert_sulfite_asthma"));

		const anestheticData = {
			...INITIAL_SOMATIC_QUESTIONNAIRE,
			allergies: {
				...INITIAL_SOMATIC_QUESTIONNAIRE.allergies,
				hasAllergies: true,
				localAnestheticsAllergy: true,
			},
		};
		const anestheticResult = evaluateSomaticRisks(anestheticData);
		assert.equal(anestheticResult.riskLevel, "high");
		assert.ok(anestheticResult.alerts.some((a) => a.id === "alert_local_anesthetic"));
	});

	it("5. Mandate 8d pt 6 (Anti-Matryoshka Law): Single modal window surface without nested containers", () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				initialStep: "phone_auth",
			}),
		);

		const modalWindowMatches = html.match(/class="[^"]*selfcheckin-modal-window[^"]*"/g);
		assert.equal(modalWindowMatches?.length, 1, "Exactly 1 modal window surface rendered (max depth = 1)");
		assert.equal(html.includes("patient-cabinet-modal"), false, "Does not nest inside other modal dialogs");
	});

	it("6. SelfCheckinTicketSection renders queue ticket, doctor wait status, and unlocked finish action", () => {
		const ticketHtml = renderToStaticMarkup(
			createElement(SelfCheckinTicketSection, {
				displayQueueTicket: "Талон № А-12",
				patientName: "Самохвалов Олег Дмитриевич",
				appointmentTime: "Сегодня в 14:30",
				doctorWaitMessage: "Д-р Воронова Е. С. ожидает вас в кабинете №2",
				checkinQrSvg: "<svg viewBox=\"0 0 80 80\"></svg>",
				checkinCode: "CHK-A12",
				onClose: () => {},
			}),
		);

		assert.ok(ticketHtml.includes("Талон № А-12"));
		assert.ok(ticketHtml.includes("Д-р Воронова Е. С."));
		assert.equal(ticketHtml.includes("<button disabled") || ticketHtml.includes('disabled=""'), false);
	});
});
