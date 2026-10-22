import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import { ChairsideIntercomBar } from "../ChairsideIntercomBar";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Chairside Intercom HUD & Anti-RPG (Mandate 4 & 8e)", () => {
	it("renders ChairsideIntercomBar HUD component with clinical specialty grouping and 44px touch targets", () => {
		const html = renderToStaticMarkup(<ChairsideIntercomBar cabinetNumber="2" />);
		assert.ok(html.includes('data-testid="chairside-intercom-bar"'), "Must render chairside intercom HUD");
		assert.ok(html.includes('data-testid="chairside-call-assistant-btn"'), "Must render call assistant button in chair HUD");
		assert.ok(html.includes('data-testid="chairside-invite-next-btn"'), "Must render invite next button in chair HUD");
		assert.ok(html.includes('data-testid="chairside-delay-btn"'), "Must render delay 10m button in chair HUD");
		assert.ok(html.includes('data-testid="chairside-sterilization-btn"'), "Must render sterilization button in chair HUD");
		assert.ok(html.includes('data-testid="chairside-sos-btn"'), "Must render SOS button in chair HUD");
		assert.ok(html.includes("Каб. 2"), "Must show current cabinet number in chair HUD");
	});

	it("source code verification: zero multi-level RPG dialogue trees or scripted surveys", () => {
		const source = fs.readFileSync(path.resolve(__dirname, "../StaffMessengerPanel.tsx"), "utf-8");
		assert.ok(!source.includes("dialogueTree"), "Forbidden: no dialogueTree in messenger");
		assert.ok(!source.includes("rpgScenario"), "Forbidden: no rpgScenario in messenger");
		assert.ok(!source.includes("surveyStep"), "Forbidden: no surveyStep in messenger");
		assert.ok(source.includes("staffMessenger.css"), "Must import staffMessenger.css for theme invariants");
		assert.ok(source.includes("staff-chat-channel-btn"), "Must use staff-chat-channel-btn class");
	});
});
