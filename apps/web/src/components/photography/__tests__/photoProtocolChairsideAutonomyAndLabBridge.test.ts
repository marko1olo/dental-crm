import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { clamp } from "../photoProtocolMath";
import { VitaShadeSelector } from "../VitaShadeSelector";
import { ClinicalPhotoProtocolModal } from "../ClinicalPhotoProtocolModal";
import { BeforeAfterComparisonView } from "../BeforeAfterComparisonView";
import { BeforeAfterSplitSlider } from "../BeforeAfterSplitSlider";
import { LabPhotoExportDrawer } from "../LabPhotoExportDrawer";
import { PHOTO_PROTOCOL_PRESETS } from "../photoGridPresets";

interface MiniNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	children: MiniNode[];
	childNodes: MiniNode[];
	attrs: Record<string, string>;
	listeners: Record<string, Array<(evt: unknown) => void>>;
	ownerDocument: unknown;
	parentNode: MiniNode | null;
	textContent: string;
	appendChild: (c: MiniNode) => MiniNode;
	insertBefore: (c: MiniNode, b: MiniNode | null) => MiniNode;
	removeChild: (c: MiniNode) => MiniNode;
	addEventListener: (type: string, fn: (evt: unknown) => void) => void;
	removeEventListener: (type: string, fn: (evt: unknown) => void) => void;
	setAttribute: (k: string, v: string) => void;
	getAttribute: (k: string) => string | null;
	removeAttribute: (k: string) => void;
	dispatchEvent: (evt: unknown) => boolean;
}

function createMiniDom() {
	const makeEl = (tag: string, doc: unknown): MiniNode => {
		const node: MiniNode = {
			nodeType: 1,
			tagName: tag.toUpperCase(),
			nodeName: tag.toUpperCase(),
			style: {},
			children: [],
			childNodes: [],
			attrs: {},
			listeners: {},
			ownerDocument: doc,
			parentNode: null,
			textContent: "",
			appendChild(c) {
				c.parentNode = node;
				node.children.push(c);
				node.childNodes.push(c);
				return c;
			},
			insertBefore(c, b) {
				c.parentNode = node;
				const idx = b ? node.childNodes.indexOf(b) : -1;
				if (idx >= 0) {
					node.children.splice(idx, 0, c);
					node.childNodes.splice(idx, 0, c);
				} else {
					node.children.push(c);
					node.childNodes.push(c);
				}
				return c;
			},
			removeChild(c) {
				node.children = node.children.filter((x) => x !== c);
				node.childNodes = node.childNodes.filter((x) => x !== c);
				c.parentNode = null;
				return c;
			},
			addEventListener(type, fn) {
				if (!node.listeners[type]) node.listeners[type] = [];
				node.listeners[type].push(fn);
			},
			removeEventListener(type, fn) {
				if (node.listeners[type]) {
					node.listeners[type] = node.listeners[type].filter((x) => x !== fn);
				}
			},
			setAttribute(k, v) {
				node.attrs[k] = String(v);
			},
			getAttribute(k) {
				return node.attrs[k] ?? null;
			},
			removeAttribute(k) {
				delete node.attrs[k];
			},
			dispatchEvent(evt: unknown) {
				const e = evt as { type: string; bubbles?: boolean; target?: unknown };
				e.target = node;
				for (const fn of node.listeners[e.type] ?? []) fn(e);
				if (e.bubbles && node.parentNode) node.parentNode.dispatchEvent(e);
				return true;
			},
		};
		return node;
	};
	const doc = {
		createElement: (tag: string) => makeEl(tag, doc),
		createElementNS: (_ns: string, tag: string) => makeEl(tag, doc),
		createTextNode: (t: string): MiniNode => ({
			...makeEl("#text", doc),
			nodeType: 3,
			textContent: t,
		}),
		createComment: (t: string): MiniNode => ({
			...makeEl("#comment", doc),
			nodeType: 8,
			textContent: t,
		}),
	};
	return { doc, container: makeEl("div", doc) };
}

function findByTestId(root: MiniNode, id: string): MiniNode | null {
	if (root.attrs["data-testid"] === id) return root;
	for (const c of root.children) {
		const hit = findByTestId(c, id);
		if (hit) return hit;
	}
	return null;
}

describe("Photo Protocol Chairside Autonomy & Dental Lab (ZTL) Bridge (6G Live SUT)", () => {
	test("1. Clicking btn-transfer-vita-to-lab dispatches dente-apply-lab-shade and persists localStorage preset", async () => {
		const prevDoc = globalThis.document;
		const prevWin = globalThis.window;
		const prevLocal = globalThis.localStorage;
		const prevCustomEvent = globalThis.CustomEvent;

		const storage = new Map<string, string>();
		const dispatched: Array<{ type: string; detail: unknown }> = [];
		const { doc, container } = createMiniDom();

		const localStorageStub = {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => {
				storage.set(k, v);
			},
			removeItem: (k: string) => {
				storage.delete(k);
			},
			clear: () => {
				storage.clear();
			},
			key: () => null,
			length: 0,
		};
		class TestCustomEvent<T = unknown> {
			type: string;
			detail: T;
			constructor(type: string, init?: { detail?: T }) {
				this.type = type;
				this.detail = init?.detail as T;
			}
		}

		(globalThis as { document?: unknown }).document = doc;
		(globalThis as { localStorage?: unknown }).localStorage = localStorageStub;
		(globalThis as { CustomEvent?: unknown }).CustomEvent = TestCustomEvent;
		(globalThis as { window?: unknown }).window = {
			dispatchEvent: (ev: { type: string; detail?: unknown }) => {
				dispatched.push({ type: ev.type, detail: ev.detail });
				return true;
			},
			addEventListener: () => {},
			removeEventListener: () => {},
		};

		let root: Root | null = null;
		try {
			root = createRoot(container as unknown as HTMLElement);
			await act(async () => {
				root?.render(
					React.createElement(VitaShadeSelector, {
						beforeShadeCode: "A3",
						afterShadeCode: "A1",
						onBeforeShadeChange: () => {},
						onAfterShadeChange: () => {},
					}),
				);
			});
			const transferBtn = findByTestId(container, "btn-transfer-vita-to-lab");
			assert.ok(transferBtn, "btn-transfer-vita-to-lab must render");
			await act(async () => {
				transferBtn.dispatchEvent({ type: "click", bubbles: true });
			});

			const savedRaw = storage.get("dente_active_lab_shade_preset");
			assert.ok(savedRaw, "VITA preset must be written to localStorage");
			const parsed = JSON.parse(savedRaw) as { afterShade?: string; beforeShade?: string };
			assert.strictEqual(parsed.beforeShade, "A3");
			assert.strictEqual(parsed.afterShade, "A1");

			const labEvent = dispatched.find((e) => e.type === "dente-apply-lab-shade");
			assert.ok(labEvent, "dente-apply-lab-shade CustomEvent must be dispatched");
		} finally {
			await act(async () => {
				root?.unmount();
			});
			(globalThis as { document?: unknown }).document = prevDoc;
			(globalThis as { window?: unknown }).window = prevWin;
			(globalThis as { localStorage?: unknown }).localStorage = prevLocal;
			(globalThis as { CustomEvent?: unknown }).CustomEvent = prevCustomEvent;
		}
	});

	test("2. ClinicalPhotoProtocolModal renders mobile tactile drag handle and zero disabled buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(ClinicalPhotoProtocolModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-bridge-1",
				patientName: "Тестов А.Б.",
			}),
		);
		assert.ok(html.includes('class="photo-mobile-drag-handle"'));
		assert.ok(html.includes('data-testid="clinical-photo-protocol-modal"'));
		assert.strictEqual(html.includes('disabled=""'), false);
	});

	test("3. Comparison & Split Slider live rendering + clamp math boundaries", () => {
		const preset = PHOTO_PROTOCOL_PRESETS[0];
		assert.ok(preset);

		const compHtml = renderToStaticMarkup(
			React.createElement(BeforeAfterComparisonView, {
				preset,
				slotsData: {},
				beforeSlotId: preset.slots[0]?.id ?? "slot_1",
				afterSlotId: preset.slots[1]?.id ?? "slot_2",
			}),
		);
		assert.ok(compHtml.includes('data-testid="before-after-split-slider"'));

		const splitHtml = renderToStaticMarkup(
			React.createElement(BeforeAfterSplitSlider, {
				beforeImageUrl: "https://example.local/before.jpg",
				afterImageUrl: "https://example.local/after.jpg",
				sliderPosition: 60,
			}),
		);
		assert.ok(splitHtml.includes("Сплит До/После: 60%"));
		assert.strictEqual(splitHtml.includes('disabled=""'), false);

		assert.equal(clamp(0.2, 0.5, 4.0), 0.5);
		assert.equal(clamp(5.0, 0.5, 4.0), 4.0);
		assert.equal(clamp(1.25, 0.5, 4.0), 1.25);
	});

	test("4. LabPhotoExportDrawer renders PNG/PDF export and ZTL transfer actions with 0 disabled buttons", () => {
		const preset = PHOTO_PROTOCOL_PRESETS[0];
		assert.ok(preset);
		const html = renderToStaticMarkup(
			React.createElement(LabPhotoExportDrawer, {
				preset,
				slotsData: {},
				patientName: "Петров И.И.",
			}),
		);
		assert.ok(html.includes('data-testid="btn-transfer-vita-to-lab"'));
		assert.ok(html.includes('data-testid="btn-export-lab-png"'));
		assert.ok(html.includes('data-testid="btn-export-lab-pdf"'));
		assert.strictEqual(html.includes('disabled=""'), false);
	});
});
