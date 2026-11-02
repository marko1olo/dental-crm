/**
 * fastCheckoutModalAutonomy.test.tsx
 *
 * Integration tests for FastCheckoutModal UI & Hardware Autonomy:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; 1-click auto-balance)
 * - Mandate 8k: CRM != Reality Simulator (Zero unnecessary manual arithmetic at reception desk)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-Click instant checkout without roadblocks)
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { KktLanPrinterService } from "../../../../services/hardware/kktLanPrinter";
import { FastCheckoutModal } from "../../../finance/FastCheckoutModal";
import { showToast } from "../../../GlobalToast";

const dispatchedToasts: { text: string; type: string; duration?: number }[] = [];

KktLanPrinterService.printReceipt = async () => ({
	success: true,
	status: "printed",
	hardwareLatencyMs: 10,
	usedCircuitBreaker: false,
});

function expect(actual: unknown) {
	return {
		toBeFalsy: () => assert.ok(!actual, `Expected falsy, but got ${actual}`),
		toBeTruthy: () => assert.ok(actual, `Expected truthy, but got ${actual}`),
		toBeNull: () => assert.strictEqual(actual, null, `Expected null, but got ${actual}`),
		not: {
			toBeNull: () => {
				assert.notStrictEqual(actual, null, "Expected value not to be null");
				assert.notStrictEqual(actual, undefined, "Expected value not to be undefined");
			},
		},
		toHaveBeenCalledWith: (expectedText: string, expectedType?: string) => {
			const found = dispatchedToasts.some(
				(t) => t.text.includes(expectedText) && (!expectedType || t.type === expectedType),
			);
			assert.ok(found, `Expected toast with "${expectedText}" (${expectedType}), got: ${JSON.stringify(dispatchedToasts)}`);
		},
	};
}

interface MockDomNode {
	nodeType: number;
	tagName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	children: MockDomNode[];
	childNodes: MockDomNode[];
	ownerDocument: unknown;
	parentNode: MockDomNode | null;
	disabled?: boolean;
	value?: string;
	textContent: string;
	className: string;
	appendChild: (child: MockDomNode) => MockDomNode;
	insertBefore: (child: MockDomNode, before: MockDomNode | null) => MockDomNode;
	removeChild: (child: MockDomNode) => MockDomNode;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: (type: string, fn: EventListener) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	removeAttribute: (name: string) => void;
	dispatchEvent: (ev: { type: string }) => boolean;
	getBoundingClientRect: () => { top: number; left: number; right: number; bottom: number; width: number; height: number };
	focus?: () => void;
	blur?: () => void;
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
		let _value = "";

		const el: MockDomNode = {
			nodeType: 1,
			tagName: tag.toUpperCase(),
			style: {},
			dataset: {},
			children,
			childNodes: children,
			get ownerDocument() { return docRef; },
			parentNode: null,
			get disabled() { return _disabled || attrs.disabled !== undefined; },
			set disabled(val: boolean) { _disabled = val; if (val) attrs.disabled = ""; else delete attrs.disabled; },
			get value() { return _value; },
			set value(val: string) { _value = val; },
			get className() { return attrs.class || ""; },
			set className(val: string) { attrs.class = val; },
			get textContent() {
				return children.reduce((t, c) => t + (c.nodeType === 3 ? (c as unknown as { textContent?: string }).textContent || "" : c.textContent || ""), "");
			},
			set textContent(val: string) {
				children.length = 0;
				if (val) children.push({ nodeType: 3, textContent: val, style: {}, parentNode: el } as unknown as MockDomNode);
			},
			appendChild: (child: MockDomNode) => { children.push(child); child.parentNode = el; return child; },
			insertBefore: (child: MockDomNode, before: MockDomNode | null) => {
				const idx = before ? children.indexOf(before) : -1;
				if (idx >= 0) children.splice(idx, 0, child); else children.push(child);
				child.parentNode = el;
				return child;
			},
			removeChild: (child: MockDomNode) => {
				const idx = children.indexOf(child);
				if (idx >= 0) children.splice(idx, 1);
				child.parentNode = null;
				return child;
			},
			addEventListener: (type: string, fn: EventListener) => { (listeners[type] = listeners[type] || []).push(fn); },
			removeEventListener: (type: string, fn: EventListener) => { if (listeners[type]) listeners[type] = listeners[type].filter((l) => l !== fn); },
			setAttribute: (name: string, value: string) => { attrs[name] = value; if (name.startsWith("data-")) el.dataset[name.slice(5)] = value; if (name === "disabled") _disabled = true; },
			getAttribute: (name: string) => attrs[name] ?? null,
			removeAttribute: (name: string) => { delete attrs[name]; if (name === "disabled") _disabled = false; },
			dispatchEvent: (ev: { type: string }) => { (listeners[ev.type] || []).forEach((fn) => fn(ev as unknown as Event)); return true; },
			getBoundingClientRect: () => ({ top: 0, left: 0, right: 1280, bottom: 900, width: 1280, height: 900 }),
			focus: () => {},
			blur: () => {},
			querySelector: () => null,
			querySelectorAll: () => [],
		};
		return el;
	}

	const doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({ nodeType: 3, textContent: text, style: {}, parentNode: null }),
		createComment: () => ({ nodeType: 8, parentNode: null }),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
	};
	docRef = doc;

	const win = {
		document: doc,
		addEventListener: () => {},
		removeEventListener: () => {},
		navigator: { onLine: true },
		dispatchEvent: (ev: { type: string; detail?: { text: string; type: string; duration?: number } }) => {
			if (ev?.type === "dente-toast" && ev.detail) dispatchedToasts.push(ev.detail);
			return true;
		},
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

function findNodeByTestId(node: MockDomNode | null, testId: string, searchBody = true): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.("data-testid") === testId) return node;
	if (node.children) {
		for (const child of node.children) {
			const res = findNodeByTestId(child, testId, false);
			if (res) return res;
		}
	}
	if (searchBody && (node as any)?.ownerDocument?.body && (node as any).ownerDocument.body !== node) {
		return findNodeByTestId((node as any).ownerDocument.body, testId, false);
	}
	return null;
}

async function changeInput(node: MockDomNode, value: string) {
	await act(async () => {
		node.value = value;
		const reactPropKey = Object.keys(node).find((k) => k.startsWith("__reactProps$"));
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onChange === "function") {
				props.onChange({ target: { value } });
			}
		}
	});
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
					props.onClick({ type: "click", preventDefault: () => {}, stopPropagation: () => {} });
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "click" });
	});
}

describe("Fast Checkout Modal UI & Hardware Autonomy (Mandates 8e, 8k, 8n)", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		dispatchedToasts.length = 0;
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		// biome-ignore lint/suspicious/noExplicitAny: container mock
		root = createRoot(container as any);
	});

	afterEach(async () => {
		try {
			await act(async () => { root?.unmount(); });
		} catch {
			// ignore unmount errors
		}
	});

	it("1. execute-fast-checkout-btn is NOT disabled when validation.isValid is false (Mandate 8e)", async () => {
		await act(async () => {
			root.render(<FastCheckoutModal isOpen={true} onClose={() => {}} totalBillKop={500000} initialPaymentMethod="bank_card" />);
		});

		const executeBtn = findNodeByTestId(container, "execute-fast-checkout-btn");
		expect(executeBtn).not.toBeNull();

		const toggleBtn = findNodeByTestId(container, "toggle-simple-cashier-btn");
		expect(toggleBtn).not.toBeNull();
		await clickNode(toggleBtn!);

		const cardInput = findNodeByTestId(container, "split-input-card");
		expect(cardInput).not.toBeNull();
		await changeInput(cardInput!, "2000");

		expect(executeBtn?.disabled).toBeFalsy();
		expect(executeBtn?.getAttribute("disabled")).toBeNull();
	});

	it("2. Clicking execute-fast-checkout-btn with remaining balance triggers 1-click auto-balance resolution and info toast (Mandate 8e, 8k)", async () => {
		await act(async () => {
			root.render(<FastCheckoutModal isOpen={true} onClose={() => {}} totalBillKop={500000} initialPaymentMethod="bank_card" />);
		});

		const executeBtn = findNodeByTestId(container, "execute-fast-checkout-btn");
		expect(executeBtn).not.toBeNull();

		const toggleBtn = findNodeByTestId(container, "toggle-simple-cashier-btn");
		expect(toggleBtn).not.toBeNull();
		await clickNode(toggleBtn!);

		const cardInput = findNodeByTestId(container, "split-input-card");
		expect(cardInput).not.toBeNull();
		await changeInput(cardInput!, "0");

		expect(executeBtn?.disabled).toBeFalsy();
		await clickNode(executeBtn!);

		expect(showToast).toHaveBeenCalledWith("Недостающая сумма автоматически добавлена к оплате!", "info");
	});

	it("3. Clicking execute-fast-checkout-btn with overpayment shows explanatory warning toast instead of silent dead state", async () => {
		await act(async () => {
			root.render(<FastCheckoutModal isOpen={true} onClose={() => {}} totalBillKop={500000} initialPaymentMethod="bank_card" />);
		});

		const executeBtn = findNodeByTestId(container, "execute-fast-checkout-btn");
		expect(executeBtn).not.toBeNull();

		const toggleBtn = findNodeByTestId(container, "toggle-simple-cashier-btn");
		expect(toggleBtn).not.toBeNull();
		await clickNode(toggleBtn!);

		const cardInput = findNodeByTestId(container, "split-input-card");
		expect(cardInput).not.toBeNull();
		await changeInput(cardInput!, "7000");

		expect(executeBtn?.disabled).toBeFalsy();
		await clickNode(executeBtn!);

		expect(showToast).toHaveBeenCalledWith("Переплата по безналу/сертификатам: 2000.00 ₽", "warning");
	});

	it("4. SBP QR Active Method: auto-balances remaining amount to SBP when activeMethod is sbp_qr", async () => {
		await act(async () => {
			root.render(<FastCheckoutModal isOpen={true} onClose={() => {}} totalBillKop={300000} initialPaymentMethod="sbp_qr" />);
		});

		const executeBtn = findNodeByTestId(container, "execute-fast-checkout-btn");
		expect(executeBtn).not.toBeNull();

		const toggleBtn = findNodeByTestId(container, "toggle-simple-cashier-btn");
		expect(toggleBtn).not.toBeNull();
		await clickNode(toggleBtn!);

		const sbpInput = findNodeByTestId(container, "split-input-sbp");
		expect(sbpInput).not.toBeNull();
		await changeInput(sbpInput!, "1000");

		expect(executeBtn?.disabled).toBeFalsy();
		await clickNode(executeBtn!);

		expect(showToast).toHaveBeenCalledWith("Недостающая сумма автоматически добавлена к оплате!", "info");
	});

	it("5. Button Grid Ergonomics: uses grid-cols-2 sm:grid-cols-4 gap-2 without lg:grid-cols-8 squishing (Mandate 8d, Greh 1)", async () => {
		await act(async () => {
			root.render(<FastCheckoutModal isOpen={true} onClose={() => {}} totalBillKop={100000} />);
		});

		const presetsSection = findNodeByTestId(container, "quick-presets-section");
		expect(presetsSection).not.toBeNull();
		const gridContainer = presetsSection?.children?.find((c) => c.className?.includes("grid-cols-2"));
		expect(gridContainer).not.toBeNull();
		assert.ok(
			gridContainer?.className.includes("grid-cols-2 sm:grid-cols-4 gap-2"),
			`Expected grid-cols-2 sm:grid-cols-4 gap-2, but got: ${gridContainer?.className}`,
		);
		assert.equal(gridContainer?.className.includes("lg:grid-cols-8"), false, "lg:grid-cols-8 must not be present to avoid button squishing");
	});

	it("6. Solo Doctor Cashier Fallback: attendingDoctorName is used when cashierFullName is omitted (Mandate 8n)", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: test spy
		let printedReceipt: any = null;
		const originalPrint = KktLanPrinterService.printReceipt;
		// biome-ignore lint/suspicious/noExplicitAny: test spy
		KktLanPrinterService.printReceipt = async (params: any) => {
			printedReceipt = params;
			return { success: true, status: "printed", hardwareLatencyMs: 5, usedCircuitBreaker: false };
		};

		try {
			await act(async () => {
				root.render(<FastCheckoutModal isOpen={true} onClose={() => {}} totalBillKop={200000} attendingDoctorName="Д-р Кузнецова Е.В." />);
			});

			const executeBtn = findNodeByTestId(container, "execute-fast-checkout-btn");
			expect(executeBtn).not.toBeNull();
			await clickNode(executeBtn!);

			assert.ok(printedReceipt, "printReceipt should have been called");
			assert.equal(printedReceipt.cashierFullName, "Д-р Кузнецова Е.В.", "Must use attendingDoctorName as cashier fallback");
		} finally {
			KktLanPrinterService.printReceipt = originalPrint;
		}
	});

	it("7. Billing Payment Synchronization: records payment to /api/billing/payments when patientId and effectiveTotalRub > 0 (ARCH-03)", async () => {
		let fetchedUrl = "";
		// biome-ignore lint/suspicious/noExplicitAny: test spy
		let fetchedOptions: any = null;
		const originalFetch = globalThis.fetch;

		// biome-ignore lint/suspicious/noExplicitAny: test spy
		globalThis.fetch = (async (url: any, options: any) => {
			const urlStr = String(url);
			if (urlStr.includes("/api/loyalty/balance")) {
				return { ok: true, status: 200, json: async () => ({ bonusPoints: 0 }) } as any;
			}
			if (urlStr.includes("/api/billing/payments")) {
				fetchedUrl = urlStr;
				fetchedOptions = options;
				return { ok: true, status: 200, json: async () => ({ id: "pay-rec-1", amountRub: 5000 }) } as any;
			}
			if (urlStr.includes("/api/cashbox/")) {
				return { ok: false, status: 404, json: async () => ({}) } as any;
			}
			return { ok: true, status: 200, json: async () => ({}) } as any;
		}) as any;

		try {
			await act(async () => {
				root.render(
					<FastCheckoutModal
						isOpen={true}
						onClose={() => {}}
						totalBillKop={500000}
						patientId="00000000-0000-0000-0000-000000000001"
						attendingDoctorName="Д-р Морозов"
					/>,
				);
			});

			const executeBtn = findNodeByTestId(container, "execute-fast-checkout-btn");
			expect(executeBtn).not.toBeNull();
			await clickNode(executeBtn!);

			assert.equal(fetchedUrl, "/api/billing/payments");
			assert.ok(fetchedOptions, "Fetch options should be provided");
			assert.equal(fetchedOptions.method, "POST");
			const parsedBody = JSON.parse(fetchedOptions.body);
			assert.equal(parsedBody.patientId, "00000000-0000-0000-0000-000000000001");
			assert.equal(parsedBody.amountRub, 5000);
			assert.ok(parsedBody.clientMutationId, "clientMutationId must be set");
		} finally {
			if (originalFetch) {
				globalThis.fetch = originalFetch;
			} else {
				// biome-ignore lint/suspicious/noExplicitAny: test cleanup
				delete (globalThis as any).fetch;
			}
		}
	});
});
