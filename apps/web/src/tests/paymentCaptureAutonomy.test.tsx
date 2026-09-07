/**
 * paymentCaptureAutonomy.test.tsx
 *
 * Comprehensive unit tests for Doctor & Cashier Autonomy in PaymentCapture:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; active toast guidance; 100% doctor discount)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Cashier autonomy without roadblocks)
 * - Mandate 8o: Scope-bounded verifiable assertions
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PaymentCapture } from "../PaymentCapture";
import { money } from "../AppHelpers";

type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
	mockReturnValue: (val: any) => MockFn;
};

function createMockFn(impl?: (...args: any[]) => any): MockFn {
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

const showToastCalls: any[][] = [];

const vi = {
	fn: (impl?: any) => createMockFn(impl),
	clearAllMocks: () => {
		showToastCalls.length = 0;
	},
};

const showToast = {
	calls: showToastCalls,
	mock: { calls: showToastCalls },
};

function expect(actual: any) {
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

function setupMockDom() {
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

function findAllButtons(node: MockDomNode | null): MockDomNode[] {
	if (!node) return [];
	const results: MockDomNode[] = [];
	if (node.tagName === "BUTTON") {
		results.push(node);
	}
	if (node.children) {
		for (const child of node.children) {
			results.push(...findAllButtons(child));
		}
	}
	return results;
}

function isNodeDisabled(node: MockDomNode | null): boolean {
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

function createBaseProps(
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

describe("PaymentCapture Autonomy & Non-Blocking Guidance (Mandates 8e, 8n)", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		vi.clearAllMocks();
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	it("verifies payment capture buttons are NOT disabled when patient is not selected (disabled === false)", async () => {
		const props = createBaseProps({
			patientId: null,
			patientContextReady: false,
			amount: "5000",
			isSaving: false,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		const sberPosBtn = findNodeByTestId(container, "payment-sberpos-button");

		expect(submitBtn).not.toBeNull();
		expect(sberPosBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(false);
		expect(isNodeDisabled(sberPosBtn)).toBe(false);
	});

	it("verifies payment capture buttons are NOT disabled when amount is empty or 0 (disabled === false)", async () => {
		const props = createBaseProps({
			patientId: "pat-123",
			patientContextReady: true,
			amount: "",
			isSaving: false,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		const sberPosBtn = findNodeByTestId(container, "payment-sberpos-button");

		expect(submitBtn).not.toBeNull();
		expect(sberPosBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(false);
		expect(isNodeDisabled(sberPosBtn)).toBe(false);
	});

	it("verifies clicking submit button without selected patient shows warning toast without crash", async () => {
		const onSubmit = vi.fn();
		const props = createBaseProps({
			patientId: null,
			patientContextReady: false,
			amount: "3000",
			onSubmit,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();

		await clickNode(submitBtn!);

		expect(onSubmit).not.toHaveBeenCalled();
		expect(showToast).toHaveBeenCalledWith(
			"Выберите пациента для проведения платежа",
			"warning",
		);
	});

	it("verifies clicking submit button without amount shows warning toast when no remaining debt", async () => {
		const onSubmit = vi.fn();
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "",
			remainingDebt: 0,
			onSubmit,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();

		await clickNode(submitBtn!);

		expect(onSubmit).not.toHaveBeenCalled();
		expect(showToast).toHaveBeenCalledWith(
			"Укажите сумму платежа или выберите услугу из плана",
			"warning",
		);
	});

	it("verifies clicking submit button when amount is 0 and debt exists offers 1-click payment by estimate", async () => {
		const onAmountChange = vi.fn();
		const onSubmit = vi.fn();
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "0",
			remainingDebt: 7500,
			onAmountChange,
			onSubmit,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();

		await clickNode(submitBtn!);

		expect(onAmountChange).toHaveBeenCalledWith("7500");
		expect(onSubmit).not.toHaveBeenCalled();
		expect(showToast).toHaveBeenCalledWith(
			`Установлена сумма по смете: ${money(7500)}. Нажмите «Принять оплату» для подтверждения`,
			"info",
		);
	});

	it("verifies payment capture buttons are disabled ONLY when isSaving is true", async () => {
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "5000",
			isSaving: true,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		const sberPosBtn = findNodeByTestId(container, "payment-sberpos-button");

		expect(submitBtn).not.toBeNull();
		expect(sberPosBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(true);
		expect(isNodeDisabled(sberPosBtn)).toBe(true);
	});

	it("verifies doctor discount presets support up to 100% without master passwords (Mandate 8e item 7)", async () => {
		const onAmountChange = vi.fn();
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "5000",
			remainingDebt: 5000,
			onAmountChange,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const warrantyBtn = findNodeByTestId(container, "btn-doctor-discount-warranty");
		const colleagueBtn = findNodeByTestId(container, "btn-doctor-discount-colleague");
		const discount50Btn = findNodeByTestId(container, "btn-doctor-discount-50");

		expect(warrantyBtn).not.toBeNull();
		expect(colleagueBtn).not.toBeNull();
		expect(discount50Btn).not.toBeNull();

		// 1. Warranty rework 100% discount
		await clickNode(warrantyBtn!);
		expect(onAmountChange).toHaveBeenCalledWith("0");
		expect(showToast).toHaveBeenCalledWith(
			"Применена 100% скидка врача: гарантийная переделка (к оплате 0 ₽, без пароля)",
			"info",
		);

		// 2. Colleague 100% discount
		await clickNode(colleagueBtn!);
		expect(onAmountChange).toHaveBeenCalledWith("0");
		expect(showToast).toHaveBeenCalledWith(
			"Применена 100% скидка для персонала (к оплате 0 ₽, без пароля)",
			"info",
		);

		// 3. 50% discount
		await clickNode(discount50Btn!);
		expect(onAmountChange).toHaveBeenCalledWith("2500");
		expect(showToast).toHaveBeenCalledWith(
			`Применена скидка врача 50%: ${money(2500)}`,
			"info",
		);
	});

	it("verifies INN is optional for physical persons and does not block payment submission (Mandate 8e item 9)", async () => {
		const onSubmit = vi.fn();
		const props = createBaseProps({
			patientId: "patient-101",
			amount: "5000",
			payerInn: "", // Empty INN for physical person
			taxDeductionCode: "",
			onSubmit,
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(false);

		await clickNode(submitBtn!);
		expect(onSubmit).toHaveBeenCalled();
	});

	it("verifies all buttons and presets have touch targets >= 44px (minHeight: 44px)", async () => {
		const props = createBaseProps({
			remainingDebt: 10000,
			method: "cash",
			amount: "5000",
		});

		await act(async () => {
			root.render(<PaymentCapture {...props} />);
		});

		const allButtons = findAllButtons(container);
		assert.ok(allButtons.length >= 10, `Expected at least 10 buttons, found ${allButtons.length}`);

		for (const btn of allButtons) {
			const hasStyle44 = btn.style.minHeight === "44px";
			const hasClass44 = btn.className.includes("min-h-[44px]");
			assert.ok(
				hasStyle44 || hasClass44,
				`Button ${btn.textContent || btn.getAttribute("aria-label") || "unnamed"} missing >= 44px minHeight (style: ${btn.style.minHeight}, class: ${btn.className})`,
			);
		}
	});
});
