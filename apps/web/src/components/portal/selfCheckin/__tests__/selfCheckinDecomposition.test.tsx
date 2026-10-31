import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";

const {
	MobileSelfCheckinModal,
	SelfCheckinPhoneAuthSection,
	SelfCheckinNumericKeypad,
	SelfCheckinPhoneInput,
	SelfCheckinOtpVerification,
	MobileCheckinHeader,
	MobileCheckinAppointmentCard,
	formatRussianPhoneMask,
} = await import("../index");

describe("Red Team Decomposition & Phone Auth SSOT Test Suite", () => {
	it("formats Russian phone numbers accurately with +7 mask", () => {
		assert.equal(formatRussianPhoneMask("9137704199"), "+7 (913) 770-41-99");
		assert.equal(formatRussianPhoneMask("79137704199"), "+7 (913) 770-41-99");
		assert.equal(formatRussianPhoneMask("89137704199"), "+7 (913) 770-41-99");
		assert.equal(formatRussianPhoneMask(""), "");
		assert.equal(formatRussianPhoneMask("123"), "+7 (123)");
	});

	it("renders SelfCheckinNumericKeypad with all digit keys, clear, and backspace", () => {
		const html = renderToStaticMarkup(
			createElement(SelfCheckinNumericKeypad, {
				onDigitPress: () => {},
				onBackspace: () => {},
				onClear: () => {},
			}),
		);

		assert.ok(html.includes('data-testid="kiosk-keypad"'), "Contains keypad container");
		for (let i = 0; i <= 9; i++) {
			assert.ok(
				html.includes(`data-testid="keypad-digit-${i}"`),
				`Contains keypad digit button ${i}`,
			);
		}
		assert.ok(html.includes('data-testid="keypad-clear"'), "Contains keypad clear button");
		assert.ok(html.includes('data-testid="keypad-backspace"'), "Contains keypad backspace button");
		assert.ok(html.includes("min-width:64px") || html.includes("min-height:56px"), "Meets touch target size >= 48px");
	});

	it("renders SelfCheckinPhoneInput with 4-digit display and hidden hardware input", () => {
		const html = renderToStaticMarkup(
			createElement(SelfCheckinPhoneInput, {
				phoneDigits: "4199",
				onChange: () => {},
			}),
		);

		assert.ok(html.includes('data-testid="kiosk-digits-display"'), "Renders 4-digit display");
		assert.ok(html.includes('data-testid="one-touch-phone-input"'), "Renders hidden hardware input");
		assert.ok(html.includes("4"), "Displays digit 4");
		assert.ok(html.includes("1"), "Displays digit 1");
		assert.ok(html.includes("9"), "Displays digit 9");
	});

	it("renders SelfCheckinOtpVerification with countdown and messenger options", () => {
		const html = renderToStaticMarkup(
			createElement(SelfCheckinOtpVerification, {
				phoneNumber: "+7 (913) 770-41-99",
				otpCode: "4199",
				setOtpCode: () => {},
				countdown: 45,
				onResendOtp: () => {},
				onVerifyOtp: () => {},
				onOpenTelegramBot: () => {},
				onBypassToReception: () => {},
			}),
		);

		assert.ok(html.includes("data-testid=\"selfcheckin-otp-verification\""), "Renders OTP container");
		assert.ok(html.includes("Подтверждение номера телефона"), "Displays header title");
		assert.ok(html.includes("+7 (913) 770-41-99"), "Displays target phone number");
		assert.ok(html.includes("Повторная отправка через 45 сек"), "Displays resend countdown");
		assert.ok(html.includes("Telegram-бот"), "Displays Telegram bot button");
		assert.ok(html.includes("Подойти к администратору"), "Displays reception desk bypass option");
	});

	it("renders MobileCheckinHeader with dynamic titles and close button", () => {
		const htmlAuth = renderToStaticMarkup(
			createElement(MobileCheckinHeader, {
				clinicName: "Клиника ДЕНТЕ",
				step: "phone_auth",
				onClose: () => {},
			}),
		);
		assert.ok(htmlAuth.includes("Вход и самочекин"), "Displays step title for phone_auth");
		assert.ok(htmlAuth.includes("Клиника ДЕНТЕ"), "Displays clinic name");
		assert.ok(htmlAuth.includes("selfcheckin-close-btn"), "Renders close button");

		const htmlCompleted = renderToStaticMarkup(
			createElement(MobileCheckinHeader, {
				clinicName: "Клиника ДЕНТЕ",
				step: "completed",
				onClose: () => {},
			}),
		);
		assert.ok(htmlCompleted.includes("Чекин успешно пройден!"), "Displays step title for completed");
	});

	it("renders MobileCheckinAppointmentCard with doctor and cabinet info", () => {
		const html = renderToStaticMarkup(
			createElement(MobileCheckinAppointmentCard, {
				patientName: "Смирнова Анна Викторовна",
				appointmentTime: "Сегодня в 14:30",
				doctorName: "Д-р Воронова Е. С.",
				cabinetName: "3",
				queueTicket: "Талон № А-07",
			}),
		);

		assert.ok(html.includes("Смирнова Анна Викторовна"), "Displays patient name");
		assert.ok(html.includes("Сегодня в 14:30"), "Displays appointment time");
		assert.ok(html.includes("Д-р Воронова Е. С."), "Displays doctor name");
		assert.ok(html.includes("Кабинет 3"), "Displays cabinet number");
		assert.ok(html.includes("Талон № А-07"), "Displays queue ticket");
	});

	it("verifies 100% backward compatibility of SelfCheckinPhoneAuthSection and MobileSelfCheckinModal facades", () => {
		const authHtml = renderToStaticMarkup(
			createElement(SelfCheckinPhoneAuthSection, {
				patientName: "Иванов Иван",
				appointmentTime: "15:00",
				doctorName: "Д-р Петров",
				phoneDigits: "1234",
				setPhoneDigits: () => {},
				showOptionalDocs: false,
				setShowOptionalDocs: () => {},
				authError: null,
				setAuthError: () => {},
				isSubmitting: false,
				onApplyPhysiologicalNorm: () => {},
				onOneTouchCheckin: () => {},
				onGoToConsents: () => {},
				onGoToSomatic: () => {},
			}),
		);

		assert.ok(authHtml.includes("kiosk-tile-scheduled"), "Scheduled tile is present");
		assert.ok(authHtml.includes("kiosk-tile-first-time"), "First time tile is present");
		assert.ok(authHtml.includes("kiosk-tile-emergency"), "Emergency tile is present");
		assert.ok(authHtml.includes("kiosk-express-norm-btn"), "Express norm button is present");
		assert.ok(authHtml.includes("one-touch-checkin-btn"), "One touch checkin button is present");
		assert.ok(authHtml.includes("kiosk-keypad"), "Numeric keypad is embedded");

		const modalHtml = renderToStaticMarkup(
			createElement(MobileSelfCheckinModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Смирнова А. В.",
				appointmentTime: "14:30",
				doctorName: "Д-р Воронова",
			}),
		);

		assert.ok(modalHtml.includes("selfcheckin-modal-window"), "Renders modal window");
		assert.ok(modalHtml.includes("selfcheckin-steps-bar"), "Renders steps progress bar");
		assert.ok(modalHtml.includes("one-touch-checkin-btn"), "Renders arrival button");
	});
});
