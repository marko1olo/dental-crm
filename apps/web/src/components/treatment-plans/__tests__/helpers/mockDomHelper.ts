import { act } from "react";
import { vi } from "./signatureTestHelpers";
import type { MockDomNode } from "./mockDomTypes";

export type { MockDomNode };

export function setupMockDom() {
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
			appendChild: (child) => { children.push(child); child.parentNode = el; return child; },
			insertBefore: (child, before) => {
				const idx = before ? children.indexOf(before) : -1;
				if (idx >= 0) children.splice(idx, 0, child); else children.push(child);
				child.parentNode = el; return child;
			},
			removeChild: (child) => {
				const idx = children.indexOf(child);
				if (idx >= 0) children.splice(idx, 1);
				child.parentNode = null; return child;
			},
			addEventListener: (t, fn) => { listeners[t] = listeners[t] || []; listeners[t].push(fn); },
			removeEventListener: (t, fn) => { if (listeners[t]) listeners[t] = listeners[t].filter((l) => l !== fn); },
			setAttribute: (n, v) => { attrs[n] = v; if (n.startsWith("data-")) el.dataset[n.slice(5)] = v; },
			getAttribute: (n) => attrs[n] || null,
			removeAttribute: (n) => { delete attrs[n]; },
			dispatchEvent: (ev) => { for (const fn of listeners[ev.type] || []) fn(ev as unknown as Event); return true; },
			getBoundingClientRect: () => ({ top: 0, left: 0, right: 600, bottom: 200, width: 600, height: 200 }),
			getContext: () => null,
			toDataURL: () => "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
		};
		return el;
	}

	doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({ nodeType: 3, textContent: text, style: {}, parentNode: null, ownerDocument: doc }),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: doc }),
		addEventListener: () => {}, removeEventListener: () => {},
		documentElement: null as any, body: null as any, activeElement: null,
	};
	doc.documentElement = createMockElement("html");
	doc.body = createMockElement("body");
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	const win = {
		document: doc, addEventListener: () => {}, removeEventListener: () => {},
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		print: vi.fn(), HTMLIFrameElement: class {}, HTMLElement: class {}, Element: class {}, Node: class {},
	};
	(doc as unknown as { defaultView: typeof win }).defaultView = win;

	const g = globalThis as any;
	g.document = doc; g.window = win; g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement; g.Element = win.Element; g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return { doc, win };
}

export function findNodeByTestId(node: MockDomNode | null, testId: string): MockDomNode | null {
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

export async function clickNode(node: MockDomNode) {
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
