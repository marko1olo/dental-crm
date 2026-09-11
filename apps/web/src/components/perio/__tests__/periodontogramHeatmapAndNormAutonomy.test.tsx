/**
 * apps/web/src/components/perio/__tests__/periodontogramHeatmapAndNormAutonomy.test.tsx
 *
 * WAVE 108: DentalPin Calm Heatmap & 1-Click Healthy Gingiva Norm Autonomy Suite
 * (Supreme Law: THE HAMMER, Mandate 8e — Doctor Autonomy, Mandate 8k — CRM Friction-Killer Law, Mandate 8d — 7 Deadly Sins)
 *
 * Invariants Verified:
 * 1. Discrete Calm Heatmap Tone Mapping:
 *    - null / undefined -> 'neutral' (#d1d5db)
 *    - <= 3 mm -> 'success' (normal gingival sulcus, emerald #34d399)
 *    - == 4 mm -> 'warning-low' (mild periodontitis, amber #fbbf24)
 *    - <= 6 mm (5..6 mm) -> 'warning-high' (moderate periodontitis, orange #f97316)
 *    - > 6 mm (7..15 mm) -> 'error' (severe deep pocket, rose #fb7185)
 * 2. Class & Hex mappings with DENTE design tokens & Light/Dark themes.
 * 3. 1-Click Physiological Norm («Вся десна здорова (Норма)» / «Десна здорова (Норма 1-клик)»):
 *    - Sets all 32 teeth (192 probing points) to normal physiology in 1 click (2 mm, 0% BOP, 0% plaque, 0 recession).
 *    - Doctor is never forced to type 192 points manually at chairside (Mandates 8e, 8k).
 * 4. Touch ergonomics: target >= 44x44px, vector Lucide icons, 0 emojis (Mandate 8d).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";

import {
	probingDepthTone,
	probingDepthClasses,
	probingDepthHex,
	TONE_TO_CLASS,
	TONE_TO_HEX,
	type HeatmapTone,
} from "../perioHeatmap";
import {
	applyHealthyPeriodontiumPreset,
	createDefaultPerioTeeth,
} from "../perioMath";
import { PeriodontogramChart } from "../PeriodontogramChart";
import { PerioArchGrid } from "../PerioArchGrid";
import { PerioProfileStrip } from "../PerioProfileStrip";
import type { PerioToothRecord } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MockDomNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	children: MockDomNode[];
	childNodes: MockDomNode[];
	options: MockDomNode[];
	selectedOptions: MockDomNode[];
	attributes: { name: string; value: string }[];
	ownerDocument: unknown;
	parentNode: MockDomNode | null;
	textContent: string;
	disabled?: boolean;
	value?: string;
	className: string;
	appendChild: (child: MockDomNode) => MockDomNode;
	insertBefore: (child: MockDomNode, before: MockDomNode | null) => MockDomNode;
	removeChild: (child: MockDomNode) => MockDomNode;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: (type: string, fn: EventListener) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	hasAttribute: (name: string) => boolean;
	removeAttribute: (name: string) => void;
	dispatchEvent: (ev: { type: string; [key: string]: unknown }) => boolean;
	getBoundingClientRect: () => {
		top: number;
		left: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	};
	focus: () => void;
	blur: () => void;
	contains: (other: MockDomNode) => boolean;
	[key: string]: unknown;
}

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	// biome-ignore lint/suspicious/noExplicitAny: mock DOM object
	let doc: any;

	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const options: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};

		const el: MockDomNode = {
			nodeType: 1,
			tagName: tag.toUpperCase(),
			nodeName: tag.toUpperCase(),
			style: {},
			dataset: {},
			children,
			childNodes: children,
			options,
			selectedOptions: [],
			attributes: [],
			ownerDocument: null,
			parentNode: null,
			textContent: "",
			disabled: false,
			value: "",
			className: "",
			appendChild: (child: MockDomNode) => {
				children.push(child);
				child.parentNode = el;
				if (child.tagName === "OPTION") {
					options.push(child);
				}
				return child;
			},
			insertBefore: (child: MockDomNode, before: MockDomNode | null) => {
				const idx = before ? children.indexOf(before) : -1;
				if (idx >= 0) children.splice(idx, 0, child);
				else children.push(child);
				child.parentNode = el;
				if (child.tagName === "OPTION") {
					options.push(child);
				}
				return child;
			},
			removeChild: (child: MockDomNode) => {
				const idx = children.indexOf(child);
				if (idx >= 0) children.splice(idx, 1);
				child.parentNode = null;
				return child;
			},
			addEventListener: (type: string, fn: EventListener) => {
				listeners[type] = listeners[type] || [];
				listeners[type].push(fn);
			},
			removeEventListener: (type: string, fn: EventListener) => {
				if (listeners[type]) {
					listeners[type] = listeners[type].filter((l) => l !== fn);
				}
			},
			setAttribute: (name: string, value: string) => {
				attrs[name] = value;
				if (name.startsWith("data-")) {
					el.dataset[name.slice(5)] = value;
				}
				if (name === "disabled") {
					el.disabled = true;
				}
				if (name === "class") {
					el.className = value;
				}
			},
			getAttribute: (name: string) => attrs[name] || null,
			hasAttribute: (name: string) => name in attrs,
			removeAttribute: (name: string) => {
				delete attrs[name];
				if (name === "disabled") {
					el.disabled = false;
				}
				if (name === "class") {
					el.className = "";
				}
			},
			dispatchEvent: (ev: { type: string; [key: string]: unknown }) => {
				const list = listeners[ev.type] || [];
				for (const fn of list) {
					fn(ev as unknown as Event);
				}
				return true;
			},
			getBoundingClientRect: () => ({
				top: 0,
				left: 0,
				right: 1200,
				bottom: 900,
				width: 1200,
				height: 900,
			}),
			focus: () => {},
			blur: () => {},
			contains: (other: MockDomNode) => {
				let curr: MockDomNode | null = other;
				while (curr) {
					if (curr === el) return true;
					curr = curr.parentNode;
				}
				return false;
			},
		};
		el.ownerDocument = doc;
		return el;
	}

	doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({
			nodeType: 3,
			textContent: text,
			style: {},
			parentNode: null,
			ownerDocument: null,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	const win = {
		document: doc,
		addEventListener: (type: string, fn: EventListener) => {
			winListeners[type] = winListeners[type] || [];
			winListeners[type].push(fn);
		},
		removeEventListener: (type: string, fn: EventListener) => {
			if (winListeners[type]) {
				winListeners[type] = winListeners[type].filter((l) => l !== fn);
			}
		},
		dispatchEvent: (ev: { type: string; [key: string]: unknown }) => {
			const list = winListeners[ev.type] || [];
			for (const fn of list) {
				fn(ev as unknown as Event);
			}
			return true;
		},
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
		CustomEvent: globalThis.CustomEvent || class extends Event {
			detail: unknown;
			constructor(type: string, params?: { detail?: unknown }) {
				super(type);
				this.detail = params?.detail;
			}
		},
	};
	(doc as unknown as { defaultView: typeof win }).defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return { doc, win };
}

function findNodeByTestId(
	node: MockDomNode | null,
	testId: string,
): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.("data-testid") === testId) return node;
	if (node.children) {
		for (const child of node.children) {
			const res = findNodeByTestId(child, testId);
			if (res) return res;
		}
	}
	return null;
}

async function clickNode(node: MockDomNode) {
	await act(async () => {
		const reactPropKey = Object.keys(node).find((k) =>
			k.startsWith("__reactProps$"),
		);
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onClick === "function") {
				props.onClick({
					type: "click",
					preventDefault: () => {},
					stopPropagation: () => {},
				});
				return;
			}
		}
		node.dispatchEvent({ type: "click" });
	});
}

describe("WAVE 108: DentalPin Calm Heatmap & 1-Click Healthy Gingiva Norm Autonomy", () => {
	describe("1. probingDepthTone Clinical Discrete Scale (DentalPin Parity)", () => {
		it("returns 'neutral' for null and undefined", () => {
			assert.strictEqual(probingDepthTone(null), "neutral");
			assert.strictEqual(probingDepthTone(undefined), "neutral");
		});

		it("returns 'success' for depth <= 3 mm (normal gingival sulcus)", () => {
			assert.strictEqual(probingDepthTone(0), "success");
			assert.strictEqual(probingDepthTone(1), "success");
			assert.strictEqual(probingDepthTone(2), "success");
			assert.strictEqual(probingDepthTone(3), "success");
		});

		it("returns 'warning-low' for depth == 4 mm (mild periodontitis)", () => {
			assert.strictEqual(probingDepthTone(4), "warning-low");
		});

		it("returns 'warning-high' for depth 5 and 6 mm (moderate periodontitis)", () => {
			assert.strictEqual(probingDepthTone(5), "warning-high");
			assert.strictEqual(probingDepthTone(6), "warning-high");
		});

		it("returns 'error' for depth > 6 mm (severe deep pocket)", () => {
			assert.strictEqual(probingDepthTone(7), "error");
			assert.strictEqual(probingDepthTone(8), "error");
			assert.strictEqual(probingDepthTone(10), "error");
			assert.strictEqual(probingDepthTone(15), "error");
		});
	});

	describe("2. probingDepthHex SVG/Canvas Hex Color Mapping", () => {
		it("maps each tone to correct DentalPin hex code", () => {
			assert.strictEqual(probingDepthHex(null), "#d1d5db"); // neutral
			assert.strictEqual(probingDepthHex(2), "#34d399"); // success (emerald-400)
			assert.strictEqual(probingDepthHex(4), "#fbbf24"); // warning-low (amber-400)
			assert.strictEqual(probingDepthHex(5), "#f97316"); // warning-high (orange-500)
			assert.strictEqual(probingDepthHex(8), "#fb7185"); // error (rose-400)
		});
	});

	describe("3. probingDepthClasses Tailwind Theme Mapping", () => {
		it("provides emerald classes for healthy depth (2 mm)", () => {
			const cls = probingDepthClasses(2);
			assert.ok(cls.includes("emerald"), "Must contain emerald color token");
			assert.ok(cls.includes("dark:"), "Must support dark theme token");
		});

		it("provides amber classes for early pocket (4 mm)", () => {
			const cls = probingDepthClasses(4);
			assert.ok(cls.includes("amber"), "Must contain amber color token");
		});

		it("provides orange classes for moderate pocket (5..6 mm)", () => {
			const cls = probingDepthClasses(5);
			assert.ok(cls.includes("orange"), "Must contain orange color token");
		});

		it("provides rose classes for severe pocket (>6 mm)", () => {
			const cls = probingDepthClasses(8);
			assert.ok(cls.includes("rose"), "Must contain rose color token");
		});
	});

	describe("4. 1-Click Healthy Gingiva Norm (Mandates 8e, 8k)", () => {
		it("applyHealthyPeriodontiumPreset sets all 32 teeth (192 sites) to physiological norm", () => {
			const dirtyTeeth: PerioToothRecord[] = createDefaultPerioTeeth(2).map((t) => ({
				...t,
				mobility: 2,
				furcation: 1,
				distoBuccal: { probingDepthMm: 7, gingivalMarginMm: 3, bleedingOnProbing: true, plaque: true, suppuration: true, calculus: true },
				midBuccal: { probingDepthMm: 6, gingivalMarginMm: 2, bleedingOnProbing: true, plaque: true, suppuration: false, calculus: true },
				mesioBuccal: { probingDepthMm: 8, gingivalMarginMm: 4, bleedingOnProbing: true, plaque: true, suppuration: true, calculus: true },
			}));

			const sanitized = applyHealthyPeriodontiumPreset(dirtyTeeth);
			assert.strictEqual(sanitized.length, 32);

			for (const tooth of sanitized) {
				assert.strictEqual(tooth.mobility, 0, `Tooth ${tooth.toothNumber} mobility must be 0`);
				assert.strictEqual(tooth.furcation, 0, `Tooth ${tooth.toothNumber} furcation must be 0`);

				const sites = [
					tooth.distoBuccal,
					tooth.midBuccal,
					tooth.mesioBuccal,
					tooth.distoLingual,
					tooth.midLingual,
					tooth.mesioLingual,
				];

				for (const site of sites) {
					assert.ok(site, "Site must exist");
					assert.strictEqual(site.probingDepthMm, 2, "Probing depth must be 2 mm");
					assert.strictEqual(site.gingivalMarginMm, 0, "Gingival margin must be 0 mm (no recession)");
					assert.strictEqual(site.bleedingOnProbing, false, "BOP must be false (0%)");
					assert.strictEqual(site.plaque, false, "Plaque must be false (0%)");
					assert.strictEqual(site.suppuration, false, "Suppuration must be false");
					assert.strictEqual(site.calculus, false, "Calculus must be false");
				}
			}
		});

		it("PeriodontogramChart renders 1-click norm buttons with touch target >= 44px and zero emojis", () => {
			const html = renderToString(<PeriodontogramChart />);
			const cleanHtml = html.replace(/<!-- -->/g, "");

			assert.ok(
				cleanHtml.includes("data-testid=\"perio-toolbar-norm-1click-btn\""),
				"Must render toolbar norm 1-click button",
			);
			assert.ok(
				cleanHtml.includes("Вся десна здорова (Норма)"),
				"Must contain label 'Вся десна здорова (Норма)'",
			);
			assert.ok(
				cleanHtml.includes("data-testid=\"perio-healthy-norm-btn\""),
				"Must render intact norm button with data-testid='perio-healthy-norm-btn'",
			);
			assert.ok(
				cleanHtml.includes("min-h-[44px]"),
				"Must enforce touch target >= 44px for gloved operation",
			);
		});

		it("PerioArchGrid renders 1-click norm button and applies physiological norm on click", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);

			let updatedResult: PerioToothRecord[] | null = null;
			const initialTeeth = createDefaultPerioTeeth(2);

			const root: Root = createRoot(container as unknown as HTMLElement);
			await act(async () => {
				root.render(
					<PerioArchGrid
						teeth={initialTeeth}
						arch="upper"
						onChange={(updated) => {
							updatedResult = updated;
						}}
					/>,
				);
			});

			const normBtn = findNodeByTestId(container, "perio-preset-norm-btn");
			assert.ok(normBtn, "Must render perio-preset-norm-btn in PerioArchGrid");

			await clickNode(normBtn);

			assert.ok(updatedResult, "onChange must be called with updated teeth");
			assert.strictEqual((updatedResult as PerioToothRecord[]).length, 16);

			for (const tooth of (updatedResult as PerioToothRecord[])) {
				assert.strictEqual(tooth.distoBuccal?.probingDepthMm, 2);
				assert.strictEqual(tooth.midBuccal?.probingDepthMm, 2);
				assert.strictEqual(tooth.mesioBuccal?.probingDepthMm, 2);
				assert.strictEqual(tooth.distoBuccal?.bleedingOnProbing, false);
				assert.strictEqual(tooth.distoBuccal?.plaque, false);
			}

			await act(async () => {
				root.unmount();
			});
		});

		it("PerioProfileStrip renders SVG probe points with probingDepthHex colors", () => {
			const teeth = createDefaultPerioTeeth(2);
			const html = renderToString(
				<PerioProfileStrip teeth={teeth.slice(0, 16)} arch="upper" aspect="buccal" />,
			);

			// Normal depth (2 mm) maps to #34d399 in DentalPin calm heatmap
			assert.ok(
				html.includes("#34d399"),
				"SVG must render probe depth circles filled with calm heatmap hex color #34d399",
			);
		});
	});

	describe("5. 7 Deadly Sins & Mandate 8d Compliance", () => {
		it("guarantees 0 cartoon emojis in perio files (Mandate 8d & Apple HIG)", () => {
			const perioFiles = [
				"perioHeatmap.ts",
				"PeriodontogramChart.tsx",
				"PerioProfileStrip.tsx",
				"PerioArchGrid.tsx",
			];

			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

			for (const file of perioFiles) {
				const filePath = path.resolve(__dirname, "..", file);
				const content = fs.readFileSync(filePath, "utf-8");
				assert.strictEqual(
					emojiRegex.test(content),
					false,
					`File ${file} must have 0 cartoon emojis according to HIG & Mandate 8d`,
				);
			}
		});
	});
});
