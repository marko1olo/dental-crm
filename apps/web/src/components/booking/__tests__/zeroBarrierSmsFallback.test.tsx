/**
 * zeroBarrierSmsFallback.test.tsx
 *
 * Dedicated Red Team Inquisitor Test Suite:
 * - Mandate 8e: Doctor & Patient Autonomy (Zero Dead-Ends / No Blocking on SMS failure).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Graceful fallback to receptionist callback).
 * - Mandate 8k: Friction-Killer Law (Zero barrier booking in 3 steps).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingConfirmationView } from "../BookingConfirmationView";
import { BookingSmsBlock } from "../BookingSmsBlock";
import type { BookingConfirmationData } from "../bookingUtils";

describe("Red Team Public Booking Inquisitor: Zero-Barrier Graceful SMS Fallback", () => {
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
			html.includes("data-testid=\"bypass-sms-btn\""),
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
			html.includes("data-testid=\"sms-fallback-notice\""),
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

	it("renders pre-booking banner and status badge in BookingConfirmationView for unconfirmed bookings", () => {
		const unconfirmedData: BookingConfirmationData = {
			referenceNumber: "DNT-TEST-1234",
			date: "2026-10-20",
			time: "11:00",
			startsAt: "2026-10-20T11:00:00.000Z",
			endsAt: "2026-10-20T11:30:00.000Z",
			cabinetNumber: "Кабинет №1",
			patientName: "Анна Новикова",
			patientPhone: "+7 (999) 777-88-99",
			comment: "Острая боль [Предварительная бронь без СМС / Звонок администратора]",
			status: "unconfirmed",
			isPreBooking: true,
			doctor: {
				id: "doc-1",
				fullName: "Д-р Смирнова Анна Павловна",
				specialties: ["Стоматолог-терапевт"],
				categoryIds: ["all"],
				experienceYears: 10,
				rating: 5.0,
				reviewsCount: 50,
			},
			branch: {
				id: "b-1",
				name: "DENTE Центр",
				address: "г. Москва, ул. Арбат, д. 1",
				phone: "+7 (495) 000-00-00",
				workHours: "09:00 - 21:00",
			},
			createdAt: "2026-10-17T12:00:00.000Z",
		};

		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: unconfirmedData,
				showArtBackdrop: false,
			}),
		);

		assert.ok(
			html.includes("data-testid=\"prebooking-banner\""),
			"Must display pre-booking alert banner",
		);
		assert.ok(
			html.includes("Предварительная бронь принята!"),
			"Notice informs patient about preliminary reservation",
		);
		assert.ok(
			html.includes("Администратор клиники перезвонит вам"),
			"Reassures patient that clinic will call them back",
		);
		assert.ok(
			html.includes("data-testid=\"confirmation-status-badge\""),
			"Status badge must be rendered",
		);
		assert.ok(
			html.includes("Предварительная бронь"),
			"Status badge shows pre-booking status",
		);
	});

	it("renders confirmed status badge in BookingConfirmationView for verified bookings", () => {
		const confirmedData: BookingConfirmationData = {
			referenceNumber: "DNT-TEST-5678",
			date: "2026-10-20",
			time: "15:00",
			startsAt: "2026-10-20T15:00:00.000Z",
			endsAt: "2026-10-20T15:30:00.000Z",
			patientName: "Петр Васильев",
			patientPhone: "+7 (999) 333-22-11",
			status: "confirmed",
			isPreBooking: false,
			doctor: {
				id: "doc-1",
				fullName: "Д-р Смирнова Анна Павловна",
				specialties: ["Стоматолог-терапевт"],
				categoryIds: ["all"],
				experienceYears: 10,
				rating: 5.0,
				reviewsCount: 50,
			},
			createdAt: "2026-10-17T12:00:00.000Z",
		};

		const html = renderToStaticMarkup(
			createElement(BookingConfirmationView, {
				confirmationData: confirmedData,
				showArtBackdrop: false,
			}),
		);

		assert.ok(
			!html.includes("data-testid=\"prebooking-banner\""),
			"Should not display prebooking banner when confirmed",
		);
		assert.ok(
			html.includes("Подтверждено"),
			"Status badge shows confirmed status",
		);
	});
});
