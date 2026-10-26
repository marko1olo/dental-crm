import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { BUTTON_CLASSES, getButtonClassName } from "../buttonTokens";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Unified Button Design Token Matrix (Section 17 frontend.md)", () => {
	it("1. exports all 5 core tiers in BUTTON_CLASSES with valid geometry", () => {
		// 1. Primary CTA: h-10 px-4 rounded-xl bg-[var(--teal,#0d9488)]
		assert.ok(BUTTON_CLASSES.primary.includes("h-10"), "primary must have h-10");
		assert.ok(BUTTON_CLASSES.primary.includes("rounded-xl"), "primary must have rounded-xl");
		assert.ok(BUTTON_CLASSES.primary.includes("px-4"), "primary must have px-4");
		assert.ok(BUTTON_CLASSES.primary.includes("bg-[var(--teal,#0d9488)]"), "primary must have teal background");

		// 2. Secondary: h-10 px-4 rounded-xl border
		assert.ok(BUTTON_CLASSES.secondary.includes("h-10"), "secondary must have h-10");
		assert.ok(BUTTON_CLASSES.secondary.includes("rounded-xl"), "secondary must have rounded-xl");
		assert.ok(BUTTON_CLASSES.secondary.includes("border"), "secondary must have border");

		// 3. Ghost: h-9 px-3 rounded-lg
		assert.ok(BUTTON_CLASSES.ghost.includes("h-9"), "ghost must have h-9");
		assert.ok(BUTTON_CLASSES.ghost.includes("rounded-lg"), "ghost must have rounded-lg");

		// 4. Pill: h-8 px-3 rounded-lg
		assert.ok(BUTTON_CLASSES.pill.includes("h-8"), "pill must have h-8");
		assert.ok(BUTTON_CLASSES.pill.includes("rounded-lg"), "pill must have rounded-lg");
		assert.ok(BUTTON_CLASSES.pillActive.includes("h-8"), "active pill must have h-8");

		// 5. Icon: 36x36 with 44x44 touch target
		assert.ok(BUTTON_CLASSES.icon.includes("w-9"), "icon must be w-9 (36px)");
		assert.ok(BUTTON_CLASSES.icon.includes("touch:w-11"), "icon must expand to touch 44px");
	});

	it("2. getButtonClassName correctly merges extra classnames", () => {
		const className = getButtonClassName("primary", "custom-trigger");
		assert.ok(className.includes("custom-trigger"));
		assert.ok(className.includes("h-10"));
	});

	it("3. components.css contains all 5 unified button matrix classes", () => {
		const cssPath = path.resolve(__dirname, "../../styles/components.css");
		const cssContent = fs.readFileSync(cssPath, "utf-8");

		assert.ok(cssContent.includes(".btn-primary"), "components.css must define .btn-primary");
		assert.ok(cssContent.includes(".btn-secondary"), "components.css must define .btn-secondary");
		assert.ok(cssContent.includes(".btn-ghost"), "components.css must define .btn-ghost");
		assert.ok(cssContent.includes(".btn-pill"), "components.css must define .btn-pill");
		assert.ok(cssContent.includes(".btn-icon"), "components.css must define .btn-icon");
	});

	it("4. StaffPinPad demo button has zero emojis and zero dashed borders", () => {
		const pinPadPath = path.resolve(__dirname, "../../components/auth/StaffPinPad.tsx");
		const content = fs.readFileSync(pinPadPath, "utf-8");

		// Zero emoji ⚡
		assert.ok(!content.includes("⚡"), "StaffPinPad must NOT contain ⚡ emoji");

		// Zero border-dashed
		assert.ok(!content.includes("border-dashed"), "StaffPinPad must NOT contain border-dashed");
		assert.ok(!content.includes("1px dashed"), "StaffPinPad must NOT contain dashed border inline style");

		// Single-line text
		assert.ok(
			content.includes("Войти как Доктор Демо (PIN: 1111)"),
			"StaffPinPad must have unified text",
		);

		// Lucide Zap with class
		assert.ok(content.includes('<Zap size={16} className="auth-demo-btn-icon" />'));
	});

	it("5. auth.css defines solid border, height 44px, and nowrap for auth-demo-btn", () => {
		const authCssPath = path.resolve(__dirname, "../../styles/auth.css");
		const authCss = fs.readFileSync(authCssPath, "utf-8");

		// Height 44px
		assert.ok(authCss.includes("height: 44px;"), "auth-demo-btn must have height: 44px");

		// Solid border (no dashed in auth-demo-btn)
		assert.ok(!authCss.includes("1.5px dashed"), "auth-demo-btn must not have dashed border");

		// Nowrap text
		assert.ok(authCss.includes("white-space: nowrap;"), "auth-demo-btn must have white-space: nowrap");
	});
});
