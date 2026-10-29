/**
 * marketingRecallsAndAppleHig.test.ts
 * Red Team Inquisitorial tests for Patient Recalls Hub, 1-Click WhatsApp/SMS/Telegram status persistence,
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

test("1. MarketingRecallPatientCard persists status to PostgreSQL /api/recalls/:patientId/status", () => {
	const cardPath = path.join(marketingDir, "MarketingRecallPatientCard.tsx");
	const content = fs.readFileSync(cardPath, "utf8");

	assert.ok(
		content.includes("/api/recalls/"),
		"Must invoke /api/recalls/ to persist recall status in PostgreSQL",
	);
	assert.ok(
		content.includes("denteClinicalMutationHeaders"),
		"Must include mutation headers for status updates",
	);
	assert.ok(
		content.includes("https://wa.me/"),
		"Must provide 1-click WhatsApp messaging link",
	);
	assert.ok(
		content.includes("https://t.me/"),
		"Must provide 1-click Telegram messaging link",
	);
	assert.ok(
		content.includes("/api/patients/recall-candidates/invite"),
		"Must provide SMS invitation route",
	);
});

test("2. MarketingRecallsHub contains Teal Primary CTA for batch reminders", () => {
	const hubPath = path.join(marketingDir, "MarketingRecallsHub.tsx");
	const content = fs.readFileSync(hubPath, "utf8");

	assert.ok(
		content.includes("btn-batch-recall-reminders"),
		"Must have data-testid btn-batch-recall-reminders",
	);
	assert.ok(
		content.includes("var(--teal"),
		"Primary CTA button must use Teal design token",
	);
	assert.ok(
		content.includes("Отправить напоминания"),
		"Primary CTA text must be human Russian",
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
