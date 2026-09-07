/**
 * procedureMaterialDeductionAutonomy.test.tsx
 *
 * Unit tests for Procedure Material Deduction Autonomy & Safe Preset Fallbacks:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; non-blocking workflows)
 * - Mandate 8k: CRM != Reality Simulator (1-click standard consumable set when procedure BOM is empty)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Smooth soft overdraft, zero dead-ends)
 * - Mandate 8o: Scope-bounded verifiable test assertions
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock GlobalToast so showToast can be spied on directly
vi.mock("../../GlobalToast", () => ({
	showToast: vi.fn(),
}));

import { showToast } from "../../GlobalToast";
import {
	ProcedureMaterialDeductionModal,
	STANDARD_CONSUMABLE_PRESET_NAME,
	createStandardConsumablePresetItem,
} from "../ProcedureMaterialDeductionModal";
import type { InventoryItem } from "../useInventoryLogic";

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
	disabled?: boolean;
	value?: string;
	textContent: string;
	className: string;
	innerHTML: string;
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
	focus?: () => void;
	blur?: () => void;
	[key: string]: unknown;
}

function setupMockDom() {
	// biome-ignore lint/suspicious/noExplicitAny: mock doc reference
	let docRef: any = null;

	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};
		let _disabled = false;
		let _value = "";

		const el: MockDomNode = {
			nodeType: 1,
			tagName: tag.toUpperCase(),
			nodeName: tag.toUpperCase(),
			style: {},
			dataset: {},
			children,
			childNodes: children,
			attributes: [],
			get ownerDocument() {
				return docRef;
			},
			parentNode: null,
			get disabled() {
				return _disabled || attrs.disabled !== undefined;
			},
			set disabled(val: boolean) {
				_disabled = val;
				if (val) attrs.disabled = "";
				else delete attrs.disabled;
			},
			get value() {
				return _value;
			},
			set value(val: string) {
				_value = val;
			},
			get className() {
				return attrs.class || "";
			},
			set className(val: string) {
				attrs.class = val;
			},
			get innerHTML() {
				return "";
			},
			set innerHTML(_val: string) {},
			get textContent() {
				let text = "";
				for (const child of children) {
					if (child.nodeType === 3) {
						text += (child as unknown as { textContent?: string }).textContent || "";
					} else if (child.textContent) {
						text += child.textContent;
					}
				}
				return text;
			},
			set textContent(val: string) {
				children.length = 0;
				if (val) {
					children.push({
						nodeType: 3,
						textContent: val,
						style: {},
						parentNode: el,
					} as unknown as MockDomNode);
				}
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
				if (name === "disabled") {
					_disabled = true;
				}
			},
			getAttribute: (name: string) => attrs[name] ?? null,
			removeAttribute: (name: string) => {
				delete attrs[name];
				if (name === "disabled") {
					_disabled = false;
				}
			},
			dispatchEvent: (ev: { type: string }) => {
				const list = listeners[ev.type] || [];
				for (const fn of list) {
					fn(ev as unknown as Event);
				}
				return true;
			},
			getBoundingClientRect: () => ({
				top: 0,
				left: 0,
				right: 1280,
				bottom: 900,
				width: 1280,
				height: 900,
			}),
			focus: () => {},
			blur: () => {},
			querySelector: () => null,
			querySelectorAll: () => [],
		};

		if (tag.toUpperCase() === "SELECT") {
			// biome-ignore lint/suspicious/noExplicitAny: mock select properties for React
			(el as any).multiple = false;
			Object.defineProperty(el, "options", {
				get() {
					return children.filter((c) => c.tagName === "OPTION");
				},
			});
		}
		if (tag.toUpperCase() === "OPTION") {
			// biome-ignore lint/suspicious/noExplicitAny: mock option selected
			(el as any).selected = false;
		}

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
		querySelector: () => null,
		querySelectorAll: () => [],
	};
	docRef = doc;

	const win = {
		document: doc,
		addEventListener: () => {},
		removeEventListener: () => {},
		navigator: { onLine: true },
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

function getNodeText(node: MockDomNode | null): string {
	if (!node) return "";
	let text = typeof node.textContent === "string" ? node.textContent : "";
	if (node.children) {
		for (const child of node.children) {
			text += getNodeText(child);
		}
	}
	return text;
}

async function clickNode(node: MockDomNode) {
	await act(async () => {
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) => k.startsWith("__reactProps$"));
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
		node.dispatchEvent({ type: "click" });
	});
}

describe("Procedure Material Deduction Autonomy & Safe Preset Fallbacks (Mandates 8e, 8k, 8n)", () => {
	let container: MockDomNode;
	let root: Root;
	// biome-ignore lint/suspicious/noExplicitAny: mock doc reference
	let mockDoc: any;

	const sampleWarehouse: InventoryItem[] = [
		{
			id: "wh-gloves-1",
			name: "Перчатки нитриловые неопудренные",
			stockQuantity: 100,
			criticalThreshold: 20,
			unitCostRub: "35.00",
			updatedAt: "2026-09-01",
		},
		{
			id: "wh-art-1",
			name: "Артикаин 1:100 000 карпула 1.7 мл",
			stockQuantity: 15,
			criticalThreshold: 10,
			unitCostRub: "95.00",
			updatedAt: "2026-09-01",
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		const { doc } = setupMockDom();
		mockDoc = doc;
		container = doc.createElement("div");
		doc.body.appendChild(container);
		// biome-ignore lint/suspicious/noExplicitAny: container mock
		root = createRoot(container as any);
	});

	it("1. Primary deduction button is NOT disabled when lines.length === 0 (disabled === false)", async () => {
		await act(async () => {
			root.render(
				<ProcedureMaterialDeductionModal
					isOpen={true}
					onClose={() => {}}
					initialTechMapCodes={[]} // Empty tech maps -> lines.length === 0
					warehouseItems={sampleWarehouse}
					isDeducting={false}
				/>,
			);
		});

		const confirmBtn = findNodeByTestId(mockDoc.body, "confirm-deduction-btn");
		expect(confirmBtn).toBeTruthy();
		expect(confirmBtn?.disabled).toBe(false);
	});

	it("2. Clicking deduction button with empty lines auto-populates standard consumable preset and triggers info toast", async () => {
		const onConfirmDeduction = vi.fn();

		await act(async () => {
			root.render(
				<ProcedureMaterialDeductionModal
					isOpen={true}
					onClose={() => {}}
					initialTechMapCodes={[]} // Empty lines initially
					warehouseItems={sampleWarehouse}
					onConfirmDeduction={onConfirmDeduction}
					isDeducting={false}
				/>,
			);
		});

		const confirmBtn = findNodeByTestId(mockDoc.body, "confirm-deduction-btn");
		expect(confirmBtn).toBeTruthy();

		// Click confirm button when lines are empty
		await clickNode(confirmBtn!);

		// Info toast must be displayed with helpful guidance
		expect(showToast).toHaveBeenCalledWith(
			expect.stringContaining("стандартный"),
			"info",
		);

		// Modal body must now render the populated standard consumable preset
		const bodyText = getNodeText(mockDoc.body);
		expect(bodyText).toContain(STANDARD_CONSUMABLE_PRESET_NAME);

		// Second click conducts the deduction with the populated lines
		await clickNode(confirmBtn!);
		expect(onConfirmDeduction).toHaveBeenCalledTimes(1);
		const calledLines = onConfirmDeduction.mock.calls[0][0];
		expect(calledLines.length).toBe(1);
		expect(calledLines[0].materialName).toBe(STANDARD_CONSUMABLE_PRESET_NAME);
	});

	it("3. Auto-populate standard preset button in empty table state adds preset in 1 click", async () => {
		await act(async () => {
			root.render(
				<ProcedureMaterialDeductionModal
					isOpen={true}
					onClose={() => {}}
					initialTechMapCodes={[]}
					warehouseItems={sampleWarehouse}
					isDeducting={false}
				/>,
			);
		});

		const autoPopulateBtn = findNodeByTestId(mockDoc.body, "auto-populate-standard-preset-btn");
		expect(autoPopulateBtn).toBeTruthy();
		expect(autoPopulateBtn?.disabled).toBe(false);

		await clickNode(autoPopulateBtn!);

		expect(showToast).toHaveBeenCalledWith(
			expect.stringContaining("стандартный"),
			"info",
		);

		const bodyText = getNodeText(mockDoc.body);
		expect(bodyText).toContain(STANDARD_CONSUMABLE_PRESET_NAME);
	});

	it("4. Custom material add buttons are NOT disabled when input is empty (disabled === false)", async () => {
		await act(async () => {
			root.render(
				<ProcedureMaterialDeductionModal
					isOpen={true}
					onClose={() => {}}
					initialTechMapCodes={["SANPIN_PPE"]}
					warehouseItems={sampleWarehouse}
					isDeducting={false}
				/>,
			);
		});

		const warehouseAddBtn = findNodeByTestId(mockDoc.body, "warehouse-add-custom-btn");
		const quickAddBtn = findNodeByTestId(mockDoc.body, "quick-custom-material-add-btn");

		expect(warehouseAddBtn).toBeTruthy();
		expect(quickAddBtn).toBeTruthy();

		// Both buttons must be active and non-blocking
		expect(warehouseAddBtn?.disabled).toBe(false);
		expect(quickAddBtn?.disabled).toBe(false);
	});

	it("5. Clicking custom add buttons without input triggers toast guidance with warning and does not crash", async () => {
		await act(async () => {
			root.render(
				<ProcedureMaterialDeductionModal
					isOpen={true}
					onClose={() => {}}
					initialTechMapCodes={["SANPIN_PPE"]}
					warehouseItems={sampleWarehouse}
					isDeducting={false}
				/>,
			);
		});

		const warehouseAddBtn = findNodeByTestId(mockDoc.body, "warehouse-add-custom-btn");
		const quickAddBtn = findNodeByTestId(mockDoc.body, "quick-custom-material-add-btn");

		// Click warehouse add without selecting item
		await clickNode(warehouseAddBtn!);
		expect(showToast).toHaveBeenCalledWith(
			expect.stringContaining("Выберите материал"),
			"warning",
		);

		// Click quick add with empty text
		await clickNode(quickAddBtn!);
		expect(showToast).toHaveBeenCalledWith(
			expect.stringContaining("Введите название"),
			"warning",
		);
	});

	it("6. Buttons are disabled ONLY when isDeducting is true", async () => {
		await act(async () => {
			root.render(
				<ProcedureMaterialDeductionModal
					isOpen={true}
					onClose={() => {}}
					initialTechMapCodes={["SANPIN_PPE"]}
					warehouseItems={sampleWarehouse}
					isDeducting={true} // In-flight deduction
				/>,
			);
		});

		const confirmBtn = findNodeByTestId(mockDoc.body, "confirm-deduction-btn");
		const cancelBtn = findNodeByTestId(mockDoc.body, "inventory-cancel-btn");
		const warehouseAddBtn = findNodeByTestId(mockDoc.body, "warehouse-add-custom-btn");
		const quickAddBtn = findNodeByTestId(mockDoc.body, "quick-custom-material-add-btn");

		expect(confirmBtn?.disabled).toBe(true);
		expect(cancelBtn?.disabled).toBe(true);
		expect(warehouseAddBtn?.disabled).toBe(true);
		expect(quickAddBtn?.disabled).toBe(true);
	});

	it("7. Action buttons in footer and custom add inputs meet touch target >= 44px (minHeight >= 44px)", async () => {
		await act(async () => {
			root.render(
				<ProcedureMaterialDeductionModal
					isOpen={true}
					onClose={() => {}}
					initialTechMapCodes={["SANPIN_PPE"]}
					warehouseItems={sampleWarehouse}
					isDeducting={false}
				/>,
			);
		});

		const confirmBtn = findNodeByTestId(mockDoc.body, "confirm-deduction-btn");
		const cancelBtn = findNodeByTestId(mockDoc.body, "inventory-cancel-btn");
		const warehouseSelect = findNodeByTestId(mockDoc.body, "warehouse-select-custom");
		const warehouseAddBtn = findNodeByTestId(mockDoc.body, "warehouse-add-custom-btn");
		const quickInput = findNodeByTestId(mockDoc.body, "quick-custom-material-input");
		const quickAddBtn = findNodeByTestId(mockDoc.body, "quick-custom-material-add-btn");

		expect(confirmBtn?.style.minHeight).toBe("44px");
		expect(cancelBtn?.style.minHeight).toBe("44px");
		expect(warehouseSelect?.style.minHeight).toBe("44px");
		expect(warehouseAddBtn?.style.minHeight).toBe("44px");
		expect(quickInput?.style.minHeight).toBe("44px");
		expect(quickAddBtn?.style.minHeight).toBe("44px");
	});

	it("8. Helper createStandardConsumablePresetItem returns valid DeductionLineItem with soft overdraft metadata", () => {
		const preset = createStandardConsumablePresetItem(sampleWarehouse);

		expect(preset.materialName).toBe(STANDARD_CONSUMABLE_PRESET_NAME);
		expect(preset.quantity).toBe(1);
		expect(preset.standardQuantity).toBe(1);
		expect(preset.unit).toBe("компл.");
		expect(preset.category).toBe("ppe");
		expect(preset.mandatory).toBe(true);
		expect(preset.unitCostKopecks).toBeGreaterThanOrEqual(0);
	});
});
