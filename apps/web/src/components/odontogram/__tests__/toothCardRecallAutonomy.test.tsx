/**
 * apps/web/src/components/odontogram/__tests__/toothCardRecallAutonomy.test.tsx
 *
 * WAVE 107 (FEATURE RECALL AUTONOMY):
 * 1-Click Treatment Recall Scheduling from ToothCardModal
 * (DentalPin Parity, Mandate 8e — Doctor Autonomy, Mandate 8k — CRM Friction-Killer Law, Mandate 8d — 7 Deadly Sins)
 *
 * Invariants Tested:
 * 1. Existence of `data-testid="tooth-card-set-recall-btn"` in ToothCardModal.
 * 2. Accurate cycle and month offset calculation for each clinical tooth state:
 *    - Healthy -> standard_prophylaxis, 6 months ("Профгигиена 6 мес.")
 *    - Caries / Filled -> caries_high_risk, 6 months ("Контроль пломбы 6 мес.")
 *    - Pulpitis / Periodontitis -> periodontal_maintenance, 3 months ("Контроль пародонта / рентген 3 мес.")
 *    - Crown -> prosthetic_check, 6 months ("Окклюзия / коронка 6 мес.")
 *    - Implant / Planned_Implant -> implant_monitoring, 3 months ("Остеоинтеграция 3 мес.")
 *    - Missing -> standard_prophylaxis, 6 months ("Профосмотр 6 мес.")
 * 3. Execution of `onSetRecall(toothNumber, cycleType, monthsOffset)` on button click.
 * 4. Fallback global `window.dispatchEvent("dente-open-recall-modal")` when `onSetRecall` is omitted.
 * 5. Zero cartoon emojis in ToothCardModal (Mandate 8d / Apple HIG).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";

import {
	ToothCardModal,
	getSuggestedRecallForToothState,
} from "../ToothCardModal";
import type { ToothData } from "../ToothChart";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MockDomNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	children: MockDomNode[];
	childNodes: MockDomNode[];
	options: MockDomNode[];
	selectedOptions: MockDomNode[];
	attributes: { name: string; value: string }[];
	ownerDocument: unknown;
	parentNode: MockDomNode | null;
	textContent: string;
	disabled?: boolean;
	value?: string;
	className: string;
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

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	// biome-ignore lint/suspicious/noExplicitAny: mock DOM object
	let doc: any;

	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const options: MockDomNode[] = [];
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
			options,
			selectedOptions: [],
			attributes: [],
			ownerDocument: null,
			parentNode: null,
			textContent: "",
			disabled: false,
			value: "",
			className: "",
			appendChild: (child: MockDomNode) => {
				children.push(child);
				child.parentNode = el;
				if (child.tagName === "OPTION") {
					options.push(child);
				}
				return child;
			},
			insertBefore: (child: MockDomNode, before: MockDomNode | null) => {
				const idx = before ? children.indexOf(before) : -1;
				if (idx >= 0) children.splice(idx, 0, child);
				else children.push(child);
				child.parentNode = el;
				if (child.tagName === "OPTION") {
					options.push(child);
				}
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
				if (name === "class") {
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
				if (name === "class") {
					el.className = "";
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
		el.ownerDocument = doc;
		return el;
	}

	doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({
			nodeType: 3,
			textContent: text,
			style: {},
			parentNode: null,
			ownerDocument: null,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	if (typeof globalThis.CustomEvent === "undefined") {
		class CustomEventPolyfill<T = unknown> extends Event {
			detail: T;
			constructor(
				type: string,
				params?: { detail?: T; bubbles?: boolean; cancelable?: boolean },
			) {
				super(type, params);
				this.detail = params?.detail as T;
			}
		}
		// biome-ignore lint/suspicious/noExplicitAny: polyfill CustomEvent
		(globalThis as any).CustomEvent = CustomEventPolyfill;
	}

	const dispatchedEvents: CustomEvent[] = [];

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
		dispatchEvent: (ev: { type: string; [key: string]: unknown }) => {
			if (ev instanceof CustomEvent || ("detail" in ev)) {
				dispatchedEvents.push(ev as unknown as CustomEvent);
			}
			const list = winListeners[ev.type] || [];
			for (const fn of list) {
				fn(ev as unknown as Event);
			}
			return true;
		},
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
		CustomEvent: globalThis.CustomEvent,
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

	return { doc, win, dispatchedEvents };
}

function findNodeByTestId(
	node: MockDomNode | null,
	testId: string,
): MockDomNode | null {
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
		const reactPropKey = Object.keys(node).find((k) =>
			k.startsWith("__reactProps$"),
		);
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onClick === "function") {
				props.onClick({
					type: "click",
					preventDefault: () => {},
					stopPropagation: () => {},
				});
				return;
			}
		}
		node.dispatchEvent({ type: "click" });
	});
}

describe("WAVE 107: 1-Click Treatment Recall Scheduling from ToothCardModal", () => {
	describe("1. Clinical Cycle & Month Offset Calculation (DentalPin Parity)", () => {
		it("Healthy tooth suggests standard prophylaxis every 6 months", () => {
			const recall = getSuggestedRecallForToothState("Healthy");
			assert.strictEqual(recall.cycle, "standard_prophylaxis");
			assert.strictEqual(recall.months, 6);
			assert.strictEqual(recall.label, "Профгигиена 6 мес.");
		});

		it("Caries and Filled teeth suggest caries high-risk check every 6 months", () => {
			const cariesRecall = getSuggestedRecallForToothState("Caries");
			assert.strictEqual(cariesRecall.cycle, "caries_high_risk");
			assert.strictEqual(cariesRecall.months, 6);
			assert.strictEqual(cariesRecall.label, "Контроль пломбы 6 мес.");

			const filledRecall = getSuggestedRecallForToothState("Filled");
			assert.strictEqual(filledRecall.cycle, "caries_high_risk");
			assert.strictEqual(filledRecall.months, 6);
			assert.strictEqual(filledRecall.label, "Контроль пломбы 6 мес.");
		});

		it("Pulpitis and Periodontitis suggest periodontal maintenance every 3 months", () => {
			const pulpitisRecall = getSuggestedRecallForToothState("Pulpitis");
			assert.strictEqual(pulpitisRecall.cycle, "periodontal_maintenance");
			assert.strictEqual(pulpitisRecall.months, 3);
			assert.strictEqual(pulpitisRecall.label, "Контроль пародонта / рентген 3 мес.");

			const perioRecall = getSuggestedRecallForToothState("Periodontitis");
			assert.strictEqual(perioRecall.cycle, "periodontal_maintenance");
			assert.strictEqual(perioRecall.months, 3);
			assert.strictEqual(perioRecall.label, "Контроль пародонта / рентген 3 мес.");
		});

		it("Crown suggests prosthetic check every 6 months", () => {
			const recall = getSuggestedRecallForToothState("Crown");
			assert.strictEqual(recall.cycle, "prosthetic_check");
			assert.strictEqual(recall.months, 6);
			assert.strictEqual(recall.label, "Окклюзия / коронка 6 мес.");
		});

		it("Implant and Planned_Implant suggest osseointegration monitoring every 3 months", () => {
			const implantRecall = getSuggestedRecallForToothState("Implant");
			assert.strictEqual(implantRecall.cycle, "implant_monitoring");
			assert.strictEqual(implantRecall.months, 3);
			assert.strictEqual(implantRecall.label, "Остеоинтеграция 3 мес.");

			const plannedRecall = getSuggestedRecallForToothState("Planned_Implant");
			assert.strictEqual(plannedRecall.cycle, "implant_monitoring");
			assert.strictEqual(plannedRecall.months, 3);
			assert.strictEqual(plannedRecall.label, "Остеоинтеграция 3 мес.");
		});

		it("Missing tooth suggests standard prophylaxis every 6 months", () => {
			const recall = getSuggestedRecallForToothState("Missing");
			assert.strictEqual(recall.cycle, "standard_prophylaxis");
			assert.strictEqual(recall.months, 6);
			assert.strictEqual(recall.label, "Профосмотр 6 мес.");
		});
	});

	describe("2. ToothCardModal SSR Rendering & Label Verification", () => {
		it("renders data-testid=\"tooth-card-set-recall-btn\" with Healthy state label", () => {
			const toothData: ToothData = { toothNumber: 16, state: "Healthy" };
			const html = renderToString(
				<ToothCardModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={16}
					toothData={toothData}
				/>,
			);

			const cleanHtml = html.replace(/<!-- -->/g, "");
			assert.ok(cleanHtml.includes("data-testid=\"tooth-card-set-recall-btn\""));
			assert.ok(cleanHtml.includes("Вызов (Профгигиена 6 мес.)"));
		});

		it("renders data-testid=\"tooth-card-set-recall-btn\" with Implant state label", () => {
			const toothData: ToothData = { toothNumber: 21, state: "Implant" };
			const html = renderToString(
				<ToothCardModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={21}
					toothData={toothData}
				/>,
			);

			const cleanHtml = html.replace(/<!-- -->/g, "");
			assert.ok(cleanHtml.includes("data-testid=\"tooth-card-set-recall-btn\""));
			assert.ok(cleanHtml.includes("Вызов (Остеоинтеграция 3 мес.)"));
		});

		it("renders data-testid=\"tooth-card-set-recall-btn\" with Periodontitis state label", () => {
			const toothData: ToothData = { toothNumber: 46, state: "Periodontitis" };
			const html = renderToString(
				<ToothCardModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={46}
					toothData={toothData}
				/>,
			);

			const cleanHtml = html.replace(/<!-- -->/g, "");
			assert.ok(cleanHtml.includes("data-testid=\"tooth-card-set-recall-btn\""));
			assert.ok(cleanHtml.includes("Вызов (Контроль пародонта / рентген 3 мес.)"));
		});

		it("renders data-testid=\"tooth-card-set-recall-btn\" with Crown state label", () => {
			const toothData: ToothData = { toothNumber: 36, state: "Crown" };
			const html = renderToString(
				<ToothCardModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={36}
					toothData={toothData}
				/>,
			);

			const cleanHtml = html.replace(/<!-- -->/g, "");
			assert.ok(cleanHtml.includes("data-testid=\"tooth-card-set-recall-btn\""));
			assert.ok(cleanHtml.includes("Вызов (Окклюзия / коронка 6 мес.)"));
		});
	});

	describe("3. Interactive Click Execution & Callback / Event Dispatch", () => {
		it("invokes onSetRecall when button is clicked with correct tooth and cycle params", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);

			let recallTooth: number | null = null;
			let recallCycle: string | null = null;
			let recallMonths: number | null = null;

			const onSetRecall = (tooth: number, cycle: string, months: number) => {
				recallTooth = tooth;
				recallCycle = cycle;
				recallMonths = months;
			};

			const root: Root = createRoot(container as unknown as HTMLElement);
			await act(async () => {
				root.render(
					<ToothCardModal
						isOpen={true}
						onClose={() => {}}
						toothNumber={16}
						toothData={{ toothNumber: 16, state: "Healthy" }}
						onSetRecall={onSetRecall}
					/>,
				);
			});

			const btn = findNodeByTestId(container, "tooth-card-set-recall-btn");
			assert.ok(btn, "Recall button must be rendered in DOM");

			await clickNode(btn);

			assert.strictEqual(recallTooth, 16, "Must call onSetRecall with tooth 16");
			assert.strictEqual(recallCycle, "standard_prophylaxis", "Must have standard_prophylaxis cycle");
			assert.strictEqual(recallMonths, 6, "Must have 6 months offset");

			await act(async () => {
				root.unmount();
			});
		});

		it("dispatches dente-open-recall-modal CustomEvent when onSetRecall is not provided", async () => {
			const { doc, dispatchedEvents } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);

			const root: Root = createRoot(container as unknown as HTMLElement);
			await act(async () => {
				root.render(
					<ToothCardModal
						isOpen={true}
						onClose={() => {}}
						toothNumber={26}
						toothData={{ toothNumber: 26, state: "Implant" }}
					/>,
				);
			});

			const btn = findNodeByTestId(container, "tooth-card-set-recall-btn");
			assert.ok(btn, "Recall button must be present");

			await clickNode(btn);

			const recallEv = dispatchedEvents.find(
				(ev) => ev.type === "dente-open-recall-modal",
			);
			assert.ok(recallEv, "Must dispatch dente-open-recall-modal CustomEvent");
			assert.deepStrictEqual(
				// biome-ignore lint/suspicious/noExplicitAny: event detail check
				(recallEv as any).detail,
				{
					toothNumber: 26,
					cycleType: "implant_monitoring",
					monthsOffset: 3,
				},
				"Dispatched event detail must match tooth and suggested recall parameters",
			);

			await act(async () => {
				root.unmount();
			});
		});

		it("reactively updates recall cycle when doctor changes tooth state in modal", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);

			let recallTooth: number | null = null;
			let recallCycle: string | null = null;
			let recallMonths: number | null = null;

			const onSetRecall = (tooth: number, cycle: string, months: number) => {
				recallTooth = tooth;
				recallCycle = cycle;
				recallMonths = months;
			};

			const root: Root = createRoot(container as unknown as HTMLElement);
			await act(async () => {
				root.render(
					<ToothCardModal
						isOpen={true}
						onClose={() => {}}
						toothNumber={47}
						toothData={{ toothNumber: 47, state: "Healthy" }}
						onSetRecall={onSetRecall}
					/>,
				);
			});

			// Doctor clicks "Periodontitis" state button
			const perioBtn = findNodeByTestId(container, "tooth-card-state-Periodontitis");
			assert.ok(perioBtn, "Periodontitis state button must exist");
			await clickNode(perioBtn);

			// Doctor clicks recall button
			const recallBtn = findNodeByTestId(container, "tooth-card-set-recall-btn");
			assert.ok(recallBtn, "Recall button must exist");
			await clickNode(recallBtn);

			assert.strictEqual(recallTooth, 47);
			assert.strictEqual(recallCycle, "periodontal_maintenance");
			assert.strictEqual(recallMonths, 3);

			await act(async () => {
				root.unmount();
			});
		});
	});

	describe("4. 7 Deadly Sins & Mandate 8d Compliance", () => {
		it("guarantees 0 cartoon emojis in ToothCardModal.tsx (Mandate 8d & Apple HIG)", () => {
			const modalPath = path.resolve(__dirname, "../ToothCardModal.tsx");
			const content = fs.readFileSync(modalPath, "utf-8");
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.strictEqual(
				emojiRegex.test(content),
				false,
				"ToothCardModal.tsx must contain 0 cartoon emojis",
			);
		});
	});
});
