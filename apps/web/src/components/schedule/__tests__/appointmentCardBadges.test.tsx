import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentCard } from "../AppointmentCard";
import {
	baseAppointment,
	mockDashboard,
	createCardProps,
} from "./appointmentCardTestFixtures";

describe("AppointmentCard Badges", () => {
	it("renders prominent debt badge when patient balanceRub is negative", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentCard, createCardProps(baseAppointment)),
		);
		assert.ok(html.includes("Долг: 4 500 ₽") || html.includes("Долг: 4 500 ₽"));
		assert.ok(html.includes("bg-rose-500/15"));
	});

	it("renders advance deposit badge when patient balanceRub is positive", () => {
		const advanceApp = { ...baseAppointment, id: "app-2", patientId: "pat-advance" };
		const html = renderToStaticMarkup(
			React.createElement(AppointmentCard, createCardProps(advanceApp)),
		);
		assert.ok(html.includes("Аванс: 12 000 ₽") || html.includes("Аванс: 12 000 ₽"));
		assert.ok(html.includes("bg-emerald-500/15"));
	});

	it("renders amber collision warning badge when doctor has overlapping appointment in another room", () => {
		const overlappingAppt = {
			id: "app-other",
			organizationId: "org-1",
			patientId: "pat-zero",
			doctorUserId: "doc-1",
			chairId: "chair-2",
			startsAt: "2026-08-20T10:00:00.000Z",
			endsAt: "2026-08-20T10:30:00.000Z",
			status: "confirmed",
		};
		const dashboardWithCollision = { ...mockDashboard, appointments: [overlappingAppt] };
		const html = renderToStaticMarkup(
			React.createElement(AppointmentCard, createCardProps(baseAppointment, dashboardWithCollision)),
		);
		assert.ok(html.includes("Коллизия: врач записан в два кабинета одновременно"));
		assert.ok(html.includes('data-testid="appointment-collision-badge"'));
	});

	it("renders prominent CITO emergency badge and pulsing alert for acute pain", () => {
		const citoAppointment = {
			...baseAppointment,
			id: "app-cito",
			reason: "CITO! Острая зубная боль, пульпит",
		};
		const html = renderToStaticMarkup(
			React.createElement(AppointmentCard, createCardProps(citoAppointment)),
		);
		assert.ok(html.includes("СРОЧНО"));
		assert.ok(!html.includes("⚡"));
		assert.ok(html.includes('data-testid="appointment-cito-badge"'));
	});
});
