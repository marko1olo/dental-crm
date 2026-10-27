import React, { act } from "react";
export { vi, expect, type SpyMock } from "./testAssertUtils.js";

export interface MockDomNode {
	nodeType: number; tagName: string; style: Record<string, string>; dataset: Record<string, string>;
	children: MockDomNode[]; parentNode: MockDomNode | null; textContent: string;
	disabled?: boolean; value?: string; className: string;
	appendChild: (c: MockDomNode) => MockDomNode; dispatchEvent: (ev: { type: string; [k: string]: unknown }) => boolean;
	getAttribute: (name: string) => string | null; setAttribute: (name: string, value: string) => void;
	[key: string]: unknown;
}

export function setupMockDom() {
	let doc: any;
	function createEl(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};
		let text = "";
		const el: MockDomNode = {
			nodeType: 1, tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(),
			style: {}, dataset: {}, children, childNodes: children, parentNode: null, ownerDocument: null,
			get textContent() { return children.length ? children.map((c) => c.textContent).join("") : text; },
			set textContent(v: string) { text = v; }, className: "",
			appendChild: (c) => { children.push(c); c.parentNode = el; return c; },
			removeChild: (c) => { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); return c; },
			insertBefore: (c, b) => { const i = b ? children.indexOf(b) : -1; if (i >= 0) children.splice(i, 0, c); else children.push(c); c.parentNode = el; return c; },
			addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
			removeEventListener: (t, fn) => { if (listeners[t]) listeners[t] = listeners[t].filter((l) => l !== fn); },
			dispatchEvent: (ev) => { for (const fn of listeners[ev.type] || []) fn(ev as any); return true; },
			getAttribute: (n) => n === "class" ? el.className : attrs[n] || null,
			setAttribute: (n, v) => { attrs[n] = v; if (n === "class") el.className = v; if (n.startsWith("data-")) el.dataset[n.slice(5)] = v; },
			hasAttribute: (n) => n in attrs || (n === "class" && Boolean(el.className)),
			removeAttribute: (n) => { delete attrs[n]; if (n === "class") el.className = ""; },
			getBoundingClientRect: () => ({ top: 0, left: 0, right: 1200, bottom: 900, width: 1200, height: 900 }),
			focus: () => {}, blur: () => {}, scrollIntoView: () => {},
		};
		el.ownerDocument = doc;
		return el;
	}
	doc = {
		nodeType: 9, createElement: createEl, createElementNS: (_: string, tag: string) => createEl(tag),
		createTextNode: (t: string) => ({ nodeType: 3, textContent: t, style: {} }), createComment: () => ({ nodeType: 8 }),
		addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true,
		documentElement: createEl("html"), body: createEl("body"),
	};
	const win = {
		document: doc, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true,
		location: { href: "http://localhost:5173", search: "" },
		HTMLIFrameElement: class {}, HTMLElement: class {}, Element: class {}, Node: class {},
	};
	(doc as any).defaultView = win;
	const g = globalThis as any;
	g.document = doc; g.window = win; g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement; g.Element = win.Element; g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;
	return { doc, win };
}

export function findNodeByTestId(node: MockDomNode | null, testId: string): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.("data-testid") === testId) return node;
	for (const child of node.children || []) {
		const res = findNodeByTestId(child, testId);
		if (res) return res;
	}
	return null;
}
export function isNodeDisabled(node: MockDomNode): boolean {
	if (Boolean(node.disabled) || (node.getAttribute?.("disabled") !== null && node.getAttribute?.("disabled") !== "false")) return true;
	const key = Object.keys(node).find((k) => k.startsWith("__reactProps$"));
	return Boolean(key && (node as any)[key]?.disabled);
}

export async function clickNode(node: MockDomNode) {
	await act(async () => {
		const key = Object.keys(node).find((k) => k.startsWith("__reactProps$"));
		if (key && typeof (node as any)[key]?.onClick === "function") await (node as any)[key].onClick({ type: "click", preventDefault: () => {} });
		let p = node.parentNode;
		while (p) {
			if (p.tagName === "FORM") {
				const fKey = Object.keys(p).find((k) => k.startsWith("__reactProps$"));
				if (fKey && typeof (p as any)[fKey]?.onSubmit === "function") {
					await (p as any)[fKey].onSubmit({ type: "submit", preventDefault: () => {} });
					return;
				}
			}
			p = p.parentNode;
		}
		node.dispatchEvent({ type: "click" });
	});
}

export async function changeInputValue(node: MockDomNode, value: string) {
	await act(async () => {
		node.value = value;
		const key = Object.keys(node).find((k) => k.startsWith("__reactProps$"));
		if (key && typeof (node as any)[key]?.onChange === "function") {
			(node as any)[key].onChange({ target: { value }, currentTarget: { value } });
		}
	});
}
