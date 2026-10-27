import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingSmsBlock } from "../../BookingSmsBlock";

describe("Booking Phone Auth: Zero-Barrier SMS Bypass & Fallback Notice", () => {
	it("renders bypass-sms-btn with clear callback wording when SMS is required", () => {
		let fallbackTriggered = false;
		const html = renderToStaticMarkup(
			createElement(BookingSmsBlock, {
				patientPhone: "+7 (999) 000-11-22",
				smsCodeSent: false,
				enteredSmsCode: "",
				isSmsVerified: false,
				isSmsFallbackActive: false,
				smsResendCountdown: 0,
				smsError: null,
				onSendSmsCode: () => {},
				onVerifySmsCode: () => {},
				onCodeChange: () => {},
				onEnableSmsFallback: () => {
					fallbackTriggered = true;
				},
			}),
		);

		assert.ok(
			html.includes('data-testid="bypass-sms-btn"'),
			"Bypass SMS button must be rendered for zero dead-ends",
		);
		assert.ok(
			html.includes("Записаться без СМС (звонок администратора)"),
			"Clear patient-friendly wording for fallback booking",
		);
	});

	it("renders active fallback notice banner when isSmsFallbackActive is true", () => {
		const html = renderToStaticMarkup(
			createElement(BookingSmsBlock, {
				patientPhone: "+7 (999) 555-44-33",
				smsCodeSent: false,
				enteredSmsCode: "",
				isSmsVerified: false,
				isSmsFallbackActive: true,
				smsResendCountdown: 0,
				smsError: null,
				onSendSmsCode: () => {},
				onVerifySmsCode: () => {},
				onCodeChange: () => {},
				onEnableSmsFallback: () => {},
			}),
		);

		assert.ok(
			html.includes('data-testid="sms-fallback-notice"'),
			"Fallback notice banner must be rendered",
		);
		assert.ok(
			html.includes("Предварительная бронь без СМС активна"),
			"Shows pre-booking confirmation message",
		);
		assert.ok(
			html.includes("+7 (999) 555-44-33"),
			"Shows patient phone in callback notice",
		);
	});
});
