/**
 * staffMessengerPanel.test.tsx
 *
 * In-Clinic Staff Messenger & Chairside Intercom Autonomy Test Suite
 * CONSTITUTION: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 4: «CRM != Reality Simulator» — Free natural staff chat without scripted RPG dialog trees
 * - Mandate 8c: Zero Blinding White Spots & Pure Clinical Depth (High contrast Dark/Light themes)
 * - Mandate 8e: Doctor & Staff Autonomy (1-Click instant signals + Enter-to-send live input)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffMessengerPanel } from "../StaffMessengerPanel";
import { ChairsideIntercomBar } from "../ChairsideIntercomBar";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("In-Clinic Staff Messenger & Chairside Intercom (Mandate 4 & 8e)", () => {
	it("renders free natural staff chat container and live input (Enter-to-send)", () => {
		const html = renderToStaticMarkup(<StaffMessengerPanel />);

		// 1. Messenger container is rendered
		assert.ok(
			html.includes('data-testid="staff-messenger-panel"'),
			"Must render staff-messenger-panel",
		);

		// 2. Free live text input is rendered
		assert.ok(
			html.includes('data-testid="staff-chat-input"'),
			"Must render free live chat text input",
		);
		assert.ok(
			html.includes('data-testid="staff-chat-send-btn"'),
			"Must render send button",
		);

		// 3. Location selector is present
		assert.ok(
			html.includes('data-testid="chairside-location-selector"'),
			"Must render dynamic location / cabinet selector",
		);
	});

	it("renders 1-click chairside intercom presets bar without modal labyrinths", () => {
		const html = renderToStaticMarkup(<StaffMessengerPanel />);

		assert.ok(
			html.includes('data-testid="chairside-intercom-pings-bar"'),
			"Must render chairside intercom pings bar",
		);
		assert.ok(
			html.includes('data-testid="intercom-btn-call-assistant"'),
			"Must render 1-click assistant call button",
		);
		assert.ok(
			html.includes('data-testid="intercom-btn-patient-arrived"'),
			"Must render 1-click patient arrived button",
		);
		assert.ok(
			html.includes('data-testid="intercom-btn-xray-ready"'),
			"Must render 1-click CT scan ready button",
		);
		assert.ok(
			html.includes('data-testid="intercom-btn-lab-ready"'),
			"Must render 1-click dental lab button",
		);
		assert.ok(
			html.includes('data-testid="intercom-btn-urgent-doctor"'),
			"Must render 1-click urgent doctor SOS button",
		);
	});

	it("renders ChairsideIntercomBar HUD component with clinical specialty grouping", () => {
		const html = renderToStaticMarkup(
			<ChairsideIntercomBar cabinetNumber="2" />,
		);

		assert.ok(
			html.includes('data-testid="chairside-intercom-bar"'),
			"Must render chairside intercom HUD",
		);
		assert.ok(
			html.includes('data-testid="chairside-call-assistant-btn"'),
			"Must render call assistant button in chair HUD",
		);
		assert.ok(
			html.includes("Каб. 2"),
			"Must show current cabinet number in chair HUD",
		);
	});

	it("source code verification: zero multi-level RPG dialogue trees or scripted surveys", () => {
		const source = fs.readFileSync(
			path.resolve(__dirname, "../StaffMessengerPanel.tsx"),
			"utf-8",
		);

		// Must NOT have over-engineered survey state or scripted dialogue branches
		assert.ok(
			!source.includes("dialogueTree"),
			"Forbidden: no dialogueTree in messenger",
		);
		assert.ok(
			!source.includes("rpgScenario"),
			"Forbidden: no rpgScenario in messenger",
		);
		assert.ok(
			!source.includes("surveyStep"),
			"Forbidden: no surveyStep in messenger",
		);

		// Must use dedicated high-contrast CSS classes
		assert.ok(
			source.includes("staffMessenger.css"),
			"Must import staffMessenger.css for theme invariants",
		);
		assert.ok(
			source.includes("staff-chat-channel-btn"),
			"Must use staff-chat-channel-btn class",
		);
	});
});
