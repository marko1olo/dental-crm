/**
 * paymentTaxAutonomyDefaults.test.tsx
 *
 * Unit tests for Payment Capture Tax Deduction Autonomy & Non-Blocking Payer Defaults:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; active toast guidance)
 * - Mandate 8k: CRM != Reality Simulator (Non-blocking autofill with manual completion allowed)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Cashier autonomy without roadblocks; no INN for physical persons)
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
			toHaveBeenCalled: () => {
				const count = actual?.mock?.calls?.length ?? actual?.calls?.length ?? 0;
				assert.strictEqual(count, 0, `Expected function NOT to have been called, but was called ${count} times`);
			},
		},
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

function findNodeById(node: MockDomNode | null, id: string): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.("id") === id || node.id === id) return node;
	if (node.children) {
		for (const child of node.children) {
			const res = findNodeById(child, id);
			if (res) return res;
		}
	}
	return null;
}

function isNodeDisabled(node: MockDomNode | null): boolean {
	if (!node) return false;
	const reactPropKey = Object.keys(node).find((k) => k.startsWith("__reactProps$"));
	if (reactPropKey) {
		const props = (node as any)[reactPropKey];
		if (props && props.disabled !== undefined) return Boolean(props.disabled);
	}
	return Boolean(node.disabled || node.getAttribute?.("disabled") !== null);
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

describe("PaymentCapture Tax Deduction Autonomy & Non-Blocking Defaults (Mandates 8e, 8n)", () => {
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

	it("1. verifies button «Заполнить из карточки пациента» is NOT disabled even when patientTaxDefaultsAvailable is false", async () => {
		const props = createBaseProps({
			patientDefaults: { birthDate: null, fullName: null, identityDocument: null, taxpayerInn: null },
		});

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const fillBtn = findNodeByTestId(container, "payment-fill-payer-from-patient");
		expect(fillBtn).not.toBeNull();
		expect(isNodeDisabled(fillBtn)).toBe(false);
		expect(fillBtn?.getAttribute("disabled")).toBeNull();
	});

	it("2. verifies clicking button with partial patient data populates available fields without errors and shows info toast", async () => {
		const onPayerFullNameChange = vi.fn();
		const onPayerBirthDateChange = vi.fn();
		const onPayerIdentityDocumentChange = vi.fn();
		const onPayerInnChange = vi.fn();
		const onPayerRelationshipChange = vi.fn();

		const props = createBaseProps({
			patientDefaults: {
				fullName: "Смирнов Алексей Владимирович",
				birthDate: "1985-04-12",
				identityDocument: null,
				taxpayerInn: null,
			},
			onPayerFullNameChange,
			onPayerBirthDateChange,
			onPayerIdentityDocumentChange,
			onPayerInnChange,
			onPayerRelationshipChange,
		});

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const fillBtn = findNodeByTestId(container, "payment-fill-payer-from-patient");
		expect(fillBtn).not.toBeNull();
		await clickNode(fillBtn!);

		expect(onPayerFullNameChange).toHaveBeenCalledWith("Смирнов Алексей Владимирович");
		expect(onPayerBirthDateChange).toHaveBeenCalledWith("1985-04-12");
		expect(onPayerRelationshipChange).toHaveBeenCalledWith("пациент");
		expect(onPayerIdentityDocumentChange).not.toHaveBeenCalled();
		expect(onPayerInnChange).not.toHaveBeenCalled();

		expect(showToastCalls.some((c) => c[0].includes("Заполнены доступные данные пациента") && c[1] === "info")).toBe(true);
	});

	it("3. verifies clicking button when patient card has no data triggers warning guidance toast without errors", async () => {
		const onPayerFullNameChange = vi.fn();
		const props = createBaseProps({
			patientDefaults: { fullName: "", birthDate: "", identityDocument: "", taxpayerInn: "" },
			onPayerFullNameChange,
		});

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const fillBtn = findNodeByTestId(container, "payment-fill-payer-from-patient");
		expect(fillBtn).not.toBeNull();
		await clickNode(fillBtn!);

		expect(onPayerFullNameChange).not.toHaveBeenCalled();
		expect(showToastCalls.some((c) => c[0].includes("В карточке пациента отсутствуют ФИО") && c[1] === "warning")).toBe(true);
	});

	it("4. verifies clicking button when no patient is selected triggers warning guidance toast", async () => {
		const props = createBaseProps({
			patientId: null,
			patientContextReady: false,
			patientDefaults: { fullName: null, birthDate: null, identityDocument: null, taxpayerInn: null },
		});

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const fillBtn = findNodeByTestId(container, "payment-fill-payer-from-patient");
		expect(fillBtn).not.toBeNull();
		await clickNode(fillBtn!);

		expect(showToastCalls.some((c) => c[0].includes("В карточке пациента отсутствуют ФИО") && c[1] === "warning")).toBe(true);
	});

	it("5. verifies tax deduction request does NOT block payment submission when tax details are missing (Mandate 8e)", async () => {
		const onSubmit = vi.fn();
		const props = createBaseProps({
			amount: "5000",
			taxDeductionCode: "1",
			payerFullName: "",
			payerBirthDate: "",
			payerIdentityDocument: "",
			fiscalReceiptIssuedAt: "",
			onSubmit,
		});

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();
		await clickNode(submitBtn!);

		expect(onSubmit).toHaveBeenCalled();
		expect(showToastCalls.some((c) => c[0].includes("Оплата принимается") && c[1] === "info")).toBe(true);
	});

	it("6. verifies non-blocking draft hint is displayed when tax deduction details are incomplete", async () => {
		const props = createBaseProps({
			amount: "5000",
			taxDeductionCode: "1",
			payerFullName: "",
		});

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const draftHint = findNodeByTestId(container, "payment-tax-draft-hint");
		expect(draftHint).not.toBeNull();
		const missingBlocker = findNodeById(container, "payment-capture-missing");
		expect(missingBlocker).toBeNull();
	});

	it("7. verifies physical person does NOT require INN to submit payment (Mandate 8n)", async () => {
		const onSubmit = vi.fn();
		const props = createBaseProps({
			amount: "3000",
			payerInn: "",
			onSubmit,
		});

		await act(async () => { root.render(<PaymentCapture {...props} />); });

		const submitBtn = findNodeByTestId(container, "payment-submit-button");
		expect(submitBtn).not.toBeNull();
		expect(isNodeDisabled(submitBtn)).toBe(false);

		await clickNode(submitBtn!);
		expect(onSubmit).toHaveBeenCalled();
	});
});
