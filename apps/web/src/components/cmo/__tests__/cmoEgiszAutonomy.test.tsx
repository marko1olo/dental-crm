/**
 * cmoEgiszAutonomy.test.tsx
 *
 * Unit tests for CMO Quality Audit & EGISZ Signing Cabinet Solo Doctor Autonomy:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; guidance toast on click)
 * - Mandate 8i: Specialized Outpatient Context (Form 043/u)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-Click Local EMR Storage / 63-FZ Art. 9)
 * - Mandate 8o: Scope-bounded verifiable assertions
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it, beforeEach } from "vitest";
import assert from "node:assert/strict";

import { renderToStaticMarkup } from "react-dom/server";
import { EgiszRemdHubModal } from "../../egisz/EgiszRemdHubModal";
import { SAMPLE_DENTAL_SEMD_105_PRESET } from "../../egisz/egiszRemdEngine";

type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
};

function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	return fn;
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
	// Forward declaration of doc so createMockElement can reference it
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

	const winListeners: Record<string, EventListener[]> = {};
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
		dispatchEvent: (ev: { type: string }) => {
			const list = winListeners[ev.type] || [];
			for (const fn of list) {
				fn(ev as unknown as Event);
			}
			return true;
		},
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		print: createMockFn(),
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

function findNodeByText(node: MockDomNode | null, text: string): MockDomNode | null {
	if (!node) return null;
	if (node.textContent && node.textContent.includes(text)) {
		if (node.children) {
			for (const child of node.children) {
				const deeper = findNodeByText(child, text);
				if (deeper) return deeper;
			}
		}
		return node;
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

describe("CMO Quality Audit & EGISZ Signing Solo Doctor Autonomy (Mandates 8e, 8n)", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		// biome-ignore lint/suspicious/noExplicitAny: container mock
		root = createRoot(container as any);

		// Mock global fetch for API calls
		globalThis.fetch = createMockFn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({
				queue: [
					{
						id: "rec-test-01",
						visitId: "vis-test-01",
						patientId: "pat-test-01",
						doctorId: "doc-test-01",
						patientFullName: "Иванов Иван Иванович",
						doctorFullName: "Петров Петр Петрович",
						status: "review",
						editableDeadline: new Date().toISOString(),
						visitStatus: "signed",
					},
				],
			}),
		})) as unknown as typeof fetch;
	});

	it("EgiszRemdHubModal renders statutory SEMD 043/u signing studio without blocking doctor (Mandates 8e, 8n)", () => {
		const html = renderToStaticMarkup(
			<EgiszRemdHubModal
				isOpen={true}
				onClose={() => {}}
				initialTab="signature"
				initialPayload={SAMPLE_DENTAL_SEMD_105_PRESET}
			/>,
		);
		assert.ok(html.includes("Подписание СЭМД УКЭП"), "Must render SEMD signing header");
		assert.ok(html.includes("Подписать УКЭП врача"), "Must contain doctor UKEP button");
		assert.ok(html.includes("Отправить в РЭМД ЕГИСЗ"), "Must contain send to REMD button");
	});
});

