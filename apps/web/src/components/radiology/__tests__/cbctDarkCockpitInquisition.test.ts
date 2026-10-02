/**
 * apps/web/src/components/radiology/__tests__/cbctDarkCockpitInquisition.test.ts
 *
 * RED TEAM INQUISITION SUITE: CBCT DARK COCKPIT & ANTI-BLINDING UI VERIFICATION
 *
 * Strict adversarial verification of:
 * 1. Medical Dark Cockpit complete light-theme isolation (#000000 / #090d16);
 * 2. Sliders runnable track (6px, #18181b) and thumb (18px) pseudo-element styling;
 * 3. Transparent background on range inputs (elimination of blinding 44px white blocks);
 * 4. Select and options isolation from CRM light theme;
 * 5. Strict adherence to Mandate 8b (< 800 lines for all touched files).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CBCT Dark Cockpit & Anti-Blinding UI Inquisition", () => {
	const tunerPath = path.resolve(__dirname, "../tuner/CbctTunerPlayground.tsx");
	const stylesPath = path.resolve(__dirname, "../tuner/cbctTunerStyles.css");
	const doctorModalPath = path.resolve(__dirname, "../../settings/DoctorCbctSettingsModal.tsx");
	const mprStudioModalPath = path.resolve(__dirname, "../CbctMprImplantStudioModal.tsx");
	const headerBarPath = path.resolve(__dirname, "../mpr/CbctHeaderBar.tsx");
	const contrastPopoverPath = path.resolve(__dirname, "../mpr/CbctContrastPopover.tsx");
	const touchTargetsPath = path.resolve(__dirname, "../../../styles/touch-targets.css");

	it("1. Mandate 8b: all touched radiology & settings files strictly under 800 lines", () => {
		const files = [
			{ path: tunerPath, name: "CbctTunerPlayground.tsx" },
			{ path: stylesPath, name: "cbctTunerStyles.css" },
			{ path: doctorModalPath, name: "DoctorCbctSettingsModal.tsx" },
			{ path: mprStudioModalPath, name: "CbctMprImplantStudioModal.tsx" },
			{ path: headerBarPath, name: "CbctHeaderBar.tsx" },
			{ path: contrastPopoverPath, name: "CbctContrastPopover.tsx" },
		];

		for (const file of files) {
			assert.ok(fs.existsSync(file.path), `File ${file.name} must exist at ${file.path}`);
			const content = fs.readFileSync(file.path, "utf-8");
			const lineCount = content.split(/\r?\n/).length;
			assert.ok(
				lineCount <= 800,
				`File ${file.name} must be <= 800 lines (Mandate 8b), got ${lineCount}`,
			);
		}
	});

	it("2. cbctTunerStyles.css enforces Dark Cockpit isolation and 100% dark immunity from CRM light theme", () => {
		assert.ok(fs.existsSync(stylesPath), "cbctTunerStyles.css must exist");
		const css = fs.readFileSync(stylesPath, "utf-8");

		// Dark Cockpit container isolation
		assert.ok(css.includes(".cbct-dark-cockpit"), "Must contain .cbct-dark-cockpit selector");
		assert.ok(css.includes('color-scheme: dark !important'), "Must force color-scheme: dark !important");
		assert.ok(css.includes('background-color: #000000 !important'), "Must force background-color: #000000 !important");

		// Light theme immunity override
		assert.ok(
			css.includes('[data-theme="light"]') || css.includes(':is([data-theme="light"]'),
			"Must explicitly override data-theme=light cascade",
		);

		// Select & option immunity
		assert.ok(css.includes("select option"), "Must style select option for dark background");
		assert.ok(css.includes("background-color: #18181b !important"), "Must force dark background on controls");

		// Runnable track 6px height
		assert.ok(css.includes("::-webkit-slider-runnable-track"), "Must style WebKit runnable track");
		assert.ok(css.includes("::-moz-range-track"), "Must style Gecko range track");
		assert.ok(css.includes("height: 6px !important"), "Track height must be strictly 6px");

		// Thumb 18px and margin-top centering
		assert.ok(css.includes("::-webkit-slider-thumb"), "Must style WebKit slider thumb");
		assert.ok(css.includes("::-moz-range-thumb"), "Must style Gecko range thumb");
		assert.ok(css.includes("margin-top: -6px !important"), "Must center 18px thumb on 6px track (-6px margin)");

		// Transparent background on input[type=range]
		assert.ok(
			css.includes("background: transparent !important") ||
				css.includes("background-color: transparent !important"),
			"Range input must have transparent background to prevent 44px white block",
		);

		// Color variants
		assert.ok(css.includes(".cbct-slider--cyan"), "Must provide --cyan variant");
		assert.ok(css.includes(".cbct-slider--amber"), "Must provide --amber variant");
		assert.ok(css.includes(".cbct-slider--emerald"), "Must provide --emerald variant");
		assert.ok(css.includes(".cbct-slider--blue"), "Must provide --blue variant");
		assert.ok(css.includes(".cbct-slider--purple"), "Must provide --purple variant");
		assert.ok(css.includes(".cbct-slider--teal"), "Must provide --teal variant");
	});

	it("3. CbctTunerPlayground.tsx uses cbct-dark-cockpit and cbct-slider classes with zero blinding bg-zinc-800 blocks", () => {
		const code = fs.readFileSync(tunerPath, "utf-8");

		// Imports modular styles
		assert.ok(code.includes('import "./cbctTunerStyles.css"'), "Must import cbctTunerStyles.css");

		// Root container has dark cockpit
		assert.ok(code.includes("cbct-dark-cockpit"), "Playground container must have cbct-dark-cockpit class");
		assert.ok(code.includes('data-cbct-cockpit="true"'), "Playground container must have data-cbct-cockpit attribute");
		assert.ok(code.includes('colorScheme: "dark"'), "Playground container must specify colorScheme: dark");

		// Z-Slider
		assert.ok(
			code.includes('className="w-full cbct-slider cbct-slider--cyan"'),
			"Z-slider must use cbct-slider cbct-slider--cyan",
		);

		// WW & WL sliders
		assert.ok(
			code.includes('data-testid="cbct-slider-window-width"') &&
				code.includes('className="w-full cbct-slider cbct-slider--cyan"'),
			"Window width slider must use cbct-slider cbct-slider--cyan",
		);
		assert.ok(
			code.includes('data-testid="cbct-slider-window-level"') &&
				code.includes('className="w-full cbct-slider cbct-slider--cyan"'),
			"Window level slider must use cbct-slider cbct-slider--cyan",
		);

		// Gamma slider
		assert.ok(
			code.includes('data-testid="cbct-slider-gamma"') &&
				code.includes('className="w-full cbct-slider cbct-slider--amber"'),
			"Gamma slider must use cbct-slider cbct-slider--amber",
		);

		// Soft-Knee slider
		assert.ok(
			code.includes('data-testid="cbct-slider-soft-knee"') &&
				code.includes('className="w-full cbct-slider cbct-slider--emerald"'),
			"Soft-Knee slider must use cbct-slider cbct-slider--emerald",
		);

		// Air cutoff slider
		assert.ok(
			code.includes('data-testid="cbct-slider-air-cutoff"') &&
				code.includes('className="w-full cbct-slider cbct-slider--blue"'),
			"Air cutoff slider must use cbct-slider cbct-slider--blue",
		);

		// Thickness slider
		assert.ok(
			code.includes('data-testid="cbct-slider-thickness"') &&
				code.includes('className="w-full cbct-slider cbct-slider--purple"'),
			"Thickness slider must use cbct-slider cbct-slider--purple",
		);

		// Zero old buggy inline slider background classes
		assert.ok(
			!code.includes("h-3 sm:h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"),
			"Must eliminate all legacy bg-zinc-800 slider classes that expand to 44px blocks",
		);
	});

	it("4. DoctorCbctSettingsModal.tsx isolates dark cockpit and styles all 7 sliders with cbct-slider--teal", () => {
		const code = fs.readFileSync(doctorModalPath, "utf-8");

		// Imports modular styles
		assert.ok(
			code.includes('import "../radiology/tuner/cbctTunerStyles.css"'),
			"Must import cbctTunerStyles.css",
		);

		// Dark cockpit container
		assert.ok(code.includes("cbct-dark-cockpit"), "Must have cbct-dark-cockpit class");
		assert.ok(code.includes('data-cbct-cockpit="true"'), "Must have data-cbct-cockpit attribute");
		assert.ok(code.includes('colorScheme: "dark"'), "Must specify colorScheme: dark");

		// Sliders styled with cbct-slider--teal
		const matches = code.match(/className="w-full cbct-slider cbct-slider--teal"/g);
		assert.ok(matches && matches.length >= 7, `Must style all 7 sliders with cbct-slider--teal, found ${matches?.length ?? 0}`);

		// Zero old bg-slate-800 classes on sliders
		assert.ok(
			!code.includes("accent-teal-400 cursor-pointer h-2 rounded-lg bg-slate-800"),
			"Must eliminate all legacy bg-slate-800 slider classes",
		);
	});

	it("5. CbctMprImplantStudioModal.tsx sets cbct-dark-cockpit container and main.tsx imports cbctTunerStyles.css", () => {
		const mainCode = fs.readFileSync(path.resolve(__dirname, "../../../main.tsx"), "utf-8");
		assert.ok(
			mainCode.includes("cbctTunerStyles.css"),
			"main.tsx must globally import cbctTunerStyles.css",
		);
		const code = fs.readFileSync(mprStudioModalPath, "utf-8");
		assert.ok(code.includes("cbct-dark-cockpit"), "Must have cbct-dark-cockpit class");
		assert.ok(code.includes('data-cbct-cockpit="true"'), "Must have data-cbct-cockpit attribute");
	});

	it("6. touch-targets.css enforces transparent background on input[type=range] to eliminate 44px white blocks", () => {
		const css = fs.readFileSync(touchTargetsPath, "utf-8");
		assert.ok(
			css.includes('input[type="range"]') && css.includes("background: transparent"),
			"touch-targets.css must ensure input[type=range] has background: transparent",
		);
	});

	it("7. Mandate: total greying of button text across all CBCT/MPR components (zero text-white / hover:text-white)", () => {
		const cbctFiles = [
			headerBarPath,
			path.resolve(__dirname, "../mpr/CbctContrastPopover.tsx"),
			path.resolve(__dirname, "../mpr/CbctQuickWlPresets.tsx"),
			path.resolve(__dirname, "../mpr/CbctPanoramicFdiRibbon.tsx"),
			path.resolve(__dirname, "../mpr/CbctViewportsRuler.tsx"),
			path.resolve(__dirname, "../mpr/CbctVolume3DViewport.tsx"),
			path.resolve(__dirname, "../mpr/CbctRightSidebar.tsx"),
			path.resolve(__dirname, "../mpr/workspaces/ImplantWorkspace.tsx"),
			path.resolve(__dirname, "../mpr/workspaces/PanoramicWorkspace.tsx"),
			path.resolve(__dirname, "../mpr/workspaces/PanoramicCrossSectionGrid.tsx"),
			tunerPath,
			path.resolve(__dirname, "../CbctViewportHud.tsx"),
			path.resolve(__dirname, "../CbctHotkeysStatusBar.tsx"),
			path.resolve(__dirname, "../CbctImplantModal.tsx"),
			path.resolve(__dirname, "../CbctLeftToolDock.tsx"),
		];

		for (const filePath of cbctFiles) {
			const code = fs.readFileSync(filePath, "utf-8");
			const lines = code.split("\n");
			lines.forEach((line, idx) => {
				if ((line.includes("<button") || line.includes("className")) && (line.includes("text-white") || line.includes("hover:text-white"))) {
					assert.fail(`Found glaring text-white in ${path.basename(filePath)}:${idx + 1} -> ${line.trim()}`);
				}
			});
		}
	});

	it("8. Upper tabs in CbctHeaderBar.tsx use reduced text-[11px] font-medium and muted zinc tones", () => {
		const headerCode = fs.readFileSync(headerBarPath, "utf-8");
		assert.ok(
			headerCode.includes("text-[11px] font-medium"),
			"Tabs must use text-[11px] font-medium to avoid oversized text relative to icons",
		);
		assert.ok(
			!headerCode.includes("text-white"),
			"Header bar must have zero text-white instances",
		);
		assert.ok(
			!headerCode.includes("text-zinc-100"),
			"Header bar must have zero text-zinc-100 instances",
		);
	});
});
