/**
 * marketingRecallsAndAppleHig.test.ts
 * Red Team Inquisitorial tests for Patient Recalls Hub, WhatsApp/SMS/Telegram status persistence,
 * single Primary CTA, and Apple HIG mobile ergonomics (Mandates 8e, 8am, 8ze).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const marketingDir = path.resolve(__dirname, "..");
const stylesDir = path.resolve(marketingDir, "../../styles/marketingStyles");
const recallsDir = path.resolve(marketingDir, "../recalls");

test("1. PatientRecallsHub canonical SSOT persists status to PostgreSQL /api/patients/recall-candidates", () => {
	const actionsPath = path.join(recallsDir, "recallStatusUpdateApi.ts");
	const actionsContent = fs.readFileSync(actionsPath, "utf8");

	assert.ok(
		actionsContent.includes("/api/patients/recall-candidates/"),
		"Must invoke /api/patients/recall-candidates/ to persist recall status in PostgreSQL",
	);

	const invitePath = path.join(recallsDir, "recallMessagingApi.ts");
	const inviteContent = fs.readFileSync(invitePath, "utf8");
	assert.ok(
		inviteContent.includes("/api/recalls/invite"),
		"Must invoke /api/recalls/invite for messaging invitations",
	);

	const hubActionsPath = path.join(recallsDir, "useRecallHubActions.ts");
	const hubActionsContent = fs.readFileSync(hubActionsPath, "utf8");
	assert.ok(
		hubActionsContent.includes("buildWhatsAppUrl"),
		"Must provide WhatsApp messaging integration",
	);
	assert.ok(
		hubActionsContent.includes("buildTelegramUrl"),
		"Must provide Telegram messaging integration",
	);
});

test("2. PatientRecallsHubModal contains canonical modal structure and Apple HIG drag handle", () => {
	const hubPath = path.join(recallsDir, "PatientRecallsHubModal.tsx");
	const content = fs.readFileSync(hubPath, "utf8");

	assert.ok(
		content.includes("data-testid=\"patient-recalls-hub-modal\""),
		"Must have data-testid patient-recalls-hub-modal",
	);
	assert.ok(
		content.includes("recall-drag-handle"),
		"Modal must contain Apple HIG mobile bottom sheet drag handle",
	);
});

test("3. MarketingRomiTableHeader has exactly ONE Primary CTA in Teal", () => {
	const headerPath = path.join(marketingDir, "MarketingRomiTableHeader.tsx");
	const content = fs.readFileSync(headerPath, "utf8");

	const primaryMatches = content.match(/romi-action-btn primary/g) || [];
	assert.equal(
		primaryMatches.length,
		1,
		"There must be exactly ONE Primary CTA in MarketingRomiTableHeader",
	);
	assert.ok(
		content.includes("Добавить канал"),
		"Primary CTA must be channel addition",
	);
});

test("4. Marketing mobile styles enforce Apple HIG >= 44px touch targets and 0px horizontal drift", () => {
	const mobileCssPath = path.join(stylesDir, "marketingMobile.css");
	const content = fs.readFileSync(mobileCssPath, "utf8");

	assert.ok(
		content.includes("min-height: 44px") || content.includes("min-height:44px"),
		"Touch targets must enforce >= 44px minimum height",
	);
	assert.ok(
		content.includes("overflow-x: clip") || content.includes("overflow-x: hidden"),
		"Must prevent horizontal drift with overflow-x: clip",
	);
});

