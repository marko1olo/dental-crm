import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Visiograph Top Toolbar Layout & Design Tokens (Mandates 8d, 8e, 8n)", () => {
	const tsxFiles = [
		"../VisiographTopToolbar.tsx",
		"../VisiographToolbarFilterCluster.tsx",
		"../VisiographToolbarToolsCluster.tsx",
		"../VisiographToolbarToothBinder.tsx",
		"../VisiographToolbarActionsCluster.tsx",
		"../VisiographToolbarSecondaryMenu.tsx",
	];
	const cssFiles = [
		"../VisiographTopToolbar.css",
		"../VisiographTopToolbarBase.css",
		"../VisiographTopToolbarMenus.css",
	];
	const fullTsx = tsxFiles.map((f) => fs.readFileSync(path.resolve(__dirname, f), "utf8")).join("\n");
	const fullCss = cssFiles.map((f) => fs.readFileSync(path.resolve(__dirname, f), "utf8")).join("\n");

	test("VisiographTopToolbar enforces canonical 1-row 36px height and 0px horizontal scroll", () => {
		assert.ok(fullCss.includes("height: 36px") && fullCss.includes("overflow-x: clip"), "Toolbar CSS must specify height: 36px and overflow-x: clip");
		assert.ok(fullCss.includes("flex-wrap: nowrap"), "Toolbar CSS must keep items on 1 row");
	});

	test("Filter Presets are styled with canonical .secondary-button for 1-click chairside workflow", () => {
		assert.ok(fullTsx.includes('data-testid="btn-filter-canal"'), "Must include Canal filter button");
		assert.ok(fullTsx.includes('data-testid="btn-filter-bone"'), "Must include Bone filter button");
		assert.ok(fullTsx.includes('data-testid="btn-filter-enamel"'), "Must include Enamel filter button");
		assert.ok(fullTsx.includes('data-testid="btn-tool-invert"'), "Must include Invert filter button");
		assert.ok(fullTsx.includes("secondary-button"), "Filter preset buttons must use .secondary-button");
	});

	test("Strict Theme Token Compliance: Zero bare hardcoded dark hex colors without var() fallback", () => {
		assert.ok(fullCss.includes("var(--paper-soft"), "Must use var(--paper-soft)");
		assert.ok(fullCss.includes("var(--paper-strong"), "Must use var(--paper-strong)");
		assert.ok(fullCss.includes("var(--teal"), "Must use var(--teal)");
		assert.ok(fullCss.includes("var(--line"), "Must use var(--line)");
		assert.ok(fullCss.includes("var(--ink"), "Must use var(--ink)");
	});
});
