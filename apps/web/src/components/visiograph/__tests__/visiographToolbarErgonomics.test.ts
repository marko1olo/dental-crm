import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Visiograph Top Toolbar Ergonomics & Design System Compliance (Mandates 8d, 8e, 8n)", () => {
	const toolbarTsxPath = path.resolve(__dirname, "../VisiographTopToolbar.tsx");
	const toolbarCssPath = path.resolve(__dirname, "../VisiographTopToolbar.css");
	const toolbarTsx = fs.readFileSync(toolbarTsxPath, "utf8");
	const toolbarCss = fs.readFileSync(toolbarCssPath, "utf8");

	test("VisiographTopToolbar enforces canonical 1-row 36px height and 0px horizontal scroll", () => {
		assert.ok(
			toolbarCss.includes("height: 36px") && toolbarCss.includes("overflow-x: clip"),
			"Toolbar CSS must specify height: 36px and overflow-x: clip to prevent layout jitter and horizontal drift",
		);
		assert.ok(
			toolbarCss.includes("flex-wrap: nowrap"),
			"Toolbar CSS must keep items strictly on 1 row without wrapping into multiple messy lines",
		);
	});

	test("Filter Presets are styled with canonical .secondary-button for 1-click chairside workflow", () => {
		// Presets: Canal, Bone, Enamel, Inversion
		assert.ok(
			toolbarTsx.includes('data-testid="btn-filter-canal"'),
			"Must include Canal (endodontics) filter button",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-filter-bone"'),
			"Must include Bone (periodont) filter button",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-filter-enamel"'),
			"Must include Enamel (caries) filter button",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tool-invert"'),
			"Must include Invert filter button",
		);

		// All 4 filter buttons must use .secondary-button
		assert.ok(
			toolbarTsx.includes('className={`secondary-button ${activeClinicalFilter === "endodontics" ? "is-active" : ""}`}') ||
			toolbarTsx.includes('secondary-button'),
			"Filter preset buttons must use canonical .secondary-button class",
		);
	});

	test("Chairside measurement tools are styled with .icon-button (30-32px)", () => {
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tool-pointer"'),
			"Must include Pointer icon button",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tool-ruler"'),
			"Must include Ruler icon button for mm root canal measurement",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tool-angle"'),
			"Must include Goniometer/Angle icon button",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tool-zoom"'),
			"Must include Zoom icon button",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tool-rotate"'),
			"Must include Rotate icon button",
		);

		// Verified .icon-button in CSS
		assert.ok(
			toolbarCss.includes(".visiograph-top-toolbar .icon-button"),
			"CSS must define compact icon-button styling for 36px toolbar",
		);
	});

	test("Dominant Emerald CTA is styled with .primary-button («Прикрепить к визиту»)", () => {
		assert.ok(
			toolbarTsx.includes('data-testid="btn-attach-to-visit"'),
			"Must include Attach-to-visit primary CTA button",
		);
		assert.ok(
			toolbarTsx.includes("Прикрепить к визиту") && toolbarTsx.includes("В приёме"),
			"CTA must support active attached state indication",
		);
		assert.ok(
			toolbarTsx.includes("primary-button"),
			"Attach button must have canonical .primary-button class",
		);
		assert.ok(
			toolbarCss.includes(".visiograph-top-toolbar .primary-button"),
			"CSS must define dominant emerald primary-button styling",
		);
	});

	test("Tooth FDI Formula binder button supports full FDI quadrant popover selection", () => {
		assert.ok(
			toolbarTsx.includes('data-testid="btn-bind-tooth-formula"'),
			"Must include Tooth formula binder trigger badge",
		);
		assert.ok(
			toolbarTsx.includes("Зубная формула (FDI)"),
			"Must display FDI formula header",
		);
		// Quadrants 1 to 4 must be present
		for (const tooth of ["18", "16", "11", "21", "26", "28", "48", "46", "41", "31", "36", "38"]) {
			assert.ok(
				toolbarTsx.includes(`"${tooth}"`),
				`FDI tooth ${tooth} must be selectable in quadrant matrix`,
			);
		}
	});

	test("Secondary advanced tools are neatly organized in «Ещё ▾» dropdown", () => {
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tools-dropdown"'),
			"Must include «Ещё ▾» dropdown trigger",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tool-apex"'),
			"Dropdown must contain Apex WL endo ruler",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tool-lesion"'),
			"Dropdown must contain Periapical lesion destruction area tool",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-tool-calibrate"'),
			"Dropdown must contain Calibration tool",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-visiograph-print-protocol"'),
			"Dropdown must contain Print protocol tool",
		);
		assert.ok(
			toolbarTsx.includes('data-testid="btn-visiograph-export-modal"'),
			"Dropdown must contain Export image modal trigger",
		);
	});

	test("Strict Theme Token Compliance: Zero bare hardcoded dark hex colors without var() fallback", () => {
		// Verify design tokens in CSS
		assert.ok(toolbarCss.includes("var(--paper-soft"), "Must use var(--paper-soft)");
		assert.ok(toolbarCss.includes("var(--paper-strong"), "Must use var(--paper-strong)");
		assert.ok(toolbarCss.includes("var(--teal"), "Must use var(--teal)");
		assert.ok(toolbarCss.includes("var(--line"), "Must use var(--line)");
		assert.ok(toolbarCss.includes("var(--ink"), "Must use var(--ink)");

		// Check for forbidden bare hardcoded hex colors in VisiographTopToolbar.tsx
		const bareDarkHexRegex = /(?:background|background-color)\s*:\s*["']#(?:161b22|0d1117|21262d|30363d|1f6feb)["']/gi;
		const matches = toolbarTsx.match(bareDarkHexRegex);
		assert.strictEqual(
			matches,
			null,
			`Found bare dark hex in VisiographTopToolbar.tsx: ${JSON.stringify(matches)}`,
		);
	});
});
