import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentModal } from "./AppointmentModal";

function createModalProps() {
	return {
		isOpen: true,
		onClose: () => {},
		appointment: {
			id: "appt-1",
			patientId: "patient-1",
			doctorUserId: "doctor-1",
			chairId: "chair-1",
			startsAt: "2026-08-21T10:00:00.000Z",
			endsAt: "2026-08-21T10:30:00.000Z",
			status: "planned" as const,
			reason: "Консультация",
		},
		dashboard: {
			clinicSettings: {
				chairs: [{ id: "chair-1", name: "Кресло 1" }],
				staff: [{ id: "doctor-1", fullName: "Д-р Иванов", role: "doctor" }],
			},
			patients: [
				{ id: "patient-1", fullName: "Иванов Иван Иванович", phone: "+79001234567" },
			],
		} as any,
	};
}

describe("AppointmentModal Root Suite", () => {
	it("renders modal dialog markup when isOpen is true", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, createModalProps()),
		);
		assert.ok(html.includes('data-testid="appointment-modal"'));
	});
});
