import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { OdontogramActiveViewSlot } from "../OdontogramActiveViewSlot";
import {
	type CatalogDefectOption,
	OdontogramStampPalette,
} from "../OdontogramStampPalette";

interface TestDomElement {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	classList: { contains(c: string): boolean; add(c: string): void; remove(c: string): void };
	children: TestDomElement[];
	childNodes: TestDomElement[];
	parentNode: TestDomElement | null;
	ownerDocument: TestDocument | null;
	textContent: string;
	className: string;
	value: string;
	disabled?: boolean;
	appendChild(c: TestDomElement): TestDomElement;
	removeChild(c: TestDomElement): TestDomElement;
	insertBefore(c: TestDomElement, b: TestDomElement | null): TestDomElement;
	addEventListener(t: string, fn: (ev: Event) => void): void;
	removeEventListener(t: string, fn: (ev: Event) => void): void;
	dispatchEvent(ev: { type: string; [k: string]: unknown }): boolean;
	getAttribute(name: string): string | null;
	setAttribute(name: string, value: string): void;
	hasAttribute(name: string): boolean;
	removeAttribute(name: string): void;
	contains(other: unknown): boolean;
	getBoundingClientRect(): {
		top: number;
		left: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
		x: number;
		y: number;
	};
	focus(): void;
}

interface TestDocument {
	nodeType: number;
	body: TestDomElement;
	documentElement: TestDomElement;
	createElement(tag: string): TestDomElement;
	createElementNS(_ns: string, tag: string): TestDomElement;
	createTextNode(text: string): TestDomElement;
	createComment(text: string): TestDomElement;
	addEventListener(t: string, fn: (ev: Event) => void): void;
	removeEventListener(t: string, fn: (ev: Event) => void): void;
	querySelector(sel: string): TestDomElement | null;
	querySelectorAll(sel: string): TestDomElement[];
}

function setupCleanDom() {
	const docListeners: Record<string, Array<(ev: Event) => void>> = {};
	const winListeners: Record<string, Array<(ev: Event) => void>> = {};
	const dispatchedEvents: string[] = [];

	let docRef: TestDocument;
	function makeEl(tag: string): TestDomElement {
		const children: TestDomElement[] = [];
		const attrs: Record<string, string> = {};
		const listeners: Record<string, Array<(ev: Event) => void>> = {};
		let text = "";
		const el: TestDomElement = {
			nodeType: tag === "#text" ? 3 : tag === "#comment" ? 8 : 1,
			tagName: tag.toUpperCase(),
			nodeName: tag.toUpperCase(),
			style: {},
			dataset: {},
			classList: {
				contains: (c: string) => el.className.split(/\s+/).includes(c),
				add: (c: string) => {
					if (!el.classList.contains(c)) el.className = `${el.className} ${c}`.trim();
				},
				remove: (c: string) => {
					el.className = el.className.split(/\s+/).filter((x) => x !== c).join(" ");
				},
			},
			children,
			childNodes: children,
			parentNode: null,
			get ownerDocument() {
				return docRef;
			},
			get textContent() {
				return children.length > 0 ? children.map((c) => c.textContent).join("") : text;
			},
			set textContent(v: string) {
				text = String(v ?? "");
			},
			get nodeValue() {
				return text;
			},
			set nodeValue(v: string) {
				text = String(v ?? "");
			},
			className: "",
			value: "",
			appendChild(c) {
				children.push(c);
				c.parentNode = el;
				return c;
			},
			removeChild(c) {
				const idx = children.indexOf(c);
				if (idx >= 0) children.splice(idx, 1);
				c.parentNode = null;
				return c;
			},
			insertBefore(c, b) {
				const idx = b ? children.indexOf(b) : -1;
				if (idx >= 0) children.splice(idx, 0, c);
				else children.push(c);
				c.parentNode = el;
				return c;
			},
			addEventListener(t, fn) {
				(listeners[t] = listeners[t] || []).push(fn);
			},
			removeEventListener(t, fn) {
				if (listeners[t]) listeners[t] = listeners[t].filter((f) => f !== fn);
			},
			dispatchEvent(ev) {
				for (const fn of listeners[ev.type] || []) {
					fn(ev as unknown as Event);
				}
				return true;
			},
			getAttribute(name) {
				return name === "class" ? el.className : (attrs[name] ?? null);
			},
			setAttribute(name, value) {
				attrs[name] = String(value);
				if (name === "class") el.className = String(value);
				if (name.startsWith("data-")) el.dataset[name.slice(5)] = String(value);
			},
			hasAttribute(name) {
				return name in attrs || (name === "class" && el.className.length > 0);
			},
			removeAttribute(name) {
				delete attrs[name];
				if (name === "class") el.className = "";
			},
			contains(other) {
				if (other === el) return true;
				return children.some((c) => c.contains(other));
			},
			getBoundingClientRect() {
				return { top: 100, left: 80, right: 240, bottom: 132, width: 160, height: 32, x: 80, y: 100 };
			},
			focus() {},
		};
		return el;
	}

	const body = makeEl("body");
	const html = makeEl("html");
	html.appendChild(body);
	docRef = {
		nodeType: 9,
		body,
		documentElement: html,
		activeElement: body,
		createElement: (tag) => makeEl(tag),
		createElementNS: (_ns, tag) => makeEl(tag),
		createTextNode: (t) => {
			const n = makeEl("#text");
			n.textContent = t;
			return n;
		},
		createComment: (t) => {
			const n = makeEl("#comment");
			n.textContent = t;
			return n;
		},
		addEventListener(t, fn) {
			(docListeners[t] = docListeners[t] || []).push(fn);
		},
		removeEventListener(t, fn) {
			if (docListeners[t]) docListeners[t] = docListeners[t].filter((f) => f !== fn);
		},
		querySelector: () => null,
		querySelectorAll: () => [],
	};

	function NodeCtor() {}
	function ElementCtor() {}
	function HTMLElementCtor() {}
	function HTMLIFrameElementCtor() {}
	function SVGElementCtor() {}

	const win = {
		document: docRef,
		innerWidth: 1440,
		innerHeight: 900,
		Node: NodeCtor,
		Element: ElementCtor,
		HTMLElement: HTMLElementCtor,
		HTMLIFrameElement: HTMLIFrameElementCtor,
		SVGElement: SVGElementCtor,
		addEventListener(t: string, fn: (ev: Event) => void) {
			(winListeners[t] = winListeners[t] || []).push(fn);
		},
		removeEventListener(t: string, fn: (ev: Event) => void) {
			if (winListeners[t]) winListeners[t] = winListeners[t].filter((f) => f !== fn);
		},
		dispatchEvent(ev: { type: string }) {
			dispatchedEvents.push(ev.type);
			for (const fn of winListeners[ev.type] || []) {
				fn(ev as Event);
			}
			return true;
		},
	};

	Reflect.set(docRef, "defaultView", win);
	Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
	Reflect.set(globalThis, "document", docRef);
	Reflect.set(globalThis, "window", win);
	Reflect.set(globalThis, "Node", NodeCtor);
	Reflect.set(globalThis, "Element", ElementCtor);
	Reflect.set(globalThis, "HTMLElement", HTMLElementCtor);
	Reflect.set(globalThis, "HTMLIFrameElement", HTMLIFrameElementCtor);
	Reflect.set(globalThis, "SVGElement", SVGElementCtor);

	return { doc: docRef, win, dispatchedEvents };
}

function invokeReactProp(el: TestDomElement, propName: string, eventArg: unknown): void {
	const propKey = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
	if (!propKey) return;
	const propsObj = Reflect.get(el, propKey) as Record<string, unknown> | undefined;
	const handler = propsObj?.[propName];
	if (typeof handler === "function") {
		(handler as (ev: unknown) => void)(eventArg);
	}
}

function findByTestId(root: TestDomElement, testId: string): TestDomElement | null {
	if (root.getAttribute("data-testid") === testId) return root;
	for (const child of root.children) {
		const found = findByTestId(child, testId);
		if (found) return found;
	}
	return null;
}

function findAllByTag(root: TestDomElement, tagName: string): TestDomElement[] {
	const out: TestDomElement[] = [];
	if (root.tagName === tagName.toUpperCase()) out.push(root);
	for (const c of root.children) out.push(...findAllByTag(c, tagName));
	return out;
}

describe("Odontogram 91 Defects Portal, Single-Fire Stamp & Batch Quick Input", () => {
	const originalDoc = globalThis.document;
	const originalWin = globalThis.window;
	const originalFetch = globalThis.fetch;
	const originalActEnv = Reflect.get(globalThis, "IS_REACT_ACT_ENVIRONMENT");
	let mountedRoot: Root | null = null;

	afterEach(async () => {
		if (mountedRoot) {
			await act(async () => {
				mountedRoot?.unmount();
			});
			mountedRoot = null;
		}
		Reflect.set(globalThis, "document", originalDoc);
		Reflect.set(globalThis, "window", originalWin);
		Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnv);
		globalThis.fetch = originalFetch;
	});

	it("loads 91 defects into OdontogramStampPalette, renders popover in document.body via createPortal, and applies defect without dead CustomEvent", async () => {
		const { doc, dispatchedEvents } = setupCleanDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		const apiDefects = Array.from({ length: 91 }, (_, i) => ({
			id: i + 1,
			name: i === 89 ? "Клиновидный дефект (StomX 90)" : `Патология #${i + 1}`,
			alias: `D${i + 1}`,
			type: "outpatient",
			key: "require_treatment",
			color: "red",
		}));

		let resolveCatalogFetch: (() => void) | null = null;
		const catalogFetchDone = new Promise<void>((r) => {
			resolveCatalogFetch = r;
		});
		globalThis.fetch = async (url: RequestInfo | URL) => {
			if (String(url).includes("/api/catalogs/tooth-defects")) {
				queueMicrotask(() => resolveCatalogFetch?.());
				return new Response(JSON.stringify({ data: { count: 91, defects: apiDefects } }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			return new Response(null, { status: 404 });
		};

		const quickCalls: Array<{ targets: number[]; state: string }> = [];
		const appliedDefects: CatalogDefectOption[] = [];

		mountedRoot = createRoot(container as unknown as HTMLElement);
		await act(async () => {
			mountedRoot!.render(
				<OdontogramStampPalette
					activeStampTool={null}
					setActiveStampTool={() => {}}
					selectedTeeth={[16]}
					onQuickStateChange={(targets, state) => {
						quickCalls.push({ targets, state });
					}}
					handleQuickTriggerState={() => {}}
					onApplyCatalogDefect={(defect) => {
						appliedDefects.push(defect);
					}}
				/>,
			);
		});
		await catalogFetchDone;
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});

		const triggerBtn = findByTestId(container, "odontogram-all-defects-trigger");
		assert.ok(triggerBtn, "Trigger button must exist");
		assert.ok(triggerBtn.textContent.includes("Классификатор (91)"), `Expected 91 defects, got: ${triggerBtn.textContent}`);

		await act(async () => {
			invokeReactProp(triggerBtn, "onClick", { type: "click", preventDefault: () => {} });
		});

		// Popover must be portaled into document.body (outside container)
		assert.equal(findByTestId(container, "odontogram-all-defects-popover"), null, "Popover must not render inline inside palette container");
		const portaledPopover = findByTestId(doc.body, "odontogram-all-defects-popover");
		assert.ok(portaledPopover, "Popover must be portaled into document.body");

		const item90 = findByTestId(doc.body, "catalog-defect-item-D90");
		assert.ok(item90, "Item #90 from 91-item catalog must render inside portal");

		await act(async () => {
			invokeReactProp(item90, "onClick", { type: "click", preventDefault: () => {} });
		});

		assert.equal(quickCalls.length, 1, "Applying catalog defect must trigger onQuickStateChange strictly once");
		assert.deepEqual(quickCalls[0]?.targets, [16]);
		assert.equal(appliedDefects.length, 1);
		assert.equal(appliedDefects[0]?.id, 90);
		assert.equal(appliedDefects[0]?.alias, "D90");
		assert.equal(
			dispatchedEvents.includes("dente:apply-tooth-defect"),
			false,
			"Dead CustomEvent dente:apply-tooth-defect must NOT be dispatched",
		);
	});

	it("fires onQuickStateChange strictly once on stamp click with selectedTeeth and sends 1 batch call from OdontogramQuickTextInput", async () => {
		const { doc } = setupCleanDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		const stateCalls: Array<{ targets: number[]; state: string; surfaces?: readonly string[] | undefined }> = [];
		const onQuickStateChange = (targets: number[], state: string, surfaces?: readonly string[] | undefined) => {
			stateCalls.push({ targets, state, surfaces });
		};

		mountedRoot = createRoot(container as unknown as HTMLElement);
		await act(async () => {
			mountedRoot!.render(
				<OdontogramActiveViewSlot
					activeMode="compact_clinical"
					sharedViewProps={{
						teethData: [{ toothNumber: 16, state: "Healthy" }],
						selectedTeeth: [16, 17],
						onSelectTeethGroup: () => {},
						onClearSelection: () => {},
						onInvertSelection: () => {},
					}}
					showPulpAndCanals={false}
					onQuickStateChange={onQuickStateChange}
					activeStampTool={null}
					setActiveStampTool={() => {}}
					handleQuickTriggerState={(state) => {
						onQuickStateChange([16, 17], state, []);
					}}
					selectedTeeth={[16, 17]}
					isLiveInvoiceOpen={false}
					setIsLiveInvoiceOpen={() => {}}
					teethData={[{ toothNumber: 16, state: "Healthy" }]}
				/>,
			);
		});

		const cariesBtn = findByTestId(container, "quick-trigger-caries-btn");
		assert.ok(cariesBtn, "Caries stamp button must render");

		await act(async () => {
			invokeReactProp(cariesBtn, "onClick", { type: "click", preventDefault: () => {} });
		});

		assert.equal(
			stateCalls.length,
			1,
			`Expected callCount === 1 on stamp click with selectedTeeth, got ${stateCalls.length}`,
		);
		assert.deepEqual(stateCalls[0]?.targets, [16, 17]);
		assert.equal(stateCalls[0]?.state, "Caries");

		// Now test batch quick text input ("16, 17, 26 кариес") — must batch into 1 call (not 3-item for loop)
		stateCalls.length = 0;
		const quickInput = findByTestId(container, "odontogram-quick-text-input");
		assert.ok(quickInput, "OdontogramQuickTextInput must render");
		const inputs = findAllByTag(quickInput, "input");
		assert.ok(inputs[0], "Quick text <input> must exist");

		await act(async () => {
			inputs[0]!.value = "16, 17, 26 кариес";
			invokeReactProp(inputs[0]!, "onChange", {
				target: { value: "16, 17, 26 кариес" },
				currentTarget: { value: "16, 17, 26 кариес" },
			});
		});

		const applyBtn = findByTestId(quickInput, "odontogram-quick-input-apply-btn");
		assert.ok(applyBtn, "Quick text apply button must exist");
		await act(async () => {
			invokeReactProp(applyBtn, "onClick", {
				type: "click",
				preventDefault: () => {},
			});
		});

		assert.equal(stateCalls.length, 1, "Quick text batch for 3 teeth with same pathology must fire 1 batch call");
		assert.deepEqual(stateCalls[0]?.targets, [16, 17, 26]);
		assert.equal(stateCalls[0]?.state, "Caries");
	});
});
