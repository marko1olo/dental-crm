import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingConfirmationView } from "../../BookingConfirmationView";
import type { BookingConfirmationData } from "../../bookingUtils";

describe("Booking Phone Auth: Pre-booking Banner & Verified Status Badge", () => {
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

		assert.ok(html.includes('data-testid="prebooking-banner"'));
		assert.ok(html.includes("Предварительная бронь принята!"));
		assert.ok(html.includes("Администратор клиники перезвонит вам"));
		assert.ok(html.includes('data-testid="confirmation-status-badge"'));
		assert.ok(html.includes("Предварительная бронь"));
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

		assert.ok(!html.includes('data-testid="prebooking-banner"'));
		assert.ok(html.includes("Подтверждено"));
	});
});
