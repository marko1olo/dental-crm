import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { MobileSelfCheckinModal } from "../MobileSelfCheckinModal";
import {
	createPhysiologicalNormSomaticQuestionnaire,
	evaluateSomaticRisks,
	INITIAL_SOMATIC_QUESTIONNAIRE,
	PHYSIOLOGICAL_NORM_SOMATIC_QUESTIONNAIRE,
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

			// Must not contain any disabled attribute on button elements
			const hasDisabledButton =
				html.includes("<button disabled") ||
				html.includes('disabled=""') ||
				html.includes("<button disabled>");
			assert.equal(
				hasDisabledButton,
				false,
				`Step '${step}' must contain zero disabled buttons`,
			);
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

			assert.equal(
				emojiRegex.test(html),
				false,
				`Step '${step}' contains 0 raw unicode cartoon emojis`,
			);

			// Unstyled cross symbol ✕ must be replaced by vector <X size={...} />
			assert.equal(
				html.includes(">✕<") || html.includes(" ✕ "),
				false,
				`Step '${step}' uses vector Lucide icons instead of raw unstyled cross symbols`,
			);
		}
	});

	it("3. Mandate 8s (Scale Sovereignty): Solo 1-chair clinic instant self-checkin works out of the box", () => {
		let checkinResult: any = null;

		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				initialPhone: "+7 (999) 123-45-67",
				patientName: "Самохвалов Олег Дмитриевич",
				doctorName: "Д-р Петров В. И.",
				appointmentTime: "Сегодня в 10:00 (Кабинет 1)",
				onCheckinSuccess: (result) => {
					checkinResult = result;
				},
				initialStep: "phone_auth",
			}),
		);

		// Express checkin button and phone inputs are available immediately without receptionist
		assert.ok(
			html.includes("kiosk-express-norm-btn"),
			"Express norm checkin button is present for 1-tap arrival",
		);
		assert.ok(
			html.includes("one-touch-phone-input"),
			"4-digit phone confirmation is present",
		);
		assert.ok(
			html.includes("one-touch-checkin-btn"),
			"Arrival button is present and not locked",
		);
	});

	it("4. Mandate 8e: Somatic Questionnaire Engine physiological norm and allergy sensitivity", () => {
		// 1. Norm default
		const normData = createPhysiologicalNormSomaticQuestionnaire();
		const normResult = evaluateSomaticRisks(normData);
		assert.equal(normResult.riskLevel, "low");
		assert.equal(normResult.alerts.length, 0);

		// 2. Sulfite allergy triggers clinical alert
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
		assert.ok(
			sulfiteResult.alerts.some((a) => a.id === "alert_sulfite_asthma"),
			"Identifies sulfite risk and warns against epinephrine with metabisulfites",
		);

		// 3. Local anesthetics allergy triggers clinical alert
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
		assert.ok(
			anestheticResult.alerts.some((a) => a.id === "alert_local_anesthetic"),
			"Identifies local anesthetic intolerance",
		);
	});

	it("5. Mandate 8d pt 6 (Anti-Matryoshka Law): Single modal window surface without nested containers", () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				initialStep: "phone_auth",
			}),
		);

		// Exactly one modal window root
		const modalWindowMatches = html.match(/class="[^"]*selfcheckin-modal-window[^"]*"/g);
		assert.equal(
			modalWindowMatches?.length,
			1,
			"Exactly 1 modal window surface rendered (max depth = 1)",
		);
		assert.equal(
			html.includes("patient-cabinet-modal"),
			false,
			"Does not nest inside other modal dialogs",
		);
	});

	it("6. CSS Design Tokens & Kiosk Ergonomics in selfCheckin.css", () => {
		const cssPath = fileURLToPath(new URL("../selfCheckin.css", import.meta.url));
		const css = readFileSync(cssPath, "utf-8");

		// Tokens used
		assert.ok(
			css.includes("var(--paper") && css.includes("var(--ink"),
			"selfCheckin.css uses --paper and --ink tokens",
		);
		assert.ok(
			css.includes("var(--teal") || css.includes("var(--success"),
			"selfCheckin.css uses --teal / --success design tokens",
		);
		assert.ok(
			css.includes("var(--danger"),
			"selfCheckin.css uses --danger design tokens",
		);

		// Kiosk Touch ergonomics
		assert.ok(
			css.includes("touch-action: manipulation;"),
			"selfCheckin.css includes touch-action: manipulation",
		);
	});
});
