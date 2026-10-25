import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Visiograph Top Toolbar Actions & Controls (Mandates 8d, 8e, 8n)", () => {
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

	test("Chairside measurement tools are styled with .icon-button (30-32px)", () => {
		assert.ok(fullTsx.includes('data-testid="btn-tool-pointer"'), "Must include Pointer icon button");
		assert.ok(fullTsx.includes('data-testid="btn-tool-ruler"'), "Must include Ruler icon button");
		assert.ok(fullTsx.includes('data-testid="btn-tool-angle"'), "Must include Angle icon button");
		assert.ok(fullTsx.includes('data-testid="btn-tool-zoom"'), "Must include Zoom icon button");
		assert.ok(fullTsx.includes('data-testid="btn-tool-rotate"'), "Must include Rotate icon button");
		assert.ok(fullCss.includes(".visiograph-top-toolbar .icon-button"), "CSS must define icon-button");
	});

	test("Dominant Emerald CTA is styled with .primary-button («Сохранить в карту пациента»)", () => {
		assert.ok(fullTsx.includes('data-testid="btn-attach-to-visit"'), "Must include Attach-to-visit primary CTA");
		assert.ok(fullTsx.includes("Сохранить в карту пациента") || fullTsx.includes("Прикрепить к визиту"), "CTA must support attachment");
		assert.ok(fullTsx.includes("primary-button"), "Attach button must have .primary-button");
		assert.ok(fullCss.includes(".visiograph-top-toolbar .primary-button"), "CSS must define emerald primary-button");
	});

	test("Native 3D CBCT viewer launcher is present for heavy Romexis / Ez3D delegation", () => {
		assert.ok(fullTsx.includes('data-testid="btn-open-romexis-ez3d"'), "Must include external 3D viewer launch button");
		assert.ok(fullTsx.includes("Romexis / Ez3D"), "Must show Romexis / Ez3D label");
	});

	test("Tooth FDI Formula binder button supports full FDI quadrant popover selection", () => {
		assert.ok(fullTsx.includes('data-testid="btn-bind-tooth-formula"'), "Must include Tooth formula binder trigger");
		assert.ok(fullTsx.includes("Зубная формула (FDI)"), "Must display FDI formula header");
		for (const tooth of ["18", "16", "11", "21", "26", "28", "48", "46", "41", "31", "36", "38"]) {
			assert.ok(fullTsx.includes(`"${tooth}"`), `FDI tooth ${tooth} must be selectable`);
		}
	});

	test("Secondary advanced tools are neatly organized in «Ещё ▾» dropdown", () => {
		assert.ok(fullTsx.includes('data-testid="btn-tools-dropdown"'), "Must include dropdown trigger");
		assert.ok(fullTsx.includes('data-testid="btn-tool-apex"'), "Must contain Apex WL endo ruler");
		assert.ok(fullTsx.includes('data-testid="btn-tool-lesion"'), "Must contain Periapical lesion tool");
		assert.ok(fullTsx.includes('data-testid="btn-tool-calibrate"'), "Must contain Calibration tool");
		assert.ok(fullTsx.includes('data-testid="btn-visiograph-print-protocol"'), "Must contain Print protocol tool");
		assert.ok(fullTsx.includes('data-testid="btn-visiograph-export-modal"'), "Must contain Export modal trigger");
	});
});
