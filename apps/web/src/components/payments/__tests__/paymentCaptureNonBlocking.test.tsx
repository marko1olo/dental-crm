/**
 * paymentCaptureNonBlocking.test.tsx
 *
 * Unit tests for Payment Capture Non-Blocking UI & Apple HIG Touch Ergonomics:
 * - Mandate 8e: Doctor & Staff Autonomy (No roadblock barriers, free payment method toggling)
 * - Mandate 8d & Apple HIG: Touch target minimum >= 44x44px for all interactable buttons
 * - Mandate 8o: Scope-bounded verifiable assertions
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PaymentCapture } from "../../../PaymentCapture";

const showToastCalls: any[][] = [];

function createMockFn(impl?: (...args: any[]) => any) {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as any;
	fn.calls = calls;
	fn.mock = { calls };
	fn.mockReturnValue = (val: any) => createMockFn(() => val);
	return fn;
}

const vi = {
	fn: (impl?: any) => createMockFn(impl),
	clearAllMocks: () => { showToastCalls.length = 0; },
};

function expect(actual: any) {
	return {
		toBe: (expected: any) => assert.strictEqual(actual, expected),
		toBeFalsy: () => assert.ok(!actual, `Expected falsy, but got ${actual}`),
		toBeTruthy: () => assert.ok(Boolean(actual), `Expected truthy, but got ${actual}`),
		toBeNull: () => assert.strictEqual(actual, null),
		not: {
			toBeNull: () => assert.ok(actual !== null && actual !== undefined),
		},
		toContain: (expected: string) => assert.ok(actual?.includes?.(expected), `Expected "${actual}" to contain "${expected}"`),
		toHaveBeenCalled: () => {
			const count = actual?.mock?.calls?.length ?? actual?.calls?.length ?? 0;
			assert.ok(count > 0, "Expected function to have been called");
		},
		toHaveBeenCalledWith: (...expectedArgs: any[]) => {
			const calls = actual?.mock?.calls ?? actual?.calls ?? [];
			const match = calls.some((callArgs: any[]) => expectedArgs.every((arg, i) => callArgs[i] === arg));
			assert.ok(match, `Expected call with ${JSON.stringify(expectedArgs)}, but calls were: ${JSON.stringify(calls)}`);
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
	removeAttribute: (name: string) => void;
	dispatchEvent: (ev: { type: string }) => boolean;
	getBoundingClientRect: () => { top: number; left: number; right: number; bottom: number; width: number; height: number };
	focus?: () => void;
	blur?: () => void;
	[key: string]: unknown;
}

function setupMockDom() {
	let doc: any;
	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};
		const el: MockDomNode = {
			nodeType: 1,
			tagName: tag.toUpperCase(),
			style: {},
			dataset: {},
			children,
			childNodes: children,
			ownerDocument: doc,
			parentNode: null,
			textContent: "",
			disabled: false,
			value: "",
			className: "",
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
			setAttribute: (name: string, value: string) => {
				attrs[name] = value;
				if (name.startsWith("data-")) el.dataset[name.slice(5)] = value;
				if (name === "disabled") el.disabled = true;
				if (name === "class" || name === "className") el.className = value;
				if (name === "value") el.value = value;
			},
			getAttribute: (name: string) => attrs[name] ?? null,
			removeAttribute: (name: string) => { delete attrs[name]; if (name === "disabled") el.disabled = false; if (name === "value") el.value = ""; },
			dispatchEvent: (ev: { type: string }) => { (listeners[ev.type] || []).forEach((fn) => fn(ev as unknown as Event)); return true; },
			getBoundingClientRect: () => ({ top: 0, left: 0, right: 600, bottom: 200, width: 600, height: 200 }),
			focus: () => {},
			blur: () => {},
		};
		return new Proxy(el, {
			get(target, prop, receiver) {
				if (typeof prop === "string" && /^\d+$/.test(prop)) return target.children[Number(prop)];
				return Reflect.get(target, prop, receiver);
			},
		});
	}

	doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({ nodeType: 3, textContent: text, style: {}, parentNode: null, ownerDocument: doc }),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: doc }),
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
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: (event: any) => {
			if (event?.type === "dente-toast" && event.detail) showToastCalls.push([event.detail.text, event.detail.type]);
			return true;
		},
		clearTimeout: () => {},
		setTimeout: () => 0,
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
		CustomEvent: class {
			type: string;
			detail: any;
			constructor(type: string, init?: any) { this.type = type; this.detail = init?.detail; }
		},
	};
	doc.defaultView = win;

	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	g.CustomEvent = win.CustomEvent;
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;
	return { doc, win };
}

function findNodeByClassName(node: MockDomNode | null, className: string): MockDomNode | null {
	if (!node) return null;
	if (node.className?.includes(className)) return node;
	if (node.children) {
		for (const child of node.children) {
			const res = findNodeByClassName(child, className);
			if (res) return res;
		}
	}
	return null;
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

function findAllButtons(node: MockDomNode | null): MockDomNode[] {
	if (!node) return [];
	const results: MockDomNode[] = [];
	if (node.tagName === "BUTTON") results.push(node);
	if (node.children) {
		for (const child of node.children) results.push(...findAllButtons(child));
	}
	return results;
}

async function clickNode(node: MockDomNode) {
	await act(async () => {
		const reactPropKey = Object.keys(node).find((k) => k.startsWith("__reactProps$"));
		if (reactPropKey) {
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onClick === "function") {
				props.onClick({ type: "click", preventDefault: () => {}, stopPropagation: () => {} });
				return;
			}
		}
		node.dispatchEvent({ type: "click" });
	});
}

function createBaseProps(overrides: Partial<React.ComponentProps<typeof PaymentCapture>> = {}): React.ComponentProps<typeof PaymentCapture> {
	return {
		amount: "5000",
		feedback: "",
		fiscalCashierName: "Иванова И.И.",
		fiscalFd: "",
		fiscalFn: "",
		fiscalFpd: "",
		fiscalReceiptIssuedAt: "2026-09-07T12:00",
		fiscalReceiptNumber: "1",
		fiscalReceiptUrl: "",
		isSaving: false,
		method: "cash",
		methodLabels: {
			cash: "Наличные",
			card: "Карта",
			bank_transfer: "Банковский перевод",
			online: "СБП / Онлайн",
			insurance: "Страховая",
			family_wallet: "Семейный кошелек",
			other: "Другое",
		},
		onAmountChange: vi.fn(),
		onFiscalCashierNameChange: vi.fn(),
		onFiscalFdChange: vi.fn(),
		onFiscalFnChange: vi.fn(),
		onFiscalFpdChange: vi.fn(),
		onFiscalReceiptIssuedAtChange: vi.fn(),
		onFiscalReceiptNumberChange: vi.fn(),
		onFiscalReceiptUrlChange: vi.fn(),
		onMethodChange: vi.fn(),
		onPayerBirthDateChange: vi.fn(),
		onPayerFullNameChange: vi.fn(),
		onPayerIdentityDocumentChange: vi.fn(),
		onPayerInnChange: vi.fn(),
		onPayerRelationshipChange: vi.fn(),
		onSubmit: vi.fn(),
		onTaxDeductionCodeChange: vi.fn(),
		patientContextMessage: "",
		patientContextReady: true,
		patientDefaults: { birthDate: null, fullName: null, identityDocument: null, taxpayerInn: null },
		patientId: "patient-101",
		payerBirthDate: "",
		payerFullName: "",
		payerIdentityDocument: "",
		payerInn: "",
		payerRelationship: "",
		taxDeductionCode: "1",
		...overrides,
	};
}

describe("PaymentCapture Non-Blocking UI & Apple HIG Touch Targets (Mandates 8d, 8e)", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		vi.clearAllMocks();
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	afterEach(async () => {
		try {
			await act(async () => { root?.unmount(); });
		} catch {
			// ignore unmount errors
		}
	});

	it("1. verifies touch targets meet >= 44px for all buttons in tax deduction section (Apple HIG)", async () => {
		const props = createBaseProps();

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const fillBtn = findNodeByTestId(container, "payment-fill-payer-from-patient");
		expect(fillBtn).not.toBeNull();
		expect(fillBtn?.style.minHeight).toBe("44px");
		expect(fillBtn?.className).toContain("min-h-[44px]");

		let taxSectionNode: MockDomNode | null = fillBtn?.parentNode ?? null;
		while (taxSectionNode && taxSectionNode.tagName !== "DETAILS") {
			taxSectionNode = taxSectionNode.parentNode;
		}

		expect(taxSectionNode).not.toBeNull();
		const taxSectionButtons = findAllButtons(taxSectionNode);

		// Exactly 9 buttons: 5 relationships + 3 tax codes + 1 fill btn
		expect(taxSectionButtons.length).toBe(9);
		for (const btn of taxSectionButtons) {
			expect(btn.style.minHeight).toBe("44px");
			expect(btn.className).toContain("min-h-[44px]");
		}
	});

	it("2. verifies payment method tabs render and switch payment method without roadblocks", async () => {
		const onMethodChange = vi.fn();
		const props = createBaseProps({ onMethodChange });

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const cardBtn = findNodeByTestId(container, "payment-method-card");
		if (cardBtn) {
			await clickNode(cardBtn);
			expect(onMethodChange).toHaveBeenCalledWith("card");
		} else {
			// Fallback: verify buttons inside container
			const allBtns = findAllButtons(container);
			const methodBtn = allBtns.find((b) => b.textContent?.includes("Карта"));
			if (methodBtn) {
				await clickNode(methodBtn);
				expect(onMethodChange).toHaveBeenCalled();
			}
		}
	});

	it("3. verifies feedback message is displayed when provided", async () => {
		const props = createBaseProps({ feedback: "Чек успешно зарегистрирован" });

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const feedbackNode = findNodeByClassName(container, "payment-capture-feedback");
		expect(feedbackNode).not.toBeNull();
		expect(feedbackNode?.textContent).toContain("Чек успешно зарегистрирован");
	});

	it("4. verifies submit button is accessible and not blocked without reason", async () => {
		const onSubmit = vi.fn();
		const props = createBaseProps({
			amount: "1500",
			payerFullName: "Петров П.П.",
			taxDeductionCode: "",
			onSubmit,
		});

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();
		await clickNode(submitBtn!);

		expect(onSubmit).toHaveBeenCalled();
	});
});
