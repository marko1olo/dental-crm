import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dashboard } from "@dental/shared";
import { AppointmentModal } from "../AppointmentModal";
import {
	mockAppointment,
	mockDashboard,
	createModalProps,
} from "./appointmentModalTestFixtures";

describe("AppointmentModal Actions and Payment", () => {
	it("renders 1-click blank contract button and clean 1-row toolbar with more actions popover per Mandates 8e, 8p", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, createModalProps()),
		);
		assert.ok(html.includes('data-testid="appointment-modal-print-blank-contract-btn"'));
		assert.ok(!html.includes('data-testid="appointment-modal-print-blank-contract-btn" disabled'));
		assert.ok(html.includes("Бланк договора"));
		assert.ok(html.includes('data-testid="appointment-modal-more-actions-btn"'));
		assert.ok(html.includes('data-testid="appointment-modal-print-blank-consent-btn"'));
		assert.ok(html.includes('data-testid="appointment-modal-menu-print-blank-contract-btn"'));
		assert.ok(html.includes('data-testid="appointment-modal-repeat-btn"'));
		assert.ok(html.includes('data-testid="appointment-modal-copy-btn"'));
	});

	it("renders blank contract button for unassigned walk-in patient without passport or SNILS", () => {
		const walkInAppt = {
			...mockAppointment,
			id: "appt-walkin-1",
			patientId: null,
			doctorUserId: "doc-1",
		};
		const emptyDashboard: any = { ...mockDashboard, patients: [] };
		const props = createModalProps(walkInAppt, emptyDashboard as Dashboard, { patientName: () => "" });
		const html = renderToStaticMarkup(React.createElement(AppointmentModal, props));
		assert.ok(html.includes('data-testid="appointment-modal-print-blank-contract-btn"'));
		assert.ok(!html.includes('data-testid="appointment-modal-print-blank-contract-btn" disabled'));
	});

	it("renders 1-click payment button for assigned patient to eliminate cashier friction per Mandates 8e, 8n", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, createModalProps()),
		);
		assert.ok(html.includes('data-testid="appointment-modal-pay-btn"'));
		assert.ok(html.includes("Принять оплату"));
		assert.ok(html.includes('data-testid="appointment-modal-menu-pay-btn"'));
	});
});
