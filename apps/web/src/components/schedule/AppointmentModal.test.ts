import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentModal } from "./AppointmentModal";
import { createModalProps } from "./__tests__/appointmentModalTestFixtures";

describe("AppointmentModal Root Suite", () => {
	it("renders modal dialog markup when isOpen is true", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentModal, createModalProps()),
		);
		assert.ok(html.includes('data-testid="appointment-modal"'));
		assert.ok(html.includes("Иванов Иван"));
	});
});
