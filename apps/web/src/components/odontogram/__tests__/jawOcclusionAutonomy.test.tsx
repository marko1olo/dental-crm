/**
 * jawOcclusionAutonomy.test.tsx
 *
 * DENTE Dental CRM — Mandates 8e, 8i, 8k, 8n Verification:
 * 1. Mandate 8e (Doctor Autonomy): Zero dead/disabled buttons in JawOcclusionModal & VoiceDictationAssistantModal.
 * 2. Mandate 8k (CRM != Reality Simulator / Friction-Killer): 1-click physiological norm by default (ju_norm, jl_norm, c_orthognathic).
 * 3. Mandate 8i (Outpatient Bounded Context): Form 043/u SOAP presets without hospital/inpatient bloat.
 * 4. Mandate 8n (Solo Doctor Sovereignty): Instant action without mandatory pre-requisites.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	JawOcclusionModal,
	UPPER_JAW_PRESETS,
	LOWER_JAW_PRESETS,
	OCCLUSION_PRESETS,
} from "../JawOcclusionModal";
import { VoiceDictationAssistantModal } from "../../voice/VoiceDictationAssistantModal";

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

let mockDom: ReturnType<typeof setupMockDom>;

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	class FakeHTMLIFrameElement {}
	class FakeHTMLElement {}
	class FakeElement {}
	class FakeNode {}
	class FakeHTMLCanvasElement extends FakeHTMLElement {}

	// biome-ignore lint/suspicious/noExplicitAny: mock doc
	const doc: any = {
		nodeType: 9,
		createTextNode: (text: string) => {
			const textNode: MockDomNode = {
				nodeType: 3,
				tagName: "#text",
				nodeName: "#text",
				style: {},
				dataset: {},
				children: [],
				childNodes: [],
				attributes: [],
				ownerDocument: doc,
				parentNode: null,
				textContent: text,
				disabled: false,
				value: "",
				className: "",
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
			};
			return textNode;
		},
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
		addEventListener: () => {},
		removeEventListener: () => {},
		activeElement: null,
	};

	function createMockElement(tagName = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};

		const el: MockDomNode = {
			nodeType: 1,
			tagName: tagName.toUpperCase(),
			nodeName: tagName.toUpperCase(),
			style: {},
			dataset: {},
			children,
			childNodes: children,
			attributes: [],
			ownerDocument: doc,
			parentNode: null,
			textContent: "",
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
				right: 800,
				bottom: 600,
				width: 800,
				height: 600,
			}),
			focus: () => {},
			blur: () => {},
			contains: (other: MockDomNode) => {
				let cur: MockDomNode | null = other;
				while (cur) {
					if (cur === el) return true;
					cur = cur.parentNode;
				}
				return false;
			},
		};

		Object.defineProperty(el, "textContent", {
			get() {
				if (children.length === 0) return (el as any)._textContent || "";
				return children.map((c) => c.textContent || "").join("");
			},
			set(v) {
				(el as any)._textContent = v;
			},
		});

		if (tagName.toUpperCase() === "CANVAS") {
			(el as any).getContext = () => ({
				fillRect: () => {},
				clearRect: () => {},
				beginPath: () => {},
				moveTo: () => {},
				lineTo: () => {},
				stroke: () => {},
				fill: () => {},
				arc: () => {},
				closePath: () => {},
				save: () => {},
				restore: () => {},
				scale: () => {},
				translate: () => {},
				setTransform: () => {},
				resetTransform: () => {},
				createLinearGradient: () => ({ addColorStop: () => {} }),
			});
		}

		return el;
	}

	doc.createElement = createMockElement;
	doc.createElementNS = (_ns: string, tag: string) => createMockElement(tag);
	doc.documentElement = createMockElement("html");
	doc.body = createMockElement("body");

	const getComputedStyleMock = () => ({
		getPropertyValue: () => "",
	});

	const rafMock = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
	const cafMock = (id: number) => clearTimeout(id);

	// biome-ignore lint/suspicious/noExplicitAny: mock window
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
		CustomEvent: class {
			type: string;
			detail: unknown;
			constructor(type: string, init?: { detail?: unknown }) {
				this.type = type;
				this.detail = init?.detail;
			}
		},
		HTMLIFrameElement: FakeHTMLIFrameElement,
		HTMLElement: FakeHTMLElement,
		Element: FakeElement,
		Node: FakeNode,
		HTMLCanvasElement: FakeHTMLCanvasElement,
		innerWidth: 1200,
		getComputedStyle: getComputedStyleMock,
		requestAnimationFrame: rafMock,
		cancelAnimationFrame: cafMock,
	};
	doc.defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	g.CustomEvent = win.CustomEvent;
	g.HTMLIFrameElement = FakeHTMLIFrameElement;
	g.HTMLElement = FakeHTMLElement;
	g.Element = FakeElement;
	g.Node = FakeNode;
	g.HTMLCanvasElement = FakeHTMLCanvasElement;
	g.getComputedStyle = getComputedStyleMock;
	g.requestAnimationFrame = rafMock;
	g.cancelAnimationFrame = cafMock;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return { body: doc.body, winListeners, win, doc };
}

function findNodeByTestId(
	node: MockDomNode | null,
	testId: string,
): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.("data-testid") === testId || node.dataset?.testid === testId) return node;
	if (node.children) {
		for (const child of node.children) {
			const res = findNodeByTestId(child, testId);
			if (res) return res;
		}
	}
	return null;
}

function findAllNodesByTag(node: MockDomNode | null, tag: string): MockDomNode[] {
	if (!node) return [];
	const results: MockDomNode[] = [];
	if (node.tagName === tag.toUpperCase()) {
		results.push(node);
	}
	if (node.children) {
		for (const child of node.children) {
			results.push(...findAllNodesByTag(child, tag));
		}
	}
	return results;
}

async function clickNode(node: MockDomNode | null) {
	if (!node) return;
	await act(async () => {
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				// biome-ignore lint/suspicious/noExplicitAny: access React internal props
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

describe("JawOcclusionModal & VoiceDictationAssistantModal — Mandate 8e Doctor Autonomy Suite", () => {
	beforeEach(() => {
		mockDom = setupMockDom();
	});

	describe("JawOcclusionModal — Mandates 8e, 8k, 8n", () => {
		it("renders with 0 disabled buttons and displays 'Норма в 1 клик (043/у)' when no preset is selected", async () => {
			const container = mockDom.doc.createElement("div");
			mockDom.body.appendChild(container);

			let root: Root | null = null;
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<JawOcclusionModal
						isOpen={true}
						onClose={() => {}}
						initialTarget="JU"
					/>,
				);
			});

			const applyBtn = findNodeByTestId(mockDom.body, "jaw-modal-apply-btn");
			assert.ok(applyBtn, "Кнопка внесения/нормы в футере обязана присутствовать");
			assert.equal(applyBtn.disabled, false, "МАНДАТ 8e: Кнопка НЕ должна быть заблокирована (disabled=false)");
			assert.match(
				applyBtn.textContent || "",
				/Норма в 1 клик/,
				"Текст кнопки по умолчанию должен предлагать норму в 1 клик",
			);

			const normBtn = findNodeByTestId(mockDom.body, "jaw-1click-norm-btn");
			assert.ok(normBtn, "Верхняя кнопка нормы в 1 клик обязана присутствовать");
			assert.equal(normBtn.disabled, false, "Кнопка нормы не должна быть заблокирована");

			await act(async () => {
				root?.unmount();
			});
		});

		it("clicking apply button without selection automatically applies 'ju_norm' for Upper Jaw (JU)", async () => {
			const container = mockDom.doc.createElement("div");
			mockDom.body.appendChild(container);

			let appliedFinding: unknown = null;
			let root: Root | null = null;
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<JawOcclusionModal
						isOpen={true}
						onClose={() => {}}
						initialTarget="JU"
						onApply={(finding) => {
							appliedFinding = finding;
						}}
					/>,
				);
			});

			const applyBtn = findNodeByTestId(mockDom.body, "jaw-modal-apply-btn");
			assert.ok(applyBtn, "Кнопка jaw-modal-apply-btn найдена");

			await clickNode(applyBtn);

			assert.ok(appliedFinding, "onApply должен быть вызван без предварительного выбора пресета");
			const res = appliedFinding as { code: string; nameRu: string; titleRu: string; soapText: string };
			assert.equal(res.code, "JU");
			assert.equal(res.nameRu, "Верхняя челюсть");
			assert.match(res.titleRu, /Физиологическая норма/);
			assert.match(res.soapText, /Верхняя челюсть.*альвеолярный отросток/);

			await act(async () => {
				root?.unmount();
			});
		});

		it("clicking apply button without selection automatically applies 'jl_norm' for Lower Jaw (JL)", async () => {
			const container = mockDom.doc.createElement("div");
			mockDom.body.appendChild(container);

			let appliedFinding: unknown = null;
			let root: Root | null = null;
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<JawOcclusionModal
						isOpen={true}
						onClose={() => {}}
						initialTarget="JL"
						onApply={(finding) => {
							appliedFinding = finding;
						}}
					/>,
				);
			});

			const applyBtn = findNodeByTestId(mockDom.body, "jaw-modal-apply-btn");
			assert.ok(applyBtn);

			await clickNode(applyBtn);

			assert.ok(appliedFinding);
			const res = appliedFinding as { code: string; nameRu: string; titleRu: string; soapText: string };
			assert.equal(res.code, "JL");
			assert.equal(res.nameRu, "Нижняя челюсть");
			assert.match(res.titleRu, /Физиологическая норма/);
			assert.match(res.soapText, /Нижняя челюсть.*альвеолярная часть/);

			await act(async () => {
				root?.unmount();
			});
		});

		it("clicking apply button without selection automatically applies 'c_orthognathic' for Occlusion (C)", async () => {
			const container = mockDom.doc.createElement("div");
			mockDom.body.appendChild(container);

			let appliedFinding: unknown = null;
			let root: Root | null = null;
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<JawOcclusionModal
						isOpen={true}
						onClose={() => {}}
						initialTarget="C"
						onApply={(finding) => {
							appliedFinding = finding;
						}}
					/>,
				);
			});

			const applyBtn = findNodeByTestId(mockDom.body, "jaw-modal-apply-btn");
			assert.ok(applyBtn);

			await clickNode(applyBtn);

			assert.ok(appliedFinding);
			const res = appliedFinding as { code: string; nameRu: string; titleRu: string; soapText: string };
			assert.equal(res.code, "C");
			assert.equal(res.nameRu, "Прикус");
			assert.match(res.titleRu, /Ортогнатический/);
			assert.match(res.soapText, /Прикус.*ортогнатический/);

			await act(async () => {
				root?.unmount();
			});
		});

		it("dispatches 'dente-apply-soap-protocol' event with Form 043/u SOAP text upon applying norm", async () => {
			const container = mockDom.doc.createElement("div");
			mockDom.body.appendChild(container);

			let dispatchedEvent: unknown = null;
			mockDom.win.addEventListener("dente-apply-soap-protocol", (e: any) => {
				dispatchedEvent = (e as CustomEvent).detail;
			});

			let root: Root | null = null;
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<JawOcclusionModal
						isOpen={true}
						onClose={() => {}}
						initialTarget="JU"
					/>,
				);
			});

			const normBtn = findNodeByTestId(mockDom.body, "jaw-1click-norm-btn");
			assert.ok(normBtn);

			await clickNode(normBtn);

			assert.ok(dispatchedEvent, "Событие dente-apply-soap-protocol должно быть отправлено в окно");
			const detail = dispatchedEvent as { targetCode: string; soap: { statusLocalis: string } };
			assert.equal(detail.targetCode, "JU");
			assert.match(detail.soap.statusLocalis, /Верхняя челюсть/);

			await act(async () => {
				root?.unmount();
			});
		});
	});

	describe("VoiceDictationAssistantModal — Mandate 8e & Non-blocking Apply", () => {
		it("renders 'Применить всё' button enabled (disabled=false) even when 0 commands are recognized", async () => {
			const container = mockDom.doc.createElement("div");
			mockDom.body.appendChild(container);

			let root: Root | null = null;
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<VoiceDictationAssistantModal
						isOpen={true}
						onClose={() => {}}
					/>,
				);
			});

			const buttons = findAllNodesByTag(mockDom.body, "button");
			const applyAllBtn = buttons.find((b) => (b.textContent || "").includes("Применить всё"));
			assert.ok(applyAllBtn, "Кнопка 'Применить всё' должна присутствовать в модалке");
			assert.equal(
				applyAllBtn.disabled,
				false,
				"МАНДАТ 8e: Кнопка 'Применить всё' НЕ должна быть заблокирована серым замком",
			);

			await act(async () => {
				root?.unmount();
			});
		});

		it("clicking 'Применить всё' with 0 commands displays informative guidance toast without errors", async () => {
			const container = mockDom.doc.createElement("div");
			mockDom.body.appendChild(container);

			let toastDetail: unknown = null;
			mockDom.win.addEventListener("dente-toast", (e: any) => {
				toastDetail = (e as CustomEvent).detail;
			});

			let root: Root | null = null;
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<VoiceDictationAssistantModal
						isOpen={true}
						onClose={() => {}}
					/>,
				);
			});

			const buttons = findAllNodesByTag(mockDom.body, "button");
			const applyAllBtn = buttons.find((b) => (b.textContent || "").includes("Применить всё"));
			assert.ok(applyAllBtn);

			await clickNode(applyAllBtn);

			assert.ok(toastDetail, "При клике без команд должен всплыть информационный тост-подсказка");
			const t = toastDetail as { text: string; type: string };
			assert.equal(t.type, "info");
			assert.match(t.text, /Произнесите диагноз или статус зуба в микрофон/);

			await act(async () => {
				root?.unmount();
			});
		});
	});

	describe("Mandate 8i (Outpatient Bounded Context) — Clinical Presets Sanity", () => {
		it("Upper jaw presets contain physiological norm and dental outpatient pathology only", () => {
			const norm = UPPER_JAW_PRESETS.find((p) => p.isNorm);
			assert.ok(norm, "Верхняя челюсть обязана содержать пресет нормы");
			assert.equal(norm.id, "ju_norm");
			assert.match(norm.titleRu, /Норма/i);
			assert.ok(norm.soapStatusLocalis.length > 20);

			for (const p of UPPER_JAW_PRESETS) {
				assert.ok(!p.titleRu.toLowerCase().includes("лапаротомия"), "Запрещен госпитальный блоат");
				assert.ok(!p.titleRu.toLowerCase().includes("трансфузия"), "Запрещен трансфузиологический блоат");
				assert.ok(!p.titleRu.toLowerCase().includes("паллиатив"), "Запрещен коечный стационар");
			}
		});

		it("Lower jaw presets contain physiological norm and dental outpatient pathology only", () => {
			const norm = LOWER_JAW_PRESETS.find((p) => p.isNorm);
			assert.ok(norm, "Нижняя челюсть обязана содержать пресет нормы");
			assert.equal(norm.id, "jl_norm");
			assert.match(norm.titleRu, /Норма/i);
			assert.ok(norm.soapStatusLocalis.length > 20);
		});

		it("Occlusion presets contain orthognathic physiological norm", () => {
			const norm = OCCLUSION_PRESETS.find((p) => p.isNorm);
			assert.ok(norm, "Окклюзия обязана содержать пресет нормы");
			assert.equal(norm.id, "c_orthognathic");
			assert.match(norm.titleRu, /Ортогнатический/i);
			assert.ok(norm.soapStatusLocalis.length > 20);
		});
	});
});
