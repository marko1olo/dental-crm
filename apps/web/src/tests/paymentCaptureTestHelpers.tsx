/**
 * paymentCaptureTestHelpers.tsx
 *
 * Shared mock DOM and test harness helpers for PaymentCapture autonomy tests.
 * Mandates 8b, 8zi, 8e, 8n Sweet Spot helper module.
 */

import assert from "node:assert/strict";
import React, { act } from "react";
(globalThis as any).React = React;
import type { PaymentCapture } from "../PaymentCapture";

export type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
	mockReturnValue: (val: any) => MockFn;
};

export function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	fn.mockReturnValue = (val: any) => createMockFn(() => val);
	return fn;
}

export const showToastCalls: any[][] = [];

export const vi = {
	fn: (impl?: any) => createMockFn(impl),
	clearAllMocks: () => {
		showToastCalls.length = 0;
	},
};

export const showToast = {
	calls: showToastCalls,
	mock: { calls: showToastCalls },
};

export function expect(actual: any) {
	return {
		toBe: (expected: any) => assert.strictEqual(actual, expected),
		toBeFalsy: () => assert.ok(!actual, `Expected falsy, but got ${actual}`),
		toBeTruthy: () => assert.ok(Boolean(actual), `Expected truthy, but got ${actual}`),
		toBeNull: () => assert.strictEqual(actual, null),
		not: {
			toBeNull: () => assert.ok(actual !== null && actual !== undefined),
			toMatch: (regex: RegExp) => assert.ok(!regex.test(String(actual))),
			toHaveBeenCalled: () => {
				const count = actual?.mock?.calls?.length ?? actual?.calls?.length ?? 0;
				assert.strictEqual(
					count,
					0,
					`Expected function NOT to have been called, but was called ${count} times`,
				);
			},
			toHaveBeenCalledWith: (...expectedArgs: any[]) => {
				const calls = actual?.mock?.calls ?? actual?.calls ?? [];
				const match = calls.some((callArgs: any[]) =>
					expectedArgs.every((arg, i) => callArgs[i] === arg),
				);
				assert.ok(
					!match,
					`Expected NOT to be called with ${JSON.stringify(expectedArgs)}, but was called with: ${JSON.stringify(calls)}`,
				);
			},
		},
		toContain: (expected: string) => {
			assert.ok(
				actual?.includes?.(expected),
				`Expected "${actual}" to contain "${expected}"`,
			);
		},
		toHaveBeenCalled: () => {
			const count = actual?.mock?.calls?.length ?? actual?.calls?.length ?? 0;
			assert.ok(count > 0, "Expected function to have been called");
		},
		toHaveBeenCalledWith: (...expectedArgs: any[]) => {
			const calls = actual?.mock?.calls ?? actual?.calls ?? [];
			const match = calls.some((callArgs: any[]) =>
				expectedArgs.every((arg, i) => callArgs[i] === arg),
			);
			assert.ok(
				match,
				`Expected call with ${JSON.stringify(expectedArgs)}, but calls were: ${JSON.stringify(calls)}`,
			);
		},
	};
}

export interface MockDomNode {
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
	getBoundingClientRect: () => {
		top: number;
		left: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	};
	focus?: () => void;
	blur?: () => void;
	[key: string]: unknown;
}

export function setupMockDom() {
	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	let doc: any;

	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
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
			attributes: [],
			ownerDocument: doc,
			parentNode: null,
			textContent: "",
			disabled: false,
			value: "",
			className: "",
			options: [],
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
					el.disabled = true;
				}
				if (name === "class" || name === "className") {
					el.className = value;
				}
				if (name === "value") {
					el.value = value;
				}
			},
			getAttribute: (name: string) => attrs[name] ?? null,
			removeAttribute: (name: string) => {
				delete attrs[name];
				if (name === "disabled") {
					el.disabled = false;
				}
				if (name === "value") {
					el.value = "";
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
				right: 600,
				bottom: 200,
				width: 600,
				height: 200,
			}),
			focus: () => {},
			blur: () => {},
		};

		return new Proxy(el, {
			get(target, prop, receiver) {
				if (typeof prop === "string" && /^\d+$/.test(prop)) {
					const idx = Number(prop);
					return target.children[idx];
				}
				return Reflect.get(target, prop, receiver);
			},
		});
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
			ownerDocument: doc,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: doc }),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: null as any,
		body: null as any,
		activeElement: null,
	};
	doc.documentElement = createMockElement("html");
	doc.body = createMockElement("body");
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	class MockHTMLIFrameElement {}
	class MockCustomEvent {
		type: string;
		detail: any;
		constructor(type: string, init?: any) {
			this.type = type;
			this.detail = init?.detail;
		}
	}

	const win = {
		document: doc,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: (event: any) => {
			if (event?.type === "dente-toast" && event.detail) {
				showToastCalls.push([event.detail.text, event.detail.type]);
			}
			return true;
		},
		clearTimeout: () => {},
		setTimeout: () => 0,
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		HTMLIFrameElement: MockHTMLIFrameElement,
		HTMLElement: class {},
		Element: class {},
		Node: class {},
		CustomEvent: MockCustomEvent,
	};
	doc.defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	g.CustomEvent = MockCustomEvent;
	g.HTMLIFrameElement = MockHTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return { doc, win };
}

export function findNodeByTestId(
	node: MockDomNode | null,
	testId: string,
	searchBody = true,
): MockDomNode | null {
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

export function findAllButtons(node: MockDomNode | null, searchBody = true): MockDomNode[] {
	if (!node) return [];
	const results: MockDomNode[] = [];
	if (node.tagName === "BUTTON") {
		results.push(node);
	}
	if (node.children) {
		for (const child of node.children) {
			results.push(...findAllButtons(child, false));
		}
	}
	if (searchBody && (node as any)?.ownerDocument?.body && (node as any).ownerDocument.body !== node) {
		results.push(...findAllButtons((node as any).ownerDocument.body, false));
	}
	return results;
}

export function isNodeDisabled(node: MockDomNode | null): boolean {
	if (!node) return false;
	const reactPropKey = Object.keys(node).find((k) =>
		k.startsWith("__reactProps$"),
	);
	if (reactPropKey) {
		// biome-ignore lint/suspicious/noExplicitAny: access React internal props
		const props = (node as any)[reactPropKey];
		if (props && props.disabled !== undefined) {
			return Boolean(props.disabled);
		}
	}
	return Boolean(node.disabled || node.getAttribute?.("disabled") !== null);
}

export async function clickNode(node: MockDomNode) {
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

export function createBaseProps(
	overrides: Partial<React.ComponentProps<typeof PaymentCapture>> = {},
): React.ComponentProps<typeof PaymentCapture> {
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
		patientDefaults: {
			birthDate: null,
			fullName: null,
			identityDocument: null,
			taxpayerInn: null,
		},
		patientId: "patient-101",
		payerBirthDate: "",
		payerFullName: "",
		payerIdentityDocument: "",
		payerInn: "",
		payerRelationship: "",
		taxDeductionCode: "",
		...overrides,
	};
}
