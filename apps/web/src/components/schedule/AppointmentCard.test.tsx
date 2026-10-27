import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentCard } from "./AppointmentCard";
import {
	baseAppointment,
	createCardProps,
} from "./__tests__/appointmentCardTestFixtures";

describe("AppointmentCard Root Suite", () => {
	it("renders successfully in static markup without errors", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppointmentCard, createCardProps(baseAppointment)),
		);
		assert.ok(html.includes('data-testid="appointment-card"'));
	});
});
