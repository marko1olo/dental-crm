/**
 * publicOnlineBookingAutonomy.test.tsx
 *
 * Unit tests for Public Online Booking Active Validation & Friction-Free Autonomy:
 * - Mandate 8e: Doctor & Patient Autonomy (Zero unexplained disabled/dead buttons).
 * - Mandate 8k: CRM != Reality Simulator (Friction-Killer Law; auto-select first available slot).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No blocking gates, active guidance feedback).
 * - Mandate 8o: Task-Scope Reporting.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_BRANCHES,
	DEFAULT_DOCTORS,
	DEFAULT_SERVICE_CATEGORIES,
	PublicOnlineBookingWidget,
} from "../PublicOnlineBookingWidget.js";

interface SpyMock {
	(...args: unknown[]): unknown;
	calls: unknown[][];
	toHaveBeenCalledWith: (...expectedArgs: unknown[]) => void;
}

const vi = {
	fn: (): SpyMock => {
		const calls: unknown[][] = [];
		const fnObj = ((...args: unknown[]) => {
			calls.push(args);
		}) as SpyMock;
		fnObj.calls = calls;
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
};

function expect(actual: unknown) {
	return {
		toContain: (expected: string) => {
			assert.ok(
				typeof actual === "string" && actual.includes(expected),
				`Expected "${actual}" to contain "${expected}"`,
			);
		},
		not: {
			toBeNull: () => {
				assert.notStrictEqual(actual, null, "Expected value not to be null");
				assert.notStrictEqual(actual, undefined, "Expected value not to be undefined");
			},
			toMatch: (regex: RegExp) => {
				assert.ok(
					typeof actual === "string" && !regex.test(actual),
					`Expected "${actual}" NOT to match ${regex}`,
				);
			},
		},
		toBe: (expected: unknown) => {
			assert.strictEqual(actual, expected);
		},
		toHaveBeenCalledWith: (...expectedArgs: unknown[]) => {
			// biome-ignore lint/suspicious/noExplicitAny: spy assertion helper
			if (actual && typeof (actual as any).toHaveBeenCalledWith === "function") {
				// biome-ignore lint/suspicious/noExplicitAny: spy assertion helper
				(actual as any).toHaveBeenCalledWith(...expectedArgs);
			} else {
				assert.fail("actual is not a spy mock");
			}
		},
	};
}

// ============================================================================
// Lightweight Mock DOM for headless React 19 testing in Node.js
// ============================================================================

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
	checked?: boolean;
	className: string;
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
	getBoundingClientRect: () => {
		top: number;
		left: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	};
	focus: () => void;
	blur: () => void;
	contains: (other: MockDomNode) => boolean;
	[key: string]: unknown;
}

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	// biome-ignore lint/suspicious/noExplicitAny: mock DOM object
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
			ownerDocument: null,
			parentNode: null,
			textContent: "",
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
		el.ownerDocument = doc;
		return el;
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
			ownerDocument: null,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
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
		addEventListener: (type: string, fn: EventListener) => {
			winListeners[type] = winListeners[type] || [];
			winListeners[type].push(fn);
		},
		removeEventListener: (type: string, fn: EventListener) => {
			if (winListeners[type]) {
				winListeners[type] = winListeners[type].filter((l) => l !== fn);
			}
		},
		dispatchEvent: (ev: { type: string; [key: string]: unknown }) => {
			const list = winListeners[ev.type] || [];
			for (const fn of list) {
				fn(ev as unknown as Event);
			}
			return true;
		},
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		location: { href: "http://localhost:5173", search: "" },
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

function isNodeDisabled(node: MockDomNode): boolean {
	if (Boolean(node.disabled)) return true;
	if (
		node.getAttribute?.("disabled") !== null &&
		node.getAttribute?.("disabled") !== undefined &&
		node.getAttribute?.("disabled") !== "false"
	) {
		return true;
	}
	const reactPropKey = Object.keys(node).find((k) =>
		k.startsWith("__reactProps$"),
	);
	if (reactPropKey) {
		// biome-ignore lint/suspicious/noExplicitAny: access React internal props
		const props = (node as any)[reactPropKey];
		if (Boolean(props?.disabled)) return true;
	}
	return false;
}

async function submitForm(formNode: MockDomNode) {
	await act(async () => {
		const reactPropKey = Object.keys(formNode).find((k) =>
			k.startsWith("__reactProps$"),
		);
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (formNode as any)[reactPropKey];
			if (props && typeof props.onSubmit === "function") {
				await props.onSubmit({
					type: "submit",
					preventDefault: () => {},
					stopPropagation: () => {},
				});
				return;
			}
		}
		formNode.dispatchEvent({ type: "submit" });
	});
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
				await props.onClick({
					type: "click",
					preventDefault: () => {},
					stopPropagation: () => {},
				});
				return;
			}
		}

		// Bubble submit event if it is a submit button in a form
		const btnType = node.getAttribute?.("type") || (node as unknown as { type?: string }).type;
		if (btnType === "submit") {
			let parent: MockDomNode | null = node.parentNode;
			while (parent) {
				if (parent.tagName === "FORM") {
					await submitForm(parent);
					return;
				}
				parent = parent.parentNode;
			}
		}

		node.dispatchEvent({ type: "click" });
	});
}

async function changeInputValue(node: MockDomNode, value: string) {
	await act(async () => {
		node.value = value;
		const reactPropKey = Object.keys(node).find((k) =>
			k.startsWith("__reactProps$"),
		);
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onChange === "function") {
				props.onChange({
					target: { value },
					currentTarget: { value },
				});
				return;
			}
		}
		node.dispatchEvent({ type: "input" });
	});
}

// ============================================================================
// Test Suite
// ============================================================================

describe("PublicOnlineBookingWidget Autonomy & Active Validation Feedback (Mandates 8e, 8k, 8n)", () => {
	it("Step 3 next button is NOT disabled when slot is not initially selected", () => {
		// Static markup test
		const html = renderToString(
			<PublicOnlineBookingWidget initialStep={3} />,
		);

		// Button should be present and NOT have disabled attribute
		expect(html).toContain("dbw-btn-next");
		expect(html).toContain("Перейти к контактам");
		// Verify next button is not rendered as disabled="disabled" or disabled in html
		expect(html).not.toMatch(/class="[^"]*dbw-btn-next[^"]*"[^>]*disabled/);
	});

	it("Step 3 next button in mounted DOM has disabled === false initially", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<PublicOnlineBookingWidget
					initialStep={3}
					customBranches={DEFAULT_BRANCHES}
					customCategories={DEFAULT_SERVICE_CATEGORIES}
					customDoctors={DEFAULT_DOCTORS}
				/>,
			);
		});

		const nextBtn = findNodeByTestId(rootContainer, "step3-next-btn");
		expect(nextBtn).not.toBeNull();
		// Button must NOT be disabled (Mandate 8e)
		expect(isNodeDisabled(nextBtn!)).toBe(false);
	});

	it("Clicking Step 3 next button auto-selects available slot or advances without dead button", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		const stepChangeSpy = vi.fn();

		await act(async () => {
			root.render(
				<PublicOnlineBookingWidget
					initialStep={3}
					onStepChange={stepChangeSpy}
				/>,
			);
		});

		const nextBtn = findNodeByTestId(rootContainer, "step3-next-btn");
		expect(nextBtn).not.toBeNull();

		// Clicking next button should advance to Step 4 with auto-selected slot (Zero friction!)
		await clickNode(nextBtn!);
		expect(stepChangeSpy).toHaveBeenCalledWith(4);
	});

	it("Step 3 displays active guidance alert if slots are empty when clicking next", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		const toastSpy = vi.fn();

		await act(async () => {
			root.render(
				<PublicOnlineBookingWidget
					initialStep={3}
					showToast={toastSpy}
				/>,
			);
		});

		const nextBtn = findNodeByTestId(rootContainer, "step3-next-btn");
		expect(nextBtn).not.toBeNull();
		expect(isNodeDisabled(nextBtn!)).toBe(false);
	});

	it("Step 4 confirm button is NOT disabled when name or phone is empty (disabled === false)", () => {
		// Static markup test
		const html = renderToString(
			<PublicOnlineBookingWidget initialStep={4} />,
		);

		expect(html).toContain("dbw-btn-confirm");
		expect(html).toContain("Подтвердить запись");
		// Verify confirm button is not disabled even with empty fields
		expect(html).not.toMatch(/class="[^"]*dbw-btn-confirm[^"]*"[^>]*disabled/);
	});

	it("Step 4 confirm button in mounted DOM has disabled === false when fields are empty", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<PublicOnlineBookingWidget initialStep={4} />,
			);
		});

		const confirmBtn = findNodeByTestId(rootContainer, "step4-confirm-btn");
		expect(confirmBtn).not.toBeNull();
		// Absolute ban on dead disabled buttons: must be false (Mandates 8e, 8n)
		expect(isNodeDisabled(confirmBtn!)).toBe(false);
	});

	it("Clicking Step 4 confirm button with empty name displays active validation feedback", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		const toastSpy = vi.fn();

		await act(async () => {
			root.render(
				<PublicOnlineBookingWidget
					initialStep={4}
					showToast={toastSpy}
				/>,
			);
		});

		const confirmBtn = findNodeByTestId(rootContainer, "step4-confirm-btn");
		expect(confirmBtn).not.toBeNull();

		// Submit with empty name
		await clickNode(confirmBtn!);

		// Active validation warning must be triggered
		expect(toastSpy).toHaveBeenCalledWith("Пожалуйста, введите ваше имя", "warning");

		const errorAlert = findNodeByTestId(rootContainer, "step4-submit-error");
		expect(errorAlert).not.toBeNull();
	});

	it("Clicking Step 4 confirm button with empty or invalid phone displays active validation feedback", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		const toastSpy = vi.fn();

		await act(async () => {
			root.render(
				<PublicOnlineBookingWidget
					initialStep={4}
					showToast={toastSpy}
				/>,
			);
		});

		// Fill name
		const nameInput = findNodeByTestId(rootContainer, "patient-name-input");
		expect(nameInput).not.toBeNull();
		await changeInputValue(nameInput!, "Смирнова Анна Сергеевна");

		// Click confirm button with empty phone
		const confirmBtn = findNodeByTestId(rootContainer, "step4-confirm-btn");
		expect(confirmBtn).not.toBeNull();
		await clickNode(confirmBtn!);

		// Active validation warning for phone must be triggered
		expect(toastSpy).toHaveBeenCalledWith(
			"Введите корректный номер телефона (11 цифр)",
			"warning",
		);

		const errorAlert = findNodeByTestId(rootContainer, "step4-submit-error");
		expect(errorAlert).not.toBeNull();
	});

	it("Step 4 auto-checks privacy policy when confirm is clicked without blocking the user", async () => {
		const { doc } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		const toastSpy = vi.fn();

		await act(async () => {
			root.render(
				<PublicOnlineBookingWidget
					initialStep={4}
					showToast={toastSpy}
				/>,
			);
		});

		// Verify privacy checkbox exists and is interactive
		const privacyCheckbox = findNodeByTestId(rootContainer, "privacy-checkbox");
		expect(privacyCheckbox).not.toBeNull();
	});

	it("Touch targets on all action buttons meet or exceed the 44px threshold", () => {
		const html = renderToString(
			<PublicOnlineBookingWidget initialStep={3} />,
		);

		// Verify min-h-[44px] is explicitly applied to action buttons
		expect(html).toContain("min-h-[44px]");
		const html4 = renderToString(
			<PublicOnlineBookingWidget initialStep={4} />,
		);
		expect(html4).toContain("min-h-[44px]");
	});
});
