import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("telegramModule decomposition: subhooks and facade file existence & exports", () => {
	const moduleDir = path.resolve(__dirname, "..");
	const facadePath = path.resolve(__dirname, "../../useTelegramModule.ts");

	assert.ok(fs.existsSync(facadePath), "Facade useTelegramModule.ts must exist");
	assert.ok(fs.existsSync(path.join(moduleDir, "index.ts")), "index.ts must exist");
	assert.ok(fs.existsSync(path.join(moduleDir, "types.ts")), "types.ts must exist");
	assert.ok(fs.existsSync(path.join(moduleDir, "useTelegramBotSettings.ts")), "useTelegramBotSettings.ts must exist");
	assert.ok(fs.existsSync(path.join(moduleDir, "useTelegramPatientNotifications.ts")), "useTelegramPatientNotifications.ts must exist");
	assert.ok(fs.existsSync(path.join(moduleDir, "useTelegramBroadcastCampaigns.ts")), "useTelegramBroadcastCampaigns.ts must exist");

	const barrelContent = fs.readFileSync(path.join(moduleDir, "index.ts"), "utf8");
	assert.ok(barrelContent.includes("useTelegramBotSettings"), "index.ts must export useTelegramBotSettings");
	assert.ok(barrelContent.includes("useTelegramPatientNotifications"), "index.ts must export useTelegramPatientNotifications");
	assert.ok(barrelContent.includes("useTelegramBroadcastCampaigns"), "index.ts must export useTelegramBroadcastCampaigns");
});

test("telegramModule decomposition: Mandate 8b line count budget", () => {
	const moduleDir = path.resolve(__dirname, "..");
	const facadePath = path.resolve(__dirname, "../../useTelegramModule.ts");

	const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
	assert.ok(
		facadeLines <= 80,
		`Facade useTelegramModule.ts must be <= 80 lines under Mandate 8b (actual: ${facadeLines} lines)`,
	);

	const entries = fs.readdirSync(moduleDir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isFile() && entry.name.endsWith(".ts")) {
			const filePath = path.join(moduleDir, entry.name);
			const lines = fs.readFileSync(filePath, "utf8").split("\n").length;
			assert.ok(
				lines <= 800,
				`File ${entry.name} must be <= 800 lines under Mandate 8b (actual: ${lines} lines)`,
			);
		}
	}
});

test("telegramModule decomposition: public return contract verification", () => {
	const facadeContent = fs.readFileSync(
		path.resolve(__dirname, "../../useTelegramModule.ts"),
		"utf8",
	);

	const expectedReturnedHandlers = [
		"telegramSettingsModule",
		"loadMoreTelegramOutbox",
		"loadMoreTelegramLinkCodes",
		"loadMoreTelegramChatLinks",
		"createTelegramLinkCode",
		"copyTelegramTextToClipboard",
		"downloadTelegramQrSvg",
		"revokeTelegramChatLink",
		"previewTelegramTemplate",
		"sendTelegramOutboxItem",
		"sendDueTelegramOutbox",
	];

	for (const handler of expectedReturnedHandlers) {
		assert.ok(
			facadeContent.includes(`${handler}:`) || facadeContent.includes(`${handler},`),
			`Facade return object must contain handler '${handler}'`,
		);
	}
});
