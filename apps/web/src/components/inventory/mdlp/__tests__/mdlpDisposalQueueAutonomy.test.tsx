/**
 * mdlpDisposalQueueAutonomy.test.tsx
 *
 * Unit tests for MDLP Disposal Queue Staff & Doctor Autonomy:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; 1-click carpules fallbacks)
 * - Mandate 8k: CRM != Reality Simulator (Elimination of carpule-by-carpule scanning friction)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 * - Mandate 8o: Scope-bounded verifiable assertions
 */

import { createCarpuleQueueItem } from "@dental/shared";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock GlobalToast so showToast can be spied on directly
vi.mock("../../../GlobalToast.js", () => ({
	showToast: vi.fn(),
}));
vi.mock("../../../GlobalToast", () => ({
	showToast: vi.fn(),
}));
vi.mock("../../GlobalToast.js", () => ({
	showToast: vi.fn(),
}));
vi.mock("../../GlobalToast", () => ({
	showToast: vi.fn(),
}));

import { showToast } from "../../../GlobalToast.js";
import { MdlpDisposalQueueModal } from "../MdlpDisposalQueueModal.js";

interface MockDomNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	children: MockDomNode[];
	childNodes: MockDomNode[];
	attributes: { name: string; value: string }[];
	ownerDocument: unknown;
	parentNode: MockDomNode | null;
	disabled?: boolean;
	textContent: string;
	className: string;
	innerHTML: string;
	appendChild: (child: MockDomNode) => MockDomNode;
	insertBefore: (child: MockDomNode, before: MockDomNode | null) => MockDomNode;
	removeChild: (child: MockDomNode) => MockDomNode;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: (type: string, fn: EventListener) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	removeAttribute: (name: string) => void;
	focus: () => void;
	blur: () => void;
	dispatchEvent: (ev: { type: string }) => boolean;
	getBoundingClientRect: () => {
		top: number;
		left: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	};
	[key: string]: unknown;
}

function setupMockDom() {
	// biome-ignore lint/suspicious/noExplicitAny: mock doc reference
	let docRef: any = null;

	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};
		let _disabled = false;

		const el: MockDomNode = {
			nodeType: 1,
			tagName: tag.toUpperCase(),
			nodeName: tag.toUpperCase(),
			style: {},
			dataset: {},
			children,
			childNodes: children,
			attributes: [],
			get ownerDocument() {
				return docRef;
			},
			parentNode: null,
			selected: false,
			get options() {
				return children.filter((c) => c.tagName === "OPTION");
			},
			get disabled() {
				return _disabled || attrs.disabled !== undefined;
			},
			set disabled(val: boolean) {
				_disabled = val;
				if (val) attrs.disabled = "";
				else delete attrs.disabled;
			},
			get className() {
				return attrs.class || "";
			},
			set className(val: string) {
				attrs.class = val;
			},
			get innerHTML() {
				return "";
			},
			set innerHTML(_val: string) {},
			get textContent() {
				let text = "";
				for (const child of children) {
					if (child.nodeType === 3) {
						text += (child as unknown as { textContent?: string }).textContent || "";
					} else if (child.textContent) {
						text += child.textContent;
					}
				}
				return text;
			},
			set textContent(val: string) {
				children.length = 0;
				if (val) {
					children.push({
						nodeType: 3,
						textContent: val,
						style: {},
						parentNode: el,
					} as unknown as MockDomNode);
				}
			},
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
				if (name.startsWith("data-")) {
					el.dataset[name.slice(5)] = value;
				}
				if (name === "disabled") {
					_disabled = true;
				}
			},
			getAttribute: (name: string) => attrs[name] ?? null,
			removeAttribute: (name: string) => {
				delete attrs[name];
				if (name === "disabled") {
					_disabled = false;
				}
			},
			focus: () => {},
			blur: () => {},
			dispatchEvent: (ev: { type: string }) => {
				const list = listeners[ev.type] || [];
				for (const fn of list) {
					fn(ev as unknown as Event);
				}
				return true;
			},
			getBoundingClientRect: () => ({
				top: 0,
				left: 0,
				right: 1280,
				bottom: 900,
				width: 1280,
				height: 900,
			}),
		};
		return el;
	}

	const doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({
			nodeType: 3,
			textContent: text,
			style: {},
			parentNode: null,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null }),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	docRef = doc;

	const win = {
		document: doc,
		addEventListener: () => {},
		removeEventListener: () => {},
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		print: vi.fn(),
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
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

function findNodeByTestId(node: MockDomNode | null, testId: string): MockDomNode | null {
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
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) => k.startsWith("__reactProps$"));
			if (reactPropKey) {
				// biome-ignore lint/suspicious/noExplicitAny: access React internal props
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onClick === "function") {
					props.onClick({
						type: "click",
						preventDefault: () => {},
						stopPropagation: () => {},
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "click" });
	});
}

describe("MDLP Disposal Queue Autonomy & Non-Blocking Carpule Disposal (Mandates 8e, 8k, 8n)", () => {
	let container: MockDomNode;
	let root: Root;
	let doc: any;

	beforeEach(() => {
		vi.clearAllMocks();
		const dom = setupMockDom();
		doc = dom.doc;
		container = doc.createElement("div");
		doc.body.appendChild(container);
		// biome-ignore lint/suspicious/noExplicitAny: container mock
		root = createRoot(container as any);
	});

	afterEach(async () => {
		if (root) {
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("1. Primary disposal button is NOT disabled when queue is empty (disabled === false)", async () => {
		await act(async () => {
			root.render(
				<MdlpDisposalQueueModal
					isOpen={true}
					onClose={() => {}}
					initialItems={[]}
				/>,
			);
		});

		const body = doc.body as MockDomNode;
		const confirmBtn = findNodeByTestId(body, "confirm-disposal-btn");

		expect(confirmBtn).not.toBeNull();
		// Mandate 8e: Never disabled when queue is empty
		expect(confirmBtn?.disabled).toBeFalsy();
		expect(confirmBtn?.getAttribute("disabled")).toBeNull();
	});

	it("2. Clicking disposal button with empty queue triggers 1-click carpules disposal and guidance toast", async () => {
		await act(async () => {
			root.render(
				<MdlpDisposalQueueModal
					isOpen={true}
					onClose={() => {}}
					initialItems={[]}
				/>,
			);
		});

		const body = doc.body as MockDomNode;
		const confirmBtn = findNodeByTestId(body, "confirm-disposal-btn");
		expect(confirmBtn).not.toBeNull();

		await clickNode(confirmBtn!);

		// Mandate 8e & 8k: Auto-populates shift carpules and shows guidance
		expect(showToast).toHaveBeenCalled();
		const calls = vi.mocked(showToast).mock.calls;
		const toastTexts = calls.map((c) => c[0]);
		const hasCarpuleToast = toastTexts.some(
			(txt) =>
				txt.includes("Списаны все пустые карпулы смены") ||
				txt.includes("Очередь списания автозаполнена"),
		);
		expect(hasCarpuleToast).toBe(true);
	});

	it("3. Barcode add button is NOT disabled when input is empty (disabled === false) and shows guidance toast on click", async () => {
		await act(async () => {
			root.render(
				<MdlpDisposalQueueModal
					isOpen={true}
					onClose={() => {}}
					initialItems={[]}
				/>,
			);
		});

		const body = doc.body as MockDomNode;
		const addBtn = findNodeByTestId(body, "add-barcode-btn");

		expect(addBtn).not.toBeNull();
		// Mandate 8e: Barcode add button is not disabled when input is empty
		expect(addBtn?.disabled).toBeFalsy();
		expect(addBtn?.getAttribute("disabled")).toBeNull();

		await clickNode(addBtn!);

		expect(showToast).toHaveBeenCalledWith(
			"Введите или отсканируйте 2D DataMatrix код карпулы анестетика",
			"warning",
		);
	});

	it("4. Print act button is NOT disabled when queue is empty (disabled === false) and shows guidance toast on click", async () => {
		await act(async () => {
			root.render(
				<MdlpDisposalQueueModal
					isOpen={true}
					onClose={() => {}}
					initialItems={[]}
				/>,
			);
		});

		const body = doc.body as MockDomNode;
		const printActBtn = findNodeByTestId(body, "print-disposal-act-btn");

		expect(printActBtn).not.toBeNull();
		// Mandate 8e: Not disabled when queue is empty
		expect(printActBtn?.disabled).toBeFalsy();
		expect(printActBtn?.getAttribute("disabled")).toBeNull();

		await clickNode(printActBtn!);

		expect(showToast).toHaveBeenCalledWith(
			"Очередь списания пуста. Нажмите кнопку 'Списать все пустые карпулы смены' для мгновенного формирования акта",
			"info",
		);
	});

	it("5. Primary disposal button is disabled ONLY when isDisposing is true", async () => {
		let resolveDisposal!: () => void;
		const pendingDisposalPromise = new Promise<void>((resolve) => {
			resolveDisposal = resolve;
		});

		const validRaw = "010460700836012421SN123456789\x1d17280531\x1d10LOT1\x1d91ABCD\x1d92qwe";
		const dummyItem = createCarpuleQueueItem(validRaw, {
			costRub: 420,
			patientId: "pat-1",
			patientName: "Тест Пациент",
			doctorId: "doc-1",
			doctorName: "Тест Врач",
		});

		await act(async () => {
			root.render(
				<MdlpDisposalQueueModal
					isOpen={true}
					onClose={() => {}}
					initialItems={[dummyItem]}
					onConfirmDisposal={() => pendingDisposalPromise}
				/>,
			);
		});

		const body = doc.body as MockDomNode;
		const confirmBtn = findNodeByTestId(body, "confirm-disposal-btn");
		expect(confirmBtn).not.toBeNull();
		expect(confirmBtn?.disabled).toBeFalsy();

		// Trigger disposal - starts async disposal
		let disposalPromise: Promise<void> | void;
		act(() => {
			const reactPropKey = Object.keys(confirmBtn!).find((k) => k.startsWith("__reactProps$"));
			const props = (confirmBtn as any)[reactPropKey!];
			disposalPromise = props.onClick({ preventDefault: () => {}, stopPropagation: () => {} });
		});

		// While async disposal is pending, isDisposing is true, so button becomes disabled
		expect(confirmBtn?.disabled).toBe(true);

		// Resolve disposal and wait for completion
		await act(async () => {
			resolveDisposal();
			await disposalPromise;
		});

		// After disposal completes, button is no longer disabled
		expect(confirmBtn?.disabled).toBeFalsy();
	});

	it("6. All action buttons in footer and toolbar have touch target >= 44px (minHeight: '44px' / min-h-[44px])", async () => {
		await act(async () => {
			root.render(
				<MdlpDisposalQueueModal
					isOpen={true}
					onClose={() => {}}
					initialItems={[]}
				/>,
			);
		});

		const body = doc.body as MockDomNode;
		const buttonsToTest = [
			{ id: "header-close-btn", label: "Header close button" },
			{ id: "add-barcode-btn", label: "Barcode add button" },
			{ id: "banner-quick-shift-carpules-btn", label: "Banner quick carpules button" },
			{ id: "sort-fefo-btn", label: "Sort FEFO button" },
			{ id: "clear-queue-btn", label: "Clear queue button" },
			{ id: "print-disposal-act-btn", label: "Print act button" },
			{ id: "footer-quick-carpules-btn", label: "Footer quick carpules button" },
			{ id: "footer-close-btn", label: "Footer close button" },
			{ id: "confirm-disposal-btn", label: "Confirm disposal button" },
		];

		for (const { id, label: _label } of buttonsToTest) {
			const btn = findNodeByTestId(body, id);
			expect(btn).not.toBeNull();
			const hasMinHClass = btn?.className.includes("min-h-[44px]");
			const hasMinHStyle = btn?.style.minHeight === "44px";
			expect(hasMinHClass || hasMinHStyle).toBe(true);
		}
	});
});
