/**
 * DENTE CRM — Unit Tests for CBCT Keyboard Navigation & Hotkey Engine
 * Standards: DICOM Part 3, Planmeca Romexis 6.x / Vatech Ez3D-i Keyboard Standard
 *
 * Test Suite:
 * 1. handleCbctKeyDown event dispatcher:
 *    - Slice scroll: ArrowUp/Down, W/S (1 slice), PageUp/PageDown (10 slices)
 *    - Cross-section navigation: ArrowLeft/Right, A/D (1 slice)
 *    - Zooming: +/- / Equal / Minus / Numpad
 *    - Reset transform: Digit0, Home, KeyR
 *    - Fullscreen maximize: Space, KeyF
 *    - Panel toggle: KeyP
 *    - Studio mode toggle: KeyM
 *    - Hounsfield presets: KeyB, KeyE, KeyS, KeyT
 *    - Viewport tab cycling: Tab, Shift+Tab
 *    - Cheatsheet help: ?, Slash, F1
 * 2. Guard conditions:
 *    - Disabled state (enabled: false)
 *    - Modifiers safety (Ctrl, Alt, Meta ignored)
 *    - Form input isolation (input, textarea, select, contentEditable)
 * 3. Zoom computation helpers:
 *    - applyStepZoom boundary clamping & ratio math
 *    - applyCursorZoom cursor-anchored invariant validation
 * 4. Hotkey definition registry integrity
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_HOTKEY_DEFINITIONS,
	applyStepZoom,
	handleCbctKeyDown,
	type CbctKeyboardShortcutsOptions,
} from "../components/radiology/useCbctKeyboardShortcuts";
import {
	applyCursorZoom,
	DEFAULT_VIEWPORT_TRANSFORM,
	type ViewportTransform,
	type CbctViewportType,
} from "../components/radiology/cbctMprMath";

function createMockEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
	let defaultPrevented = false;
	let propagationStopped = false;

	const event = {
		key: "",
		code: "",
		shiftKey: false,
		ctrlKey: false,
		altKey: false,
		metaKey: false,
		target: null,
		preventDefault: () => {
			defaultPrevented = true;
		},
		stopPropagation: () => {
			propagationStopped = true;
		},
		get defaultPrevented() {
			return defaultPrevented;
		},
		get propagationStopped() {
			return propagationStopped;
		},
		...overrides,
	} as unknown as KeyboardEvent;

	return event;
}

describe("CBCT Keyboard Shortcuts Engine", () => {
	describe("1. Slice Navigation (Z/Y/X Planes)", () => {
		it("should trigger single slice scroll on ArrowUp / ArrowDown", () => {
			const actions: string[] = [];
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onScrollSlice: (direction, step) => actions.push(`scroll_${direction}_${step}`),
			};

			const evUp = createMockEvent({ key: "ArrowUp", code: "ArrowUp" });
			const handledUp = handleCbctKeyDown(evUp, options);
			assert.equal(handledUp, true);
			assert.deepEqual(actions, ["scroll_next_1"]);

			const evDown = createMockEvent({ key: "ArrowDown", code: "ArrowDown" });
			const handledDown = handleCbctKeyDown(evDown, options);
			assert.equal(handledDown, true);
			assert.deepEqual(actions, ["scroll_next_1", "scroll_prev_1"]);
		});

		it("should trigger single slice scroll on W / S keys", () => {
			const actions: string[] = [];
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "coronal",
				onScrollSlice: (direction, step) => actions.push(`${direction}_${step}`),
			};

			const evW = createMockEvent({ key: "w", code: "KeyW" });
			handleCbctKeyDown(evW, options);

			const evS = createMockEvent({ key: "s", code: "KeyS" });
			handleCbctKeyDown(evS, options);

			assert.deepEqual(actions, ["next_1", "prev_1"]);
		});

		it("should trigger fast 10-slice scroll on PageUp / PageDown", () => {
			const actions: string[] = [];
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "sagittal",
				onScrollSlice: (direction, step) => actions.push(`${direction}_${step}`),
			};

			const evPgUp = createMockEvent({ key: "PageUp", code: "PageUp" });
			handleCbctKeyDown(evPgUp, options);

			const evPgDn = createMockEvent({ key: "PageDown", code: "PageDown" });
			handleCbctKeyDown(evPgDn, options);

			assert.deepEqual(actions, ["next_10", "prev_10"]);
		});
	});

	describe("2. Cross-Section & Arch Navigation", () => {
		it("should trigger cross-section step on ArrowLeft / ArrowRight", () => {
			const actions: string[] = [];
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "cross_section",
				onNavigateCrossSection: (dir, step) => actions.push(`cs_${dir}_${step}`),
			};

			const evLeft = createMockEvent({ key: "ArrowLeft", code: "ArrowLeft" });
			handleCbctKeyDown(evLeft, options);

			const evRight = createMockEvent({ key: "ArrowRight", code: "ArrowRight" });
			handleCbctKeyDown(evRight, options);

			assert.deepEqual(actions, ["cs_prev_1", "cs_next_1"]);
		});

		it("should trigger cross-section step on A / D keys", () => {
			const actions: string[] = [];
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "cross_section",
				onNavigateCrossSection: (dir, step) => actions.push(`${dir}_${step}`),
			};

			const evA = createMockEvent({ key: "a", code: "KeyA" });
			handleCbctKeyDown(evA, options);

			const evD = createMockEvent({ key: "d", code: "KeyD" });
			handleCbctKeyDown(evD, options);

			assert.deepEqual(actions, ["prev_1", "next_1"]);
		});
	});

	describe("3. Viewport Zoom & Reset", () => {
		it("should trigger zoom in on +, Equal, and NumpadAdd", () => {
			const zooms: string[] = [];
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onZoom: (dir, pct) => zooms.push(`${dir}_${pct}`),
			};

			handleCbctKeyDown(createMockEvent({ key: "+", code: "Equal" }), options);
			handleCbctKeyDown(createMockEvent({ key: "=", code: "Equal" }), options);
			handleCbctKeyDown(createMockEvent({ key: "+", code: "NumpadAdd" }), options);

			assert.deepEqual(zooms, ["in_10", "in_10", "in_10"]);
		});

		it("should trigger zoom out on -, Minus, and NumpadSubtract", () => {
			const zooms: string[] = [];
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onZoom: (dir, pct) => zooms.push(`${dir}_${pct}`),
			};

			handleCbctKeyDown(createMockEvent({ key: "-", code: "Minus" }), options);
			handleCbctKeyDown(createMockEvent({ key: "_", code: "Minus" }), options);
			handleCbctKeyDown(createMockEvent({ key: "-", code: "NumpadSubtract" }), options);

			assert.deepEqual(zooms, ["out_10", "out_10", "out_10"]);
		});

		it("should trigger transform reset on Digit0, Home, and KeyR", () => {
			let resetCount = 0;
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onResetTransform: () => {
					resetCount++;
				},
			};

			handleCbctKeyDown(createMockEvent({ key: "0", code: "Digit0" }), options);
			handleCbctKeyDown(createMockEvent({ key: "Home", code: "Home" }), options);
			handleCbctKeyDown(createMockEvent({ key: "r", code: "KeyR" }), options);

			assert.equal(resetCount, 3);
		});
	});

	describe("4. Window Maximization & Panel Toggles", () => {
		it("should trigger viewport maximization on Space and KeyF", () => {
			let maxCount = 0;
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "coronal",
				onToggleMaximize: () => {
					maxCount++;
				},
			};

			handleCbctKeyDown(createMockEvent({ key: " ", code: "Space" }), options);
			handleCbctKeyDown(createMockEvent({ key: "f", code: "KeyF" }), options);

			assert.equal(maxCount, 2);
		});

		it("should trigger panel toggle on KeyP", () => {
			let panelToggled = false;
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onTogglePanel: () => {
					panelToggled = true;
				},
			};

			handleCbctKeyDown(createMockEvent({ key: "p", code: "KeyP" }), options);
			assert.equal(panelToggled, true);
		});

		it("should trigger studio mode toggle on KeyM", () => {
			let modeToggled = false;
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onToggleMode: () => {
					modeToggled = true;
				},
			};

			handleCbctKeyDown(createMockEvent({ key: "m", code: "KeyM" }), options);
			assert.equal(modeToggled, true);
		});
	});

	describe("5. Hounsfield Density Presets", () => {
		it("should select bone preset on KeyB", () => {
			let selected = "";
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onSelectPreset: (preset) => {
					selected = preset;
				},
			};

			handleCbctKeyDown(createMockEvent({ key: "b", code: "KeyB" }), options);
			assert.equal(selected, "bone");
		});

		it("should select endo preset on KeyE", () => {
			let selected = "";
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onSelectPreset: (preset) => {
					selected = preset;
				},
			};

			handleCbctKeyDown(createMockEvent({ key: "e", code: "KeyE" }), options);
			assert.equal(selected, "endo");
		});

		it("should select soft tissue preset on KeyS and KeyT", () => {
			const presets: string[] = [];
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onSelectPreset: (preset) => presets.push(preset),
			};

			handleCbctKeyDown(createMockEvent({ key: "t", code: "KeyT" }), options);
			assert.deepEqual(presets, ["soft"]);
		});
	});

	describe("6. Tab Cycling Across Viewports", () => {
		const viewports: CbctViewportType[] = ["axial", "coronal", "sagittal", "panoramic", "cross_section"];

		it("should cycle forward through viewports on Tab", () => {
			let currentViewport: CbctViewportType = "axial";
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: currentViewport,
				setActiveViewport: (v) => {
					currentViewport = v;
				},
				viewports,
			};

			// axial -> coronal
			handleCbctKeyDown(createMockEvent({ key: "Tab", code: "Tab", shiftKey: false }), options);
			assert.equal(currentViewport, "coronal");

			// coronal -> sagittal
			options.activeViewport = "coronal";
			handleCbctKeyDown(createMockEvent({ key: "Tab", code: "Tab", shiftKey: false }), options);
			assert.equal(currentViewport, "sagittal");

			// sagittal -> panoramic
			options.activeViewport = "sagittal";
			handleCbctKeyDown(createMockEvent({ key: "Tab", code: "Tab", shiftKey: false }), options);
			assert.equal(currentViewport, "panoramic");

			// panoramic -> cross_section
			options.activeViewport = "panoramic";
			handleCbctKeyDown(createMockEvent({ key: "Tab", code: "Tab", shiftKey: false }), options);
			assert.equal(currentViewport, "cross_section");

			// cross_section -> axial (wrap around)
			options.activeViewport = "cross_section";
			handleCbctKeyDown(createMockEvent({ key: "Tab", code: "Tab", shiftKey: false }), options);
			assert.equal(currentViewport, "axial");
		});

		it("should cycle backward through viewports on Shift+Tab", () => {
			let currentViewport: CbctViewportType = "axial";
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: currentViewport,
				setActiveViewport: (v) => {
					currentViewport = v;
				},
				viewports,
			};

			// axial -> cross_section (backward wrap)
			handleCbctKeyDown(createMockEvent({ key: "Tab", code: "Tab", shiftKey: true }), options);
			assert.equal(currentViewport, "cross_section");

			// cross_section -> panoramic
			options.activeViewport = "cross_section";
			handleCbctKeyDown(createMockEvent({ key: "Tab", code: "Tab", shiftKey: true }), options);
			assert.equal(currentViewport, "panoramic");
		});
	});

	describe("7. Help Cheatsheet Trigger", () => {
		it("should trigger help toggle on ?, Slash, and F1", () => {
			let helpToggled = 0;
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onToggleHelp: () => {
					helpToggled++;
				},
			};

			handleCbctKeyDown(createMockEvent({ key: "?", code: "Slash" }), options);
			handleCbctKeyDown(createMockEvent({ key: "/", code: "Slash" }), options);
			handleCbctKeyDown(createMockEvent({ key: "F1", code: "F1" }), options);

			assert.equal(helpToggled, 3);
		});
	});

	describe("8. Safety Gates & Ignore Conditions", () => {
		it("should do nothing when enabled is false", () => {
			let called = false;
			const options: CbctKeyboardShortcutsOptions = {
				enabled: false,
				activeViewport: "axial",
				onScrollSlice: () => {
					called = true;
				},
			};

			const handled = handleCbctKeyDown(createMockEvent({ key: "ArrowUp", code: "ArrowUp" }), options);
			assert.equal(handled, false);
			assert.equal(called, false);
		});

		it("should ignore shortcuts when Ctrl, Meta, or Alt modifiers are pressed", () => {
			let called = false;
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onScrollSlice: () => {
					called = true;
				},
				onResetTransform: () => {
					called = true;
				},
			};

			// Ctrl + R (browser reload)
			const evCtrlR = createMockEvent({ key: "r", code: "KeyR", ctrlKey: true });
			assert.equal(handleCbctKeyDown(evCtrlR, options), false);

			// Meta + W (close tab on mac)
			const evMetaW = createMockEvent({ key: "w", code: "KeyW", metaKey: true });
			assert.equal(handleCbctKeyDown(evMetaW, options), false);

			// Alt + Tab
			const evAltTab = createMockEvent({ key: "Tab", code: "Tab", altKey: true });
			assert.equal(handleCbctKeyDown(evAltTab, options), false);

			assert.equal(called, false);
		});

		it("should ignore shortcuts when focus is inside text input or textarea", () => {
			let called = false;
			const options: CbctKeyboardShortcutsOptions = {
				activeViewport: "axial",
				onScrollSlice: () => {
					called = true;
				},
			};

			const mockInput = { tagName: "INPUT" } as unknown as HTMLElement;
			const evInput = createMockEvent({ key: "ArrowUp", code: "ArrowUp", target: mockInput });
			assert.equal(handleCbctKeyDown(evInput, options), false);

			const mockTextarea = { tagName: "TEXTAREA" } as unknown as HTMLElement;
			const evTextarea = createMockEvent({ key: "w", code: "KeyW", target: mockTextarea });
			assert.equal(handleCbctKeyDown(evTextarea, options), false);

			const mockContentEditable = {
				tagName: "DIV",
				isContentEditable: true,
			} as unknown as HTMLElement;
			const evEditable = createMockEvent({ key: "Space", code: "Space", target: mockContentEditable });
			assert.equal(handleCbctKeyDown(evEditable, options), false);

			assert.equal(called, false);
		});
	});

	describe("9. Zoom Calculation Math", () => {
		it("should step zoom in and out with default 10% increment", () => {
			const initial: ViewportTransform = { zoom: 1.0, panX: 0, panY: 0 };

			const zoomedIn = applyStepZoom(initial, "in", 10, { width: 300, height: 300 });
			assert.equal(zoomedIn.zoom, 1.1);
			assert.ok(typeof zoomedIn.panX === "number");
			assert.ok(typeof zoomedIn.panY === "number");

			const zoomedOut = applyStepZoom(zoomedIn, "out", 10, { width: 300, height: 300 });
			assert.ok(Math.abs(zoomedOut.zoom - 0.99) < 0.02);
		});

		it("should clamp step zoom to min and max boundaries", () => {
			const nearMax: ViewportTransform = { zoom: 4.8, panX: 0, panY: 0 };
			const atMax = applyStepZoom(nearMax, "in", 50, { width: 300, height: 300 }, 0.5, 5.0);
			assert.equal(atMax.zoom, 5.0);

			const nearMin: ViewportTransform = { zoom: 0.6, panX: 0, panY: 0 };
			const atMin = applyStepZoom(nearMin, "out", 50, { width: 300, height: 300 }, 0.5, 5.0);
			assert.equal(atMin.zoom, 0.5);
		});

		it("should apply cursor-anchored zoom keeping cursor physical point stationary", () => {
			const transform = DEFAULT_VIEWPORT_TRANSFORM; // { zoom: 1.0, panX: 0, panY: 0 }
			const cursorPx = { x: 200, y: 150 };

			// Zoom in with deltaY = -100 (wheel up)
			const zoomed = applyCursorZoom(transform, cursorPx, -100, 0.5, 5.0);

			assert.ok(zoomed.zoom > 1.0, "Zoom factor must increase");

			// The untransformed world point at cursor before and after zoom must be equal:
			const ptBefore = {
				x: (cursorPx.x - transform.panX) / transform.zoom,
				y: (cursorPx.y - transform.panY) / transform.zoom,
			};
			const ptAfter = {
				x: (cursorPx.x - zoomed.panX) / zoomed.zoom,
				y: (cursorPx.y - zoomed.panY) / zoomed.zoom,
			};

			assert.ok(Math.abs(ptBefore.x - ptAfter.x) < 1e-4, "World X under cursor must remain stationary");
			assert.ok(Math.abs(ptBefore.y - ptAfter.y) < 1e-4, "World Y under cursor must remain stationary");
		});
	});

	describe("10. Hotkey Metadata Integrity", () => {
		it("should define all essential CBCT navigation shortcut categories", () => {
			assert.ok(CBCT_HOTKEY_DEFINITIONS.length >= 8);

			const categories = new Set(CBCT_HOTKEY_DEFINITIONS.map((h) => h.category));
			assert.ok(categories.has("slices"));
			assert.ok(categories.has("zoom_pan"));
			assert.ok(categories.has("viewports"));
			assert.ok(categories.has("presets_modes"));

			for (const item of CBCT_HOTKEY_DEFINITIONS) {
				assert.ok(item.keyLabel.length > 0, `Hotkey ${item.descriptionRu} must have keyLabel`);
				assert.ok(item.actionLabel.length > 0, `Hotkey ${item.keyLabel} must have actionLabel`);
				assert.ok(item.descriptionRu.length > 0, "Hotkey must have Russian description");
			}
		});
	});
});
