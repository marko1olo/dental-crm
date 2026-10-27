import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Patient } from "@dental/shared";
import { AppointmentCard } from "../AppointmentCard";
import {
	baseAppointment,
	debtorPatient,
	mockDashboard,
	createCardProps,
} from "./appointmentCardTestFixtures";

describe("AppointmentCard Medical Markers", () => {
	it("renders medical markers: tooth number badge, allergy alert, and somatic status", () => {
		const allergyPatient: Patient = {
			...debtorPatient,
			id: "pat-allergy",
			fullName: "Соколова Елена Викторовна",
			notes: "Аллергия на пенициллин; диабет 2 типа",
		};
		const appointmentWithTeeth = {
			...baseAppointment,
			id: "app-medical",
			patientId: "pat-allergy",
			reason: "Лечение кариеса зуба 26 и 27",
		};
		const dashboardWithAllergy = {
			...mockDashboard,
			patients: [allergyPatient],
		};

		const html = renderToStaticMarkup(
			React.createElement(
				AppointmentCard,
				createCardProps(appointmentWithTeeth, dashboardWithAllergy),
			),
		);

		assert.ok(html.includes('data-testid="appointment-teeth-badge"'));
		assert.ok(html.includes("Зуб 26, 27"));
		assert.ok(html.includes('data-testid="appointment-card-allergy-badge"'));
		assert.ok(html.includes("Внимание: Аллергия на пенициллин"));
		assert.ok(html.includes('data-testid="appointment-somatic-badge"'));
		assert.ok(html.includes("диабет"));
	});
});
