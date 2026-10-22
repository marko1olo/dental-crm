/**
 * Lightweight Mock DOM for React 19 Test Environment (Wave 53)
 */

import { act } from 'react';

export interface MockDomNode {
	nodeType: number; tagName: string; style: Record<string, string>; dataset: Record<string, string>;
	children: MockDomNode[]; childNodes: MockDomNode[]; parentNode: MockDomNode | null; textContent: string;
	className: string; ownerDocument: unknown;
	appendChild: (c: MockDomNode) => MockDomNode;
	insertBefore: (c: MockDomNode, b: MockDomNode | null) => MockDomNode;
	removeChild: (c: MockDomNode) => MockDomNode;
	setAttribute: (n: string, v: string) => void;
	getAttribute: (n: string) => string | null;
	removeAttribute: (n: string) => void;
	addEventListener: (t: string, fn: EventListener) => void;
	removeEventListener: (t: string, fn: EventListener) => void;
	dispatchEvent: (ev: { type: string; [k: string]: unknown }) => boolean;
	[key: string]: unknown;
}

export function setupMockDom() {
	let writtenClipboard = '';
	let lastToast: CustomEvent | null = null;
	let printCalled = false;
	const winListeners: Record<string, EventListener[]> = {};

	// biome-ignore lint/suspicious/noExplicitAny: mock DOM
	let doc: any;
	function createElement(tag = 'div'): MockDomNode {
		const children: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};
		let text = '';

		const el: MockDomNode = {
			nodeType: 1, tagName: tag.toUpperCase(), style: {}, dataset: {}, children, childNodes: children, parentNode: null, ownerDocument: null, className: '',
			get textContent() { return children.length ? children.map(c => c.textContent).join('') : text; },
			set textContent(v: string) { text = v; },
			appendChild: (c) => { children.push(c); c.parentNode = el; return c; },
			insertBefore: (c, b) => { const i = b ? children.indexOf(b) : -1; if (i >= 0) children.splice(i, 0, c); else children.push(c); c.parentNode = el; return c; },
			removeChild: (c) => { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); c.parentNode = null; return c; },
			setAttribute: (n, v) => { attrs[n] = v; if (n === 'class' || n === 'className') el.className = v; if (n.startsWith('data-')) el.dataset[n.slice(5)] = v; },
			getAttribute: (n) => n === 'class' ? el.className || attrs[n] || null : attrs[n] || null,
			removeAttribute: (n) => { delete attrs[n]; if (n === 'class') el.className = ''; },
			addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
			removeEventListener: (t, fn) => { if (listeners[t]) listeners[t] = listeners[t].filter(l => l !== fn); },
			dispatchEvent: (ev) => { for (const fn of listeners[ev.type] || []) fn(ev as unknown as Event); return true; }
		};
		el.ownerDocument = doc;
		return el;
	}

	doc = {
		nodeType: 9, createElement, createElementNS: (_: string, t: string) => createElement(t),
		createTextNode: (t: string) => ({ nodeType: 3, textContent: t, parentNode: null }),
		createComment: () => ({ nodeType: 8, parentNode: null }),
		addEventListener: () => {}, removeEventListener: () => {}, activeElement: null,
		documentElement: createElement('html'), body: createElement('body')
	};
	const win = {
		document: doc,
		addEventListener: (t: string, fn: EventListener) => { (winListeners[t] = winListeners[t] || []).push(fn); },
		removeEventListener: (t: string, fn: EventListener) => { if (winListeners[t]) winListeners[t] = winListeners[t].filter(l => l !== fn); },
		dispatchEvent: (ev: { type: string; [k: string]: unknown }) => {
			if (ev.type === 'dente-toast') lastToast = ev as unknown as CustomEvent;
			for (const fn of winListeners[ev.type] || []) fn(ev as unknown as Event);
			return true;
		},
		navigator: { clipboard: { writeText: async (t: string) => { writtenClipboard = t; } } },
		print: () => { printCalled = true; },
		HTMLIFrameElement: class {}, HTMLElement: class {}, Element: class {}, Node: class {}
	};

	const g = globalThis as unknown as Record<string, unknown>;
	g.document = doc; g.window = win;
	if (g.navigator) {
		Object.defineProperty(g.navigator, 'clipboard', { value: win.navigator.clipboard, configurable: true, writable: true });
	} else {
		Object.defineProperty(g, 'navigator', { value: win.navigator, configurable: true, writable: true });
	}
	g.HTMLIFrameElement = win.HTMLIFrameElement; g.HTMLElement = win.HTMLElement; g.Element = win.Element; g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return {
		doc, win, getClipboardText: () => writtenClipboard, getLastToast: () => lastToast, wasPrintCalled: () => printCalled,
		reset: () => { writtenClipboard = ''; lastToast = null; printCalled = false; }
	};
}

export function findNodeByTestId(node: MockDomNode | null, testId: string): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.('data-testid') === testId) return node;
	for (const child of node.children || []) {
		const res = findNodeByTestId(child, testId);
		if (res) return res;
	}
	return null;
}

export async function clickNode(node: MockDomNode) {
	await act(async () => {
		const k = Object.keys(node).find(key => key.startsWith('__reactProps$'));
		if (k) {
			const props = (node as unknown as Record<string, { onClick?: (e: unknown) => Promise<void> | void }>)[k];
			if (props?.onClick) {
				await props.onClick({ type: 'click', preventDefault: () => {}, stopPropagation: () => {} });
				return;
			}
		}
		node.dispatchEvent({ type: 'click' });
	});
}
