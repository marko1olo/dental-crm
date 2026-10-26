import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Telegram Bot Studio & Hub CSS Decomposition (Mandate 8b)", () => {
	const baseDir = path.resolve(__dirname, "..");
	const studioCssPath = path.join(baseDir, "TelegramBotStudio.css");
	const hubCssPath = path.join(baseDir, "TelegramIntegrationHub.css");
	const studioStylesDir = path.join(baseDir, "styles/studio");
	const hubStylesDir = path.join(baseDir, "styles/hub");

	it("TelegramBotStudio.css is a thin import facade <= 50 lines", () => {
		expect(fs.existsSync(studioCssPath)).toBe(true);
		const content = fs.readFileSync(studioCssPath, "utf-8");
		const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
		expect(lines.length).toBeLessThanOrEqual(50);
		expect(content).toContain('@import "./styles/studio/botStudioLayout.css";');
		expect(content).toContain('@import "./styles/studio/botStudioSimulatorCanvas.css";');
	});

	it("All micro-modules in styles/studio/ are strictly <= 120 lines conforming to Mandate 8b", () => {
		expect(fs.existsSync(studioStylesDir)).toBe(true);
		const files = fs.readdirSync(studioStylesDir).filter((f) => f.endsWith(".css"));
		expect(files.length).toBeGreaterThanOrEqual(20);

		for (const file of files) {
			const filePath = path.join(studioStylesDir, file);
			const raw = fs.readFileSync(filePath, "utf-8");
			const lineCount = raw.split(/\r?\n/).length;

			expect(lineCount).toBeLessThanOrEqual(120);

			// Balanced brackets verification
			const openBrackets = (raw.match(/\{/g) || []).length;
			const closeBrackets = (raw.match(/\}/g) || []).length;
			expect(openBrackets).toBe(closeBrackets);
		}
	});

	it("TelegramIntegrationHub.css is a thin import facade <= 30 lines", () => {
		expect(fs.existsSync(hubCssPath)).toBe(true);
		const content = fs.readFileSync(hubCssPath, "utf-8");
		const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
		expect(lines.length).toBeLessThanOrEqual(30);
		expect(content).toContain('@import "./styles/hub/hubRootAndTabs.css";');
		expect(content).toContain('@import "./styles/hub/hubConnectedCard.css";');
	});

	it("All micro-modules in styles/hub/ are strictly <= 120 lines conforming to Mandate 8b", () => {
		expect(fs.existsSync(hubStylesDir)).toBe(true);
		const files = fs.readdirSync(hubStylesDir).filter((f) => f.endsWith(".css"));
		expect(files.length).toBe(8);

		for (const file of files) {
			const filePath = path.join(hubStylesDir, file);
			const raw = fs.readFileSync(filePath, "utf-8");
			const lineCount = raw.split(/\r?\n/).length;

			expect(lineCount).toBeLessThanOrEqual(120);

			// Balanced brackets verification
			const openBrackets = (raw.match(/\{/g) || []).length;
			const closeBrackets = (raw.match(/\}/g) || []).length;
			expect(openBrackets).toBe(closeBrackets);
		}
	});
});
