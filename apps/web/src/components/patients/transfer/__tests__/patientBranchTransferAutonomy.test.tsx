/**
 * patientBranchTransferAutonomy.test.tsx
 *
 * Unit tests for Patient Branch Transfer Doctor & Staff Autonomy:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; guidance toast on click)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 * - Mandate 8o: Scope-bounded verifiable assertions
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { PatientBranchTransferModal } from "../PatientBranchTransferModal";

const dispatchedToasts: { text: string; type: string }[] = [];

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
		print: () => {},
		dispatchEvent: (ev: { type: string; detail?: { text: string; type: string } }) => {
			if (ev?.type === "dente-toast" && ev.detail) {
				dispatchedToasts.push(ev.detail);
			}
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

describe("Patient Branch Transfer Autonomy & Non-blocking Feedback (Mandates 8e, 8n)", () => {
	let container: MockDomNode;
	let root: Root;
	let doc: any;

	beforeEach(() => {
		dispatchedToasts.length = 0;
		const dom = setupMockDom();
		doc = dom.doc;
		container = doc.createElement("div");
		doc.body.appendChild(container);
		// biome-ignore lint/suspicious/noExplicitAny: container mock
		root = createRoot(container as any);
	});

	it("1. execute-branch-transfer-btn is NOT disabled when source and target branches are identical, and clicking triggers warning toast (Mandate 8e)", async () => {
		await act(async () => {
			root.render(
				<PatientBranchTransferModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-test-01"
					patientFullName="Иванова Анна Сергеевна"
					patientBirthDate="1990-05-14"
					initialSourceBranchId="branch_center"
					initialTargetBranchId="branch_center"
				/>,
			);
		});

		// Modal renders via createPortal into document.body
		const body = doc.body as MockDomNode;
		const executeBtn = findNodeByTestId(body, "execute-branch-transfer-btn");

		assert.ok(executeBtn, "executeBtn must exist");
		// MANDATE 8e: Never disabled by !validation.isValid
		assert.equal(Boolean(executeBtn?.disabled), false);
		assert.equal(executeBtn?.getAttribute("disabled"), null);

		// Clicking should NOT silently fail; it must show an explanatory warning toast
		await clickNode(executeBtn!);

		const found = dispatchedToasts.some(
			(t) =>
				t.text.includes("Филиал-отправитель и филиал-получатель не могут совпадать") &&
				t.type === "warning",
		);
		assert.ok(
			found,
			`Expected warning toast, but got: ${JSON.stringify(dispatchedToasts)}`,
		);
	});

	it("2. execute-branch-transfer-btn is NOT disabled when patientId is missing, and clicking triggers warning toast (Mandate 8e)", async () => {
		await act(async () => {
			root.render(
				<PatientBranchTransferModal
					isOpen={true}
					onClose={() => {}}
					patientId=""
					patientFullName="Пациент Без ИД"
					initialSourceBranchId="branch_center"
					initialTargetBranchId="branch_north"
				/>,
			);
		});

		const body = doc.body as MockDomNode;
		const executeBtn = findNodeByTestId(body, "execute-branch-transfer-btn");

		assert.ok(executeBtn, "executeBtn must exist");
		assert.equal(Boolean(executeBtn?.disabled), false);
		assert.equal(executeBtn?.getAttribute("disabled"), null);

		await clickNode(executeBtn!);

		const found = dispatchedToasts.some(
			(t) =>
				t.text.includes("Не выбран пациент для межфилиального трансфера") &&
				t.type === "warning",
		);
		assert.ok(
			found,
			`Expected warning toast, but got: ${JSON.stringify(dispatchedToasts)}`,
		);
	});

	it("3. execute-branch-transfer-btn has touch target >= 44px (min-h-[44px])", async () => {
		await act(async () => {
			root.render(
				<PatientBranchTransferModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-test-01"
					patientFullName="Иванова Анна Сергеевна"
				/>,
			);
		});

		const body = doc.body as MockDomNode;
		const executeBtn = findNodeByTestId(body, "execute-branch-transfer-btn");

		assert.ok(executeBtn, "executeBtn must exist");
		assert.ok(executeBtn?.className.includes("min-h-[44px]"));
	});
});
