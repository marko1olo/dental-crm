/**
 * dentalLabAutonomyWave52.test.tsx
 *
 * Verification suite for Feature 239 (Wave 52):
 * «зуботехническая_лаборатория::1_клик_копирование_наряда_зтл_для_курьера_и_техника_в_мессенджеры_и_печать_из_любого_таба»
 *
 * Specifications covered:
 * 1. buildLabOrderMessengerSummary:
 *    - Pure function generating formatted text for WhatsApp/Telegram messenger delivery
 *    - Mandatory order fields: clinic name, phone, GOST number, patient, doctor, teeth/jaw, construction, material, shade, due date
 *    - Optional trial dates (framework trial, ceramic trial) and clinical notes
 *    - Fallback notes: "Без особенностей"
 *    - Strict zero-emoji compliance (Mandate 8d item 7)
 * 2. DentalLabOrderModal footer buttons:
 *    - data-testid="lab-order-copy-messenger-btn" with touch target >= 44x44px
 *    - data-testid="lab-order-footer-print-btn" with touch target >= 44x44px
 * 3. Interactions:
 *    - Clicking lab-order-copy-messenger-btn calls navigator.clipboard.writeText with formatted summary
 *    - Clicking lab-order-footer-print-btn triggers window.print() from any tab
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	DentalLabOrderModal,
	buildLabOrderMessengerSummary,
	type LabOrderMessengerParams,
} from "../DentalLabOrderModal";

// ─── MOCK DOM SETUP ──────────────────────────────────────────────────────────

type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
};

function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	return fn;
}

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
	appendChild: (child: MockDomNode) => MockDomNode;
	insertBefore: (child: MockDomNode, before: MockDomNode | null) => MockDomNode;
	removeChild: (child: MockDomNode) => MockDomNode;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: (type: string, fn: EventListener) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	removeAttribute: (name: string) => void;
	dispatchEvent: (ev: { type: string }) => boolean;
	getBoundingClientRect: () => {
		top: number;
		left: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	};
	[key: string]: unknown;
}

function setupMockDom() {
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
			},
			getAttribute: (name: string) => attrs[name] || null,
			removeAttribute: (name: string) => {
				delete attrs[name];
			},
			dispatchEvent: (ev: { type: string }) => {
				const list = listeners[ev.type] || [];
				for (const fn of list) {
					fn(ev as unknown as Event);
				}
				return true;
			},
			focus: () => {},
			blur: () => {},
			getBoundingClientRect: () => ({
				top: 0,
				left: 0,
				right: 1280,
				bottom: 900,
				width: 1280,
				height: 900,
			}),
		};
		return el;
	}

	const doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({
			nodeType: 3,
			textContent: text,
			style: {},
			parentNode: null,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null }),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	let lastCopiedText = "";
	const clipboardWriteMock = createMockFn(async (text: string) => {
		lastCopiedText = text;
		return Promise.resolve();
	});

	const printMock = createMockFn();

	const win = {
		document: doc,
		location: {
			origin: "http://localhost:5173",
			href: "http://localhost:5173/#/portal/lab-order/token-52",
			search: "",
			hash: "#/portal/lab-order/token-52",
		},
		addEventListener: () => {},
		removeEventListener: () => {},
		navigator: {
			clipboard: {
				writeText: clipboardWriteMock,
			},
		},
		print: printMock,
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
	g.print = printMock;
	if (g.navigator) {
		Object.defineProperty(g.navigator, "clipboard", {
			value: win.navigator.clipboard,
			configurable: true,
			writable: true,
		});
	} else {
		g.navigator = win.navigator;
	}
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return {
		doc,
		win,
		getClipboardText: () => lastCopiedText,
		clipboardWriteMock,
		printMock,
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
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				// biome-ignore lint/suspicious/noExplicitAny: access React internal props
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onClick === "function") {
					props.onClick({
						type: "click",
						preventDefault: () => {},
						stopPropagation: () => {},
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
	});
}

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

describe("Wave 52 (Feature 239) — Dental Lab Messenger Summary & Universal A4 Print", () => {
	it("1. buildLabOrderMessengerSummary correctly formats order summary with all fields and zero emojis", () => {
		const fullParams: LabOrderMessengerParams = {
			clinicName: "Денте Премиум",
			clinicPhone: "+7 (495) 777-88-99",
			gostOrderNumber: "ЗТЛ-2026-0908-4421",
			patientName: "Алексеев Владимир Сергеевич",
			doctorName: "Др. Коновалов И. П.",
			teethOrJaw: "Зуб 24",
			constructionTypeTitle: "Одиночная коронка",
			materialTitle: "Диоксид циркония Multi-layer (Katana HTML)",
			shade: "A2",
			dueDate: "15.09.2026",
			frameworkTrialDate: "11.09.2026",
			ceramicTrialDate: "13.09.2026",
			clinicalNotes: "Индивидуальная эстетика, легкая текстура, без выраженных мамелонов",
		};

		const text = buildLabOrderMessengerSummary(fullParams);

		// Assert line-by-line structure
		assert.ok(
			text.includes("Заказ-наряд в зуботехническую лабораторию (клиника «Денте Премиум»):"),
			"Должна присутствовать шапка клиники",
		);
		assert.ok(text.includes("Наряд: ЗТЛ-2026-0908-4421"), "Номер наряда ГОСТ");
		assert.ok(text.includes("Пациент: Алексеев Владимир Сергеевич"), "ФИО пациента");
		assert.ok(text.includes("Лечащий врач: Др. Коновалов И. П."), "ФИО врача");
		assert.ok(text.includes("Область: Зуб 24"), "Область вмешательства");
		assert.ok(text.includes("Конструкция: Одиночная коронка"), "Вид конструкции");
		assert.ok(text.includes("Материал: Диоксид циркония Multi-layer (Katana HTML)"), "Материал");
		assert.ok(text.includes("Цвет: A2"), "Цвет VITA");
		assert.ok(text.includes("Срок сдачи (Due date): 15.09.2026"), "Срок сдачи");
		assert.ok(text.includes("Примерка каркаса: 11.09.2026"), "Дата примерки каркаса");
		assert.ok(text.includes("Примерка керамики: 13.09.2026"), "Дата примерки керамики");
		assert.ok(
			text.includes("Особые указания: Индивидуальная эстетика, легкая текстура, без выраженных мамелонов"),
			"Клинические указания",
		);
		assert.ok(
			text.includes("Курьерская доставка / Связь с клиникой: +7 (495) 777-88-99."),
			"Телефон для курьера и связи",
		);

		// Strict zero emoji rule (Mandate 8d item 7)
		const emojiRegex = /\p{Extended_Pictographic}/u;
		assert.strictEqual(
			emojiRegex.test(text),
			false,
			"В выжимке наряда для мессенджеров строго запрещены эмодзи",
		);
	});

	it("2. buildLabOrderMessengerSummary handles optional trial dates and default notes", () => {
		const minimalParams: LabOrderMessengerParams = {
			clinicName: "Денте",
			gostOrderNumber: "ЗТЛ-2026-0001",
			patientName: "Иванова Ольга Николаевна",
			doctorName: "Др. Смирнова Е. В.",
			teethOrJaw: "Верхняя челюсть",
			constructionTypeTitle: "Бюгельный протез с замковой фиксацией",
			materialTitle: "КХС + Акрил",
			shade: "A3",
			dueDate: "20.09.2026",
		};

		const text = buildLabOrderMessengerSummary(minimalParams);

		assert.ok(
			!text.includes("Примерка каркаса:"),
			"Не должно быть строки примерки каркаса, если она не задана",
		);
		assert.ok(
			!text.includes("Примерка керамики:"),
			"Не должно быть строки примерки керамики, если она не задана",
		);
		assert.ok(
			text.includes("Особые указания: Без особенностей"),
			"При отсутствии примечаний должно быть указано «Без особенностей»",
		);
		assert.ok(
			text.includes("Курьерская доставка / Связь с клиникой: не указан."),
			"При отсутствии телефона клиники указывается «не указан»",
		);
		assert.ok(
			!text.includes("+7 (495) 123-45-67"),
			"Запрещены синтетические заглушки номеров телефонов",
		);
		assert.strictEqual(/\p{Extended_Pictographic}/u.test(text), false);
	});

	it("3. Footer contains 1-click copy and print buttons with touch targets >= 44px", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					<DentalLabOrderModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-52"
						patientName="Семенов Аркадий Петрович"
						doctorId="doc-1"
						doctorName="Др. Ортопедов В. С."
						initialToothFdi="24"
					/>,
				);
			});

			// Verify Copy button presence and touch target
			const copyBtn = findNodeByTestId(doc.body, "lab-order-copy-messenger-btn");
			assert.notStrictEqual(copyBtn, null, "Кнопка копирования наряда должна присутствовать в футере");
			const copyClass = copyBtn?.getAttribute("class") || "";
			assert.ok(
				copyClass.includes("min-h-[44px]"),
				"Кнопка копирования должна иметь тач-таргет min-h-[44px]",
			);

			// Verify Footer Print button presence and touch target
			const printBtn = findNodeByTestId(doc.body, "lab-order-footer-print-btn");
			assert.notStrictEqual(printBtn, null, "Кнопка быстрой печати наряда должна присутствовать в футере");
			const printClass = printBtn?.getAttribute("class") || "";
			assert.ok(
				printClass.includes("min-h-[44px]"),
				"Кнопка печати должна иметь тач-таргет min-h-[44px]",
			);
		} finally {
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("4. Clicking lab-order-copy-messenger-btn copies formatted summary to clipboard", async () => {
		const { doc, clipboardWriteMock, getClipboardText } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					<DentalLabOrderModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-52"
						patientName="Семенов Аркадий Петрович"
						doctorId="doc-1"
						doctorName="Др. Ортопедов В. С."
						initialToothFdi="24"
						clinicPhone="+7 (495) 999-88-77"
					/>,
				);
			});

			const copyBtn = findNodeByTestId(doc.body, "lab-order-copy-messenger-btn");
			assert.notStrictEqual(copyBtn, null);

			await clickNode(copyBtn!);

			assert.ok(
				clipboardWriteMock.calls.length >= 1,
				"Клик на кнопку копирования должен вызвать navigator.clipboard.writeText",
			);

			const copied = getClipboardText();
			assert.ok(
				copied.includes("Заказ-наряд в зуботехническую лабораторию"),
				"Скопированный текст должен содержать шапку наряда",
			);
			assert.ok(
				copied.includes("Семенов Аркадий Петрович"),
				"Скопированный текст должен содержать имя пациента",
			);
			assert.ok(
				copied.includes("Др. Ортопедов В. С."),
				"Скопированный текст должен содержать имя врача",
			);
			assert.ok(
				copied.includes("+7 (495) 999-88-77"),
				"Скопированный текст должен содержать переданный телефон клиники",
			);
			assert.strictEqual(
				/\p{Extended_Pictographic}/u.test(copied),
				false,
				"Скопированный текст не должен содержать эмодзи",
			);
		} finally {
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("5. Clicking lab-order-footer-print-btn triggers window.print()", async () => {
		const { doc, printMock } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					<DentalLabOrderModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-52"
						patientName="Семенов Аркадий Петрович"
						doctorId="doc-1"
						doctorName="Др. Ортопедов В. С."
					/>,
				);
			});

			const printBtn = findNodeByTestId(doc.body, "lab-order-footer-print-btn");
			assert.notStrictEqual(printBtn, null);

			await clickNode(printBtn!);

			assert.strictEqual(
				printMock.calls.length,
				1,
				"Клик по кнопке печати в футере должен вызвать window.print()",
			);
		} finally {
			await act(async () => {
				root.unmount();
			});
		}
	});
});
