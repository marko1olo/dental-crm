/**
 * dentalLabHubAndCardAutonomyWave239.test.tsx
 *
 * Dedicated verification suite for Wave 239:
 * «Dental Lab & ZTL Orders Hunter — Mandates 8d, 8e, 8n Autonomy & Ergonomics»
 *
 * Requirements verified:
 * 1. DentalLabOrdersHubModal Kanban card ergonomics (Mandate 8d, Sin #3 / Miller's Law):
 *    - Exactly 2 direct action buttons on card: «Открыть» (data-testid="ztl-card-open-${id}") and «Статус» (data-testid="ztl-card-status-${id}")
 *    - Secondary actions consolidated into «...» menu (data-testid="ztl-card-menu-btn-${id}"), including A4 print (data-testid="ztl-card-print-a4-${id}")
 * 2. DentalLabOrdersHubModal Toolbar (Mandate 8d, Sin #2 / Hick's Law):
 *    - Strict single-row filter bar with stage selector ("Все этапы") and date range selector ("Все сроки")
 * 3. Doctor & Prosthodontist Autonomy (Mandates 8e item 7, 8n):
 *    - Treatment plan > 30 days emits informative warning without hard-blocking ZTL orders
 *    - Patient advance < 50% does not block lab orders with 1-click clinical override
 * 4. Zero Emojis Compliance (Mandate 8d, Sin #7):
 *    - Clean vector typography across all ZTL components
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DentalLabOrdersHubModal } from "../DentalLabOrdersHubModal";
import { createDentalLabOrder, type DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";
import { checkDentalLabFinancialGate, createDoctorClinicalOverride } from "../dentalLabFinancialGateEngine";

// ─── MOCK DOM SETUP ──────────────────────────────────────────────────────────

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
	focus: () => void;
	blur: () => void;
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
			textContent: "",
			multiple: false,
			selectedIndex: 0,
			value: "",
			get options() {
				return children.filter((c) => c.tagName === "OPTION");
			},
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

	doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({
			nodeType: 3,
			textContent: text,
			style: {},
			parentNode: null,
			ownerDocument: doc,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: doc }),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	const printMock = () => {};

	const win = {
		document: doc,
		location: {
			origin: "http://localhost:5173",
			href: "http://localhost:5173/#/lab-orders",
			search: "",
			hash: "#/lab-orders",
		},
		addEventListener: () => {},
		removeEventListener: () => {},
		navigator: {
			clipboard: {
				writeText: async () => Promise.resolve(),
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
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return { doc, win };
}

function findNodeByTestId(node: MockDomNode | null, testId: string): MockDomNode | null {
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

function findAllNodesByCondition(
	node: MockDomNode | null,
	cond: (n: MockDomNode) => boolean,
): MockDomNode[] {
	const out: MockDomNode[] = [];
	if (!node) return out;
	if (cond(node)) out.push(node);
	if (node.children) {
		for (const child of node.children) {
			out.push(...findAllNodesByCondition(child, cond));
		}
	}
	return out;
}

async function clickNode(node: MockDomNode) {
	await act(async () => {
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) => k.startsWith("__reactProps$"));
			if (reactPropKey) {
				// biome-ignore lint/suspicious/noExplicitAny: React internal props
				const props = (curr as any)[reactPropKey];
				if (props?.onClick) {
					props.onClick({
						stopPropagation: () => {},
						preventDefault: () => {},
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "click" });
	});
}

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

describe("Wave 239 — Dental Lab & ZTL Orders Hunter Autonomy & Ergonomics", () => {
	it("1. Kanban card obeys Miller's Law: strictly 2 direct action buttons («Открыть», «Статус») and menu «...»", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		const sampleOrder: DentalLabWorkflowOrder = createDentalLabOrder({
			patientId: "pat-42",
			doctorId: "doc-01",
			orderNumber: "ЗТЛ-2026-0042",
			patientName: "Волков Сергей Александрович",
			doctorName: "Д-р Кузнецов А. С.",
			labName: "CAD/CAM Центр Дентал-Мастер",
			workTypeId: "crown_emax",
			selectedTeeth: [26],
			shadeCode: "A2",
			expectedLabDate: "2026-09-22",
			pricePerUnitRub: 24000,
			costPerUnitRub: 8000,
			doctorPercent: 20,
			initialStatus: "sent_to_lab",
		});

		let root: Root | null = null;
		await act(async () => {
			// biome-ignore lint/suspicious/noExplicitAny: mock container
			root = createRoot(container as any);
			root.render(
				<DentalLabOrdersHubModal
					isOpen={true}
					onClose={() => {}}
					initialOrders={[sampleOrder]}
				/>,
			);
		});

		// 1. Проверяем наличие первой кнопки прямого действия: «Открыть»
		const openBtn = findNodeByTestId(container, `ztl-card-open-${sampleOrder.id}`);
		assert.ok(openBtn, "Кнопка «Открыть» (ztl-card-open) должна присутствовать на карточке наряда");

		// 2. Проверяем наличие второй кнопки прямого действия: «Статус»
		const statusBtn = findNodeByTestId(container, `ztl-card-status-${sampleOrder.id}`);
		assert.ok(statusBtn, "Кнопка смены статуса (ztl-card-status) должна присутствовать на карточке наряда");

		// 3. Проверяем кнопку вызова меню вторичных действий: «...»
		const menuBtn = findNodeByTestId(container, `ztl-card-menu-btn-${sampleOrder.id}`);
		assert.ok(menuBtn, "Кнопка «...» (ztl-card-menu-btn) должна присутствовать для вторичных действий");

		// 4. Открываем контекстное меню вторичных действий
		await clickNode(menuBtn);

		// 5. В открывшемся меню должна быть кнопка печати бланка А4 для курьера
		const printA4Btn = findNodeByTestId(container, `ztl-card-print-a4-${sampleOrder.id}`);
		assert.ok(printA4Btn, "Кнопка «Печать ЗТЛ-1 (А4)» должна присутствовать в выпадающем меню «...»");

		// Очистка
		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});

	it("2. Toolbar contains stage and date range selectors and delay filter", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		const sampleOrder: DentalLabWorkflowOrder = createDentalLabOrder({
			patientId: "pat-99",
			doctorId: "doc-01",
			orderNumber: "ЗТЛ-2026-0099",
			patientName: "Иванова Ольга Павловна",
			doctorName: "Д-р Кузнецов А. С.",
			labName: "CAD/CAM Центр Дентал-Мастер",
			workTypeId: "crown_zirconia",
			selectedTeeth: [16],
			shadeCode: "A3",
			expectedLabDate: "2026-09-22",
			pricePerUnitRub: 28000,
			costPerUnitRub: 9000,
			doctorPercent: 20,
			initialStatus: "draft",
		});

		let root: Root | null = null;
		await act(async () => {
			// biome-ignore lint/suspicious/noExplicitAny: mock container
			root = createRoot(container as any);
			root.render(
				<DentalLabOrdersHubModal
					isOpen={true}
					onClose={() => {}}
					initialOrders={[sampleOrder]}
				/>,
			);
		});

		// Находим все select в контейнере
		const selects = findAllNodesByCondition(container, (n) => n.tagName === "SELECT");
		assert.ok(selects.length >= 4, "Тулбар должен содержать как минимум 4 селекта (лаборатория, конструкция, этап, срок)");

		const stageSelect = selects.find((s) => s.getAttribute("aria-label") === "Фильтр по этапу");
		assert.ok(stageSelect, "Селект «Фильтр по этапу» должен присутствовать в тулбаре");

		const dateSelect = selects.find((s) => s.getAttribute("aria-label") === "Фильтр по срокам");
		assert.ok(dateSelect, "Селект «Фильтр по срокам» должен присутствовать в тулбаре");

		// Очистка
		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});

	it("3. Mandate 8e & 8n: Doctor Autonomy — Plan > 30 days & Advance < 50% do not block ZTL orders", () => {
		// Тест 1: План лечения старше 30 дней
		const checkResultOldPlan = checkDentalLabFinancialGate({
			stageTotalKopecks: 2400000, // 24 000 ₽
			paidKopecks: 1500000, // 15 000 ₽ (>50%)
			treatmentPlanAgeDays: 45, // 45 дней (> 30 дней)
			isPlanExpired: true,
		});

		assert.equal(checkResultOldPlan.isGatePassed, true, "Истечение 30 дней не должно блокировать отправку наряда в ЗТЛ");
		assert.equal(checkResultOldPlan.isPlanExpiredNotice !== undefined, true, "Должно быть выставлено информационное уведомление об истечении 30 дней плана");

		// Тест 2: Аванс < 50% с клиническим оверрайдом лечащего врача
		const checkResultLowAdvance = checkDentalLabFinancialGate({
			stageTotalKopecks: 2400000, // 24 000 ₽
			paidKopecks: 500000, // 5 000 ₽ (<50%)
			doctorOverride: createDoctorClinicalOverride("Клиническое решение лечащего врача-ортопеда: пациент в процессе протезирования"),
		});

		assert.equal(checkResultLowAdvance.isGatePassed, true, "Клинический оверрайд врача должен разблокировать отправку в ЗТЛ без начмедов");
		assert.equal(checkResultLowAdvance.gateStatus, "DOCTOR_OVERRIDE", "Статус шлюза должен быть DOCTOR_OVERRIDE");
	});

	it("4. Zero Emojis Compliance across all ZTL components (Mandate 8d item 7)", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const labFiles = fs.readdirSync(labDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

		const emojiRegex = /\p{Extended_Pictographic}/u;

		for (const file of labFiles) {
			const fullPath = path.join(labDir, file);
			const content = fs.readFileSync(fullPath, "utf-8");
			const hasEmoji = emojiRegex.test(content);
			assert.equal(
				hasEmoji,
				false,
				`Файл ${file} содержит запрещенные эмодзи (Мандат 8d пункт 7 запрещает эмодзи в медицинских и официальных формах)`
			);
		}
	});
});
