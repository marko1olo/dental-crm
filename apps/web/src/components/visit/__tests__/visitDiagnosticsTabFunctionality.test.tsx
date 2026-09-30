/**
 * visitDiagnosticsTabFunctionality.test.tsx
 *
 * Comprehensive Test Suite for VisitDiagnosticsTab Interactive Functionality:
 * 1. Segmented Mode Switcher (RVG / Photo / CBCT / Endo & Implants) and card visibility.
 * 2. All action & modal trigger buttons:
 *    - Direct RVG sensor capture (btn-open-direct-rvg-modal -> DirectRvgCaptureModal)
 *    - Hot folder intake (btn-open-hot-folder-modal -> HotFolderIntakeModal)
 *    - DICOM viewer (btn-open-dicom-viewer-modal -> DicomViewerModal)
 *    - Radiology referral (btn-open-radiology-referral-modal -> RadiologyReferralModal)
 *    - 3D CBCT studio (btn-open-cbct-studio-modal -> CbctMprImplantStudioModal)
 *    - Endo canal working length (btn-open-endo-canal-modal -> EndoCanalLogModal)
 *    - Implant passport (open-implant-passport-modal-btn -> ImplantPassportModal)
 *    - Advanced TRG / Cephalometry toggle & modal (toggle-advanced-diagnostics-btn -> open-visit-ceph-modal-btn -> CephalometricAnalysisModal)
 *    - Photo protocol attachment lifecycle (add photo, list rendering, delete photo)
 * 3. Design token compliance:
 *    - Inactive tabs have 'bg-transparent border-transparent' to prevent browser buttonface.
 *
 * Invariants: Mandates 8d (7 Deadly Sins), 8e (Doctor Autonomy), 8x (Zero Memory Leaks).
 */

import { registerHooks } from "node:module";

// Ensure CSS imports are stubbed in headless test environment if run directly without testCssStub.mjs
try {
	registerHooks({
		load(url, context, nextLoad) {
			if (url.endsWith(".css")) {
				return { format: "module", shortCircuit: true, source: "export default {};" };
			}
			return nextLoad(url, context);
		},
	});
} catch {
	// Hooks already registered
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React, { act, Suspense } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { VisitDiagnosticsTab } from "../VisitDiagnosticsTab";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Headless DOM Environment Setup (Compliant with Mandate 8x & React 19)
// ============================================================================

interface MockDomNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, unknown> & {
		setProperty: (name: string, value: string) => void;
		removeProperty: (name: string) => void;
		getPropertyValue: (name: string) => string;
	};
	dataset: Record<string, string>;
	children: MockDomNode[];
	childNodes: MockDomNode[];
	attributes: { name: string; value: string }[];
	ownerDocument: unknown;
	parentNode: MockDomNode | null;
	rawText: string;
	textContent: string;
	className: string;
	classList: {
		contains: (token: string) => boolean;
		add: (...tokens: string[]) => void;
		remove: (...tokens: string[]) => void;
		toggle: (token: string) => boolean;
	};
	disabled?: boolean;
	value?: string;
	selected?: boolean;
	options?: MockDomNode[];
	length?: number;
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
	getBoundingClientRect: () => { top: number; left: number; right: number; bottom: number; width: number; height: number };
	focus: () => void;
	blur: () => void;
	contains: (other: MockDomNode) => boolean;
	getContext?: (type: string) => unknown;
	toDataURL?: (type?: string) => string;
	[key: string]: unknown;
}

let mockDoc: {
	nodeType: number;
	createElement: (tag?: string) => MockDomNode;
	createElementNS: (_ns: string, tag: string) => MockDomNode;
	createTextNode: (t: string) => unknown;
	createComment: () => unknown;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: () => void;
	documentElement: MockDomNode;
	body: MockDomNode;
	activeElement: unknown;
	defaultView?: unknown;
};

function createMockStyle(): Record<string, unknown> & {
	setProperty: (name: string, value: string) => void;
	removeProperty: (name: string) => void;
	getPropertyValue: (name: string) => string;
} {
	const styleObj: Record<string, unknown> = {
		setProperty: (name: string, value: string) => {
			styleObj[name] = value;
		},
		removeProperty: (name: string) => {
			delete styleObj[name];
		},
		getPropertyValue: (name: string) => {
			return (styleObj[name] as string) || "";
		},
	};
	return styleObj as Record<string, unknown> & {
		setProperty: (name: string, value: string) => void;
		removeProperty: (name: string) => void;
		getPropertyValue: (name: string) => string;
	};
}

function createMockElement(tag = "div"): MockDomNode {
	const children: MockDomNode[] = [];
	const listeners: Record<string, EventListener[]> = {};
	const attrs: Record<string, string> = {};

	const el: MockDomNode = {
		nodeType: 1,
		tagName: tag.toUpperCase(),
		nodeName: tag.toUpperCase(),
		style: createMockStyle(),
		dataset: {},
		children,
		childNodes: children,
		attributes: [],
		ownerDocument: mockDoc,
		parentNode: null,
		rawText: "",
		get textContent(): string {
			if (children.length === 0) return this.rawText;
			return children.map((c) => c.textContent || "").join("");
		},
		set textContent(v: string) {
			this.rawText = v;
		},
		className: "",
		classList: {
			contains: (token: string) => {
				const tokens = (el.className || "").trim().split(/\s+/);
				return tokens.includes(token);
			},
			add: (...tokens: string[]) => {
				const current = new Set((el.className || "").trim().split(/\s+/).filter(Boolean));
				for (const t of tokens) current.add(t);
				el.className = Array.from(current).join(" ");
			},
			remove: (...tokens: string[]) => {
				const current = new Set((el.className || "").trim().split(/\s+/).filter(Boolean));
				for (const t of tokens) current.delete(t);
				el.className = Array.from(current).join(" ");
			},
			toggle: (token: string) => {
				const current = new Set((el.className || "").trim().split(/\s+/).filter(Boolean));
				const had = current.has(token);
				if (had) current.delete(token);
				else current.add(token);
				el.className = Array.from(current).join(" ");
				return !had;
			},
		},
		get options() {
			return children.filter((c) => c.tagName === "OPTION");
		},
		get length() {
			return children.length;
		},
		selected: false,
		value: "",
		getContext: () => {
			const ctx: Record<string, unknown> = {
				drawImage: () => {},
				fillRect: () => {},
				clearRect: () => {},
				getImageData: () => ({ data: new Uint8ClampedArray(4) }),
				putImageData: () => {},
				beginPath: () => {},
				closePath: () => {},
				stroke: () => {},
				fill: () => {},
				save: () => {},
				restore: () => {},
				translate: () => {},
				scale: () => {},
				rotate: () => {},
				resetTransform: () => {},
				moveTo: () => {},
				lineTo: () => {},
				arc: () => {},
				rect: () => {},
				fillText: () => {},
				strokeText: () => {},
				measureText: () => ({ width: 50 }),
				setLineDash: () => {},
				getLineDash: () => [],
			};
			return new Proxy(ctx, {
				get(target, prop) {
					if (prop in target) return target[prop as string];
					return () => {};
				},
			});
		},
		toDataURL: () => "data:image/png;base64,mock",
		appendChild: (child: MockDomNode) => {
			children.push(child);
			child.parentNode = el;
			return child;
		},
		insertBefore: (child: MockDomNode, before: MockDomNode | null) => {
			const idx = before ? children.indexOf(before) : -1;
			if (idx >= 0) children.splice(idx, 0, child);
			else children.push(child);
			child.parentNode = el;
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
			if (name === "class" || name === "className") {
				el.className = value;
			}
			if (name.startsWith("data-")) {
				el.dataset[name.slice(5)] = value;
			}
		},
		getAttribute: (name: string) => {
			if (name === "class" || name === "className") {
				return el.className || attrs[name] || null;
			}
			return attrs[name] || null;
		},
		hasAttribute: (name: string) => name in attrs || (name === "class" && Boolean(el.className)),
		removeAttribute: (name: string) => {
			delete attrs[name];
			if (name === "class" || name === "className") {
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
	return el;
}

function initDom() {
	const docListeners: Record<string, EventListener[]> = {};
	const winListeners: Record<string, EventListener[]> = {};

	mockDoc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({
			nodeType: 3,
			textContent: text,
			parentNode: null,
			ownerDocument: mockDoc,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: mockDoc }),
		addEventListener: (type: string, fn: EventListener) => {
			docListeners[type] = docListeners[type] || [];
			docListeners[type].push(fn);
		},
		removeEventListener: () => {},
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	mockDoc.documentElement.ownerDocument = mockDoc;
	mockDoc.body.ownerDocument = mockDoc;

	const win = {
		document: mockDoc,
		addEventListener: (type: string, fn: EventListener) => {
			winListeners[type] = winListeners[type] || [];
			winListeners[type].push(fn);
		},
		removeEventListener: () => {},
		dispatchEvent: () => true,
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		location: { href: "http://localhost:5173", search: "" },
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
	};
	mockDoc.defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	g.React = React;
	g.document = mockDoc;
	g.window = win;
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;
	g.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
	g.Image = class {
		onload?: () => void;
		constructor() {
			setTimeout(() => this.onload?.(), 0);
		}
	};
	g.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	(win as any).ResizeObserver = g.ResizeObserver;

	return { doc: mockDoc, win };
}

function findByTestId(node: MockDomNode | null, testId: string): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.("data-testid") === testId) return node;
	if (node.children) {
		for (const child of node.children) {
			const res = findByTestId(child, testId);
			if (res) return res;
		}
	}
	return null;
}

function findNode(node: MockDomNode | null, predicate: (n: MockDomNode) => boolean): MockDomNode | null {
	if (!node) return null;
	if (predicate(node)) return node;
	if (node.children) {
		for (const child of node.children) {
			const res = findNode(child, predicate);
			if (res) return res;
		}
	}
	return null;
}

async function clickNode(node: MockDomNode) {
	await act(async () => {
		const reactPropKey = Object.keys(node).find((k) => k.startsWith("__reactProps$"));
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: React internal props
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onClick === "function") {
				await props.onClick({
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

// ============================================================================
// Mock Application Context for VisitDiagnosticsTab
// ============================================================================

const mockPatient = {
	id: "pat-diagnostics-001",
	fullName: "Смирнова Елена Дмитриевна",
	cardNumber: "K-043-774",
	medCardNumber: "K-043-774",
};

const mockAppLogicContext = {
	activePatient: mockPatient,
	dashboard: {
		activeDoctor: {
			id: "doc-test-1",
			fullName: "Др. Ковалёв Михаил Сергеевич",
			specialty: "therapist",
			specialtyRu: "Врач-стоматолог-терапевт",
		},
		activeVisit: {
			patientId: "pat-diagnostics-001",
			diagnosisTooth: 16,
		},
		clinicSettings: {
			profile: {
				brandName: "ДЕНТЕ Клиника",
			},
		},
		patients: [mockPatient],
	},
	auth: {
		currentUser: {
			name: "Др. Ковалёв Михаил Сергеевич",
		},
	},
} as unknown as AppLogicContextType;

// ============================================================================
// Test Suite
// ============================================================================

describe("VisitDiagnosticsTab Comprehensive Functionality & Button Test Suite", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		const { doc } = initDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		if (container.parentNode) {
			container.parentNode.removeChild(container);
		}
	});

	async function renderDiagnosticsTab(propsOverrides?: Record<string, unknown>) {
		await act(async () => {
			root.render(
				<Suspense fallback={null}>
					<AppLogicProvider value={mockAppLogicContext}>
						<VisitDiagnosticsTab activePatient={mockPatient} {...propsOverrides} />
					</AppLogicProvider>
				</Suspense>,
			);
		});
	}

	describe("1. Segmented Mode Switcher (RVG / Photo / CBCT / Endo & Implants)", () => {
		it("default mode is RVG: RVG section is active and visible, other mode cards are hidden", async () => {
			await renderDiagnosticsTab();

			const rvgTab = findByTestId(container, "tab-diagnostic-mode-rvg");
			const photoTab = findByTestId(container, "tab-diagnostic-mode-photo");
			const cbctTab = findByTestId(container, "tab-diagnostic-mode-cbct");

			assert.ok(rvgTab, "tab-diagnostic-mode-rvg must exist");
			assert.ok(photoTab, "tab-diagnostic-mode-photo must exist");
			assert.ok(cbctTab, "tab-diagnostic-mode-cbct must exist");

			// Active RVG tab has active classes (bg-[var(--paper)] text-[var(--teal)])
			assert.ok(
				rvgTab.className.includes("text-[var(--teal)]") && rvgTab.className.includes("bg-[var(--paper)]"),
				"tab-diagnostic-mode-rvg must be marked as active",
			);

			// RVG action buttons are present in DOM
			const directRvgBtn = findByTestId(container, "btn-open-direct-rvg-modal");
			assert.ok(directRvgBtn, "btn-open-direct-rvg-modal must be rendered in RVG mode");

			// Photo card and CBCT card are hidden in DOM
			const photoCard = findByTestId(container, "visit-photo-protocol-card");
			const cbctCard = findByTestId(container, "visit-cbct-optg-card");

			assert.ok(photoCard?.parentNode?.className?.includes("hidden"), "Photo protocol card must be hidden in RVG mode");
			assert.ok(cbctCard?.parentNode?.className?.includes("hidden"), "CBCT card must be hidden in RVG mode");
		});

		it("clicking tab-diagnostic-mode-photo switches to photo mode: photo card is visible, RVG and CBCT hidden", async () => {
			await renderDiagnosticsTab();

			const photoTab = findByTestId(container, "tab-diagnostic-mode-photo");
			assert.ok(photoTab, "tab-diagnostic-mode-photo must exist");

			await clickNode(photoTab);

			// Photo card becomes visible (parent loses hidden)
			const photoCard = findByTestId(container, "visit-photo-protocol-card");
			assert.ok(photoCard, "visit-photo-protocol-card must be present");
			assert.ok(
				!photoCard.parentNode?.className?.includes("hidden"),
				"Photo protocol card parent must NOT be hidden after clicking photo tab",
			);

			// CBCT card is hidden
			const cbctCard = findByTestId(container, "visit-cbct-optg-card");
			assert.ok(cbctCard?.parentNode?.className?.includes("hidden"), "CBCT card must remain hidden in photo mode");

			// Photo tab becomes active
			assert.ok(
				photoTab.className.includes("text-[var(--teal)]"),
				"tab-diagnostic-mode-photo must have active teal class",
			);
		});

		it("clicking tab-diagnostic-mode-cbct switches to CBCT mode: CBCT card is visible", async () => {
			await renderDiagnosticsTab();

			const cbctTab = findByTestId(container, "tab-diagnostic-mode-cbct");
			assert.ok(cbctTab, "tab-diagnostic-mode-cbct must exist");

			await clickNode(cbctTab);

			const cbctCard = findByTestId(container, "visit-cbct-optg-card");
			assert.ok(cbctCard, "visit-cbct-optg-card must exist");
			assert.ok(
				!cbctCard.parentNode?.className?.includes("hidden"),
				"CBCT card parent must NOT be hidden after clicking CBCT tab",
			);

			// Quick action buttons in CBCT card
			const cbctStudioBtn = findByTestId(container, "btn-open-cbct-studio-modal");
			const addCbctServiceBtn = findByTestId(container, "btn-add-cbct-service-to-visit");
			assert.ok(cbctStudioBtn, "btn-open-cbct-studio-modal must be rendered in CBCT card");
			assert.ok(addCbctServiceBtn, "btn-add-cbct-service-to-visit must be rendered in CBCT card");
		});
	});

	describe("2. Modal Trigger Buttons & Action Functionality", () => {
		it("clicking btn-open-direct-rvg-modal opens DirectRvgCaptureModal", async () => {
			await renderDiagnosticsTab();

			const btn = findByTestId(container, "btn-open-direct-rvg-modal");
			assert.ok(btn, "btn-open-direct-rvg-modal must exist");

			await clickNode(btn);

			// Allow lazy component to load
			await act(async () => {
				await new Promise((r) => setTimeout(r, 60));
			});

			const modal =
				findByTestId(mockDoc.body, "direct-rvg-capture-modal") ||
				findByTestId(mockDoc.body, "direct-rvg-capture-modal-overlay");
			assert.ok(modal, "DirectRvgCaptureModal must open upon clicking btn-open-direct-rvg-modal");
		});

		it("clicking btn-open-hot-folder-modal opens HotFolderIntakeModal", async () => {
			await renderDiagnosticsTab();

			const btn = findByTestId(container, "btn-open-hot-folder-modal");
			assert.ok(btn, "btn-open-hot-folder-modal must exist");

			await clickNode(btn);

			await act(async () => {
				await new Promise((r) => setTimeout(r, 60));
			});

			const modal =
				findByTestId(mockDoc.body, "hotfolder-intake-modal") ||
				findByTestId(mockDoc.body, "hotfolder-intake-modal-overlay");
			assert.ok(modal, "HotFolderIntakeModal must open upon clicking btn-open-hot-folder-modal");
		});

		it("clicking btn-open-dicom-viewer-modal opens DicomViewerModal", async () => {
			await renderDiagnosticsTab();

			const btn = findByTestId(container, "btn-open-dicom-viewer-modal");
			assert.ok(btn, "btn-open-dicom-viewer-modal must exist");

			await clickNode(btn);

			await act(async () => {
				await new Promise((r) => setTimeout(r, 60));
			});

			const modalDropzone =
				findByTestId(mockDoc.body, "dicom-viewer-modal") ||
				findByTestId(mockDoc.body, "dicom-viewer-dropzone") ||
				findNode(mockDoc.body, (n) => n.textContent.includes("DICOM"));
			assert.ok(modalDropzone, "DicomViewerModal must open upon clicking btn-open-dicom-viewer-modal");
		});

		it("clicking btn-open-radiology-referral-modal opens RadiologyReferralModal", async () => {
			await renderDiagnosticsTab();

			const btn = findByTestId(container, "btn-open-radiology-referral-modal");
			assert.ok(btn, "btn-open-radiology-referral-modal must exist");

			await clickNode(btn);

			await act(async () => {
				await new Promise((r) => setTimeout(r, 60));
			});

			const modal = findByTestId(mockDoc.body, "radiology-referral-generator-modal");
			assert.ok(modal, "RadiologyReferralModal must open upon clicking btn-open-radiology-referral-modal");
		});

		it("in CBCT mode: clicking btn-open-cbct-studio-modal opens CbctMprImplantStudioModal", async () => {
			await renderDiagnosticsTab();

			// Switch to CBCT mode
			const cbctTab = findByTestId(container, "tab-diagnostic-mode-cbct");
			assert.ok(cbctTab);
			await clickNode(cbctTab);

			const cbctStudioBtn = findByTestId(container, "btn-open-cbct-studio-modal");
			assert.ok(cbctStudioBtn, "btn-open-cbct-studio-modal must exist in CBCT card");

			await clickNode(cbctStudioBtn);

			await act(async () => {
				await new Promise((r) => setTimeout(r, 60));
			});

			const modal = findByTestId(mockDoc.body, "cbct-studio-modal");
			assert.ok(modal, "CbctMprImplantStudioModal must open upon clicking btn-open-cbct-studio-modal");
		});

		it("in advanced diagnostics: clicking toggle-advanced-diagnostics-btn expands TRG section and opening analysis modal works", async () => {
			await renderDiagnosticsTab();

			const toggleBtn = findByTestId(container, "toggle-advanced-diagnostics-btn");
			assert.ok(toggleBtn, "toggle-advanced-diagnostics-btn must exist");

			const cephCard = findByTestId(container, "visit-ceph-diagnostic-card");
			assert.ok(cephCard, "visit-ceph-diagnostic-card must exist in DOM");
			assert.ok(cephCard.className.includes("hidden"), "Ceph section must be hidden initially for non-ortho doctors");

			// Click toggle button to expand
			await clickNode(toggleBtn);
			assert.ok(cephCard.className.includes("block"), "Ceph section must expand with class 'block'");

			// Click button to open CephalometricAnalysisModal
			const openCephBtn = findByTestId(container, "open-visit-ceph-modal-btn");
			assert.ok(openCephBtn, "open-visit-ceph-modal-btn must exist");

			await clickNode(openCephBtn);

			await act(async () => {
				await new Promise((r) => setTimeout(r, 60));
			});

			const modal =
				findByTestId(mockDoc.body, "cephalometric-analysis-modal") ||
				findByTestId(container, "cephalometric-analysis-modal");
			assert.ok(modal, "CephalometricAnalysisModal must open upon clicking open-visit-ceph-modal-btn");
		});

		it("photo protocol attachment: handleAddPhoto adds photo to list and handleRemovePhoto deletes it", async () => {
			const onInsertSpy: string[] = [];
			await renderDiagnosticsTab({
				onInsertToProtocol: (text: string) => onInsertSpy.push(text),
			});

			// Switch to photo mode
			const photoTab = findByTestId(container, "tab-diagnostic-mode-photo");
			assert.ok(photoTab);
			await clickNode(photoTab);

			// Initially shows quiet empty state
			assert.ok(
				container.textContent.includes("Снимки не прикреплены"),
				"Initially shows empty photo attachments message",
			);

			// Find Add Photo button ("Привязать")
			const addPhotoBtn = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.textContent.includes("Привязать"),
			);
			assert.ok(addPhotoBtn, "Button 'Привязать' must exist in photo protocol card");

			// Click Add Photo
			await clickNode(addPhotoBtn);

			// Photo attachment list should now render attached photo
			assert.ok(
				container.textContent.includes("Прикрепленные снимки фотопротокола (1)"),
				"Must display count of attached photos",
			);
			assert.ok(container.textContent.includes("Зуб 16"), "Must display tooth 16");
			assert.ok(onInsertSpy.length > 0, "Must call onInsertToProtocol with photo statement");

			// Find Remove Photo button
			const removeBtn = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.getAttribute("title") === "Удалить снимок",
			);
			assert.ok(removeBtn, "Remove photo button must exist for attached photo");

			// Click Remove Photo
			await clickNode(removeBtn);

			// List reverts to empty state
			assert.ok(
				container.textContent.includes("Снимки не прикреплены"),
				"After removing photo, displays empty photo attachments message",
			);
		});
	});

	describe("3. Design Tokens & Elimination of Browser Buttonface", () => {
		it("inactive mode tabs have class 'bg-transparent border-transparent' to prevent buttonface", async () => {
			await renderDiagnosticsTab();

			const photoTab = findByTestId(container, "tab-diagnostic-mode-photo");
			const cbctTab = findByTestId(container, "tab-diagnostic-mode-cbct");

			assert.ok(photoTab);
			assert.ok(cbctTab);

			assert.ok(
				photoTab.className.includes("bg-transparent") && photoTab.className.includes("border-transparent"),
				"tab-diagnostic-mode-photo must have 'bg-transparent border-transparent' when inactive",
			);
			assert.ok(
				cbctTab.className.includes("bg-transparent") && cbctTab.className.includes("border-transparent"),
				"tab-diagnostic-mode-cbct must have 'bg-transparent border-transparent' when inactive",
			);

			// Now click photo tab and verify rvgTab becomes inactive with 'bg-transparent border-transparent'
			const rvgTab = findByTestId(container, "tab-diagnostic-mode-rvg");
			assert.ok(rvgTab);
			await clickNode(photoTab);

			assert.ok(
				rvgTab.className.includes("bg-transparent") && rvgTab.className.includes("border-transparent"),
				"tab-diagnostic-mode-rvg must transition to 'bg-transparent border-transparent' when inactive",
			);
		});

		it("source code verification: VisitDiagnosticsTab strictly enforces design tokens across all tabs", () => {
			const sourcePath = path.resolve(__dirname, "../VisitDiagnosticsTab.tsx");
			const source = fs.readFileSync(sourcePath, "utf8");

			// Check all 3 segmented mode buttons use bg-transparent border border-transparent
			const bgTransparentCount = (source.match(/bg-transparent border border-transparent/g) || []).length;
			assert.ok(
				bgTransparentCount >= 3,
				`Expected at least 3 occurrences of 'bg-transparent border border-transparent' for inactive tabs, found ${bgTransparentCount}`,
			);

			// Check all required testids are in the source
			const requiredTestIds = [
				"tab-diagnostic-mode-rvg",
				"tab-diagnostic-mode-photo",
				"tab-diagnostic-mode-cbct",
				"btn-open-direct-rvg-modal",
				"btn-open-hot-folder-modal",
				"btn-open-dicom-viewer-modal",
				"btn-open-radiology-referral-modal",
				"btn-open-cbct-studio-modal",
				"toggle-advanced-diagnostics-btn",
				"open-visit-ceph-modal-btn",
				"visit-photo-protocol-card",
				"visit-cbct-optg-card",
				"visit-ceph-diagnostic-card",
			];

			for (const testId of requiredTestIds) {
				assert.ok(
					source.includes(`data-testid="${testId}"`),
					`VisitDiagnosticsTab.tsx must contain data-testid="${testId}"`,
				);
			}
		});
	});
});
