import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
	QuickAddChairModal,
	CHAIR_COLOR_PRESETS,
	CHAIR_SPECIALTY_PRESETS,
} from "../QuickAddChairModal";
import {
	ScheduleFilterStrip,
	type ScheduleFilterStripProps,
} from "../ScheduleFilterStrip";

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
	[key: string]: unknown;
}

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	class FakeHTMLIFrameElement {}
	class FakeHTMLElement {}
	class FakeElement {}
	class FakeNode {}

	const doc: any = {
		nodeType: 9,
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
				right: 390,
				bottom: 844,
				width: 390,
				height: 844,
			}),
		};
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
	};
	doc.defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	g.HTMLIFrameElement = FakeHTMLIFrameElement;
	g.HTMLElement = FakeHTMLElement;
	g.Element = FakeElement;
	g.Node = FakeNode;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return { doc, win };
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

function createDefaultFilterStripProps(
	overrides: Partial<ScheduleFilterStripProps> = {},
): ScheduleFilterStripProps {
	return {
		scheduleDateFilter: "2026-09-07",
		setScheduleDateFilter: vi.fn(),
		stepScheduleDay: vi.fn(),
		activeScheduleFilterCount: 0,
		resetScheduleFilters: vi.fn(),
		staffMembers: [
			{ id: "doc-1", fullName: "Д-р Иванов И.И.", active: true, role: "doctor" },
		],
		chairs: [
			{ id: "chair-1", name: "Кресло 1", active: true, specialization: "therapist", room: "Каб. 1" },
			{ id: "chair-2", name: "Кресло 2", active: true, specialization: "surgeon", room: "Каб. 2" },
		],
		isSoloDoctor: false,
		scheduleDoctorFilterId: null,
		setScheduleDoctorFilterId: vi.fn(),
		scheduleChairFilterId: null,
		setScheduleChairFilterId: vi.fn(),
		...overrides,
	};
}

describe("Schedule Inline Chair Management & Quick Add Modal (StomX / DentalPRO parity)", () => {
	setupMockDom();

	it("1. renders '+ Кресло' button in ScheduleFilterStrip with >= 44px touch target", async () => {
		const props = createDefaultFilterStripProps();
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(<ScheduleFilterStrip {...props} />);
		});

		// Button in the chair chips bar
		const chipAddBtn = findNodeByTestId(container, "schedule-add-chair-btn");
		expect(chipAddBtn).not.toBeNull();
		expect(chipAddBtn?.className).toContain("min-h-[44px]");
		expect(chipAddBtn?.className).toContain("min-w-[44px]");
		expect(chipAddBtn?.style?.minHeight).toBe("44px");
		expect(chipAddBtn?.style?.minWidth).toBe("44px");

		// Button in the [⋮ Опции] dropdown menu
		const optionsAddBtn = findNodeByTestId(container, "schedule-options-add-chair-btn");
		expect(optionsAddBtn).not.toBeNull();
		expect(optionsAddBtn?.className).toContain("min-h-[44px]");
		expect(optionsAddBtn?.style?.minHeight).toBe("44px");

		// Check rendered HTML
		const html = renderToString(<ScheduleFilterStrip {...props} />);
		expect(html).toContain("data-testid=\"schedule-add-chair-btn\"");
		expect(html).toContain("+ Кресло");
		expect(html).toContain("data-testid=\"schedule-options-add-chair-btn\"");
		expect(html).toContain("Добавить кресло (+ Кресло)");
	});

	it("2. clicking '+ Кресло' triggers chair creation modal or onOpenAddChair callback", async () => {
		const onOpenAddChair = vi.fn();
		const props = createDefaultFilterStripProps({ onOpenAddChair });
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(<ScheduleFilterStrip {...props} />);
		});

		// Click the inline chair chip button
		const chipAddBtn = findNodeByTestId(container, "schedule-add-chair-btn");
		expect(chipAddBtn).not.toBeNull();
		await clickNode(chipAddBtn);
		expect(onOpenAddChair).toHaveBeenCalledTimes(1);

		// Click the options menu item
		const optionsAddBtn = findNodeByTestId(container, "schedule-options-add-chair-btn");
		expect(optionsAddBtn).not.toBeNull();
		await clickNode(optionsAddBtn);
		expect(onOpenAddChair).toHaveBeenCalledTimes(2);

		// Verify QuickAddChairModal renders when open
		const modalHtml = renderToString(
			<QuickAddChairModal isOpen={true} onClose={vi.fn()} existingChairsCount={2} />,
		);
		expect(modalHtml).toContain("Добавить кресло в расписание");
		expect(modalHtml).toContain("Быстрое добавление рабочего места (StomX / DentalPRO parity)");
		expect(modalHtml).toContain("+ Добавить кресло");
	});

	it("3. in QuickAddChairModal, the submit button is NOT disabled when name is empty (disabled === false, Mandates 8e, 8n)", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<QuickAddChairModal
					isOpen={true}
					onClose={vi.fn()}
					existingChairsCount={0}
					onAddChair={vi.fn()}
				/>,
			);
		});

		const submitBtn = findNodeByTestId(container, "quick-add-chair-submit-btn");
		expect(submitBtn).not.toBeNull();
		// Mandate 8e: Doctor Autonomy - NEVER disabled
		expect(submitBtn?.disabled).toBe(false);
		expect(submitBtn?.hasAttribute("disabled")).toBe(false);

		// Verify rendered HTML does not disable the button
		const html = renderToString(
			<QuickAddChairModal isOpen={true} onClose={vi.fn()} existingChairsCount={0} />,
		);
		expect(html).toContain("data-testid=\"quick-add-chair-submit-btn\"");
		expect(html).not.toMatch(/data-testid="quick-add-chair-submit-btn"[^>]*disabled=""/);
		expect(html).not.toMatch(/data-testid="quick-add-chair-submit-btn"[^>]*disabled="true"/);
	});

	it("4. submitting with empty name auto-generates safe default chair name ('Кресло N')", async () => {
		// Test A: 0 existing chairs -> auto-generates "Кресло 1" and "Кабинет 1"
		const onAddChair0 = vi.fn();
		const container0 = document.createElement("div") as unknown as MockDomNode;
		const root0: Root = createRoot(container0 as unknown as HTMLElement);

		await act(async () => {
			root0.render(
				<QuickAddChairModal
					isOpen={true}
					onClose={vi.fn()}
					existingChairsCount={0}
					onAddChair={onAddChair0}
				/>,
			);
		});

		const submitBtn0 = findNodeByTestId(container0, "quick-add-chair-submit-btn");
		expect(submitBtn0).not.toBeNull();
		await clickNode(submitBtn0);

		expect(onAddChair0).toHaveBeenCalled();
		const call0 = (onAddChair0 as any).mock.calls[0]?.[0];
		expect(call0?.name).toBe("Кресло 1");
		expect(call0?.room).toBe("Кабинет 1");
		expect(call0?.specialization).toBe("therapist");
		expect(call0?.color).toBe("#0d9488");

		// Test B: 3 existing chairs -> auto-generates "Кресло 4" and "Кабинет 4"
		const onAddChair3 = vi.fn();
		const container3 = document.createElement("div") as unknown as MockDomNode;
		const root3: Root = createRoot(container3 as unknown as HTMLElement);

		await act(async () => {
			root3.render(
				<QuickAddChairModal
					isOpen={true}
					onClose={vi.fn()}
					existingChairsCount={3}
					onAddChair={onAddChair3}
				/>,
			);
		});

		const submitBtn3 = findNodeByTestId(container3, "quick-add-chair-submit-btn");
		expect(submitBtn3).not.toBeNull();
		await clickNode(submitBtn3);

		expect(onAddChair3).toHaveBeenCalled();
		const call3 = (onAddChair3 as any).mock.calls[0]?.[0];
		expect(call3?.name).toBe("Кресло 4");
		expect(call3?.room).toBe("Кабинет 4");
	});

	it("5. all touch targets in QuickAddChairModal meet the >= 44px requirement", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<QuickAddChairModal
					isOpen={true}
					onClose={vi.fn()}
					existingChairsCount={1}
					onAddChair={vi.fn()}
				/>,
			);
		});

		// Header close button
		const closeBtn = findNodeByTestId(container, "quick-add-chair-close-btn");
		expect(closeBtn).not.toBeNull();
		expect(closeBtn?.className).toContain("min-h-[44px]");
		expect(closeBtn?.className).toContain("min-w-[44px]");
		expect(closeBtn?.style?.minHeight).toBe("44px");
		expect(closeBtn?.style?.minWidth).toBe("44px");

		// Chair name input
		const nameInput = findNodeByTestId(container, "quick-add-chair-name-input");
		expect(nameInput).not.toBeNull();
		expect(nameInput?.className).toContain("min-h-[44px]");
		expect(nameInput?.style?.minHeight).toBe("44px");

		// Room input
		const roomInput = findNodeByTestId(container, "quick-add-chair-room-input");
		expect(roomInput).not.toBeNull();
		expect(roomInput?.className).toContain("min-h-[44px]");
		expect(roomInput?.style?.minHeight).toBe("44px");

		// All 6 specialization preset buttons
		for (const spec of CHAIR_SPECIALTY_PRESETS) {
			const specBtn = findNodeByTestId(container, `quick-add-chair-spec-${spec.id}`);
			expect(specBtn).not.toBeNull();
			expect(specBtn?.className).toContain("min-h-[44px]");
			expect(specBtn?.style?.minHeight).toBe("44px");
		}

		// All 6 color preset buttons
		for (const color of CHAIR_COLOR_PRESETS) {
			const colorBtn = findNodeByTestId(container, `quick-add-chair-color-${color.id}`);
			expect(colorBtn).not.toBeNull();
			expect(colorBtn?.className).toContain("min-h-[44px]");
			expect(colorBtn?.className).toContain("min-w-[44px]");
			expect(colorBtn?.style?.minHeight).toBe("44px");
			expect(colorBtn?.style?.minWidth).toBe("44px");
		}

		// Footer cancel button
		const cancelBtn = findNodeByTestId(container, "quick-add-chair-cancel-btn");
		expect(cancelBtn).not.toBeNull();
		expect(cancelBtn?.className).toContain("min-h-[44px]");
		expect(cancelBtn?.style?.minHeight).toBe("44px");

		// Footer submit button
		const submitBtn = findNodeByTestId(container, "quick-add-chair-submit-btn");
		expect(submitBtn).not.toBeNull();
		expect(submitBtn?.className).toContain("min-h-[44px]");
		expect(submitBtn?.style?.minHeight).toBe("44px");
	});
});
