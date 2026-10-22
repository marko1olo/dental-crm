// Cartoon emoji detector per Mandate 8d
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

// Minimal DOM mock for React client render & createPortal
export function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	class FakeHTMLIFrameElement {}
	class FakeHTMLElement {}
	class FakeElement {}
	class FakeNode {}

	function createMockStyle(): any {
		const s: any = {
			setProperty(k: string, v: string) { s[k] = v; },
			removeProperty(k: string) { delete s[k]; },
			getPropertyValue(k: string) { return s[k] || ""; },
		};
		return s;
	}

	function createMockNode(tagName: string): any {
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};
		const children: any[] = [];
		const node: any = {
			nodeType: 1, tagName: tagName.toUpperCase(), nodeName: tagName.toUpperCase(),
			style: createMockStyle(), dataset: {}, children, childNodes: children,
			attributes: [], ownerDocument: null, parentNode: null, textContent: "",
			disabled: false, value: "", className: "",
			appendChild(c: any) { c.parentNode = node; c.ownerDocument = node.ownerDocument; children.push(c); return c; },
			insertBefore(c: any, b: any) {
				c.parentNode = node; c.ownerDocument = node.ownerDocument;
				const idx = children.indexOf(b);
				if (idx >= 0) children.splice(idx, 0, c); else children.push(c);
				return c;
			},
			removeChild(c: any) { const idx = children.indexOf(c); if (idx >= 0) { children.splice(idx, 1); c.parentNode = null; } return c; },
			addEventListener(t: string, fn: EventListener) { listeners[t] = listeners[t] || []; listeners[t].push(fn); },
			removeEventListener(t: string, fn: EventListener) { if (listeners[t]) listeners[t] = listeners[t].filter((l) => l !== fn); },
			setAttribute(n: string, v: string) {
				attrs[n] = String(v); if (n === "class") node.className = String(v); if (n === "disabled") node.disabled = true;
				if (n.startsWith("data-")) node.dataset[n.slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase())] = String(v);
			},
			getAttribute: (n: string) => attrs[n] ?? null,
			hasAttribute: (n: string) => n in attrs,
			removeAttribute(n: string) { delete attrs[n]; if (n === "disabled") node.disabled = false; },
			dispatchEvent(ev: any) {
				for (const fn of listeners[ev.type] || []) fn.call(node, { ...ev, target: node, currentTarget: node });
				if (ev.type === "click") {
					let curr = node;
					while (curr) {
						const k = Object.keys(curr).find((x) => x.startsWith("__reactProps$"));
						if (k && curr[k]?.onClick) {
							curr[k].onClick({ type: "click", preventDefault() {}, stopPropagation() {}, target: node, currentTarget: curr });
							break;
						}
						curr = curr.parentNode;
					}
				}
				return true;
			},
			getBoundingClientRect: () => ({ top: 0, left: 0, right: 100, bottom: 44, width: 100, height: 44 }),
			focus() {}, blur() {},
			contains: (other: any) => { let c = other; while (c) { if (c === node) return true; c = c.parentNode; } return false; },
		};
		if (tagName.toUpperCase() === "SELECT") {
			node.multiple = false;
			Object.defineProperty(node, "options", { get: () => children.filter((c: any) => c.tagName === "OPTION") });
		}
		if (tagName.toUpperCase() === "OPTION") { node.selected = false; }
		return node;
	}

	const doc: any = {
		nodeType: 9,
		createTextNode(text: string) {
			const tn: any = { nodeType: 3, _val: String(text ?? ""), get textContent() { return this._val; }, set textContent(v: string) { this._val = String(v ?? ""); }, get nodeValue() { return this._val; }, set nodeValue(v: string) { this._val = String(v ?? ""); }, parentNode: null, ownerDocument: null };
			return tn;
		},
		createComment() { return { nodeType: 8, parentNode: null, ownerDocument: null }; },
		createElement(tagName: string) { const n = createMockNode(tagName); n.ownerDocument = doc; return n; },
		createElementNS(_ns: string, tagName: string) { const n = createMockNode(tagName); n.ownerDocument = doc; return n; },
		addEventListener(type: string, fn: EventListener) { winListeners[type] = winListeners[type] || []; winListeners[type].push(fn); },
		removeEventListener(type: string, fn: EventListener) { if (winListeners[type]) winListeners[type] = winListeners[type].filter((l) => l !== fn); },
		activeElement: null,
	};
	const body = createMockNode("body");
	body.ownerDocument = doc; doc.body = body; doc.documentElement = body;
	const win: any = {
		document: doc, addEventListener(t: string, f: EventListener) { winListeners[t] = winListeners[t] || []; winListeners[t].push(f); },
		removeEventListener(t: string, f: EventListener) { if (winListeners[t]) winListeners[t] = winListeners[t].filter((l) => l !== f); },
		HTMLIFrameElement: FakeHTMLIFrameElement, HTMLElement: FakeHTMLElement, Element: FakeElement, Node: FakeNode,
		getComputedStyle: () => ({ getPropertyValue: () => "" }), setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
	};
	doc.defaultView = win;
	(globalThis as any).window = win; (globalThis as any).document = doc;
	(globalThis as any).HTMLIFrameElement = FakeHTMLIFrameElement; (globalThis as any).HTMLElement = FakeHTMLElement;
	(globalThis as any).Element = FakeElement; (globalThis as any).Node = FakeNode;
	(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
	return { doc, win, body };
}

export function findNodeByTestId(rootNode: any, testId: string): any {
	if (!rootNode) return null;
	if (rootNode.getAttribute && rootNode.getAttribute("data-testid") === testId) return rootNode;
	for (const child of rootNode.childNodes || rootNode.children || []) {
		const found = findNodeByTestId(child, testId);
		if (found) return found;
	}
	return null;
}

export function collectAllText(node: any): string {
	if (!node) return "";
	let text = node.textContent || node._val || "";
	for (const child of node.childNodes || node.children || []) text += ` ${collectAllText(child)}`;
	return text;
}
