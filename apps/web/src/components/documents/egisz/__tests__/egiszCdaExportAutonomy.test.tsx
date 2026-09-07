/**
 * egiszCdaExportAutonomy.test.tsx
 *
 * Unit tests for EGISZ CDA Export Autonomy & Active Validation Guidance:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; active guidance toast on click)
 * - Mandate 8k: CRM != Reality Simulator
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Sensible demo defaults for draft export)
 * - Mandate 8o: Scope-bounded verifiable assertions
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const showToastCalls: Array<[string, string | undefined]> = [];

interface SpyMock {
	(...args: unknown[]): unknown;
	calls: unknown[][];
	mockResolvedValue: (val: unknown) => SpyMock;
	mockReturnValue: (val: unknown) => SpyMock;
	mockImplementation: (fn: (...args: unknown[]) => unknown) => SpyMock;
	toHaveBeenCalled: () => void;
	toHaveBeenCalledWith: (...expectedArgs: unknown[]) => void;
}

const vi = {
	clearAllMocks: () => {
		showToastCalls.length = 0;
	},
	fn: (initialImpl?: (...args: unknown[]) => unknown): SpyMock => {
		const calls: unknown[][] = [];
		let resolvedVal: unknown = undefined;
		let returnVal: unknown = undefined;
		let impl = initialImpl;
		const fnObj = ((...args: unknown[]) => {
			calls.push(args);
			if (resolvedVal !== undefined) return Promise.resolve(resolvedVal);
			if (returnVal !== undefined) return returnVal;
			if (impl) return impl(...args);
			return undefined;
		}) as SpyMock;
		fnObj.calls = calls;
		fnObj.mockResolvedValue = (val: unknown) => {
			resolvedVal = val;
			return fnObj;
		};
		fnObj.mockReturnValue = (val: unknown) => {
			returnVal = val;
			return fnObj;
		};
		fnObj.mockImplementation = (newImpl: (...args: unknown[]) => unknown) => {
			impl = newImpl;
			resolvedVal = undefined;
			returnVal = undefined;
			return fnObj;
		};
		fnObj.toHaveBeenCalled = () => {
			assert.ok(calls.length > 0, "Expected function to have been called");
		};
		fnObj.toHaveBeenCalledWith = (...expectedArgs: unknown[]) => {
			const found = calls.some((actual) =>
				expectedArgs.every((arg, idx) => actual[idx] === arg),
			);
			assert.ok(
				found,
				`Expected call with ${JSON.stringify(expectedArgs)}, but actual calls were: ${JSON.stringify(calls)}`,
			);
		};
		return fnObj;
	},
	mocked: (_fn: unknown) => ({
		mock: {
			calls: showToastCalls,
		},
	}),
};

const showToast = {
	toHaveBeenCalled: () => {
		assert.ok(showToastCalls.length > 0, "Expected showToast to have been called");
	},
	toHaveBeenCalledWith: (text: string, type?: string) => {
		const found = showToastCalls.some(
			(c) => c[0].includes(text) && (!type || c[1] === type),
		);
		assert.ok(
			found,
			`Expected toast with "${text}" (${type}), but calls were: ${JSON.stringify(showToastCalls)}`,
		);
	},
};

function expect(actual: unknown) {
	return {
		toBeNull: () => assert.strictEqual(actual, null),
		toBeDefined: () => assert.notStrictEqual(actual, undefined),
		toBeGreaterThanOrEqual: (expected: number) => {
			assert.ok(
				typeof actual === "number" && actual >= expected,
				`Expected ${actual} >= ${expected}`,
			);
		},
		not: {
			toBeNull: () => assert.notStrictEqual(actual, null),
			toBeUndefined: () => assert.notStrictEqual(actual, undefined),
		},
		toBe: (expected: unknown) => assert.strictEqual(actual, expected),
		toBeFalsy: () => assert.ok(!actual, `Expected falsy, got ${actual}`),
		toBeTruthy: () => assert.ok(Boolean(actual), `Expected truthy, got ${actual}`),
		toHaveBeenCalled: () => {
			// biome-ignore lint/suspicious/noExplicitAny: spy assertion
			(actual as any)?.toHaveBeenCalled?.();
		},
		toHaveBeenCalledWith: (...args: unknown[]) => {
			// biome-ignore lint/suspicious/noExplicitAny: spy assertion
			(actual as any)?.toHaveBeenCalledWith?.(...args);
		},
	};
}
import { EgiszCdaExportModal } from "../EgiszCdaExportModal";

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
	click: () => void;
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
			click: () => {
				el.dispatchEvent({ type: "click" });
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
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		print: vi.fn(),
		dispatchEvent: (ev: { type: string; detail?: { text: string; type?: string; duration?: number } }) => {
			if (ev?.type === "dente-toast" && ev.detail) {
				showToastCalls.push([ev.detail.text, ev.detail.type]);
			}
			return true;
		},
		URL: {
			createObjectURL: vi.fn().mockReturnValue("blob:mock-zip-package"),
			revokeObjectURL: vi.fn(),
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
	g.URL = win.URL;
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

async function triggerClick(node: MockDomNode) {
	let curr: MockDomNode | null = node;
	while (curr) {
		const reactPropKey = Object.keys(curr).find((k) => k.startsWith("__reactProps$"));
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (curr as any)[reactPropKey];
			if (props && typeof props.onClick === "function") {
				return props.onClick({
					type: "click",
					preventDefault: () => {},
					stopPropagation: () => {},
				});
			}
		}
		curr = curr.parentNode;
	}
	node.dispatchEvent({ type: "click" });
}

describe("EGISZ CDA Export Autonomy & Active Validation Guidance (Mandates 8e, 8n)", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		vi.clearAllMocks();
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		// biome-ignore lint/suspicious/noExplicitAny: container mock
		root = createRoot(container as any);

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ status: "accepted" }),
		}) as unknown as typeof fetch;
	});

	it("1. Export button is NOT disabled when generationResult.success is false (Mandate 8e: Doctor Autonomy)", async () => {
		// Pass invalid parameters (missing names, invalid OID) so generationResult.success is false
		await act(async () => {
			root.render(
				<EgiszCdaExportModal
					isOpen={true}
					onClose={() => {}}
					patient={{
						patientId: "PAT-INVALID-01",
						name: { first: "", last: "" },
						snils: "000-000-000 00",
					}}
					doctor={{
						name: { first: "", last: "" },
						snils: "000-000-000 00",
					}}
					clinic={{
						oid: "invalid.oid",
						name: "",
					}}
				/>,
			);
		});

		// biome-ignore lint/suspicious/noExplicitAny: access document.body
		const body = (globalThis as any).document.body as MockDomNode;
		const exportBtn = findNodeByTestId(body, "egisz-1click-export-btn");

		expect(exportBtn).not.toBeNull();
		// Assert not disabled (Mandate 8e: Doctor Autonomy - no dead disabled buttons)
		expect(exportBtn?.disabled).toBe(false);
		expect(exportBtn?.getAttribute("disabled")).toBeNull();
	});

	it("2. Clicking export button when !generationResult.success displays active guidance toast without crashing (Mandate 8e)", async () => {
		// Pass invalid parameters to trigger validation failure
		await act(async () => {
			root.render(
				<EgiszCdaExportModal
					isOpen={true}
					onClose={() => {}}
					patient={{
						patientId: "PAT-INVALID-02",
						name: { first: "", last: "" },
						snils: "000-000-000 00",
					}}
					doctor={{
						name: { first: "", last: "" },
						snils: "000-000-000 00",
					}}
					clinic={{
						oid: "invalid.oid",
						name: "",
					}}
				/>,
			);
		});

		// biome-ignore lint/suspicious/noExplicitAny: access document.body
		const body = (globalThis as any).document.body as MockDomNode;
		const exportBtn = findNodeByTestId(body, "egisz-1click-export-btn");
		expect(exportBtn).not.toBeNull();

		// Click the export button inside act
		await act(async () => {
			await triggerClick(exportBtn!);
		});

		// Expect active guidance toast with explanation
		expect(showToast).toHaveBeenCalled();
		const toastCall = vi.mocked(showToast).mock.calls[0];
		expect(toastCall).toBeDefined();
		expect(typeof toastCall?.[0]).toBe("string");
		expect(toastCall?.[1]).toBe("warning");
	});

	it("3. Export button is disabled ONLY when isSubmitting is true", async () => {
		let resolveSubmission!: (val: unknown) => void;
		globalThis.fetch = vi.fn().mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveSubmission = resolve;
				}),
		) as unknown as typeof fetch;

		await act(async () => {
			root.render(
				<EgiszCdaExportModal
					isOpen={true}
					onClose={() => {}}
				/>,
			);
		});

		// biome-ignore lint/suspicious/noExplicitAny: access document.body
		const body = (globalThis as any).document.body as MockDomNode;
		const exportBtn = findNodeByTestId(body, "egisz-1click-export-btn");
		expect(exportBtn).not.toBeNull();

		// Initially not submitting -> disabled === false
		expect(exportBtn?.disabled).toBe(false);

		// Trigger export
		let clickPromise: Promise<void> | void;
		await act(async () => {
			clickPromise = triggerClick(exportBtn!);
		});

		// While submission is in progress -> disabled === true
		expect(exportBtn?.disabled).toBe(true);
		expect(exportBtn?.getAttribute("disabled")).not.toBeNull();

		// Resolve fetch submission
		await act(async () => {
			resolveSubmission({ ok: true, status: 200, json: async () => ({}) });
			await clickPromise;
		});

		// After submission completes -> disabled === false
		expect(exportBtn?.disabled).toBe(false);
	});

	it("4. Touch targets for export and action buttons meet the >= 44px threshold (Apple HIG)", async () => {
		await act(async () => {
			root.render(
				<EgiszCdaExportModal
					isOpen={true}
					onClose={() => {}}
					initialTab="signature"
				/>,
			);
		});

		// biome-ignore lint/suspicious/noExplicitAny: access document.body
		const body = (globalThis as any).document.body as MockDomNode;

		// 1. Export button in footer
		const exportBtn = findNodeByTestId(body, "egisz-1click-export-btn");
		expect(exportBtn).not.toBeNull();
		const exportMinHeight = Number.parseInt(exportBtn?.style?.minHeight || "0", 10);
		expect(exportMinHeight).toBeGreaterThanOrEqual(44);

		// 2. Print draft button in footer
		const printBtn = findNodeByTestId(body, "egisz-print-draft-btn");
		expect(printBtn).not.toBeNull();
		const printMinHeight = Number.parseInt(printBtn?.style?.minHeight || "0", 10);
		expect(printMinHeight).toBeGreaterThanOrEqual(44);

		// 3. Close button in footer
		const closeFooterBtn = findNodeByTestId(body, "egisz-close-footer-btn");
		expect(closeFooterBtn).not.toBeNull();
		const closeMinHeight = Number.parseInt(closeFooterBtn?.style?.minHeight || "0", 10);
		expect(closeMinHeight).toBeGreaterThanOrEqual(44);

		// 4. Header close button
		const closeHeaderBtn = findNodeByTestId(body, "egisz-close-header-btn");
		expect(closeHeaderBtn).not.toBeNull();
		const closeHeaderMinHeight = Number.parseInt(closeHeaderBtn?.style?.minHeight || "0", 10);
		expect(closeHeaderMinHeight).toBeGreaterThanOrEqual(44);

		// 5. Navigation Tabs
		const tabs = [
			"egisz-tab-diagnostics",
			"egisz-tab-clinical",
			"egisz-tab-signature",
			"egisz-tab-xml",
		];
		for (const tabId of tabs) {
			const tab = findNodeByTestId(body, tabId);
			expect(tab).not.toBeNull();
			const tabMinHeight = Number.parseInt(tab?.style?.minHeight || "0", 10);
			expect(tabMinHeight).toBeGreaterThanOrEqual(44);
		}

		// 6. Form Type Switcher cards
		const kind043u = findNodeByTestId(body, "egisz-kind-043u");
		expect(kind043u).not.toBeNull();
		expect(Number.parseInt(kind043u?.style?.minHeight || "0", 10)).toBeGreaterThanOrEqual(44);

		const kind043_1u = findNodeByTestId(body, "egisz-kind-043_1u");
		expect(kind043_1u).not.toBeNull();
		expect(Number.parseInt(kind043_1u?.style?.minHeight || "0", 10)).toBeGreaterThanOrEqual(44);

		// 7. Signature action cards and action buttons
		const doctorSignCard = findNodeByTestId(body, "egisz-sign-card-doctor");
		expect(doctorSignCard).not.toBeNull();
		expect(Number.parseInt(doctorSignCard?.style?.minHeight || "0", 10)).toBeGreaterThanOrEqual(44);

		const clinicSignCard = findNodeByTestId(body, "egisz-sign-card-clinic");
		expect(clinicSignCard).not.toBeNull();
		expect(Number.parseInt(clinicSignCard?.style?.minHeight || "0", 10)).toBeGreaterThanOrEqual(44);

		const signDemoBtn = findNodeByTestId(body, "egisz-sign-doctor-demo-btn");
		if (signDemoBtn) {
			expect(Number.parseInt(signDemoBtn?.style?.minHeight || "0", 10)).toBeGreaterThanOrEqual(44);
		}

		const clinicSignBtn = findNodeByTestId(body, "egisz-sign-clinic-btn");
		expect(clinicSignBtn).not.toBeNull();
		expect(Number.parseInt(clinicSignBtn?.style?.minHeight || "0", 10)).toBeGreaterThanOrEqual(44);
	});
});
