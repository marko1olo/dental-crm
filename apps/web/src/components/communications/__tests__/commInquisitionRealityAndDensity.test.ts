import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { describeDispatchReport } from "../deliveryReportNotice";
import { summarizeJournal } from "../journalDigest";
import { commDir } from "./communicationsInquisitionFixtures";

describe("Red Team Inquisition: Mandate 8i — CRM != Reality Simulator", () => {
	it("1. No fake spam simulation or academic multi-tier campaign bloat in target files", () => {
		const targetFiles = [
			"MessageDeliveryConsole.tsx",
			"CampaignPanel.tsx",
			"deliveryReportNotice.ts",
			"journalDigest.ts",
		];
		for (const file of targetFiles) {
			const content = fs.readFileSync(path.resolve(commDir, file), "utf-8");
			assert.ok(!content.includes("fakeSimulation"), `${file} must not have fakeSimulation`);
			assert.ok(!content.includes("spamScore"), `${file} must not have spamScore`);
			assert.ok(!content.includes("mockDispatch"), `${file} must not have mockDispatch`);
		}
	});

	it("2. Real queue states and direct channel logging supported", () => {
		const report = describeDispatchReport({
			claimed: 3, sent: 3, retried: 0, failed: 0, suppressed: 0,
			notConfigured: 0, deferred: 0, releasedStuck: 0, awaitingRetry: 0, awaitingSchedule: 0,
		});
		assert.equal(report.kind, "done");
		assert.match(report.text, /Отправлено: 3 сообщения/);

		const digest = summarizeJournal([
			{ direction: "outbound", status: "delivered" },
			{ direction: "inbound", status: "delivered" },
		]);
		assert.equal(digest.phase, "ready");
		assert.equal(digest.total, 2);
		assert.equal(digest.undelivered, 0);
	});
});

describe("Red Team Inquisition: Mandate 8d pt 7 — Zero Cartoon Emojis", () => {
	it("1. Zero raw emojis in notification templates, buttons, and status badges", () => {
		const targetFiles = [
			"MessageDeliveryConsole.tsx",
			"CampaignPanel.tsx",
			"deliveryReportNotice.ts",
			"journalDigest.ts",
			"communicationsCostEngine.ts",
		];
		const emojiRegex = /\p{Extended_Pictographic}/u;

		for (const file of targetFiles) {
			const fullPath = path.resolve(commDir, file);
			if (!fs.existsSync(fullPath)) continue;
			const lines = fs.readFileSync(fullPath, "utf-8").split("\n");
			lines.forEach((line, index) => {
				assert.ok(!emojiRegex.test(line), `Found cartoon emoji in ${file}:${index + 1} -> ${line.trim()}`);
			});
		}
	});
});

describe("Red Team Inquisition: Mandate 8d pt 3 & pt 6 — Anti-Matryoshka & Desktop Density", () => {
	it("1. Max modal depth = 1: no nested modal dialogs or layered cards in communications", () => {
		const targetFiles = ["MessageDeliveryConsole.tsx", "CampaignPanel.tsx"];
		for (const file of targetFiles) {
			const content = fs.readFileSync(path.resolve(commDir, file), "utf-8");
			const modalCount = (content.match(/<dialog|<Modal/g) || []).length;
			assert.ok(modalCount <= 1, `${file} must not have nested modals`);
			assert.ok(!content.includes("card-body card"), `${file} must not nest cards`);
		}
	});

	it("2. Desktop Density First: No hardcoded minHeight 44px inline style bloat in CampaignPanel", () => {
		const campaignSrc = fs.readFileSync(path.resolve(commDir, "CampaignPanel.tsx"), "utf-8");
		assert.ok(!campaignSrc.includes('style={{ minHeight: "44px" }}'));
	});
});
