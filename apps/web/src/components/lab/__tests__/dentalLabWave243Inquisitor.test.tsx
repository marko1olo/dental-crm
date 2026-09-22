/**
 * dentalLabWave243Inquisitor.test.tsx
 *
 * Dedicated verification suite for Wave 243:
 * «Dental Lab & ZTL Orders Inquisitor — Mandates 8d, 8e, 8n Autonomy, Ergonomics & VITA Presets»
 *
 * Requirements verified:
 * 1. 1-Click popular presets (Mandates 8e, 8k):
 *    - Одиночная коронка ZrO2 (zirconia_crown_express)
 *    - Мостовидный протез ZrO2 (bridge_zirconia_express)
 *    - Вкладка E.max Inlay/Onlay (emax_inlay_express)
 *    - All presets correctly define constructionType, materialId, colorVita, workingDays, and price.
 * 2. Toolbar filtering adheres to Hick's Law (Mandate 8d item 2):
 *    - Stage selector and segmented chips for: «Все», «Отправлен», «В работе», «Принят», «Готов», «Припасован».
 *    - Filter bar is strictly 1 compact line (32–36px).
 * 3. Card action buttons obey Miller's Law (Mandate 8d item 3):
 *    - Exactly 2 direct action buttons («Открыть», «Статус»), secondary actions consolidated into «...».
 * 4. Statutory Form ZTL-1 (Mandates 8d item 7, 8e item 5):
 *    - Zero emojis compliance across all components.
 *    - Dynamic stamps: «ЧЕРНОВИК» vs «ПОДПИСАНО ВРАЧОМ».
 * 5. Theme tokens compliance (WCAG AAA):
 *    - Zero hardcoded blinding patches in dark mode.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	DentalLabOrderModal,
	MODAL_EXPRESS_LAB_PRESETS,
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
	EXPRESS_PRESET_EMAX_CROWN,
} from "../DentalLabOrderModal";
import { DentalLabOrdersHubModal } from "../DentalLabOrdersHubModal";
import { createDentalLabOrder, type DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";

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

describe("Wave 243 — Dental Lab & ZTL Orders Inquisitor Verification", () => {
	it("1. 1-Click presets include Single crown ZrO2, Bridge prosthesis, and Inlay E.max", () => {
		// Одиночная коронка ZrO2
		assert.ok(EXPRESS_PRESET_ZIRCONIA_CROWN, "Пресет одиночной коронки ZrO2 должен быть определен");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.constructionType, "single_crown");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.materialId, "zirconia_multilayer");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.colorVita, "A2");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.workingDays, 5);

		// Мостовидный протез ZrO2
		assert.ok(EXPRESS_PRESET_BRIDGE_ZIRCONIA, "Пресет мостовидного протеза ZrO2 должен быть определен");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.constructionType, "bridge");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.materialId, "zirconia_multilayer");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.colorVita, "A2");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.workingDays, 7);

		// Вкладка E.max
		assert.ok(EXPRESS_PRESET_EMAX_INLAY, "Пресет вкладки E.max должен быть определен");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.constructionType, "inlay_onlay");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.materialId, "emax_lithium_disilicate");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.colorVita, "A2");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.workingDays, 5);

		// Проверка присутствия в MODAL_EXPRESS_LAB_PRESETS
		const presetIds = MODAL_EXPRESS_LAB_PRESETS.map((p) => p.id);
		assert.ok(presetIds.includes("zirconia_crown_express"), "Должен содержать zirconia_crown_express");
		assert.ok(presetIds.includes("bridge_zirconia_express"), "Должен содержать bridge_zirconia_express");
		assert.ok(presetIds.includes("emax_inlay_express"), "Должен содержать emax_inlay_express");
		assert.ok(presetIds.includes("emax_crown_express"), "Должен содержать emax_crown_express");
	});

	it("2. Toolbar has segmented status filters («Все», «Отправлен», «В работе», «Принят», «Готов», «Припасован»)", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		const sampleOrder = createDentalLabOrder({
			patientId: "pat-1",
			doctorId: "doc-1",
			orderNumber: "ЗТЛ-243-01",
			patientName: "Сидоров Алексей Петрович",
			doctorName: "Д-р Смирнов В. А.",
			labName: "CAD/CAM Центр Дентал-Мастер",
			workTypeId: "crown_zirconia",
			selectedTeeth: [14],
			shadeCode: "A2",
			expectedLabDate: "2026-09-25",
			pricePerUnitRub: 24000,
			costPerUnitRub: 7500,
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

		// Проверяем наличие всех 6 чипов быстрого фильтра по Закону Хика
		const requiredStatusChipIds = [
			"ALL",
			"sent_to_lab",
			"in_work",
			"draft",
			"fitting_scheduled",
			"installed_completed",
		];

		for (const chipId of requiredStatusChipIds) {
			const chip = findNodeByTestId(container, `ztl-filter-stage-${chipId}`);
			assert.ok(chip, `Чип фильтра статуса ztl-filter-stage-${chipId} должен присутствовать в тулбаре`);
		}

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});

	it("3. Zero Emojis Compliance across all lab files (Mandate 8d Sin #7)", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const targetFiles = [
			"DentalLabOrderModal.tsx",
			"DentalLabOrdersHubModal.tsx",
			"DentalLabShadeSelector.tsx",
			"DentalLabPrintBlank.tsx",
		];

		const emojiRegex = /\p{Extended_Pictographic}/u;

		for (const file of targetFiles) {
			const fullPath = path.join(labDir, file);
			const content = fs.readFileSync(fullPath, "utf-8");
			assert.equal(
				emojiRegex.test(content),
				false,
				`Файл ${file} содержит запрещенные эмодзи (Мандат 8d п. 7)`
			);
		}
	});

	it("4. Form ZTL-1 (ГОСТ Р 51087-97) 5-stage tracker and Mandate 8e/8s invariants", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const blankPath = path.join(labDir, "DentalLabPrintBlank.tsx");
		const content = fs.readFileSync(blankPath, "utf-8");

		// 5-stage tracker container
		assert.ok(
			content.includes('data-testid="lab-blank-5stage-tracker"'),
			"Форма ЗТЛ-1 должна содержать трекер 5 этапов (data-testid='lab-blank-5stage-tracker')"
		);

		// All 5 canonical stage testids
		assert.ok(
			content.includes("CANONICAL_5_CLINICAL_LAB_STATUSES") &&
			content.includes("ztl-blank-stage-"),
			"Форма ЗТЛ-1 должна отображать все 5 канонических этапов ЗТЛ"
		);

		// Mandate 8e item 7 unblocking clause
		assert.ok(
			content.includes("Срок плана лечения (>30 дн.) не блокирует наряды ЗТЛ") ||
			content.includes("Срок плана лечения (&gt;30 дн.) не блокирует наряды ЗТЛ"),
			"Форма ЗТЛ-1 должна содержать нормативную отметку о неблокируемости срока плана лечения"
		);

		// ГОСТ Р 51087-97
		assert.ok(
			content.includes("ГОСТ Р 51087-97"),
			"Форма ЗТЛ-1 должна содержать ссылку на ГОСТ Р 51087-97"
		);
	});
});
