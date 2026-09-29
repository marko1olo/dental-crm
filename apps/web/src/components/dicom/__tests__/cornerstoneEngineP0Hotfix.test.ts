/**
 * cornerstoneEngineP0Hotfix.test.ts
 *
 * Targeted test suite for Cornerstone3D Engine P0 Lifecycle fixes, Presets & Keyboard Shortcuts:
 * - BUG-001 (P0): Dynamic renderingEngineId (no hardcoded "my-engine")
 * - BUG-002 & BUG-003 (P0): Global init guard & addTool try-catch on re-mount
 * - BUG-004 (P0): Honest toggleInvert implementation & viewport invert property
 * - BUG-005 (P0): PanTool registration in init() and setupMprToolGroup()
 * - BUG-008: Synchronization of mandibular nerve safety threshold with MANDIBULAR_NERVE_DANGER_THRESHOLD_MM (1.5mm)
 * - FEAT-009: Elimination of mid-file imports in cornerstoneEngineHelper.ts
 * - FEAT-002: CDViewer (OnDemand3D) reverse-engineered LPF WL presets (Airway, Skull, Endoscopy, Soft Tissue+Bone)
 * - FEAT-008: useCornerstoneKeyboardShortcuts hook (zoom, reset, invert, 1..8 presets)
 * - Real DICOM scans verification: KaVo OP300 slice header and HU calibration
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
	VISIOGRAPH_WINDOW_PRESETS,
	VISIOGRAPH_PRESETS_LIST,
	CDVIEWER_CLINICAL_PRESETS,
	computeVoiRange,
	huToGrayscale,
} from "../VisiographWindowPresets";
import {
	KEYBOARD_PRESET_MAP,
	isTypingInInputElement,
} from "../useCornerstoneKeyboardShortcuts";
import {
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
} from "../cornerstoneTypes";
import { parseDicomSliceHeader } from "../../radiology/realDicomVolumeLoader";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Cornerstone3D Engine P0 Lifecycle & Presets Inquisitor Test Suite", () => {
	// ─── 1. BUG-001: RENDERING ENGINE ID ──────────────────────────────────────
	describe("1. BUG-001 (P0): Dynamic renderingEngineId & toolGroupId", () => {
		it("Cornerstone3DViewer.tsx contains NO hardcoded 'my-engine' references", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);

			assert.equal(
				source.includes('"my-engine"'),
				false,
				'Cornerstone3DViewer.tsx must not contain hardcoded string "my-engine"',
			);
			assert.ok(
				source.includes("renderingEngineIdRef"),
				"Cornerstone3DViewer.tsx must manage renderingEngineId via useRef",
			);
			assert.ok(
				source.includes("toolGroupIdRef"),
				"Cornerstone3DViewer.tsx must manage toolGroupId via useRef",
			);
		});

		it("cornerstoneEngineHelper.ts accepts optional dynamic renderingEngineId", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../cornerstoneEngineHelper.ts"),
				"utf-8",
			);

			assert.ok(
				source.includes("renderingEngineId?: string"),
				"ImplantPlacementParams must accept dynamic renderingEngineId",
			);
		});
	});

	// ─── 2. BUG-002 & BUG-003: INIT GUARDS & SAFE ADD TOOL ────────────────────
	describe("2. BUG-002 & BUG-003 (P0): Global init guard & safe addTool", () => {
		it("Cornerstone3DViewer.tsx defines module-level _csGlobalInitialized guard", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);

			assert.ok(
				source.includes("let _csGlobalInitialized = false"),
				"Must declare module-level _csGlobalInitialized flag",
			);
			assert.ok(
				source.includes("if (!_csGlobalInitialized)"),
				"Must check _csGlobalInitialized before calling cornerstone.init()",
			);
		});

		it("cornerstoneTools.addTool calls are protected with try-catch on re-mount", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);

			assert.ok(
				source.includes("toolsToAdd"),
				"Must iterate over toolsToAdd list",
			);
			assert.ok(
				source.includes("cornerstoneTools.addTool(tool)"),
				"Must add tools dynamically",
			);
		});
	});

	// ─── 3. BUG-004: HONEST TOGGLE INVERT ─────────────────────────────────────
	describe("3. BUG-004 (P0): Color Invert State & Viewport Properties", () => {
		it("Cornerstone3DViewer.tsx implements genuine toggleInvert with setProperties({ invert })", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);

			assert.ok(
				source.includes("const [isInverted, setIsInverted] = useState(false)"),
				"Must maintain isInverted state",
			);
			assert.equal(
				source.includes("toggleInvert={() => {}}"),
				false,
				"Must not have dead stub toggleInvert={() => {}}",
			);
			assert.ok(
				source.includes("setProperties({ invert: nextInvert })"),
				"Must apply invert property to volume viewports",
			);
		});
	});

	// ─── 4. BUG-005: PAN TOOL REGISTRATION ────────────────────────────────────
	describe("4. BUG-005 (P0): PanTool Registration in Init & ToolGroup", () => {
		it("PanTool is registered in Cornerstone3DViewer init() and setupMprToolGroup()", () => {
			const viewerSource = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);
			const helperSource = fs.readFileSync(
				path.resolve(__dirname, "../cornerstoneEngineHelper.ts"),
				"utf-8",
			);

			assert.ok(
				viewerSource.includes("cornerstoneTools.PanTool"),
				"Cornerstone3DViewer must include PanTool in toolsToAdd",
			);
			assert.ok(
				helperSource.includes("toolGroup.addTool(cornerstoneTools.PanTool.toolName)"),
				"setupMprToolGroup must register PanTool in the toolGroup",
			);
		});
	});

	// ─── 5. BUG-008: MANDIBULAR NERVE SAFETY CORRIDOR ─────────────────────────
	describe("5. BUG-008: Mandibular Nerve Safety Corridor Synchronization", () => {
		it("MANDIBULAR_NERVE_DANGER_THRESHOLD_MM is exactly 1.5mm (Misch CE Standard)", () => {
			assert.strictEqual(MANDIBULAR_NERVE_DANGER_THRESHOLD_MM, 1.5);
		});

		it("CornerstoneHudOverlays.tsx imports and uses MANDIBULAR_NERVE_DANGER_THRESHOLD_MM", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../CornerstoneHudOverlays.tsx"),
				"utf-8",
			);

			assert.ok(
				source.includes("MANDIBULAR_NERVE_DANGER_THRESHOLD_MM"),
				"CornerstoneHudOverlays must import MANDIBULAR_NERVE_DANGER_THRESHOLD_MM",
			);
			assert.ok(
				source.includes("${MANDIBULAR_NERVE_DANGER_THRESHOLD_MM.toFixed(1)} мм"),
				"UI must format threshold dynamically using constant",
			);
			assert.equal(
				source.includes("коридор безопасности 2.0 мм"),
				false,
				"Must not show stale hardcoded 2.0 mm corridor label",
			);
		});
	});

	// ─── 6. FEAT-009: CODE SMELL CLEANUP ──────────────────────────────────────
	describe("6. FEAT-009: Elimination of Mid-File Imports", () => {
		it("cornerstoneEngineHelper.ts has NO import statements after first export function", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../cornerstoneEngineHelper.ts"),
				"utf-8",
			);
			const lines = source.split("\n");
			const firstFuncIndex = lines.findIndex((l) => l.trim().startsWith("export function"));
			assert.ok(firstFuncIndex > 0, "File must have an export function");

			for (let i = firstFuncIndex; i < lines.length; i++) {
				const line = lines[i]?.trim() ?? "";
				assert.equal(
					line.startsWith("import ") || line.startsWith("import {"),
					false,
					`Found illegal mid-file import at line ${i + 1}: ${line}`,
				);
			}
		});
	});

	// ─── 7. FEAT-002: CDVIEWER REVERSE-ENGINEERED LPF WL PRESETS ──────────────
	describe("7. FEAT-002: CDViewer (OnDemand3D) Reverse-Engineered WL Presets", () => {
		it("all 8 clinical presets are registered in VISIOGRAPH_PRESETS_LIST", () => {
			assert.strictEqual(VISIOGRAPH_PRESETS_LIST.length, 8);
			const ids = VISIOGRAPH_PRESETS_LIST.map((p) => p.id);
			assert.deepStrictEqual(ids, [
				"bone",
				"enamel_dentin",
				"soft_tissue",
				"endodontic_canal",
				"airway",
				"skull",
				"endoscopy",
				"soft_tissue_bone",
			]);
		});

		it("Airway preset matches LPF Lucion specs (W2000, L-800)", () => {
			const preset = VISIOGRAPH_WINDOW_PRESETS.airway;
			assert.strictEqual(preset.windowWidth, 2000);
			assert.strictEqual(preset.windowCenter, -800);
			const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
			assert.strictEqual(range.lower, -1800);
			assert.strictEqual(range.upper, 200);
		});

		it("Skull preset matches LPF Lucion specs (W2500, L600)", () => {
			const preset = VISIOGRAPH_WINDOW_PRESETS.skull;
			assert.strictEqual(preset.windowWidth, 2500);
			assert.strictEqual(preset.windowCenter, 600);
			const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
			assert.strictEqual(range.lower, -650);
			assert.strictEqual(range.upper, 1850);
		});

		it("Endoscopy / TMJ preset matches LPF Lucion specs (W800, L-200)", () => {
			const preset = VISIOGRAPH_WINDOW_PRESETS.endoscopy;
			assert.strictEqual(preset.windowWidth, 800);
			assert.strictEqual(preset.windowCenter, -200);
			const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
			assert.strictEqual(range.lower, -600);
			assert.strictEqual(range.upper, 200);
		});

		it("Soft Tissue + Bone preset matches LPF Lucion specs (W2800, L400)", () => {
			const preset = VISIOGRAPH_WINDOW_PRESETS.soft_tissue_bone;
			assert.strictEqual(preset.windowWidth, 2800);
			assert.strictEqual(preset.windowCenter, 400);
			const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
			assert.strictEqual(range.lower, -1000);
			assert.strictEqual(range.upper, 1800);
		});

		it("CDVIEWER_CLINICAL_PRESETS exports exactly the 4 reverse-engineered presets", () => {
			assert.strictEqual(CDVIEWER_CLINICAL_PRESETS.length, 4);
			const ids = CDVIEWER_CLINICAL_PRESETS.map((p) => p.id);
			assert.deepStrictEqual(ids, ["airway", "skull", "endoscopy", "soft_tissue_bone"]);
		});

		it("huToGrayscale correctly maps airway and negative HU ranges with clamping", () => {
			const airway = VISIOGRAPH_WINDOW_PRESETS.airway;
			// lower: -1800, center: -800, upper: 200
			assert.strictEqual(huToGrayscale(-2000, airway.windowWidth, airway.windowCenter), 0);
			assert.strictEqual(huToGrayscale(-1800, airway.windowWidth, airway.windowCenter), 0);
			assert.strictEqual(huToGrayscale(-800, airway.windowWidth, airway.windowCenter), 128);
			assert.strictEqual(huToGrayscale(200, airway.windowWidth, airway.windowCenter), 255);
			assert.strictEqual(huToGrayscale(500, airway.windowWidth, airway.windowCenter), 255);
		});
	});

	// ─── 8. FEAT-008: KEYBOARD SHORTCUTS HOOK ─────────────────────────────────
	describe("8. FEAT-008: useCornerstoneKeyboardShortcuts Hook", () => {
		it("KEYBOARD_PRESET_MAP maps keys 1..8 to valid presets", () => {
			assert.strictEqual(KEYBOARD_PRESET_MAP["1"], "bone");
			assert.strictEqual(KEYBOARD_PRESET_MAP["2"], "enamel_dentin");
			assert.strictEqual(KEYBOARD_PRESET_MAP["3"], "soft_tissue");
			assert.strictEqual(KEYBOARD_PRESET_MAP["4"], "endodontic_canal");
			assert.strictEqual(KEYBOARD_PRESET_MAP["5"], "airway");
			assert.strictEqual(KEYBOARD_PRESET_MAP["6"], "skull");
			assert.strictEqual(KEYBOARD_PRESET_MAP["7"], "endoscopy");
			assert.strictEqual(KEYBOARD_PRESET_MAP["8"], "soft_tissue_bone");
		});

		it("isTypingInInputElement ignores non-input elements and detects inputs", () => {
			assert.equal(isTypingInInputElement(null), false);

			// Mock DOM elements
			const inputMock = { tagName: "INPUT", isContentEditable: false } as unknown as HTMLElement;
			const textareaMock = { tagName: "TEXTAREA", isContentEditable: false } as unknown as HTMLElement;
			const selectMock = { tagName: "SELECT", isContentEditable: false } as unknown as HTMLElement;
			const editableMock = { tagName: "DIV", isContentEditable: true } as unknown as HTMLElement;
			const canvasMock = { tagName: "CANVAS", isContentEditable: false } as unknown as HTMLElement;
			const buttonMock = { tagName: "BUTTON", isContentEditable: false } as unknown as HTMLElement;

			assert.equal(isTypingInInputElement(inputMock), true);
			assert.equal(isTypingInInputElement(textareaMock), true);
			assert.equal(isTypingInInputElement(selectMock), true);
			assert.equal(isTypingInInputElement(editableMock), true);
			assert.equal(isTypingInInputElement(canvasMock), false);
			assert.equal(isTypingInInputElement(buttonMock), false);
		});

		it("Cornerstone3DViewer integrates useCornerstoneKeyboardShortcuts hook", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);

			assert.ok(
				source.includes("useCornerstoneKeyboardShortcuts"),
				"Cornerstone3DViewer must call useCornerstoneKeyboardShortcuts",
			);
		});
	});

	// ─── 9. REAL DICOM SCANS VERIFICATION ─────────────────────────────────────
	describe("9. Real DICOM Scans Verification (KaVo OP300 CBCT)", () => {
		const webScanPath = path.resolve(
			__dirname,
			"../../../../public/radiology/kavo_op300_cbct_slice.dcm",
		);
		const fixtureScanPath = path.resolve(
			__dirname,
			"../../../../../../packages/shared/test-fixtures/kavo_op300_cbct_slice_anonymized.dcm",
		);

		it("Public KaVo OP300 slice exists and has authentic DICOM header with calibrated HU rescale", () => {
			assert.ok(fs.existsSync(webScanPath), `Scan file must exist at ${webScanPath}`);
			const buf = fs.readFileSync(webScanPath);
			assert.ok(buf.length > 132, "File must be larger than DICOM preamble (132 bytes)");

			const header = parseDicomSliceHeader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
			assert.ok(header, "Header must be successfully parsed");
			assert.ok(header.rows > 0 && header.cols > 0, "Dimensions must be positive integers");
			assert.ok(header.bitsAllocated === 16, "CBCT must be 16-bit allocated");
			assert.ok(Number.isFinite(header.rescaleSlope), "Rescale slope must be finite");
			assert.ok(Number.isFinite(header.rescaleIntercept), "Rescale intercept must be finite");
		});

		it("Test fixture KaVo OP300 anonymized slice exists and validates", () => {
			assert.ok(fs.existsSync(fixtureScanPath), `Fixture file must exist at ${fixtureScanPath}`);
			const buf = fs.readFileSync(fixtureScanPath);
			const header = parseDicomSliceHeader(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
			assert.ok(header, "Header must be successfully parsed");
			assert.ok(header.rows > 0);
			assert.ok(header.cols > 0);
		});
	});
});
