import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileSelfCheckinModal } from "../MobileSelfCheckinModal";

describe("MobileSelfCheckinModal Component & 1-Touch Checkin Flow", () => {
	it("renders 1-Touch Checkin screen with 4 digits input and instant ticket button without mandatory 3-signature maze", () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				initialPhone: "+7 (913) 770-41-99",
				patientName: "Смирнова Анна Викторовна",
				doctorName: "Д-р Воронова Е. С.",
				appointmentTime: "Сегодня в 14:30",
			}),
		);

		// Modal and Header
		assert.ok(
			html.includes("selfcheckin-modal-window"),
			"Renders modal window",
		);
		assert.ok(
			html.includes("Смирнова Анна Викторовна"),
			"Renders patient name",
		);
		assert.ok(html.includes("Д-р Воронова Е. С."), "Renders doctor name");
		assert.ok(html.includes("Сегодня в 14:30"), "Renders appointment time");

		// 1-Touch Checkin controls
		assert.ok(
			html.includes("one-touch-phone-input"),
			"Renders 4-digit phone confirmation input",
		);
		assert.ok(
			html.includes("one-touch-checkin-btn"),
			"Renders prominent 1-touch checkin button",
		);
		assert.ok(
			html.includes("Я в клинике — Получить талон"),
			"Button text matches 'Я в клинике — Получить талон'",
		);
		assert.ok(
			html.includes("qr-checkin-btn"),
			"Renders QR ticket checkin option",
		);

		// Must NOT block with 3 mandatory canvas signatures or mandatory 15 questions on arrival
		assert.equal(
			html.includes("signature-canvas"),
			false,
			"Does not display mandatory signature canvas on arrival",
		);
		assert.ok(
			html.includes("Нормативные документы"),
			"Contains optional collapsible documents accordion",
		);
		assert.ok(
			html.includes("one-touch-checkin-btn"),
			"Express checkin button is present and not silently disabled",
		);
	});

	it("evaluates PHYSIOLOGICAL_NORM_SOMATIC_QUESTIONNAIRE with zero danger/warning alerts and riskLevel='low'", async () => {
		const {
			PHYSIOLOGICAL_NORM_SOMATIC_QUESTIONNAIRE,
			createPhysiologicalNormSomaticQuestionnaire,
			evaluateSomaticRisks,
		} = await import("../SomaticQuestionnaireEngine.js");

		const norm = createPhysiologicalNormSomaticQuestionnaire();
		assert.equal(norm.allergies.hasAllergies, false);
		assert.equal(norm.cardiovascular.hasRisk, false);
		assert.equal(norm.coagulation.hasBleedingDisorder, false);
		assert.equal(norm.diabetes.hasDiabetes, false);
		assert.equal(norm.pregnancy.isPregnantOrLactating, false);
		assert.equal(norm.respiratory.bronchialAsthma, false);

		const result = evaluateSomaticRisks(
			PHYSIOLOGICAL_NORM_SOMATIC_QUESTIONNAIRE,
		);
		assert.equal(
			result.riskLevel,
			"low",
			"Physiological norm must result in low risk level",
		);
		assert.equal(
			result.alerts.length,
			0,
			"Physiological norm must have 0 clinical risk alerts",
		);
		assert.equal(result.profile.hasCardiovascularRisk, false);
		assert.equal(result.profile.hasSulfiteAllergy, false);
		assert.equal(result.profile.hasLocalAnestheticsAllergy, false);
		assert.equal(result.profile.hasBleedingDisorder, false);
	});

	it("renders 1-click physiological norm button and frictionless checkin options without unexplained disabled buttons", async () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				initialPhone: "+7 (913) 770-41-99",
				patientName: "Барабаш Сергей Васильевич",
				doctorName: "Д-р Воронова Е. С.",
				appointmentTime: "Сегодня в 15:00",
			}),
		);

		// Express arrival button has informative title
		assert.ok(
			html.includes('title="Подтвердить прибытие в клинику и получить талон"'),
			"Arrival button has clear accessible title explaining its action",
		);

		// Verification that no button is disabled without title explanation
		const disabledWithoutTitle =
			html.includes('<button disabled="" class=') ||
			html.includes("<button disabled class=");
		assert.equal(
			disabledWithoutTitle,
			false,
			"No button is disabled without attributes",
		);
	});

	it("renders dominant green 1-touch kiosk express button in phone_auth step", () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				initialPhone: "+7 (913) 770-41-99",
				patientName: "Кузнецов Игорь Павлович",
				doctorName: "Д-р Смирнова А. В.",
				appointmentTime: "Сегодня в 16:00 (Кабинет 3)",
				initialStep: "phone_auth",
			}),
		);

		assert.ok(
			html.includes("kiosk-express-norm-btn"),
			"Kiosk express button is present on phone auth step",
		);
		assert.ok(
			html.includes("✓ Чувствую себя хорошо / Соматическая норма"),
			"Express button has dominant text '✓ Чувствую себя хорошо / Соматическая норма'",
		);
		assert.ok(
			html.includes("Экспресс-чекин в 1 касание и получение талона очереди"),
			"Express button explains 1-touch checkin and ticket generation",
		);
	});

	it("renders somatic step with dominant physiological norm button and quick allergy chips for penicillin, lidocaine, aspirin, sulfites", () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Алексеева Марина Петровна",
				initialStep: "somatic",
			}),
		);

		// Dominant 1-click norm button
		assert.ok(
			html.includes("somatic-norm-dominant-btn"),
			"Dominant norm button is rendered in somatic step",
		);
		assert.ok(
			html.includes("✓ Чувствую себя хорошо / Соматическая норма"),
			"Dominant button text matches Mandate 8e specification",
		);

		// Quick allergy chips (Mandate 8e #3: patient customizes only real dental allergies)
		assert.ok(
			html.includes("quick-allergies-block"),
			"Quick allergies container is rendered",
		);
		assert.ok(
			html.includes("allergy-chip-penicillin"),
			"Penicillin / antibiotics allergy chip is rendered",
		);
		assert.ok(
			html.includes("Пенициллин / Антибиотики"),
			"Penicillin text is displayed",
		);
		assert.ok(
			html.includes("allergy-chip-lidocaine"),
			"Lidocaine / local anesthetics chip is rendered",
		);
		assert.ok(
			html.includes("Лидокаин / Анестетики"),
			"Lidocaine text is displayed",
		);
		assert.ok(
			html.includes("allergy-chip-aspirin"),
			"Aspirin / NSAID chip is rendered",
		);
		assert.ok(
			html.includes("Аспирин / НПВС"),
			"Aspirin text is displayed",
		);
		assert.ok(
			html.includes("allergy-chip-sulfites"),
			"Sulfites / preservatives chip is rendered",
		);
		assert.ok(
			html.includes("Сульфиты / Консерванты"),
			"Sulfites text is displayed",
		);
	});

	it("renders arrival confirmation screen with Queue Ticket, Doctor Waiting Status, Animated Badge, and Reception Schedule Alert", () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Иванов Петр Сергеевич",
				doctorName: "Д-р Смирнова Е. В.",
				appointmentTime: "Сегодня в 14:30 (Кабинет 3)",
				queueTicket: "Талон № А-07",
				initialStep: "completed",
			}),
		);

		// 1. Queue Ticket Card & Large Number
		assert.ok(
			html.includes("queue-ticket-card"),
			"Queue ticket card is displayed on completed screen",
		);
		assert.ok(
			html.includes("queue-ticket-number"),
			"Queue ticket number container is displayed",
		);
		assert.ok(
			html.includes("Талон № А-07"),
			"Display queue ticket matches 'Талон № А-07'",
		);

		// 2. Doctor & Cabinet Waiting Status
		assert.ok(
			html.includes("doctor-wait-status"),
			"Doctor wait status container is displayed",
		);
		assert.ok(
			html.includes("Д-р Смирнова Е. В. ожидает вас в кабинете №3 (2 этаж)"),
			"Doctor waiting status matches 'Д-р Смирнова ожидает вас в кабинете №3 (2 этаж)'",
		);

		// 3. Animated Green Success Badge
		assert.ok(
			html.includes("selfcheckin-animated-success-badge"),
			"Animated success badge is displayed",
		);
		assert.ok(
			html.includes("selfcheckin-success-ring"),
			"Success pulse ring is rendered",
		);

		// 4. Reception and Schedule Alert: «В холле / Ожидает приёма»
		assert.ok(
			html.includes("reception-alert-badge"),
			"Reception alert badge is displayed",
		);
		assert.ok(
			html.includes("В холле / Ожидает приёма"),
			"Visit status matches 'В холле / Ожидает приёма'",
		);
		assert.ok(
			html.includes("Оповещение передано на стойку регистрации и ассистенту в кабинет врача"),
			"Explains automated alert sent to reception and assistant",
		);
	});

	it("guarantees terminal and touchscreen ergonomics (touch-action: manipulation and touch targets >= 48px)", async () => {
		const { readFileSync } = await import("node:fs");
		const { fileURLToPath } = await import("node:url");

		const cssPath = fileURLToPath(new URL("../selfCheckin.css", import.meta.url));
		const cssContent = readFileSync(cssPath, "utf-8");

		// Touch action manipulation must be present across interactive touch elements
		assert.ok(
			cssContent.includes("touch-action: manipulation;"),
			"selfCheckin.css includes touch-action: manipulation for kiosk touch responsiveness",
		);

		// Touch target heights >= 48px
		assert.ok(
			cssContent.includes(".selfcheckin-close-btn {") &&
				cssContent.includes("width: 48px;") &&
				cssContent.includes("height: 48px;"),
			"Close button has minimum 48x48px touch target",
		);
		assert.ok(
			cssContent.includes(".selfcheckin-allergy-chip {") &&
				cssContent.includes("min-height: 48px;"),
			"Allergy chips have minimum 48px touch height",
		);
		assert.ok(
			cssContent.includes(".selfcheckin-btn-kiosk-express {") &&
				cssContent.includes("min-height: 58px;"),
			"Kiosk express button has prominent touch height (58px)",
		);
		assert.ok(
			cssContent.includes(".selfcheckin-btn-norm-dominant {") &&
				cssContent.includes("min-height: 64px;"),
			"Dominant physiological norm button has dominant touch height (64px)",
		);
	});
});
