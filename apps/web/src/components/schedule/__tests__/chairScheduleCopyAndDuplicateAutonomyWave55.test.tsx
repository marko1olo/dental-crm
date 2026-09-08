/**
 * chairScheduleCopyAndDuplicateAutonomyWave55.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 244 (Wave 55):
 * «расписание_кресла_смены::1_клик_копирование_смен_на_всю_неделю_пн_вс_пн_пт_дублирование_кресел_и_очистка_дня»
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Mandate 8c: Dominant Workspace & touch targets floor (>= 44x44px in modals/popovers).
 * - Mandate 8d п. 4 & 7: WCAG contrast, 0 cartoon emojis (Lucide icons only).
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, frictionless actions).
 * - Mandate 8k: CRM != Reality Simulator (friction-killer law, 1-click week batching).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard } from "@dental/shared";

import {
	ChairScheduleView,
} from "../ChairScheduleView";
import {
	QuickAddChairModal,
	type QuickAddChairData,
} from "../QuickAddChairModal";
import {
	ScheduleGrid,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";
import {
	getMondayOfWeekIso,
	addDaysToDateIso,
} from "../roster/DoctorShiftRosterModal";

// Cartoon emoji detector per Mandate 8d п. 7
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

function findAllNodes(node: MockDomNode | null, predicate: (n: MockDomNode) => boolean): MockDomNode[] {
	const res: MockDomNode[] = [];
	if (!node) return res;
	if (predicate(node)) res.push(node);
	if (node.children) {
		for (const child of node.children) {
			res.push(...findAllNodes(child, predicate));
		}
	}
	return res;
}

function getAllText(node: MockDomNode | null): string {
	if (!node) return "";
	let s = node.textContent || "";
	if (node.children) {
		for (const c of node.children) {
			s += " " + getAllText(c);
		}
	}
	return s;
}

// Minimal test fixture
const mockStaff = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		role: "doctor",
		active: true,
		specialties: ["therapist"],
	},
	{
		id: "doc-2",
		fullName: "Петрова Анна Сергеевна",
		role: "doctor",
		active: true,
		specialties: ["orthopedist"],
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		room: "Кабинет 101",
		color: "#0d9488",
		specialization: "therapist",
		active: true,
		isActive: true,
		defaultDoctorId: "doc-1",
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Ортопедия)",
		room: "Кабинет 102",
		color: "#2563eb",
		specialization: "orthopedist",
		active: true,
		isActive: true,
		defaultDoctorId: "doc-2",
	},
];

const mockDashboard: Dashboard = {
	stats: {} as any,
	todayAppointments: [],
	patients: [],
	clinicSettings: {
		clinicName: "Денте Люкс",
		profile: {
			organizationId: "clinic-test",
			clinicName: "Стоматология DENTE",
			timezone: "Europe/Moscow",
			mode: "standard",
		} as any,
		chairs: mockChairs as any,
		staff: mockStaff as any,
	} as any,
} as any;

describe("Feature 244 (Wave 55): Schedule & Chair Shift Autonomy & Parity", () => {
	let container: MockDomNode;
	let root: Root;
	let storage: Record<string, string>;

	beforeEach(() => {
		const env = setupMockDom();
		storage = env.storage;
		container = env.doc.createElement("div");
		env.doc.body.appendChild(container);
		root = createRoot(container as any);
	});

	it("1. Copies today's shifts to full week (Mon-Sun, 7 days) via handleCopyTodayShiftsToCurrentWeek(false)", async () => {
		const dateKey = "2026-09-09"; // Wednesday
		const mondayIso = getMondayOfWeekIso(dateKey); // 2026-09-07
		assert.strictEqual(mondayIso, "2026-09-07");

		const todayAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				chairName: "Кресло 1 (Терапия)",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "morning",
				shiftLabel: "Утро 08-14",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
		};

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey={dateKey}
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					chairDoctorAssignments={todayAssignments}
				/>,
			);
		});

		// Find button "На неделю (Пн–Вс)"
		const copyWeekBtn = findNodeByTestId(container, "btn-copy-chair-week-current");
		assert.ok(copyWeekBtn, "Toolbar button btn-copy-chair-week-current must exist");
		assert.strictEqual(copyWeekBtn.disabled, false, "Mandate 8e: button must not be disabled");

		// Click the button using clickNode
		await clickNode(copyWeekBtn);

		// Verify 7 days (offset 0..6) were populated in localStorage
		for (let i = 0; i < 7; i++) {
			const dayIso = addDaysToDateIso(mondayIso, i);
			const saved = storage[`dente_chair_doctor_assignments_${dayIso}`];
			assert.ok(saved, `Day ${dayIso} must have saved assignments`);
			const parsed = JSON.parse(saved);
			assert.ok(parsed["chair-1"], `chair-1 must be present on ${dayIso}`);
			assert.strictEqual(parsed["chair-1"].doctorId, "doc-1");
			assert.strictEqual(parsed["chair-1"].shiftPreset, "morning");
		}
	});

	it("2. Copies today's shifts to workdays (Mon-Fri, 5 days) via handleCopyTodayShiftsToCurrentWeek(true)", async () => {
		const dateKey = "2026-09-09";
		const mondayIso = getMondayOfWeekIso(dateKey); // 2026-09-07

		const todayAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-2": {
				chairId: "chair-2",
				chairName: "Кресло 2 (Ортопедия)",
				doctorId: "doc-2",
				doctorName: "Петрова Анна Сергеевна",
				shiftPreset: "evening",
				shiftLabel: "Вечер 14-20",
				shiftHours: "14:00–20:00",
				startHour: 14,
				endHour: 20,
			},
		};

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey={dateKey}
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					chairDoctorAssignments={todayAssignments}
				/>,
			);
		});

		// Find button "На будни (Пн–Пт)"
		const copyWorkdaysBtn = findNodeByTestId(container, "btn-copy-chair-week-workdays");
		assert.ok(copyWorkdaysBtn, "Toolbar button btn-copy-chair-week-workdays must exist");
		assert.strictEqual(copyWorkdaysBtn.disabled, false, "Mandate 8e: button must not be disabled");

		// Click button
		await clickNode(copyWorkdaysBtn);

		// Verify 5 workdays (offset 0..4) are populated
		for (let i = 0; i < 5; i++) {
			const dayIso = addDaysToDateIso(mondayIso, i);
			const saved = storage[`dente_chair_doctor_assignments_${dayIso}`];
			assert.ok(saved, `Workday ${dayIso} must have saved assignments`);
			const parsed = JSON.parse(saved);
			assert.strictEqual(parsed["chair-2"].doctorId, "doc-2");
		}

		// Saturday and Sunday (offset 5 and 6) should NOT have been overwritten
		const satIso = addDaysToDateIso(mondayIso, 5);
		const sunIso = addDaysToDateIso(mondayIso, 6);
		assert.strictEqual(storage[`dente_chair_doctor_assignments_${satIso}`], undefined);
		assert.strictEqual(storage[`dente_chair_doctor_assignments_${sunIso}`], undefined);
	});

	it("3. Clears all day shifts in 1 click and notifies parent", async () => {
		const dateKey = "2026-09-09";
		storage[`dente_chair_doctor_assignments_${dateKey}`] = JSON.stringify({
			"chair-1": { doctorId: "doc-1" },
		});

		const onAssignChairDoctor = vi.fn();

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey={dateKey}
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAssignChairDoctor={onAssignChairDoctor}
				/>,
			);
		});

		const clearBtn = findNodeByTestId(container, "btn-clear-day-shifts");
		assert.ok(clearBtn, "btn-clear-day-shifts button must exist in toolbar");
		assert.strictEqual(clearBtn.disabled, false, "Mandate 8e: clear button must not be disabled");

		await clickNode(clearBtn);

		// Verify localStorage was cleared for this date
		assert.strictEqual(storage[`dente_chair_doctor_assignments_${dateKey}`], undefined);

		// Verify onAssignChairDoctor was called with null for each chair
		assert.ok(onAssignChairDoctor.calls.length >= 2, "Parent callback must be notified for chairs");
		assert.strictEqual(onAssignChairDoctor.calls[0]![0], "chair-1");
		assert.strictEqual(onAssignChairDoctor.calls[0]![1], null);
		assert.strictEqual(onAssignChairDoctor.calls[1]![0], "chair-2");
		assert.strictEqual(onAssignChairDoctor.calls[1]![1], null);
	});

	it("4. Duplicates chair in QuickAddChairModal with + Дублировать как новое кресло", async () => {
		const onAddChair = vi.fn();
		const onClose = vi.fn();

		const initialChair: QuickAddChairData = {
			id: "chair-1",
			name: "Кресло 1 (Терапия)",
			room: "Кабинет 101",
			specialization: "therapist",
			color: "#0d9488",
			isActive: true,
			defaultDoctorId: "doc-1",
		};

		await act(async () => {
			root.render(
				<QuickAddChairModal
					isOpen={true}
					onClose={onClose}
					initialData={initialChair}
					onAddChair={onAddChair}
					doctors={mockStaff}
					existingChairsCount={2}
				/>,
			);
		});

		// Check presence of duplicate button
		const duplicateBtn = findNodeByTestId(container, "quick-add-chair-duplicate-btn");
		assert.ok(duplicateBtn, "quick-add-chair-duplicate-btn must be present in edit/initial mode");
		assert.strictEqual(duplicateBtn.disabled, false, "Duplicate button must never be disabled");
		assert.ok(
			duplicateBtn.style.minHeight === "44px" || duplicateBtn.className?.includes("min-h-[44px]"),
			"Mandate 8c: touch target must be >= 44px",
		);

		// Click duplicate button
		await clickNode(duplicateBtn);

		// Verify onAddChair called with cloned data and (копия) suffix
		assert.strictEqual(onAddChair.calls.length, 1, "onAddChair should be called once");
		const createdData: QuickAddChairData = onAddChair.calls[0]![0];
		assert.strictEqual(createdData.name, "Кресло 1 (Терапия) (копия)");
		assert.strictEqual(createdData.room, "Кабинет 101");
		assert.strictEqual(createdData.specialization, "therapist");
		assert.strictEqual(createdData.color, "#0d9488");
		assert.strictEqual(createdData.defaultDoctorId, "doc-1");
		assert.strictEqual(createdData.isActive, true);

		// Modal should close
		assert.strictEqual(onClose.calls.length, 1);
	});

	it("5. ChairScheduleView: popover has duplicate button and triggers QuickAddChairModal with prefilled copy", async () => {
		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		// Click chair shift button to open popover
		const shiftToggleBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
		assert.ok(shiftToggleBtn, "chair shift toggle button must exist");

		await clickNode(shiftToggleBtn);

		// Popover should be open
		const popover = findNodeByTestId(container, "chair-view-shift-popover-chair-1");
		assert.ok(popover, "Chair popover must be visible");

		// Duplicate button must be present in popover
		const duplicateBtn = findNodeByTestId(container, "chair-view-duplicate-chair-1");
		assert.ok(duplicateBtn, "chair-view-duplicate-chair-1 button must be present in popover");
		assert.strictEqual(duplicateBtn.disabled, false);

		// Click duplicate in popover
		await clickNode(duplicateBtn);

		// QuickAddChairModal should be open with duplicated name in input
		const nameInput = findNodeByTestId(container, "quick-add-chair-name-input");
		assert.ok(nameInput, "Chair name input must be rendered in opened modal");
		assert.strictEqual((nameInput as any).value, "Кресло 1 (Терапия) (копия)");
	});

	it("6. ScheduleGrid: popover has 'На всю неделю (Пн–Вс)' (7 days) and 'Снять врача с кресла'", async () => {
		const onAssignChairDoctor = vi.fn();
		const dateKey = "2026-09-07";
		const mondayIso = getMondayOfWeekIso(dateKey);

		await act(async () => {
			root.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey={dateKey}
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAssignChairDoctor={onAssignChairDoctor}
					patientName={(_, id) => id || "Пациент"}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={{
						planned: "Запланирован",
						confirmed: "Подтвержден",
						arrived: "Прибыл",
						in_treatment: "В кресле",
						completed: "Завершен",
						cancelled: "Отменен",
						no_show: "Не явился",
					}}
				/>,
			);
		});

		// Open doctor popover in column header for chair-1
		const chairHeaderBtn = findNodeByTestId(container, "btn-chair-doctor-popover-chair-1");
		assert.ok(chairHeaderBtn, "btn-chair-doctor-popover-chair-1 button must exist");

		await clickNode(chairHeaderBtn);

		const popover = findNodeByTestId(container, "chair-doctor-quick-popover-chair-1");
		assert.ok(popover, "chair-doctor-quick-popover-chair-1 must be open");

		// Full week 7-day button
		const weekFullBtn = findNodeByTestId(container, "chair-popover-shift-week-full-chair-1");
		assert.ok(weekFullBtn, "chair-popover-shift-week-full-chair-1 must exist");
		assert.strictEqual(weekFullBtn.disabled, false);

		// Click weekFullBtn
		await clickNode(weekFullBtn);

		// Verify onAssignChairDoctor called
		assert.ok(onAssignChairDoctor.calls.length >= 1);
		const assigned = onAssignChairDoctor.calls[0]![1];
		assert.strictEqual(assigned.shiftLabel, "Весь день (Пн–Вс)");

		// Verify all 7 days were stored in localStorage
		for (let i = 0; i < 7; i++) {
			const dayIso = addDaysToDateIso(mondayIso, i);
			const saved = storage[`dente_chair_doctor_assignments_${dayIso}`];
			assert.ok(saved, `Day ${dayIso} must have assignment saved`);
			const parsed = JSON.parse(saved);
			assert.strictEqual(parsed["chair-1"].shiftLabel, "Весь день (Пн–Вс)");
		}

		// Re-open popover to check unassign button
		await clickNode(chairHeaderBtn);

		const unassignBtn = findNodeByTestId(container, "chair-popover-unassign-chair-1");
		assert.ok(unassignBtn, "chair-popover-unassign-chair-1 must exist when doctor is assigned");
		assert.strictEqual(unassignBtn.disabled, false);

		await clickNode(unassignBtn);

		// Verify onAssignChairDoctor called with null
		const lastCall = onAssignChairDoctor.calls[onAssignChairDoctor.calls.length - 1]!;
		assert.strictEqual(lastCall[0], "chair-1");
		assert.strictEqual(lastCall[1], null);
	});

	it("7. Mandate 8d & 8e: 0 cartoon emojis and 0 disabled buttons", async () => {
		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		const allText = getAllText(container);
		assert.strictEqual(
			hasCartoonEmojis(allText),
			false,
			"Mandate 8d: No cartoon emojis allowed in rendered schedule interface",
		);

		// All buttons in toolbar and view must not be disabled
		const allButtons = findAllNodes(container, (n) => n.tagName === "BUTTON");
		for (const btn of allButtons) {
			assert.strictEqual(
				btn.disabled,
				false,
				`Mandate 8e: Button ${btn.getAttribute("data-testid") || btn.textContent} must not be disabled`,
			);
		}
	});
});
