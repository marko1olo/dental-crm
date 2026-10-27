import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { BookingDoctorData } from "../../BookingDoctorCard";
import { PublicOnlineBookingWidget } from "../../PublicOnlineBookingWidget";

describe("Booking Steps: Solo Doctor & Specialist Roster (Mandate 8n)", () => {
	it("renders compact solo doctor banner when 1 doctor is provided", () => {
		const soloDoctor: BookingDoctorData = {
			id: "doc-solo-1",
			fullName: "Д-р Кузнецов Андрей Игоревич",
			specialties: ["Стоматолог-терапевт", "Ортопед"],
			experienceYears: 12,
			rating: 4.95,
			reviewsCount: 88,
			categoryIds: ["all"],
		};

		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, { customDoctors: [soloDoctor] }),
		);

		assert.ok(html.includes("dbw-solo-doctor-banner"));
		assert.ok(html.includes("Соло-доктор"));
		assert.ok(html.includes("Д-р Кузнецов Андрей Игоревич"));
		assert.ok(html.includes("Опыт 12 лет"));
		assert.equal(html.includes("Любой свободный специалист"), false);
	});

	it("renders doctor list with 'Любой свободный специалист' when multiple doctors are provided", () => {
		const multipleDoctors: BookingDoctorData[] = [
			{
				id: "doc-1",
				fullName: "Д-р Смирнова Елена",
				specialties: ["Терапевт"],
				experienceYears: 10,
				rating: 5.0,
				reviewsCount: 45,
				categoryIds: ["all"],
			},
			{
				id: "doc-2",
				fullName: "Д-р Васильев Олег",
				specialties: ["Хирург"],
				experienceYears: 15,
				rating: 4.9,
				reviewsCount: 60,
				categoryIds: ["all"],
			},
		];

		const html = renderToStaticMarkup(
			createElement(PublicOnlineBookingWidget, { customDoctors: multipleDoctors }),
		);

		assert.ok(html.includes("dbw-doctors-list"));
		assert.ok(html.includes("Любой свободный специалист"));
		assert.ok(html.includes("Д-р Смирнова Елена"));
		assert.ok(html.includes("Д-р Васильев Олег"));
	});
});
