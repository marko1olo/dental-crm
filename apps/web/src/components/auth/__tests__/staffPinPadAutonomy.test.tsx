import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffPinPad } from "../StaffPinPad";
import { resolveStaffUnlockListState, resolveStaffUnlockPhase } from "../staffUnlockState";

const CARTOON_EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

interface DomNodeStub {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	children: DomNodeStub[];
	childNodes: DomNodeStub[];
	attrs: Record<string, string>;
	listeners: Record<string, Array<(evt: unknown) => void>>;
	ownerDocument: unknown;
	parentNode: DomNodeStub | null;
	textContent: string;
	nodeValue?: string;
	data?: string;
	className?: string;
	disabled?: boolean;
	appendChild: (c: DomNodeStub) => DomNodeStub;
	insertBefore: (c: DomNodeStub, b: DomNodeStub | null) => DomNodeStub;
	removeChild: (c: DomNodeStub) => DomNodeStub;
	addEventListener: (type: string, fn: (evt: unknown) => void) => void;
	removeEventListener: (type: string, fn: (evt: unknown) => void) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	hasAttribute: (name: string) => boolean;
	removeAttribute: (name: string) => void;
	dispatchEvent: (evt: unknown) => boolean;
	getBoundingClientRect: () => { top: number; left: number; right: number; bottom: number; width: number; height: number };
	focus: () => void;
	blur: () => void;
	contains: (other?: unknown) => boolean;
}

function findNodes(root: DomNodeStub, predicate: (node: DomNodeStub) => boolean): DomNodeStub[] {
	const out: DomNodeStub[] = [];
	const walk = (n: DomNodeStub) => {
		if (n.nodeType === 1 && predicate(n)) out.push(n);
		for (const c of n.children) walk(c);
	};
	walk(root);
	return out;
}

describe("Staff PIN Pad Autonomy & Solo Doctor Sovereignty (Live 6G SUT)", () => {
	const singleStaffList = [
		{
			id: "doc-solo-1",
			fullName: "Доктор Айболит",
			role: "Врач-стоматолог",
			active: true,
		},
	];

	const multiStaffList = [
		{
			id: "doc-1",
			fullName: "Иванов Иван Иванович",
			role: "Терапевт",
			active: true,
		},
		{
			id: "doc-2",
			fullName: "Петров Петр Петрович",
			role: "Хирург",
			active: true,
		},
	];

	it("1. renders markup with all numpad digits (0-9, Сброс, Backspace) not disabled (Mandate 8e)", () => {
		const html = renderToStaticMarkup(
			<StaffPinPad
				staffMembers={multiStaffList}
				staffListLoading={false}
				staffListStatus={200}
				onUnlockSuccess={() => {}}
				onClinicLogout={() => {}}
				onRetryStaffList={() => {}}
			/>,
		);

		assert.ok(html.includes("auth-pin-btn"));
		assert.ok(html.includes("Сброс"));
		assert.equal(CARTOON_EMOJI_RE.test(html), false);

		const disabledPinButtons = html.match(/<button[^>]*class="[^"]*auth-pin-btn[^"]*"[^>]*disabled/g);
		assert.equal(disabledPinButtons, null);
	});

	it("2. renders doctor card in staff list and resolves solo doctor phase cleanly (Mandate 8n)", () => {
		const html = renderToStaticMarkup(
			<StaffPinPad
				staffMembers={singleStaffList}
				staffListLoading={false}
				staffListStatus={200}
				onUnlockSuccess={() => {}}
				onClinicLogout={() => {}}
				onRetryStaffList={() => {}}
			/>,
		);

		assert.ok(html.includes("Доктор Айболит"));
		assert.ok(html.includes("auth-staff-card"));
		const state = resolveStaffUnlockListState(singleStaffList);
		assert.equal(state.phase, "ready");
		assert.equal(state.activeStaff.length, 1);
		assert.equal(resolveStaffUnlockPhase({ isLoading: false, list: state }), "ready");
	});

	it("3. clicking PIN digit without selected multi-staff member triggers toast guidance and keeps buttons unlocked", async () => {
		const prevGlobals = {
			window: (globalThis as { window?: unknown }).window,
			document: (globalThis as { document?: unknown }).document,
			fetch: (globalThis as { fetch?: unknown }).fetch,
			CustomEvent: (globalThis as { CustomEvent?: unknown }).CustomEvent,
			HTMLElement: (globalThis as { HTMLElement?: unknown }).HTMLElement,
			Element: (globalThis as { Element?: unknown }).Element,
			Node: (globalThis as { Node?: unknown }).Node,
			HTMLIFrameElement: (globalThis as { HTMLIFrameElement?: unknown }).HTMLIFrameElement,
			IS_REACT_ACT_ENVIRONMENT: (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT,
		};

		class FakeIFrame {}
		class FakeEl {}
		class FakeHtmlEl {}
		class FakeNode {}
		class FakeCustomEvent {
			type: string;
			detail: unknown;
			constructor(type: string, init?: { detail?: unknown }) {
				this.type = type;
				this.detail = init?.detail;
			}
		}

		const toasts: Array<{ text?: string; type?: string }> = [];
		const doc: Record<string, unknown> = {
			nodeType: 9,
			activeElement: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
			createTextNode: (text: string): DomNodeStub => ({
				nodeType: 3,
				tagName: "#text",
				nodeName: "#text",
				style: {},
				dataset: {},
				children: [],
				childNodes: [],
				attrs: {},
				listeners: {},
				ownerDocument: doc,
				parentNode: null,
				textContent: String(text ?? ""),
				nodeValue: String(text ?? ""),
				data: String(text ?? ""),
				appendChild: (c) => c,
				insertBefore: (c) => c,
				removeChild: (c) => c,
				addEventListener: () => {},
				removeEventListener: () => {},
				setAttribute: () => {},
				getAttribute: () => null,
				hasAttribute: () => false,
				removeAttribute: () => {},
				dispatchEvent: () => true,
				getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
				focus: () => {},
				blur: () => {},
				contains: () => false,
			}),
		};
		const makeEl = (tag = "div"): DomNodeStub => {
			const children: DomNodeStub[] = [];
			const attrs: Record<string, string> = {};
			const listeners: Record<string, Array<(evt: unknown) => void>> = {};
			const el: DomNodeStub = {
				nodeType: 1,
				tagName: tag.toUpperCase(),
				nodeName: tag.toUpperCase(),
				style: {},
				dataset: {},
				children,
				childNodes: children,
				attrs,
				listeners,
				ownerDocument: doc,
				parentNode: null,
				textContent: "",
				appendChild: (c) => { children.push(c); c.parentNode = el; return c; },
				insertBefore: (c, b) => {
					const idx = b ? children.indexOf(b) : -1;
					if (idx >= 0) children.splice(idx, 0, c);
					else children.push(c);
					c.parentNode = el;
					return c;
				},
				removeChild: (c) => { const idx = children.indexOf(c); if (idx >= 0) children.splice(idx, 1); c.parentNode = null; return c; },
				addEventListener: (t, fn) => {
					(listeners[t] ??= []).push(fn);
				},
				removeEventListener: (t, fn) => {
					listeners[t] = (listeners[t] ?? []).filter((f) => f !== fn);
				},
				setAttribute: (k, v) => { attrs[k] = v; if (k === "class" || k === "className") el.className = v; if (k === "disabled") el.disabled = true; },
				getAttribute: (k) => attrs[k] ?? null,
				hasAttribute: (k) => k in attrs,
				removeAttribute: (k) => { delete attrs[k]; if (k === "disabled") el.disabled = false; },
				dispatchEvent: (evt) => {
					const type = (evt as { type?: string })?.type;
					if (type) {
						for (const fn of listeners[type] ?? []) fn(evt);
					}
					return true;
				},
				getBoundingClientRect: () => ({ top: 0, left: 0, right: 1200, bottom: 900, width: 1200, height: 900 }),
				focus: () => {},
				blur: () => {},
				contains: (other) => { let curr = other as DomNodeStub | null | undefined; while (curr) { if (curr === el) return true; curr = curr.parentNode; } return false; },
			};
			return el;
		};
		doc.createElement = (t: string) => makeEl(t);
		doc.createElementNS = (_ns: string, t: string) => makeEl(t);
		doc.body = makeEl("body");
		doc.documentElement = makeEl("html");

		(globalThis as { fetch: unknown }).fetch = async () =>
			new Response(JSON.stringify({ images: [] }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		(globalThis as { CustomEvent: unknown }).CustomEvent = FakeCustomEvent;
		(globalThis as { window: unknown }).window = {
			document: doc,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: (evt: { type?: string; detail?: { text?: string; type?: string } }) => {
				if (evt.type === "dente-toast" && evt.detail) toasts.push(evt.detail);
				return true;
			},
			HTMLIFrameElement: FakeIFrame,
			Element: FakeEl,
			HTMLElement: FakeHtmlEl,
			Node: FakeNode,
			navigator: { userAgent: "node" },
		};
		(globalThis as { document: unknown }).document = doc;
		(globalThis as { HTMLElement: unknown }).HTMLElement = FakeHtmlEl;
		(globalThis as { Element: unknown }).Element = FakeEl;
		(globalThis as { Node: unknown }).Node = FakeNode;
		(globalThis as { HTMLIFrameElement: unknown }).HTMLIFrameElement = FakeIFrame;
		(globalThis as { IS_REACT_ACT_ENVIRONMENT: unknown }).IS_REACT_ACT_ENVIRONMENT = true;

		const container = makeEl("div");
		let root: Root | null = null;
		try {
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<StaffPinPad
						staffMembers={multiStaffList}
						staffListLoading={false}
						staffListStatus={200}
						onUnlockSuccess={() => {}}
						onClinicLogout={() => {}}
						onRetryStaffList={() => {}}
					/>,
				);
				await new Promise((r) => setTimeout(r, 20));
			});

			const pinButtons = findNodes(
				container,
				(n) => n.tagName === "BUTTON" && (n.className ?? "").includes("auth-pin-btn"),
			);
			const digitOne = pinButtons.find((b) => b.textContent === "1");
			assert.ok(digitOne, "Digit 1 button must be mounted");
			assert.equal(Boolean(digitOne.disabled), false);

			await act(async () => {
				const propKey = Object.keys(digitOne).find((k) => k.startsWith("__reactProps$"));
				assert.ok(propKey, "Button must have React props attached");
				const btnProps = (digitOne as unknown as Record<string, { onClick?: (e: unknown) => void }>)[propKey];
				btnProps?.onClick?.({
					type: "click",
					preventDefault: () => {},
					stopPropagation: () => {},
				});
				await new Promise((r) => setTimeout(r, 550));
			});

			assert.ok(
				toasts.some((t) => (t.text ?? "").includes("Сначала выберите сотрудника из списка")),
				"Expected toast guidance when clicking PIN digit without selecting a staff member",
			);

			const alertNode = findNodes(container, (n) => n.getAttribute("role") === "alert")[0];
			assert.ok(alertNode && alertNode.textContent.includes("Сначала выберите сотрудника"));
		} finally {
			if (root) {
				act(() => {
					root?.unmount();
				});
			}
			(globalThis as { window?: unknown }).window = prevGlobals.window;
			(globalThis as { document?: unknown }).document = prevGlobals.document;
			(globalThis as { fetch?: unknown }).fetch = prevGlobals.fetch;
			(globalThis as { CustomEvent?: unknown }).CustomEvent = prevGlobals.CustomEvent;
			(globalThis as { HTMLElement?: unknown }).HTMLElement = prevGlobals.HTMLElement;
			(globalThis as { Element?: unknown }).Element = prevGlobals.Element;
			(globalThis as { Node?: unknown }).Node = prevGlobals.Node;
			(globalThis as { HTMLIFrameElement?: unknown }).HTMLIFrameElement = prevGlobals.HTMLIFrameElement;
			(globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT = prevGlobals.IS_REACT_ACT_ENVIRONMENT;
		}
	});

	it("4. solo doctor list auto-selects the only active staff member upon mount", async () => {
		const prevGlobals = {
			window: (globalThis as { window?: unknown }).window,
			document: (globalThis as { document?: unknown }).document,
			fetch: (globalThis as { fetch?: unknown }).fetch,
			HTMLElement: (globalThis as { HTMLElement?: unknown }).HTMLElement,
			Element: (globalThis as { Element?: unknown }).Element,
			Node: (globalThis as { Node?: unknown }).Node,
			HTMLIFrameElement: (globalThis as { HTMLIFrameElement?: unknown }).HTMLIFrameElement,
			IS_REACT_ACT_ENVIRONMENT: (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT,
		};
		class FakeIFrame {}
		class FakeEl {}
		class FakeHtmlEl {}
		class FakeNode {}
		const doc: Record<string, unknown> = {
			nodeType: 9,
			activeElement: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
			createTextNode: (text: string): DomNodeStub => ({
				nodeType: 3, tagName: "#text", nodeName: "#text", style: {}, dataset: {}, children: [], childNodes: [], attrs: {}, listeners: {}, ownerDocument: doc, parentNode: null,
				textContent: String(text ?? ""), nodeValue: String(text ?? ""), data: String(text ?? ""),
				appendChild: (c) => c, insertBefore: (c) => c, removeChild: (c) => c, addEventListener: () => {}, removeEventListener: () => {}, setAttribute: () => {}, getAttribute: () => null, hasAttribute: () => false, removeAttribute: () => {}, dispatchEvent: () => true,
				getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }), focus: () => {}, blur: () => {}, contains: () => false,
			}),
		};
		const makeEl = (tag = "div"): DomNodeStub => {
			const children: DomNodeStub[] = [];
			const attrs: Record<string, string> = {};
			const el: DomNodeStub = {
				nodeType: 1, tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), style: {}, dataset: {}, children, childNodes: children, attrs, listeners: {}, ownerDocument: doc, parentNode: null, textContent: "",
				appendChild: (c) => { children.push(c); c.parentNode = el; return c; },
				insertBefore: (c, b) => { const idx = b ? children.indexOf(b) : -1; if (idx >= 0) children.splice(idx, 0, c); else children.push(c); c.parentNode = el; return c; },
				removeChild: (c) => { const idx = children.indexOf(c); if (idx >= 0) children.splice(idx, 1); c.parentNode = null; return c; },
				addEventListener: () => {}, removeEventListener: () => {}, setAttribute: (k, v) => { attrs[k] = v; if (k === "class" || k === "className") el.className = v; },
				getAttribute: (k) => attrs[k] ?? null, hasAttribute: (k) => k in attrs, removeAttribute: (k) => { delete attrs[k]; }, dispatchEvent: () => true,
				getBoundingClientRect: () => ({ top: 0, left: 0, right: 1200, bottom: 900, width: 1200, height: 900 }), focus: () => {}, blur: () => {},
				contains: (other) => { let curr = other as DomNodeStub | null | undefined; while (curr) { if (curr === el) return true; curr = curr.parentNode; } return false; },
			};
			return el;
		};
		doc.createElement = (t: string) => makeEl(t);
		doc.createElementNS = (_ns: string, t: string) => makeEl(t);
		doc.body = makeEl("body");
		doc.documentElement = makeEl("html");
		(globalThis as { fetch: unknown }).fetch = async () =>
			new Response(JSON.stringify({ images: [] }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		(globalThis as { window: unknown }).window = { document: doc, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true, HTMLIFrameElement: FakeIFrame, Element: FakeEl, HTMLElement: FakeHtmlEl, Node: FakeNode, navigator: { userAgent: "node" } };
		(globalThis as { document: unknown }).document = doc;
		(globalThis as { HTMLElement: unknown }).HTMLElement = FakeHtmlEl;
		(globalThis as { Element: unknown }).Element = FakeEl;
		(globalThis as { Node: unknown }).Node = FakeNode;
		(globalThis as { HTMLIFrameElement: unknown }).HTMLIFrameElement = FakeIFrame;
		(globalThis as { IS_REACT_ACT_ENVIRONMENT: unknown }).IS_REACT_ACT_ENVIRONMENT = true;
		const container = makeEl("div");
		let root: Root | null = null;
		try {
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<StaffPinPad
						staffMembers={singleStaffList}
						staffListLoading={false}
						staffListStatus={200}
						onUnlockSuccess={() => {}}
						onClinicLogout={() => {}}
						onRetryStaffList={() => {}}
					/>,
				);
				await new Promise((r) => setTimeout(r, 20));
			});
			const headers = findNodes(container, (n) => n.tagName === "H4");
			assert.ok(headers.some((h) => h.textContent.includes("Доктор Айболит")), "Solo doctor must be auto-selected in PIN header");
		} finally {
			if (root) {
				act(() => {
					root?.unmount();
				});
			}
			(globalThis as { window?: unknown }).window = prevGlobals.window;
			(globalThis as { document?: unknown }).document = prevGlobals.document;
			(globalThis as { fetch?: unknown }).fetch = prevGlobals.fetch;
			(globalThis as { HTMLElement?: unknown }).HTMLElement = prevGlobals.HTMLElement;
			(globalThis as { Element?: unknown }).Element = prevGlobals.Element;
			(globalThis as { Node?: unknown }).Node = prevGlobals.Node;
			(globalThis as { HTMLIFrameElement?: unknown }).HTMLIFrameElement = prevGlobals.HTMLIFrameElement;
			(globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT = prevGlobals.IS_REACT_ACT_ENVIRONMENT;
		}
	});
});
