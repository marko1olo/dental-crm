/**
 * sberPosAutonomy.test.tsx
 *
 * Unit tests for Sberbank POS Terminal & Cashier Autonomy:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; guidance toast on click)
 * - Mandate 8d: 7 Deadly Sins & Apple HIG touch targets (>= 44x44px)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 * - Mandate 8o: Scope-bounded verifiable assertions
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock GlobalToast so showToast can be spied on directly
vi.mock("../../../GlobalToast", () => ({
	showToast: vi.fn(),
}));

// Mock sberbankTerminal so it does not trigger real network or complete transaction prematurely
vi.mock("../../../../services/hardware/sberbankTerminal", () => ({
	sberbankTerminal: {
		setConfig: vi.fn(),
		executeTransaction: vi.fn().mockImplementation(() => new Promise(() => {})),
		cancelCurrentOperation: vi.fn(),
	},
}));

import { showToast } from "../../../GlobalToast";
import { sberbankTerminal } from "../../../../services/hardware/sberbankTerminal";
import { SberPosTerminalModal } from "../SberPosTerminalModal";
import type { SberPosTransactionResponse } from "@dental/shared";

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
			get disabled() {
				return Boolean(_disabled || attrs.disabled !== undefined);
			},
			set disabled(val: boolean) {
				_disabled = Boolean(val);
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
		navigator: {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		},
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
	try {
		Object.defineProperty(globalThis, "navigator", {
			value: win.navigator,
			configurable: true,
			writable: true,
		});
	} catch {
		try {
			Object.defineProperty(globalThis.navigator, "clipboard", {
				value: win.navigator.clipboard,
				configurable: true,
				writable: true,
			});
		} catch {
			// ignore
		}
	}
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

describe("Sber POS Terminal & Cashier Autonomy (Mandates 8d, 8e, 8n)", () => {
	let container: MockDomNode;
	let root!: Root;

	beforeEach(() => {
		vi.clearAllMocks();
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		// biome-ignore lint/suspicious/noExplicitAny: container mock
		root = createRoot(container as any);
	});

	afterEach(() => {
		act(() => {
			root.unmount();
		});
	});

	it("1. Slip copy and print buttons are NOT disabled when lastResponse is null (disabled === false)", async () => {
		// Mock executeTransaction to not resolve immediately so lastResponse is null
		(sberbankTerminal.executeTransaction as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {}),
		);

		await act(async () => {
			root.render(
				<SberPosTerminalModal
					isOpen={true}
					onClose={() => {}}
				/>,
			);
		});

		const copyBtn = findNodeByTestId(container, "sber-copy-slip-btn");
		const printBtn = findNodeByTestId(container, "sber-print-slip-btn");

		expect(copyBtn).not.toBeNull();
		expect(printBtn).not.toBeNull();

		// Mandate 8e: Doctor & Cashier Autonomy - buttons must NOT be disabled when lastResponse is null
		expect(copyBtn?.disabled).toBe(false);
		expect(copyBtn?.getAttribute("disabled")).toBeNull();

		expect(printBtn?.disabled).toBe(false);
		expect(printBtn?.getAttribute("disabled")).toBeNull();
	});

	it("2. Clicking copy or print without lastResponse triggers guidance toast (Mandate 8e)", async () => {
		(sberbankTerminal.executeTransaction as ReturnType<typeof vi.fn>).mockImplementation(
			() => new Promise(() => {}),
		);

		await act(async () => {
			root.render(
				<SberPosTerminalModal
					isOpen={true}
					onClose={() => {}}
				/>,
			);
		});

		const copyBtn = findNodeByTestId(container, "sber-copy-slip-btn");
		const printBtn = findNodeByTestId(container, "sber-print-slip-btn");

		expect(copyBtn).not.toBeNull();
		expect(printBtn).not.toBeNull();

		// Click copy button without lastResponse
		await clickNode(copyBtn!);
		expect(showToast).toHaveBeenCalledWith(
			"Слип-чек будет доступен после авторизации платежа на терминале",
			"info",
		);

		vi.clearAllMocks();

		// Click print button without lastResponse
		await clickNode(printBtn!);
		expect(showToast).toHaveBeenCalledWith(
			"Слип-чек будет доступен после авторизации платежа на терминале",
			"info",
		);
	});

	it("3. Button touch targets satisfy >= 44x44px (Mandate 8d / Apple HIG)", async () => {
		await act(async () => {
			root.render(
				<SberPosTerminalModal
					isOpen={true}
					onClose={() => {}}
				/>,
			);
		});

		const copyBtn = findNodeByTestId(container, "sber-copy-slip-btn");
		const printBtn = findNodeByTestId(container, "sber-print-slip-btn");

		expect(copyBtn).not.toBeNull();
		expect(printBtn).not.toBeNull();

		// Verify Apple HIG touch targets: min-w-[44px] and min-h-[44px]
		expect(copyBtn?.className).toContain("min-w-[44px]");
		expect(copyBtn?.className).toContain("min-h-[44px]");
		expect(copyBtn?.className).toContain("p-2.5");

		expect(printBtn?.className).toContain("min-w-[44px]");
		expect(printBtn?.className).toContain("min-h-[44px]");
		expect(printBtn?.className).toContain("p-2.5");
	});

	it("4. Print button is disabled ONLY when isPrinting is true", async () => {
		vi.useFakeTimers();

		const mockResponse: SberPosTransactionResponse = {
			success: true,
			responseCode: "00",
			responseMessageRu: "Одобрено",
			terminalId: "19827340",
			merchantId: "981273948192031",
			rrn: "423891028471",
			authCode: "982310",
			cardHash: "4276********1234",
			cardIssuer: "Visa",
			aid: "A0000000031010",
			tvr: "0000008000",
			amountKop: 1960000,
			operationType: "sale",
			transactionDateTime: new Date().toISOString(),
			customerSlip: "=== ЧЕК КЛИЕНТА ===\nСУММА: 19600.00 РУБ",
			merchantSlip: "=== ЧЕК КЛИНИКИ ===\nСУММА: 19600.00 РУБ",
		};

		(sberbankTerminal.executeTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

		await act(async () => {
			root.render(
				<SberPosTerminalModal
					isOpen={true}
					onClose={() => {}}
				/>,
			);
		});

		// Wait for promise resolution and state update
		await act(async () => {
			await Promise.resolve();
		});

		const printBtn = findNodeByTestId(container, "sber-print-slip-btn");
		expect(printBtn).not.toBeNull();

		// Before print: disabled is false
		expect(printBtn?.disabled).toBe(false);

		// Click print: isPrinting becomes true
		await clickNode(printBtn!);

		// During printing: disabled is true
		expect(printBtn?.disabled).toBe(true);

		// After printing timer completes: disabled returns to false
		act(() => {
			vi.advanceTimersByTime(1600);
		});

		expect(printBtn?.disabled).toBe(false);

		vi.useRealTimers();
	});
});
