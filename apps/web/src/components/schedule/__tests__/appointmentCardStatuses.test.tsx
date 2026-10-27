import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Appointment } from "@dental/shared";
import { AppointmentCard } from "../AppointmentCard";
import {
	baseAppointment,
	mockAppointmentLabels,
	createCardProps,
} from "./appointmentCardTestFixtures";

describe("AppointmentCard Statuses", () => {
	it("renders distinct status indicators for confirmed, in_treatment, arrived and completed", () => {
		const statuses: Array<Appointment["status"]> = ["confirmed", "in_treatment", "arrived", "completed"];

		for (const st of statuses) {
			const stAppointment = { ...baseAppointment, id: `app-${st}`, status: st };
			const html = renderToStaticMarkup(
				React.createElement(AppointmentCard, createCardProps(stAppointment)),
			);
			assert.ok(html.includes(mockAppointmentLabels[st]), `должен содержать лейбл статуса ${st}`);
			if (st === "in_treatment") {
				assert.ok(html.includes("animate-ping"));
			} else if (st === "confirmed") {
				assert.ok(html.includes("border-emerald-500"));
			} else if (st === "arrived") {
				assert.ok(html.includes("border-amber-500"));
			}
		}
	});

	it("renders direct patient CT / X-ray radiology action button in appointment card", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentCard, createCardProps(baseAppointment)),
		);
		assert.ok(html.includes("appointment-context-menu-btn"));
	});
});
