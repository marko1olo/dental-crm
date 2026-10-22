import { act } from "react";
import {
	type MockFn,
	createMockFn,
	type MockDomNode,
} from "./dentalLabTestDomTypes";

export { type MockFn, createMockFn, type MockDomNode };

export function setupMockDom(defaultUrl = "http://localhost:5173/#/lab-orders") {
	let doc: any;
	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};
		const el: MockDomNode = {
			nodeType: 1, tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(),
			style: {}, dataset: {}, children, childNodes: children, attributes: [],
			ownerDocument: doc, parentNode: null, textContent: "", multiple: false, selectedIndex: 0, value: "",
			get options() { return children.filter((c) => c.tagName === "OPTION"); },
			appendChild: (child: MockDomNode) => { children.push(child); child.parentNode = el; return child; },
			insertBefore: (child: MockDomNode, before: MockDomNode | null) => {
				const idx = before ? children.indexOf(before) : -1;
				if (idx >= 0) children.splice(idx, 0, child); else children.push(child);
				child.parentNode = el; return child;
			},
			removeChild: (child: MockDomNode) => {
				const idx = children.indexOf(child);
				if (idx >= 0) children.splice(idx, 1);
				child.parentNode = null; return child;
			},
			addEventListener: (type: string, fn: EventListener) => { listeners[type] = listeners[type] || []; listeners[type].push(fn); },
			removeEventListener: (type: string, fn: EventListener) => { if (listeners[type]) listeners[type] = listeners[type].filter((l) => l !== fn); },
			setAttribute: (name: string, value: string) => { attrs[name] = value; if (name.startsWith("data-")) el.dataset[name.slice(5)] = value; },
			getAttribute: (name: string) => attrs[name] || null,
			removeAttribute: (name: string) => { delete attrs[name]; },
			dispatchEvent: (ev: { type: string }) => { for (const fn of listeners[ev.type] || []) fn(ev as unknown as Event); return true; },
			focus: () => {}, blur: () => {},
			getBoundingClientRect: () => ({ top: 0, left: 0, right: 1280, bottom: 900, width: 1280, height: 900 }),
		};
		return el;
	}

	let lastCopiedText = "";
	const clipboardWriteMock = createMockFn(async (text: string) => { lastCopiedText = text; return Promise.resolve(); });
	const printMock = createMockFn();
	doc = {
		nodeType: 9, createElement: createMockElement, createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({ nodeType: 3, textContent: text, style: {}, parentNode: null, ownerDocument: doc }),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: doc }),
		addEventListener: () => {}, removeEventListener: () => {},
		documentElement: createMockElement("html"), body: createMockElement("body"), activeElement: null,
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;
	const win = {
		document: doc, location: { origin: "http://localhost:5173", href: defaultUrl, search: "", hash: defaultUrl.includes("#") ? defaultUrl.slice(defaultUrl.indexOf("#")) : "" },
		addEventListener: () => {}, removeEventListener: () => {},
		navigator: { clipboard: { writeText: clipboardWriteMock } }, print: printMock,
		HTMLIFrameElement: class {}, HTMLElement: class {}, Element: class {}, Node: class {},
	};
	(doc as any).defaultView = win;
	const g = globalThis as any;
	g.document = doc; g.window = win; g.print = printMock;
	if (g.navigator) Object.defineProperty(g.navigator, "clipboard", { value: win.navigator.clipboard, configurable: true, writable: true });
	else g.navigator = win.navigator;
	g.HTMLIFrameElement = win.HTMLIFrameElement; g.HTMLElement = win.HTMLElement; g.Element = win.Element; g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;
	return { doc, win, printMock, clipboardWriteMock, getClipboardText: () => lastCopiedText };
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

export function findAllNodesByCondition(
	node: MockDomNode | null,
	predicate: (n: MockDomNode) => boolean,
): MockDomNode[] {
	if (!node) return [];
	const results: MockDomNode[] = [];
	if (predicate(node)) results.push(node);
	for (const child of node.children || []) {
		results.push(...findAllNodesByCondition(child, predicate));
	}
	return results;
}

export async function clickNode(node: MockDomNode) {
	await act(async () => {
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) => k.startsWith("__reactProps$"));
			if (reactPropKey) {
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onClick === "function") {
					props.onClick({ type: "click", preventDefault: () => {}, stopPropagation: () => {} });
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "click" });
	});
}
