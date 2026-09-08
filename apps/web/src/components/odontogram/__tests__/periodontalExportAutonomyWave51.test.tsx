/**
 * periodontalExportAutonomyWave51.test.tsx
 *
 * Wave 51 (Feature 237):
 * «пародонтограмма_экспорт::1_клик_копирование_пародонтологического_статуса_индексов_гигиены_для_пациента_и_печать_карты_а4»
 *
 * CONSTITUTIONAL INVARIANTS TESTED:
 * 1. Mandate 8e: Doctor & Patient Autonomy (1-click export of understandable perio indices for patient messengers: WhatsApp/Telegram).
 * 2. Mandate 8d (p. 2, 7): 7 Deadly Sins of UI (1-row presets toolbar, zero cartoon emojis in clinical documents).
 * 3. Mandate 8c & Apple HIG: Touch targets strictly >= 44x44px for gloved chairside operation.
 * 4. Mandate 8i & 8k: Specialized outpatient dental context and friction-killer law (instant Florida probe A4 print).
 * 5. Mandate 8n: Solo Doctor & Small Clinic Sovereignty (works without setup barriers, defaults for clinicName & clinicPhone).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
	createDefaultPerioTeeth,
	calculatePerioIndices,
	type PerioToothRecord,
} from "@dental/shared";
import {
	PeriodontalChartingModal,
	formatPatientPerioSummaryText,
	extractPatientPerioSummaryIndices,
} from "../PeriodontalChartingModal";

// ============================================================================
// Lightweight Mock DOM for headless React 19 interactive testing in Node.js
// ============================================================================

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
	// biome-ignore lint/suspicious/noExplicitAny: mock DOM
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
			ownerDocument: null,
			parentNode: null,
			textContent: "",
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
				if (name === "class" || name === "className") {
					el.className = value;
				}
				if (name.startsWith("data-")) {
					el.dataset[name.slice(5)] = value;
				}
			},
			getAttribute: (name: string) => {
				if (name === "class" || name === "className") {
					return el.className || attrs[name] || null;
				}
				return attrs[name] || null;
			},
			hasAttribute: (name: string) => name in attrs || (name === "class" && Boolean(el.className)),
			removeAttribute: (name: string) => {
				delete attrs[name];
				if (name === "class" || name === "className") {
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

	let lastWrittenClipboardText = "";
	let printCalled = false;

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
			const list = winListeners[ev.type] || [];
			for (const fn of list) {
				fn(ev as unknown as Event);
			}
			return true;
		},
		navigator: {
			clipboard: {
				writeText: async (text: string) => {
					lastWrittenClipboardText = text;
					return Promise.resolve();
				},
			},
		},
		print: () => {
			printCalled = true;
		},
		location: { href: "http://localhost:5173", search: "" },
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
	};
	(doc as unknown as { defaultView: typeof win }).defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	if (g.navigator) {
		Object.defineProperty(g.navigator, "clipboard", {
			value: win.navigator.clipboard,
			configurable: true,
			writable: true,
		});
	} else {
		Object.defineProperty(g, "navigator", {
			value: win.navigator,
			configurable: true,
			writable: true,
		});
	}
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return {
		doc,
		win,
		getClipboardText: () => lastWrittenClipboardText,
		wasPrintCalled: () => printCalled,
		reset: () => {
			lastWrittenClipboardText = "";
			printCalled = false;
		},
	};
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
				await props.onClick({
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

describe("Wave 51 (Feature 237): Periodontal Export Autonomy & Florida Probe A4 Print", () => {
	describe("1. SSR Structure, Buttons & Zero-Emoji Sanity (Mandates 8d, 8c)", () => {
		it("renders perio-copy-patient-summary-btn and perio-print-chart-btn in footer", () => {
			const html = renderToString(
				<PeriodontalChartingModal
					isOpen={true}
					onClose={() => {}}
					patientName="Алексеев Владимир Сергеевич"
					doctorName="Д-р Воронова Е.А."
					clinicName="Стоматология ДЕНТЕ Плюс"
					clinicPhone="+7 (495) 777-22-33"
				/>,
			);

			// Check presence of data-testid attributes
			assert.ok(
				html.includes('data-testid="perio-copy-patient-summary-btn"'),
				"perio-copy-patient-summary-btn must be present in DOM",
			);
			assert.ok(
				html.includes('data-testid="perio-print-chart-btn"'),
				"perio-print-chart-btn must be present in DOM",
			);

			// Check labels
			assert.ok(
				html.includes("Скопировать для пациента"),
				"Must render button label 'Скопировать для пациента'",
			);
			assert.ok(
				html.includes("Печать карты (А4)"),
				"Must render button label 'Печать карты (А4)'",
			);
		});

		it("guarantees touch target strictly >= 44x44px on export and print action buttons", () => {
			const html = renderToString(
				<PeriodontalChartingModal
					isOpen={true}
					onClose={() => {}}
					patientName="Тестовый Пациент"
				/>,
			);

			// Both buttons use perio-secondary-btn class which defines min-height: 48px, padding: 10px 20px
			const copyMatch = html.match(
				/<button[^>]*data-testid="perio-copy-patient-summary-btn"[^>]*class="([^"]*)"/,
			);
			assert.ok(copyMatch, "perio-copy-patient-summary-btn match found");
			assert.ok(
				copyMatch[1]?.includes("perio-secondary-btn"),
				"Copy button must have perio-secondary-btn class (min-height 48px >= 44px)",
			);

			const printMatch = html.match(
				/<button[^>]*data-testid="perio-print-chart-btn"[^>]*class="([^"]*)"/,
			);
			assert.ok(printMatch, "perio-print-chart-btn match found");
			assert.ok(
				printMatch[1]?.includes("perio-secondary-btn"),
				"Print button must have perio-secondary-btn class (min-height 48px >= 44px)",
			);
		});

		it("Mandate 8d p. 7: Zero cartoon emojis in medical/clinical documents and buttons", () => {
			const html = renderToString(
				<PeriodontalChartingModal
					isOpen={true}
					onClose={() => {}}
					patientName="Пациент Без Эмодзи"
				/>,
			);

			// Sanctity of Medical Records: strictly no cartoon emojis
			const forbiddenEmojis = ["⚡", "💡", "🦷", "🔬", "📋", "🖨️", "🩺", "💉", "💊", "🚨"];
			for (const emoji of forbiddenEmojis) {
				assert.strictEqual(
					html.includes(emoji),
					false,
					`Rendered HTML must NOT contain cartoon emoji: "${emoji}"`,
				);
			}
		});
	});

	describe("2. Pure Formatting Function formatPatientPerioSummaryText", () => {
		it("formats intact physiological norm summary accurately", () => {
			const teeth = createDefaultPerioTeeth(2);
			const text = formatPatientPerioSummaryText(teeth, undefined, {
				clinicName: "Клиника ДЕНТЕ",
				clinicPhone: "+7 (495) 123-45-67",
				patientName: "Иванова Ольга Павловна",
				doctorName: "Д-р Смирнов К.И.",
			});

			assert.ok(text.includes("Результаты пародонтологического обследования (клиника «Клиника ДЕНТЕ»):"));
			assert.ok(text.includes("Пациент: Иванова Ольга Павловна"));
			assert.ok(text.includes("Лечащий врач: Д-р Смирнов К.И."));
			assert.ok(text.includes("Индекс гигиены Грина-Вермиллиона (OHI-S): 0 (Хорошая)"));
			assert.ok(text.includes("Кровоточивость при зондировании (BOP): 0% (норма)"));
			assert.ok(text.includes("Индекс зубного налета (PLI): 0%"));
			assert.ok(text.includes("Средняя глубина карманов: 2 мм (карманов >3 мм: 0)"));
			assert.ok(text.includes("Клинический статус (AAP/EFP 2018): Пародонт в норме"));
			assert.ok(text.includes("Рекомендации: соблюдайте индивидуальную гигиену (ершики, монопучковая щетка, зубная нить), плановый осмотр через 3-6 месяцев."));
			assert.ok(text.includes("Телефон клиники для связи: +7 (495) 123-45-67."));
		});

		it("formats pathology (gingivitis/periodontitis) with OHI-S and BOP % properly", () => {
			const teeth = createDefaultPerioTeeth(2);
			// Add pathology on tooth 16 and 46
			const t16 = teeth.find((t) => t.toothNumber === 16)!;
			t16.mesioBuccal.probingDepthMm = 5;
			t16.mesioBuccal.bleedingOnProbing = true;
			t16.mesioBuccal.plaque = true;
			t16.mesioBuccal.calculus = true;
			t16.midBuccal.plaque = true;
			t16.distoBuccal.probingDepthMm = 4;
			t16.distoBuccal.bleedingOnProbing = true;

			const t46 = teeth.find((t) => t.toothNumber === 46)!;
			t46.mesioBuccal.probingDepthMm = 6;
			t46.mesioBuccal.bleedingOnProbing = true;

			const text = formatPatientPerioSummaryText(teeth, undefined, {
				patientName: "Сидоров М.В.",
				doctorName: "Д-р Петров В.А.",
			});

			assert.ok(text.includes("Пациент: Сидоров М.В."));
			assert.ok(text.includes("Лечащий врач: Д-р Петров В.А."));
			assert.ok(text.includes("Индекс гигиены Грина-Вермиллиона (OHI-S):"));
			assert.ok(text.includes("Кровоточивость при зондировании (BOP):"));
			assert.ok(text.includes("Индекс зубного налета (PLI):"));
			assert.ok(text.includes("Средняя глубина карманов:"));
			assert.ok(text.includes("карманов >3 мм: 3"));
			assert.ok(text.includes("Телефон клиники для связи: уточняйте в регистратуре."));
		});
	});

	describe("3. Interactive Click & Clipboard Copying (Mandates 8e, 8k)", () => {
		let mockDom: ReturnType<typeof setupMockDom>;
		let root: Root | null = null;
		let container: MockDomNode | null = null;

		beforeEach(() => {
			mockDom = setupMockDom();
			mockDom.reset();
			container = mockDom.doc.createElement("div");
			mockDom.doc.body.appendChild(container);
			root = createRoot(container as unknown as HTMLElement);
		});

		afterEach(async () => {
			if (root) {
				await act(async () => {
					root?.unmount();
				});
			}
		});

		it("clicking perio-copy-patient-summary-btn copies text with OHI-S and BOP to navigator.clipboard", async () => {
			await act(async () => {
				root?.render(
					<PeriodontalChartingModal
						isOpen={true}
						onClose={() => {}}
						patientName="Егоров Станислав"
						doctorName="Д-р Воронова Е.А."
						clinicName="ДЕНТЕ Премиум"
						clinicPhone="+7 (495) 888-99-00"
					/>,
				);
			});

			const copyBtn = findNodeByTestId(container, "perio-copy-patient-summary-btn");
			assert.ok(copyBtn, "perio-copy-patient-summary-btn must be present");

			// Click copy button
			await clickNode(copyBtn);

			const copied = mockDom.getClipboardText();
			assert.ok(copied.length > 0, "Clipboard text must not be empty");
			assert.ok(
				copied.includes("Результаты пародонтологического обследования (клиника «ДЕНТЕ Премиум»):"),
				"Must include clinic header",
			);
			assert.ok(copied.includes("Пациент: Егоров Станислав"), "Must include patient name");
			assert.ok(copied.includes("Лечащий врач: Д-р Воронова Е.А."), "Must include doctor name");
			assert.ok(
				copied.includes("Индекс гигиены Грина-Вермиллиона (OHI-S):"),
				"Must include OHI-S index",
			);
			assert.ok(
				copied.includes("Кровоточивость при зондировании (BOP):"),
				"Must include BOP percentage",
			);
			assert.ok(
				copied.includes("Индекс зубного налета (PLI):"),
				"Must include PLI percentage",
			);
			assert.ok(
				copied.includes("Средняя глубина карманов:"),
				"Must include mean pocket depth and deep pockets count",
			);
			assert.ok(
				copied.includes("Клинический статус (AAP/EFP 2018):"),
				"Must include AAP/EFP status",
			);
			assert.ok(
				copied.includes("Телефон клиники для связи: +7 (495) 888-99-00."),
				"Must include clinic phone",
			);
		});

		it("clicking perio-print-chart-btn calls window.print() for A4 sheet export", async () => {
			await act(async () => {
				root?.render(
					<PeriodontalChartingModal
						isOpen={true}
						onClose={() => {}}
						patientName="Печатный Пациент"
					/>,
				);
			});

			const printBtn = findNodeByTestId(container, "perio-print-chart-btn");
			assert.ok(printBtn, "perio-print-chart-btn must be present");

			// Click print button
			await clickNode(printBtn);

			assert.strictEqual(mockDom.wasPrintCalled(), true, "window.print() must have been called");
		});
	});
});
