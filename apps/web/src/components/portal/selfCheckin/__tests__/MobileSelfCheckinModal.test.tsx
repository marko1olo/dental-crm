import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";
const { MobileSelfCheckinModal } = await import("../MobileSelfCheckinModal");
const { SelfCheckinConsentsSection, DEFAULT_CONSENTS } = await import("../SelfCheckinConsentsSection");

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

		assert.ok(html.includes("selfcheckin-modal-backdrop"), "Renders modal backdrop");
		assert.ok(html.includes("auth-art-background"), "Renders atmospheric auth-art background in lobby kiosk");
		assert.ok(html.includes("selfcheckin-modal-window"), "Renders modal window");
		assert.ok(html.includes("Смирнова Анна Викторовна"), "Renders patient name");
		assert.ok(html.includes("Д-р Воронова Е. С."), "Renders doctor name");
		assert.ok(html.includes("Сегодня в 14:30"), "Renders appointment time");

		assert.ok(html.includes("one-touch-phone-input"), "Renders 4-digit phone confirmation input");
		assert.ok(html.includes("one-touch-checkin-btn"), "Renders prominent 1-touch checkin button");
		assert.ok(html.includes("Я в клинике — Получить талон"), "Button text matches 'Я в клинике — Получить талон'");
		assert.ok(html.includes("qr-checkin-btn"), "Renders QR ticket checkin option");

		assert.equal(html.includes("signature-canvas"), false, "Does not display mandatory signature canvas on arrival");
		assert.ok(html.includes("Нормативные документы"), "Contains optional collapsible documents accordion");
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

		const result = evaluateSomaticRisks(PHYSIOLOGICAL_NORM_SOMATIC_QUESTIONNAIRE);
		assert.equal(result.riskLevel, "low", "Physiological norm must result in low risk level");
		assert.equal(result.alerts.length, 0, "Physiological norm must have 0 clinical risk alerts");
		assert.equal(result.profile.hasCardiovascularRisk, false);
		assert.equal(result.profile.hasSulfiteAllergy, false);
		assert.equal(result.profile.hasLocalAnestheticsAllergy, false);
		assert.equal(result.profile.hasBleedingDisorder, false);
	});

	it("renders physiological norm button and frictionless checkin options without unexplained disabled buttons", () => {
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

		assert.ok(
			html.includes('title="Подтвердить прибытие в клинику и получить талон"'),
			"Arrival button has clear accessible title explaining its action",
		);
		const disabledWithoutTitle =
			html.includes('<button disabled="" class=') ||
			html.includes("<button disabled class=");
		assert.equal(disabledWithoutTitle, false, "No button is disabled");
	});

	it("renders dominant green kiosk express button in phone_auth step", () => {
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

		assert.ok(html.includes("kiosk-express-norm-btn"), "Kiosk express button is present on phone auth step");
		assert.ok(
			html.includes("✓ Чувствую себя хорошо / Соматическая норма"),
			"Express button has dominant text '✓ Чувствую себя хорошо / Соматическая норма'",
		);
		assert.ok(html.includes("Экспресс-чекин и получение талона очереди"));
		assert.ok(html.includes("selfcheckin-close-btn"), "Renders ergonomic close button class");
		assert.ok(html.includes("selfcheckin-btn-kiosk-express"), "Renders kiosk express class");
	});

	it("renders somatic step with dominant physiological norm button and quick allergy chips", () => {
		const html = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Алексеева Марина Петровна",
				initialStep: "somatic",
			}),
		);

		assert.ok(html.includes("somatic-norm-dominant-btn"), "Dominant norm button is rendered in somatic step");
		assert.ok(html.includes("selfcheckin-btn-norm-dominant"), "Renders dominant norm button class");
		assert.ok(html.includes("✓ Чувствую себя хорошо / Соматическая норма"));
		assert.ok(html.includes("quick-allergies-block"));
		assert.ok(html.includes("selfcheckin-allergy-chip"));
		assert.ok(html.includes("allergy-chip-penicillin") && html.includes("Пенициллин / Антибиотики"));
		assert.ok(html.includes("allergy-chip-lidocaine") && html.includes("Лидокаин / Анестетики"));
		assert.ok(html.includes("allergy-chip-aspirin") && html.includes("Аспирин / НПВС"));
		assert.ok(html.includes("allergy-chip-sulfites") && html.includes("Сульфиты / Консерванты"));
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

		assert.ok(html.includes("queue-ticket-card"));
		assert.ok(html.includes("queue-ticket-number"));
		assert.ok(html.includes("Талон № А-07"));
		assert.ok(html.includes("doctor-wait-status"));
		assert.ok(html.includes("Д-р Смирнова Е. В. ожидает вас в кабинете №3"));
		assert.equal(html.includes("(2 этаж)"), false);
		assert.ok(html.includes("selfcheckin-animated-success-badge"));
		assert.ok(html.includes("selfcheckin-success-ring"));
		assert.ok(html.includes("reception-alert-badge"));
		assert.ok(html.includes("В холле / Ожидает приёма"));
		assert.ok(html.includes("Оповещение передано на стойку регистрации и ассистенту в кабинет врача"));
	});

	it("renders consents step with PEP signing and unlocked touch-friendly controls", () => {
		const firstConsent = DEFAULT_CONSENTS[0];
		assert.ok(firstConsent);
		const html = renderToStaticMarkup(
			createElement(SelfCheckinConsentsSection, {
				consents: DEFAULT_CONSENTS,
				activeConsentIndex: 0,
				onSelectConsentIndex: () => {},
				onSignAllConsentsWithPep: () => {},
				onSignCurrentConsent: () => {},
				onSignCurrentConsentWithPaper: () => {},
				consentNotice: null,
				allConsentsSigned: false,
				onProceedToSomatic: () => {},
			}),
		);

		assert.ok(html.includes(firstConsent.titleRu));
		assert.equal(html.includes("<button disabled") || html.includes('disabled=""'), false);
	});
});
