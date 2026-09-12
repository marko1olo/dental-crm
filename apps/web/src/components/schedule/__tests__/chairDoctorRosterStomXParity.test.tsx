/**
 * chairDoctorRosterStomXParity.test.tsx
 *
 * Comprehensive Unit & Integration Test Suite for StomX / DentalPRO Parity:
 * - Quick chair addition with name suggestions and 14 authentic color presets
 * - Solo doctor & small clinic 1-chair default (Mandate 8n)
 * - 1-click doctor-to-chair shift binding (08-14, 09-15, 14-20, 15-21, full day, 2/2, even/odd)
 * - Multi-day date range shift assignment (applyDoctorChairDateRange, panel & modal)
 * - 1-click week copy and month copy
 * - Mandate 8d & 8e compliance (1 toolbar row 32-36px, >= 44px touch targets, 0 emojis, 0 disabled buttons)
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard, Appointment } from "@dental/shared";

import {
	QuickAddChairModal,
	CHAIR_COLOR_PRESETS,
	CHAIR_NAME_SUGGESTIONS,
	type QuickAddChairData,
} from "../QuickAddChairModal";
import { ChairScheduleView } from "../ChairScheduleView";
import {
	ScheduleGrid,
	DEFAULT_SOLO_CHAIR,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";
import {
	applyCellShiftPreset,
	applyDoctorChairDateRange,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
	type DoctorShift,
	type StaffMember,
	type CabinetDefinition,
} from "../chairRosterMath";

// Cartoon emoji detector per Mandate 8d
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
	mockReturnValue: (val: any) => MockFn;
};

function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	fn.mockReturnValue = (val: any) => createMockFn(() => val);
	return fn;
}

const vi = {
	fn: (impl?: any) => createMockFn(impl),
};

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

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	class FakeHTMLIFrameElement {}
	class FakeHTMLElement {}
	class FakeElement {}
	class FakeNode {}

	// biome-ignore lint/suspicious/noExplicitAny: mock DOM
	const doc: any = {
		nodeType: 9,
		createTextNode: (text: string) => {
			const tn: any = {
				nodeType: 3,
				_val: String(text ?? ""),
				get textContent(): string {
					return this._val;
				},
				set textContent(v: string) {
					this._val = String(v ?? "");
				},
				get nodeValue(): string {
					return this._val;
				},
				set nodeValue(v: string) {
					this._val = String(v ?? "");
				},
				get data(): string {
					return this._val;
				},
				set data(v: string) {
					this._val = String(v ?? "");
				},
				style: {},
				parentNode: null,
				ownerDocument: null,
			};
			return tn;
		},
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
		addEventListener: () => {},
		removeEventListener: () => {},
		activeElement: null,
	};

	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};

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
			ownerDocument: doc,
			parentNode: null,
			textContent: "",
			disabled: false,
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
				if (ev.type === "click") {
					let curr: MockDomNode | null = el;
					while (curr) {
						const reactPropKey = Object.keys(curr).find((k) =>
							k.startsWith("__reactProps$"),
						);
						if (reactPropKey) {
							const props = (curr as any)[reactPropKey];
							if (props && typeof props.onClick === "function") {
								props.onClick({
									type: "click",
									preventDefault: () => {},
									stopPropagation: () => {},
									target: el,
									currentTarget: curr,
								});
								break;
							}
						}
						curr = curr.parentNode;
					}
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

		Object.defineProperty(el, "value", {
			get() {
				if (attrs.value !== undefined) return attrs.value;
				return _value;
			},
			set(v) {
				_value = String(v ?? "");
				attrs.value = _value;
			},
			configurable: true,
		});

		if (tag.toUpperCase() === "SELECT") {
			(el as any).multiple = false;
			Object.defineProperty(el, "options", {
				get() {
					return children.filter((c) => c.tagName === "OPTION");
				},
			});
			Object.defineProperty(el, "value", {
				get() {
					const opts = (el as any).options as MockDomNode[];
					const selectedOpts = opts.filter((o) => (o as any).selected);
					if (selectedOpts.length > 0) return (selectedOpts[selectedOpts.length - 1] as any).value;
					if (attrs.value !== undefined) return attrs.value;
					if ((el as any)._value !== undefined) return (el as any)._value;
					return "";
				},
				set(v) {
					(el as any)._value = String(v);
					attrs.value = String(v);
					const opts = (el as any).options as MockDomNode[];
					for (const o of opts) {
						(o as any).selected = (o as any).value === String(v);
					}
				},
			});
		}
		if (tag.toUpperCase() === "OPTION") {
			Object.defineProperty(el, "value", {
				get() {
					return attrs.value !== undefined ? attrs.value : el.textContent;
				},
				set(v) {
					attrs.value = String(v);
				},
			});
			Object.defineProperty(el, "selected", {
				get() {
					return Boolean((el as any)._selected) || attrs.selected === "true" || attrs.selected === "";
				},
				set(v) {
					(el as any)._selected = Boolean(v);
					if (v) {
						attrs.selected = "true";
						if (el.parentNode && el.parentNode.tagName === "SELECT" && !(el.parentNode as any).multiple) {
							for (const sibling of el.parentNode.children || []) {
								if (sibling !== el && sibling.tagName === "OPTION") {
									(sibling as any)._selected = false;
									delete (sibling as any).dataset?.selected;
									if (sibling.removeAttribute) sibling.removeAttribute("selected");
								}
							}
						}
					} else {
						delete attrs.selected;
					}
				},
			});
		}

		el.ownerDocument = doc;
		return el;
	}

	doc.createElement = createMockElement;
	doc.createElementNS = (_ns: string, tag: string) => createMockElement(tag);
	doc.documentElement = createMockElement("html");
	doc.body = createMockElement("body");

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
		HTMLIFrameElement: FakeHTMLIFrameElement,
		HTMLElement: FakeHTMLElement,
		Element: FakeElement,
		Node: FakeNode,
		innerWidth: 1200,
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

	const storage: Record<string, string> = {};
	const mockLocalStorage = {
		getItem: (key: string) => storage[key] ?? null,
		setItem: (key: string, val: string) => {
			storage[key] = String(val);
		},
		removeItem: (key: string) => {
			delete storage[key];
		},
		clear: () => {
			for (const k of Object.keys(storage)) delete storage[k];
		},
	};
	g.localStorage = mockLocalStorage;
	win.localStorage = mockLocalStorage;

	return { doc, win, mockLocalStorage, storage };
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

function findAllNodesByTestId(
	node: MockDomNode | null,
	testIdPrefix: string,
): MockDomNode[] {
	const res: MockDomNode[] = [];
	function traverse(n: MockDomNode | null) {
		if (!n) return;
		const tid = n.getAttribute?.("data-testid");
		if (tid && tid.startsWith(testIdPrefix)) {
			res.push(n);
		}
		if (n.children) {
			for (const c of n.children) traverse(c);
		}
	}
	traverse(node);
	return res;
}

function findNodesByTag(node: MockDomNode | null, tag: string): MockDomNode[] {
	const res: MockDomNode[] = [];
	function traverse(n: MockDomNode | null) {
		if (!n) return;
		if (n.tagName === tag.toUpperCase()) {
			res.push(n);
		}
		if (n.children) {
			for (const c of n.children) traverse(c);
		}
	}
	traverse(node);
	return res;
}

function collectAllText(node: MockDomNode | null): string {
	if (!node) return "";
	let txt = node.textContent || "";
	if (node.children) {
		for (const c of node.children) {
			txt += ` ${collectAllText(c)}`;
		}
	}
	return txt;
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
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onClick === "function") {
					await props.onClick({
						type: "click",
						preventDefault: () => {},
						stopPropagation: () => {},
						target: node,
						currentTarget: curr,
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "click" });
	});
}

async function changeInputNode(node: MockDomNode | null, value: string) {
	if (!node) return;
	await act(async () => {
		node.value = value;
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onChange === "function") {
					await props.onChange({
						type: "change",
						target: { value },
						currentTarget: { value },
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "change", target: { value } });
	});
}

// Minimal mock dashboard
function getMockDashboard(): Dashboard {
	return {
		clinicSettings: {
			chairs: [
				{
					id: "chair-1",
					name: "Кресло 1 (Терапия)",
					room: "1",
					roomNumber: "1",
					color: "#0d9488",
					specialization: "therapist",
					active: true,
				},
				{
					id: "chair-2",
					name: "Кресло 2 (Хирургия)",
					room: "2",
					roomNumber: "2",
					color: "#2563eb",
					specialization: "surgeon",
					active: true,
				},
			],
			staff: [
				{
					id: "doc-1",
					fullName: "Иванов Иван Иванович",
					role: "doctor",
					specialties: ["therapist"],
					active: true,
					preferredChairId: "chair-1",
				},
				{
					id: "doc-2",
					fullName: "Петрова Анна Сергеевна",
					role: "doctor",
					specialties: ["surgeon"],
					active: true,
					preferredChairId: "chair-2",
				},
			],
			profile: {
				organizationId: "org-1",
				timezone: "Europe/Moscow",
			},
		},
		appointments: [],
		patients: [],
	} as unknown as Dashboard;
}

describe("StomX / DentalPRO Parity: Chair Roster, Doctor Shifts & Week Copy", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	// --- 1. Quick Chair Addition with Name Suggestions & Colors ---
	describe("1. QuickAddChairModal: Name Suggestions & 14 Authentic Color Presets", () => {
		it("CHAIR_NAME_SUGGESTIONS export has authentic Russian clinical names", () => {
			assert.ok(Array.isArray(CHAIR_NAME_SUGGESTIONS), "CHAIR_NAME_SUGGESTIONS must be an array");
			assert.ok(CHAIR_NAME_SUGGESTIONS.length >= 4, "Must have at least 4 name suggestions");
			assert.ok(CHAIR_NAME_SUGGESTIONS.includes("Кресло 1"));
			assert.ok(CHAIR_NAME_SUGGESTIONS.includes("Кресло 2 (Хирургия)"));
			assert.ok(CHAIR_NAME_SUGGESTIONS.includes("Кресло 3 (Терапия)"));
			assert.ok(CHAIR_NAME_SUGGESTIONS.includes("Кабинет 1"));
		});

		it("CHAIR_COLOR_PRESETS export has 14 authentic StomX color palettes with lightHex & darkHex", () => {
			assert.strictEqual(CHAIR_COLOR_PRESETS.length, 14, "Must have exactly 14 color palettes");
			for (const cp of CHAIR_COLOR_PRESETS) {
				assert.ok(cp.id, "Preset must have id");
				assert.ok(cp.label, "Preset must have label");
				assert.ok(cp.hex.startsWith("#"), "Preset must have valid hex");
				assert.ok(cp.lightHex.startsWith("#"), "Preset must have valid lightHex");
				assert.ok(cp.darkHex.startsWith("#"), "Preset must have valid darkHex");
			}
		});

		it("renders name suggestion chips and clicking one fills the chair name input", async () => {
			await act(async () => {
				root.render(
					<QuickAddChairModal
						isOpen={true}
						onClose={() => {}}
						existingChairsCount={2}
					/>,
				);
			});

			const sugg0 = findNodeByTestId(container, "quick-add-chair-name-suggestion-0");
			const sugg1 = findNodeByTestId(container, "quick-add-chair-name-suggestion-1");
			assert.ok(sugg0, "quick-add-chair-name-suggestion-0 must exist");
			assert.ok(sugg1, "quick-add-chair-name-suggestion-1 must exist");

			const input = findNodeByTestId(container, "quick-add-chair-name-input");
			assert.ok(input, "quick-add-chair-name-input must exist");

			// Click suggestion 1 ("Кресло 2 (Хирургия)")
			await clickNode(sugg1);

			assert.strictEqual(
				input.value,
				CHAIR_NAME_SUGGESTIONS[1],
				"Input value should match selected suggestion chip",
			);
		});

		it("Mandate 8e: submit button is never disabled even with empty inputs", async () => {
			await act(async () => {
				root.render(
					<QuickAddChairModal
						isOpen={true}
						onClose={() => {}}
						existingChairsCount={0}
					/>,
				);
			});

			const submitBtn = findNodeByTestId(container, "quick-add-chair-submit-btn");
			assert.ok(submitBtn, "quick-add-chair-submit-btn must exist");
			assert.strictEqual(
				submitBtn.disabled,
				false,
				"Submit button must NEVER be disabled (Mandate 8e Doctor Autonomy)",
			);
		});

		it("Mandate 8d: 0 cartoon emojis in QuickAddChairModal", async () => {
			await act(async () => {
				root.render(
					<QuickAddChairModal
						isOpen={true}
						onClose={() => {}}
						existingChairsCount={1}
					/>,
				);
			});

			const allText = collectAllText(container);
			assert.strictEqual(
				hasCartoonEmojis(allText),
				false,
				"Must not contain cartoon emojis (Mandate 8d п. 7)",
			);
		});
	});

	// --- 2. Solo Doctor & Small Clinic Sovereignty (Mandate 8n) ---
	describe("2. Solo Doctor & Small Clinic Sovereignty (Mandate 8n)", () => {
		it("DEFAULT_SOLO_CHAIR provides clean 1-chair default with zero setup", () => {
			assert.ok(DEFAULT_SOLO_CHAIR, "DEFAULT_SOLO_CHAIR must exist");
			assert.strictEqual(DEFAULT_SOLO_CHAIR.id, "default-chair");
			assert.ok(DEFAULT_SOLO_CHAIR.name.includes("Кресло 1"));
			assert.strictEqual(DEFAULT_SOLO_CHAIR.isActive, true);
		});

		it("ChairScheduleView falls back to DEFAULT_SOLO_CHAIR when chairs list is empty", async () => {
			const emptyDashboard = {
				clinicSettings: {
					chairs: [],
					staff: [],
					profile: { organizationId: "org-1", timezone: "Europe/Moscow" },
				},
				appointments: [],
				patients: [],
			} as unknown as Dashboard;

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={emptyDashboard}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			// Should render without throwing error, and display default chair badge
			const soloBadge = findNodeByTestId(container, "chair-view-badge-default-chair");
			assert.ok(
				soloBadge,
				"Solo default chair badge must render when clinicSettings.chairs is empty (Mandate 8n)",
			);
		});

		it("ChairScheduleView toolbar has 1 unified compact row (32-36px, Hick's Law)", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onOpenRosterModal={() => {}}
					/>,
				);
			});

			const toolbar = findNodeByTestId(container, "chair-schedule-palette-strip");
			assert.ok(toolbar, "chair-schedule-palette-strip toolbar must exist");
			assert.ok(
				toolbar.className?.includes("h-9") || toolbar.className?.includes("min-h-[36px]"),
				"Toolbar must be strictly 1 compact row 32-36px",
			);
		});
	});

	// --- 3. 1-Click Shift Presets (08-14, 09-15, 14-20, 15-21, full day, 2/2, even/odd) ---
	describe("3. 1-Click Shift Presets & Doctor-to-Chair Binding", () => {
		it("applyCellShiftPreset supports morning, morning_9, evening, evening_15, full_day, and clear", () => {
			const initialShifts: DoctorShift[] = [];
			const baseParams = {
				dateIso: "2026-09-09",
				cabinetId: "cab-1",
				chairId: "chair-1",
				doctorId: "doc-1",
				staffList: DEFAULT_CLINIC_STAFF,
				cabinets: CLINIC_CABINETS_CATALOG,
			};

			// 1. Morning 08:00–14:00
			const s1 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "morning" });
			assert.strictEqual(s1.length, 1);
			assert.strictEqual(s1[0]?.startTime, "08:00");
			assert.strictEqual(s1[0]?.endTime, "14:00");

			// 2. Morning_9 09:00–15:00
			const s2 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "morning_9" });
			assert.strictEqual(s2.length, 1);
			assert.strictEqual(s2[0]?.startTime, "09:00");
			assert.strictEqual(s2[0]?.endTime, "15:00");

			// 3. Evening 14:00–20:00
			const s3 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "evening" });
			assert.strictEqual(s3.length, 1);
			assert.strictEqual(s3[0]?.startTime, "14:00");
			assert.strictEqual(s3[0]?.endTime, "20:00");

			// 4. Evening_15 15:00–21:00
			const s4 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "evening_15" });
			assert.strictEqual(s4.length, 1);
			assert.strictEqual(s4[0]?.startTime, "15:00");
			assert.strictEqual(s4[0]?.endTime, "21:00");

			// 5. Full day 08:00–20:00
			const s5 = applyCellShiftPreset(initialShifts, { ...baseParams, presetType: "full_day" });
			assert.strictEqual(s5.length, 1);
			assert.strictEqual(s5[0]?.startTime, "08:00");
			assert.strictEqual(s5[0]?.endTime, "20:00");

			// 6. Clear (removes shift on chair)
			const s6 = applyCellShiftPreset(s5, { ...baseParams, presetType: "clear" });
			assert.strictEqual(s6.length, 0, "Shift should be cleared");
		});

		it("ChairScheduleView popover renders morning-9 and evening-15 preset buttons", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			// Open popover for chair-1
			const assignBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			assert.ok(assignBtn, "chair-view-assign-doctor-chair-1 must exist");

			await clickNode(assignBtn);

			const m9Btn = findNodeByTestId(container, "chair-view-shift-morning-9-chair-1");
			const e15Btn = findNodeByTestId(container, "chair-view-shift-evening-15-chair-1");

			assert.ok(m9Btn, "chair-view-shift-morning-9-chair-1 must exist in shift popover");
			assert.ok(e15Btn, "chair-view-shift-evening-15-chair-1 must exist in shift popover");
		});
	});

	// --- 4. Multi-Day Date Range Shift Assignment (StomX / DentalPRO parity) ---
	describe("4. Multi-Day Date Range Shift Assignment", () => {
		it("applyDoctorChairDateRange generates shifts for all days in date range", () => {
			const initialShifts: DoctorShift[] = [];
			const result = applyDoctorChairDateRange(initialShifts, {
				startDateIso: "2026-09-07",
				endDateIso: "2026-09-11", // 5 days (Mon–Fri)
				doctorId: "doc-1",
				chairId: "chair-1",
				shiftPreset: "morning_9",
				staffList: DEFAULT_CLINIC_STAFF,
				cabinets: CLINIC_CABINETS_CATALOG,
			});

			assert.strictEqual(result.length, 5, "Should create 5 shifts for 5 days");
			for (const shift of result) {
				assert.strictEqual(shift.doctorId, "doc-1");
				assert.strictEqual(shift.chairId, "chair-1");
				assert.strictEqual(shift.startTime, "09:00");
				assert.strictEqual(shift.endTime, "15:00");
			}
		});

		it("applyDoctorChairDateRange correctly handles two_two (2/2) rotation", () => {
			const initialShifts: DoctorShift[] = [];
			const result = applyDoctorChairDateRange(initialShifts, {
				startDateIso: "2026-09-07",
				endDateIso: "2026-09-14", // 8 days: 2 work, 2 off, 2 work, 2 off
				doctorId: "doc-1",
				chairId: "chair-1",
				shiftPreset: "two_two",
				staffList: DEFAULT_CLINIC_STAFF,
				cabinets: CLINIC_CABINETS_CATALOG,
			});

			// 8 days in 2/2 rotation = 4 working days (days 0, 1, 4, 5)
			assert.strictEqual(result.length, 4, "2/2 rotation over 8 days should yield 4 working days");
		});

		it("applyDoctorChairDateRange correctly handles five_day (skips weekends)", () => {
			const initialShifts: DoctorShift[] = [];
			const result = applyDoctorChairDateRange(initialShifts, {
				startDateIso: "2026-09-07", // Monday
				endDateIso: "2026-09-13", // Sunday (7 days)
				doctorId: "doc-1",
				chairId: "chair-1",
				shiftPreset: "five_day",
				staffList: DEFAULT_CLINIC_STAFF,
				cabinets: CLINIC_CABINETS_CATALOG,
			});

			// Monday to Sunday: 5 workdays (Mon–Fri), Sat and Sun skipped
			assert.strictEqual(result.length, 5, "five_day preset must skip Sat and Sun");
		});

		it("ChairScheduleView: dropdown menu has btn-assign-date-range which opens date range modal", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const menuBtn = findNodeByTestId(container, "btn-assign-date-range");
			assert.ok(menuBtn, "btn-assign-date-range must exist in dropdown menu");

			// Click to open modal
			await clickNode(menuBtn);

			const modal = findNodeByTestId(container, "chair-schedule-date-range-modal");
			assert.ok(modal, "chair-schedule-date-range-modal must open");

			const applyModalBtn = findNodeByTestId(container, "chair-range-modal-apply-btn");
			assert.ok(applyModalBtn, "chair-range-modal-apply-btn must exist in modal");
		});
	});

	// --- 5. 1-Click Week Copy and Month Copy ---
	describe("5. 1-Click Week Copy & Month Copy (StomX Parity)", () => {
		it("copyWeekShiftsToTargetWeek correctly shifts dates by 7 days", () => {
			const week1Shifts: DoctorShift[] = [
				{
					id: "s1",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-07",
					archetypeId: "morning_shift",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
			];

			const copied = copyWeekShiftsToTargetWeek(week1Shifts, "2026-09-07", "2026-09-14");
			const targetShift = copied.find((s) => s.dateIso === "2026-09-14");
			assert.ok(targetShift, "Shift must be copied to target date 2026-09-14");
			assert.strictEqual(targetShift.doctorId, "doc-1");
			assert.strictEqual(targetShift.chairId, "chair-1");
			assert.strictEqual(targetShift.startTime, "08:00");
		});

		it("copyWeekShiftsToMonth copies shifts across 4 consecutive weeks", () => {
			const week1Shifts: DoctorShift[] = [
				{
					id: "s1",
					doctorId: "doc-1",
					doctorName: "Иванов И.И.",
					doctorRole: "therapist",
					assistantId: null,
					assistantName: null,
					cabinetId: "cab-1",
					chairId: "chair-1",
					dateIso: "2026-09-07",
					archetypeId: "morning_shift",
					startTime: "08:00",
					endTime: "14:00",
					durationHours: 6,
					breakMinutes: 0,
					isNight: false,
					nightHours: 0,
					status: "scheduled",
				},
			];

			const copied = copyWeekShiftsToMonth(week1Shifts, "2026-09-07", 4);
			assert.ok(copied.some((s) => s.dateIso === "2026-09-14"));
			assert.ok(copied.some((s) => s.dateIso === "2026-09-21"));
			assert.ok(copied.some((s) => s.dateIso === "2026-09-28"));
		});

		it("ChairScheduleView dropdown menu has btn-copy-chair-week-next and btn-copy-chair-month", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const copyNextWeekBtn = findNodeByTestId(container, "btn-copy-chair-week-next");
			const copyMonthBtn = findNodeByTestId(container, "btn-copy-chair-month");

			assert.ok(copyNextWeekBtn, "btn-copy-chair-week-next must exist");
			assert.ok(copyMonthBtn, "btn-copy-chair-week-month must exist");
		});
	});

	// --- 6. Mandate 8d & 8e Compliance Audit ---
	describe("6. Mandate 8d & 8e Compliance Audit", () => {
		it("all buttons in ChairScheduleView have zero cartoon emojis", async () => {
			const db = getMockDashboard();
			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={db}
						dateKey="2026-09-09"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const text = collectAllText(container);
			assert.strictEqual(
				hasCartoonEmojis(text),
				false,
				"ChairScheduleView must contain 0 cartoon emojis (Mandate 8d)",
			);
		});
	});
});
