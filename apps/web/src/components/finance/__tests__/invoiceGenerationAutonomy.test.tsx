/**
 * invoiceGenerationAutonomy.test.tsx
 *
 * Unit tests for Invoice Generation Autonomy & Zero Blocking Barriers (Mandates 8e, 8k, 8n, 8aq):
 * 1. 1-Click Doctor Clinical Decision button renders in Footer without any admin PIN drawer blocker.
 * 2. 1-Click Doctor Clinical Decision button authorizes price agreement under Doctor Autonomy (Mandate 8e).
 * 3. Create invoice CTA button is NOT permanently disabled by missing secondary manager approvals.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { InvoiceGenerationModal } from "../InvoiceGenerationModal";

let toastEvents: { text: string; type: string; duration?: number }[] = [];

function clearToastEvents() {
	toastEvents = [];
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
	// biome-ignore lint/suspicious/noExplicitAny: forward declaration
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
			selected: false,
			defaultSelected: false,
			value: "",
			get length() {
				return children.length;
			},
			get options() {
				return children;
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
					el.disabled = true;
				}
				if (name === "value") {
					el.value = value;
				}
			},
			getAttribute: (name: string) => attrs[name] || null,
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

	const win = {
		document: doc,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: (ev: any) => {
			if (ev?.type === "dente-toast" && ev?.detail) {
				toastEvents.push(ev.detail);
			}
			return true;
		},
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		HTMLIFrameElement: MockHTMLIFrameElement,
		HTMLElement: class {},
		Element: class {},
		Node: class {},
	};
	doc.defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
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

const mockPlanItems: TreatmentPlanItem[] = [
	{
		id: "plan-item-1",
		code804n: "B01.065.001",
		name: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "therapy",
		priceRub: 2500,
		unitPriceRub: 2500,
		discountRub: 0,
		quantity: 1,
		phase: 1,
		stageKind: "stage_1_therapy",
	},
];

const mockAppContext = {
	dashboard: {
		serviceCatalog: [
			{
				id: "srv-1",
				code: "B01.065.001",
				title: "Прием (осмотр, консультация) врача-стоматолога первичный",
				category: "therapy",
				priceRub: 2500,
				isActive: true,
			},
		],
		patients: [{ id: "PAT-001", fullName: "Иванов И.И." }],
		documents: [],
	},
	auth: {
		currentUser: { name: "Д-р Смирнов А. В." },
	},
} as unknown as AppLogicContextType;

describe("InvoiceGenerationModal Autonomy & Doctor Autonomy (Mandates 8e, 8k, 8n, 8aq)", () => {
	beforeEach(() => {
		clearToastEvents();
		// biome-ignore lint/suspicious/noExplicitAny: mock fetch
		(globalThis as any).fetch = async () => ({
			ok: true,
			status: 200,
			json: async () => [],
		});
	});

	it("renders static markup with 1-click doctor clinical decision button in footer without admin PIN drawer barrier", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<InvoiceGenerationModal
					isOpen={true}
					onClose={() => {}}
					patientId="PAT-001"
					doctorFullName="Д-р Смирнов А. В."
					planItems={mockPlanItems}
				/>
			</AppLogicProvider>,
		);

		// Verify 1-click doctor clinical decision button in footer
		assert.ok(html.includes('data-testid="doctor-override-footer-btn"'));
		assert.ok(html.includes("Согласовать врачом"));

		// Verify orphan admin-pin-drawer is completely gone (Mandates 8e, 8aq)
		assert.ok(!html.includes('data-testid="admin-pin-drawer"'));
		assert.ok(!html.includes('data-testid="admin-pin-verify-btn"'));
	});

	it("1-click doctor clinical decision button renders and successfully authorizes override without requiring manager PIN", async () => {
		const { doc } = setupMockDom();
		clearToastEvents();
		let root: Root | null = null;
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		await act(async () => {
			root = createRoot(container as unknown as HTMLElement);
			root.render(
				<AppLogicProvider value={mockAppContext}>
					<InvoiceGenerationModal
						isOpen={true}
						onClose={() => {}}
						patientId="PAT-001"
						doctorFullName="Д-р Смирнов А. В."
						planItems={mockPlanItems}
					/>
				</AppLogicProvider>,
			);
		});

		// 1. Verify 1-click doctor decision button is present in footer
		const doctorBtn = findNodeByTestId(
			doc.body,
			"doctor-override-footer-btn",
		);
		assert.ok(doctorBtn !== null, "doctor-override-footer-btn must be present in footer");

		// 2. Click 1-click doctor clinical override
		await clickNode(doctorBtn!);

		// 3. Verify success toast is triggered under Mandate 8e
		const doctorToast = toastEvents[0];
		assert.ok(doctorToast, "Expected toast after doctor clinical decision click");
		assert.ok(
			String(doctorToast.text).includes(
				"Цены согласованы лечащим врачом",
			),
		);
		assert.equal(doctorToast.type, "success");

		// 4. Verify admin override authorized badge is rendered
		const authorizedBadge = findNodeByTestId(
			doc.body,
			"override-authorized-badge",
		);
		assert.ok(authorizedBadge !== null, "override-authorized-badge must be present");

		// 5. Verify no admin-pin-drawer exists in the DOM
		const pinDrawer = findNodeByTestId(doc.body, "admin-pin-drawer");
		assert.equal(pinDrawer, null, "admin-pin-drawer must not exist");

		await act(async () => {
			root?.unmount();
		});
	});

	it("guarantees create invoice CTA button is NOT blocked or disabled when idle", async () => {
		const { doc } = setupMockDom();
		let root: Root | null = null;
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		await act(async () => {
			root = createRoot(container as unknown as HTMLElement);
			root.render(
				<AppLogicProvider value={mockAppContext}>
					<InvoiceGenerationModal
						isOpen={true}
						onClose={() => {}}
						patientId="PAT-001"
						doctorFullName="Д-р Смирнов А. В."
						planItems={mockPlanItems}
					/>
				</AppLogicProvider>,
			);
		});

		// Find the submit button via testid
		const submitBtn = findNodeByTestId(doc.body, "create-invoice-submit-btn");
		assert.ok(submitBtn !== null, "Submit button with testid must exist");
		assert.equal(isNodeDisabled(submitBtn), false, "Submit button must NOT be disabled");

		await act(async () => {
			root?.unmount();
		});
	});
});
