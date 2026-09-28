import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { DENTE_THEMES } from "../themeData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Theme System Inquisition & Law of System Silence Audit", () => {
	it("1. DENTE_THEMES defines exactly 10 noble clinical themes", () => {
		assert.equal(DENTE_THEMES.length, 10, "DENTE_THEMES must contain exactly 10 themes");

		const expectedThemes = [
			"light",
			"dark",
			"ocean",
			"cyber_xray",
			"emerald",
			"sakura",
			"warm_sand",
			"night",
			"calm_teal",
			"contrast",
		];

		const actualIds = DENTE_THEMES.map((t) => t.id);
		for (const expectedId of expectedThemes) {
			assert.ok(
				actualIds.includes(expectedId as any),
				`Expected theme "${expectedId}" must be present in DENTE_THEMES`,
			);
		}

		for (const theme of DENTE_THEMES) {
			assert.ok(theme.name.length > 0, `Theme ${theme.id} must have a valid name`);
			assert.ok(theme.shortLabel.length > 0, `Theme ${theme.id} must have a shortLabel`);
			assert.ok(theme.wcagRatio.length > 0, `Theme ${theme.id} must declare WCAG ratio`);
			assert.ok(theme.primaryDot.startsWith("#"), `Theme ${theme.id} must have hex primaryDot`);
			assert.ok(theme.secondaryDot.startsWith("#"), `Theme ${theme.id} must have hex secondaryDot`);
			assert.ok(theme.description.length > 10, `Theme ${theme.id} must have descriptive text`);
		}
	});

	it("2. Mandate 8d: 100% absence of cartoon emojis across theme definitions", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		for (const theme of DENTE_THEMES) {
			assert.ok(
				!emojiRegex.test(theme.name),
				`Theme name "${theme.name}" contains forbidden emoji`,
			);
			assert.ok(
				!emojiRegex.test(theme.shortLabel),
				`Theme shortLabel "${theme.shortLabel}" contains forbidden emoji`,
			);
			assert.ok(
				!emojiRegex.test(theme.badge),
				`Theme badge "${theme.badge}" contains forbidden emoji`,
			);
			assert.ok(
				!emojiRegex.test(theme.description),
				`Theme description contains forbidden emoji`,
			);
		}
	});

	it("3. ThemeQuickAccessWidget: Law of System Silence and line ceiling", () => {
		const widgetPath = path.resolve(
			__dirname,
			"../../workspace/ThemeQuickAccessWidget.tsx",
		);
		assert.ok(fs.existsSync(widgetPath), "ThemeQuickAccessWidget.tsx must exist");

		const content = fs.readFileSync(widgetPath, "utf-8");
		const lines = content.split("\n");

		// Mandate 8b line ceiling
		assert.ok(
			lines.length <= 800,
			`ThemeQuickAccessWidget.tsx must be <= 800 lines (actual: ${lines.length})`,
		);

		// Law of System Silence: No glowing neon shadow boxes
		assert.ok(
			!content.includes("boxShadow: 0 0 6px") && !content.includes("boxShadow: `0 0 6px"),
			"ThemeQuickAccessWidget must NOT contain glowing neon shadows (violates System Silence)",
		);

		// Must support collapsed and expanded modes
		assert.ok(
			content.includes("collapsed") && content.includes("quick-theme-trigger-collapsed"),
			"ThemeQuickAccessWidget must support collapsed compact icon mode",
		);

		// Must render the ThemeSwitcherModal
		assert.ok(
			content.includes("ThemeSwitcherModal"),
			"ThemeQuickAccessWidget must mount ThemeSwitcherModal",
		);
	});

	it("4. ThemeSwitcherModal: Structure, tokens, and Mandate 8b ceiling", () => {
		const modalPath = path.resolve(__dirname, "../ThemeSwitcherModal.tsx");
		assert.ok(fs.existsSync(modalPath), "ThemeSwitcherModal.tsx must exist");

		const content = fs.readFileSync(modalPath, "utf-8");
		const lines = content.split("\n");

		// Mandate 8b line ceiling
		assert.ok(
			lines.length <= 800,
			`ThemeSwitcherModal.tsx must be <= 800 lines (actual: ${lines.length})`,
		);

		// Must use design tokens
		assert.ok(content.includes("var(--paper)"), "ThemeSwitcherModal must use var(--paper)");
		assert.ok(content.includes("var(--teal)"), "ThemeSwitcherModal must use var(--teal)");
		assert.ok(content.includes("var(--line)"), "ThemeSwitcherModal must use var(--line)");
	});

	it("5. WorkspaceShell: Topbar and Sidebar footer mounting of ThemeQuickAccessWidget", () => {
		const shellPath = path.resolve(__dirname, "../../../workspaceShell.tsx");
		assert.ok(fs.existsSync(shellPath), "workspaceShell.tsx must exist");

		const content = fs.readFileSync(shellPath, "utf-8");

		// ThemeQuickAccessWidget must be mounted in WorkspaceSidebar
		assert.ok(
			content.includes("<ThemeQuickAccessWidget collapsed={collapsed} />"),
			"WorkspaceSidebar must mount ThemeQuickAccessWidget with collapsed prop",
		);

		// Legacy inline ThemeSwitcher must be removed
		assert.ok(
			!content.includes("function ThemeSwitcher()"),
			"Legacy inline ThemeSwitcher function must be eliminated",
		);

		// Topbar must mount ThemeQuickAccessWidget variant="topbar"
		assert.ok(
			content.includes('<ThemeQuickAccessWidget variant="topbar" />'),
			"WorkspaceTopbar must mount ThemeQuickAccessWidget variant='topbar'",
		);
	});
});
