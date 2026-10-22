import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import { StaffMessengerPanel } from "../StaffMessengerPanel";

describe("In-Clinic Staff Messenger (Mandate 4 & 8e)", () => {
	it("renders free natural staff chat container and live input (Enter-to-send)", () => {
		const html = renderToStaticMarkup(<StaffMessengerPanel />);
		assert.ok(html.includes('data-testid="staff-messenger-panel"'), "Must render staff-messenger-panel");
		assert.ok(html.includes('data-testid="staff-chat-input"'), "Must render free live chat text input");
		assert.ok(html.includes('data-testid="staff-chat-send-btn"'), "Must render send button");
		assert.ok(html.includes('data-testid="chairside-location-selector"'), "Must render dynamic location / cabinet selector");
	});

	it("renders 1-click chairside intercom presets bar without modal labyrinths", () => {
		const html = renderToStaticMarkup(<StaffMessengerPanel />);
		assert.ok(html.includes('data-testid="chairside-intercom-pings-bar"'), "Must render chairside intercom pings bar");
		assert.ok(html.includes('data-testid="intercom-btn-call-assistant"'), "Must render 1-click assistant call button");
		assert.ok(html.includes('data-testid="intercom-btn-invite-next"'), "Must render 1-click invite next patient button");
		assert.ok(html.includes('data-testid="intercom-btn-delay-10m"'), "Must render 1-click delay 10m button");
		assert.ok(html.includes('data-testid="intercom-btn-sterilization"'), "Must render 1-click sterilization button");
		assert.ok(html.includes('data-testid="intercom-btn-patient-arrived"'), "Must render 1-click patient arrived button");
		assert.ok(html.includes('data-testid="intercom-btn-xray-ready"'), "Must render 1-click CT scan ready button");
		assert.ok(html.includes('data-testid="intercom-btn-lab-ready"'), "Must render 1-click dental lab button");
		assert.ok(html.includes('data-testid="intercom-btn-urgent-doctor"'), "Must render 1-click urgent doctor SOS button");
	});
});
