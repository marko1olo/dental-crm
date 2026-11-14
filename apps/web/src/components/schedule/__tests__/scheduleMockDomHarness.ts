/**
 * scheduleMockDomHarness.ts
 *
 * Lightweight Mock DOM Test Harness for Schedule & Chair Unit Tests.
 * Polyfills DOM nodes, act() wrappers, event dispatches, and queries without heavy JSDOM overhead.
 * SSOT for Mandates 8b, 8zi (anti-monolith sweet-spot sharing).
 */

import React, { act } from "react";

// Cartoon emoji detector per Mandate 8d п. 7
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

export type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
	mockReturnValue: (val: any) => MockFn;
};

export function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	fn.mockReturnValue = (val: any) => createMockFn(() => val);
	return fn;
}

export interface MockDomNode {
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
	className?: string;
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

export function createMockStyle(): any {
	const s: any = {
		setProperty(k: string, v: string) {
			s[k] = v;
		},
		removeProperty(k: string) {
			delete s[k];
		},
		getPropertyValue(k: string) {
			return s[k] || "";
		},
	};
	return s;
}

export function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	class FakeHTMLIFrameElement {}
	class FakeHTMLElement {}
	class FakeElement {}
	class FakeNode {}

	const doc: any = {
		nodeType: 9,
		createTextNode: (text: string) => {
			const tn: any = {
				nodeType: 3,
				_val: String(text ?? ""),
				get textContent(): string {
					return this._val;
				},
				set textContent(v: string) {
					this._val = String(v ?? "");
				},
				get nodeValue(): string {
					return this._val;
				},
				set nodeValue(v: string) {
					this._val = String(v ?? "");
				},
				get data(): string {
					return this._val;
				},
				set data(v: string) {
					this._val = String(v ?? "");
				},
				style: createMockStyle(),
				parentNode: null,
				ownerDocument: null,
			};
			return tn;
		},
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
		addEventListener: () => {},
		removeEventListener: () => {},
		activeElement: null,
	};

	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};

		const el: MockDomNode = {
			nodeType: 1,
			tagName: tag.toUpperCase(),
			nodeName: tag.toUpperCase(),
			style: createMockStyle(),
			dataset: {},
			children,
			childNodes: children,
			attributes: [],
			ownerDocument: doc,
			parentNode: null,
			get textContent(): string {
				if (children.length === 0) return (el as any)._textContent ?? "";
				return children.map((c) => c.textContent ?? "").join("");
			},
			set textContent(v: string) {
				(el as any)._textContent = v;
			},
			disabled: false,
			value: "",
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
				if (name.startsWith("data-")) {
					el.dataset[name.slice(5)] = value;
				}
				if (name === "disabled") {
					el.disabled = true;
				}
				if (name === "class" || name === "className") {
					el.className = value;
				}
			},
			getAttribute: (name: string) => attrs[name] || null,
			hasAttribute: (name: string) => name in attrs,
			removeAttribute: (name: string) => {
				delete attrs[name];
				if (name === "disabled") {
					el.disabled = false;
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

		if (tag.toUpperCase() === "SELECT") {
			(el as any).multiple = false;
			Object.defineProperty(el, "options", {
				get() {
					return children.filter((c) => c.tagName === "OPTION");
				},
			});
			Object.defineProperty(el, "value", {
				get() {
					const opts = (el as any).options as MockDomNode[];
					const selectedOpts = opts.filter((o) => (o as any).selected);
					if (selectedOpts.length > 0) return (selectedOpts[selectedOpts.length - 1] as any).value;
					if (attrs.value !== undefined) return attrs.value;
					if ((el as any)._value !== undefined) return (el as any)._value;
					return "";
				},
				set(v) {
					(el as any)._value = String(v);
					attrs.value = String(v);
					const opts = (el as any).options as MockDomNode[];
					for (const o of opts) {
						(o as any).selected = (o as any).value === String(v);
					}
				},
			});
		}

		if (tag.toUpperCase() === "OPTION") {
			Object.defineProperty(el, "value", {
				get() {
					return attrs.value !== undefined ? attrs.value : el.textContent;
				},
				set(v) {
					attrs.value = String(v);
				},
			});
			Object.defineProperty(el, "selected", {
				get() {
					return Boolean((el as any)._selected) || attrs.selected === "true" || attrs.selected === "";
				},
				set(v) {
					(el as any)._selected = Boolean(v);
					if (v) {
						attrs.selected = "true";
						if (el.parentNode && el.parentNode.tagName === "SELECT" && !(el.parentNode as any).multiple) {
							for (const sibling of el.parentNode.children || []) {
								if (sibling !== el && sibling.tagName === "OPTION") {
									(sibling as any)._selected = false;
									delete (sibling as any).dataset?.selected;
									if (sibling.removeAttribute) sibling.removeAttribute("selected");
								}
							}
						}
					} else {
						delete attrs.selected;
					}
				},
			});
		}

		el.ownerDocument = doc;
		return el;
	}

	doc.createElement = createMockElement;
	doc.createElementNS = (_ns: string, tag: string) => createMockElement(tag);
	doc.documentElement = createMockElement("html");
	doc.body = createMockElement("body");

	const win: any = {
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
		HTMLIFrameElement: FakeHTMLIFrameElement,
		HTMLElement: FakeHTMLElement,
		Element: FakeElement,
		Node: FakeNode,
		innerWidth: 1200,
		matchMedia: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}),
	};
	doc.defaultView = win;

	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	g.HTMLIFrameElement = FakeHTMLIFrameElement;
	g.HTMLElement = FakeHTMLElement;
	g.Element = FakeElement;
	g.Node = FakeNode;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	// In-memory localStorage mock
	const storage: Record<string, string> = {};
	g.localStorage = {
		getItem: (k: string) => (k in storage ? storage[k] : null),
		setItem: (k: string, v: string) => {
			storage[k] = String(v);
		},
		removeItem: (k: string) => {
			delete storage[k];
		},
		clear: () => {
			for (const k of Object.keys(storage)) delete storage[k];
		},
	};

	// Mock fetch
	g.fetch = createMockFn().mockReturnValue(
		Promise.resolve({
			ok: true,
			status: 200,
			json: async () => ({ ok: true, shifts: [] }),
		}),
	);

	return { doc, win };
}

export function findNodeByTestId(
	node: MockDomNode | null,
	testId: string,
): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute && typeof node.getAttribute === "function") {
		const attr = node.getAttribute("data-testid");
		const legacy = node.getAttribute("data-legacy-testid");
		if (
			attr === testId ||
			(attr && attr.split(/\s+/).includes(testId)) ||
			legacy === testId ||
			(legacy && legacy.split(/\s+/).includes(testId))
		) {
			return node;
		}
	}
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			const res = findNodeByTestId(child, testId);
			if (res) return res;
		}
	}
	return null;
}

export function findAllNodesByTag(node: MockDomNode | null, tag: string): MockDomNode[] {
	const res: MockDomNode[] = [];
	if (!node) return res;
	const upper = tag.toUpperCase();
	if (node.tagName === upper) res.push(node);
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			res.push(...findAllNodesByTag(child, tag));
		}
	}
	return res;
}

export function collectAllText(node: MockDomNode): string {
	let text = node.textContent || "";
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			text += " " + collectAllText(child);
		}
	}
	return text;
}

export async function clickNode(node: MockDomNode | null) {
	if (!node) return;
	await act(async () => {
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onClick === "function") {
					await props.onClick({
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

export async function changeNode(node: MockDomNode | null, value: string) {
	if (!node) return;
	node.value = value;
	await act(async () => {
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) => k.startsWith("__reactProps$"));
			if (reactPropKey) {
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onChange === "function") {
					await props.onChange({
						target: { value },
						currentTarget: { value },
						preventDefault: () => {},
						stopPropagation: () => {},
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "change", target: { value } });
	});
}
