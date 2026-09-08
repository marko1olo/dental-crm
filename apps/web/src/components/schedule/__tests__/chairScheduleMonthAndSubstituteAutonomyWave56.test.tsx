/**
 * chairScheduleMonthAndSubstituteAutonomyWave56.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 245 (Wave 56):
 * «расписание_кресла_смены::1_клик_копирование_смен_на_месяц_подмена_дежурного_врача_и_ротация_кресел»
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Mandate 8c: Dominant Workspace & touch targets floor (>= 44x44px in popovers).
 * - Mandate 8d п. 7: 0 cartoon emojis (Lucide vector icons only).
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, frictionless actions).
 * - Mandate 8k: CRM != Reality Simulator (friction-killer law, 1-click month batching).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard } from "@dental/shared";

import { ChairScheduleView } from "../ChairScheduleView";
import {
	ScheduleGrid,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";

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
		innerWidth: 1200,
	};
	doc.defaultView = win;

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

describe("Feature 245 (Wave 56): Schedule & Chair Shifts Month Copy, Quick Substitution and Rotation", () => {
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

	it("1. Copies today's shifts to entire month in 1 click via handleCopyTodayShiftsToMonth (btn-copy-chair-month)", async () => {
		const dateKey = "2026-09-08"; // September 2026 has 30 days
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

		// Find toolbar button "На месяц"
		const copyMonthBtn = findNodeByTestId(container, "btn-copy-chair-month");
		assert.ok(copyMonthBtn, "Toolbar button btn-copy-chair-month must exist");
		assert.strictEqual(copyMonthBtn.disabled, false, "Mandate 8e: button must not be disabled");

		// Click the button
		await clickNode(copyMonthBtn);

		// Verify all 30 days in September 2026 (2026-09-01 .. 2026-09-30) were saved in localStorage
		for (let d = 1; d <= 30; d++) {
			const dayIso = `2026-09-${String(d).padStart(2, "0")}`;
			const saved = storage[`dente_chair_doctor_assignments_${dayIso}`];
			assert.ok(saved, `Day ${dayIso} must have saved assignments for entire month`);
			const parsed = JSON.parse(saved);
			assert.ok(parsed["chair-1"], `chair-1 must be present on ${dayIso}`);
			assert.strictEqual(parsed["chair-1"].doctorId, "doc-1");
			assert.strictEqual(parsed["chair-1"].shiftPreset, "morning");
		}

		// Verify dente_doctor_shifts was also updated
		const shiftsRaw = storage["dente_doctor_shifts"];
		assert.ok(shiftsRaw, "dente_doctor_shifts must be populated");
	});

	it("2. Quick substitute doctor on chair shift in ChairScheduleView (chair-view-substitute-btn-...)", async () => {
		const dateKey = "2026-09-08";
		const onAssignChairDoctor = vi.fn();
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
					onAssignChairDoctor={onAssignChairDoctor}
				/>,
			);
		});

		// Open chair shift popover
		const assignBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
		assert.ok(assignBtn, "Doctor assign trigger chair-view-assign-doctor-chair-1 must exist");
		await clickNode(assignBtn);

		const popover = findNodeByTestId(container, "chair-view-shift-popover-chair-1");
		assert.ok(popover, "Shift popover chair-view-shift-popover-chair-1 must be open");

		// Find substitute doctor button
		const substituteBtn = findNodeByTestId(container, "chair-view-substitute-btn-chair-1");
		assert.ok(substituteBtn, "Substitute button chair-view-substitute-btn-chair-1 must exist");
		assert.strictEqual(substituteBtn.disabled, false, "Mandate 8e: substitute button must not be disabled");

		// Click substitute button to open doctor picker
		await clickNode(substituteBtn);

		const picker = findNodeByTestId(container, "chair-view-substitute-picker-chair-1");
		assert.ok(picker, "Substitute picker chair-view-substitute-picker-chair-1 must be open");

		// Pick substitute doctor: doc-2 (Петрова Анна Сергеевна)
		const doc2Option = findNodeByTestId(container, "chair-view-substitute-option-chair-1-doc-2");
		assert.ok(doc2Option, "Substitute option for doc-2 must exist");
		assert.strictEqual(doc2Option.disabled, false);

		await clickNode(doc2Option);

		// Verify onAssignChairDoctor was called with doc-2
		assert.ok(onAssignChairDoctor.calls.length >= 1, "onAssignChairDoctor must be called");
		const call = onAssignChairDoctor.calls[onAssignChairDoctor.calls.length - 1]!;
		assert.strictEqual(call[0], "chair-1");
		assert.strictEqual(call[1].doctorId, "doc-2");
		assert.strictEqual(call[1].doctorName, "Петрова Анна Сергеевна");

		// Verify localStorage was updated
		const saved = storage[`dente_chair_doctor_assignments_${dateKey}`];
		assert.ok(saved);
		const parsed = JSON.parse(saved);
		assert.strictEqual(parsed["chair-1"].doctorId, "doc-2");
	});

	it("3. Cyclic rotation of shifts between chairs in 1 click (btn-rotate-chair-shifts)", async () => {
		const dateKey = "2026-09-08";
		const onAssignChairDoctor = vi.fn();
		const currentAssignments: Record<string, ChairDoctorShiftAssignment> = {
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
					chairDoctorAssignments={currentAssignments}
					onAssignChairDoctor={onAssignChairDoctor}
				/>,
			);
		});

		// Find toolbar button "Ротация кресел"
		const rotateBtn = findNodeByTestId(container, "btn-rotate-chair-shifts");
		assert.ok(rotateBtn, "btn-rotate-chair-shifts button must exist");
		assert.strictEqual(rotateBtn.disabled, false, "Mandate 8e: rotate button must not be disabled");

		// Click rotation
		await clickNode(rotateBtn);

		// Verify onAssignChairDoctor was called for both chairs
		assert.ok(onAssignChairDoctor.calls.length >= 2, "Parent callback must be notified for both chairs");

		// Chair 1 should receive doc-2 (was on Chair 2)
		const chair1Call = onAssignChairDoctor.calls.find((c) => c[0] === "chair-1");
		assert.ok(chair1Call, "Chair 1 assignment must be updated");
		assert.strictEqual(chair1Call[1].doctorId, "doc-2");
		assert.strictEqual(chair1Call[1].doctorName, "Петрова Анна Сергеевна");

		// Chair 2 should receive doc-1 (was on Chair 1)
		const chair2Call = onAssignChairDoctor.calls.find((c) => c[0] === "chair-2");
		assert.ok(chair2Call, "Chair 2 assignment must be updated");
		assert.strictEqual(chair2Call[1].doctorId, "doc-1");
		assert.strictEqual(chair2Call[1].doctorName, "Иванов Иван Иванович");

		// Verify localStorage has rotated assignments
		const saved = storage[`dente_chair_doctor_assignments_${dateKey}`];
		assert.ok(saved);
		const parsed = JSON.parse(saved);
		assert.strictEqual(parsed["chair-1"].doctorId, "doc-2");
		assert.strictEqual(parsed["chair-2"].doctorId, "doc-1");
	});

	it("4. ScheduleGrid: 1-click assign doctor to chair for entire month (chair-popover-shift-month-...)", async () => {
		const onAssignChairDoctor = vi.fn();
		const dateKey = "2026-09-08";

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
		assert.ok(chairHeaderBtn, "btn-chair-doctor-popover-chair-1 must exist");

		await clickNode(chairHeaderBtn);

		const popover = findNodeByTestId(container, "chair-doctor-quick-popover-chair-1");
		assert.ok(popover, "chair-doctor-quick-popover-chair-1 must be open");

		// Month button
		const monthBtn = findNodeByTestId(container, "chair-popover-shift-month-chair-1");
		assert.ok(monthBtn, "chair-popover-shift-month-chair-1 must exist");
		assert.strictEqual(monthBtn.disabled, false, "Mandate 8e: month button must not be disabled");

		// Click monthBtn
		await clickNode(monthBtn);

		// Verify onAssignChairDoctor called
		assert.ok(onAssignChairDoctor.calls.length >= 1);
		const assigned = onAssignChairDoctor.calls[0]![1];
		assert.strictEqual(assigned.shiftLabel, "Весь день (Месяц)");

		// Verify all 30 days in September 2026 were populated in localStorage
		for (let d = 1; d <= 30; d++) {
			const dayIso = `2026-09-${String(d).padStart(2, "0")}`;
			const saved = storage[`dente_chair_doctor_assignments_${dayIso}`];
			assert.ok(saved, `Day ${dayIso} must have assignment saved for whole month`);
			const parsed = JSON.parse(saved);
			assert.strictEqual(parsed["chair-1"].shiftLabel, "Весь день (Месяц)");
		}
	});

	it("5. ScheduleGrid: quick substitute doctor for today (chair-popover-substitute-...)", async () => {
		const onAssignChairDoctor = vi.fn();
		const dateKey = "2026-09-08";

		// Pre-assign chair-1 to doc-1
		storage[`dente_chair_doctor_assignments_${dateKey}`] = JSON.stringify({
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "full",
				shiftLabel: "Весь день",
			},
		});

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

		// Open doctor popover for chair-1
		const chairHeaderBtn = findNodeByTestId(container, "btn-chair-doctor-popover-chair-1");
		assert.ok(chairHeaderBtn);
		await clickNode(chairHeaderBtn);

		// Find substitute button
		const substituteBtn = findNodeByTestId(container, "chair-popover-substitute-chair-1");
		assert.ok(substituteBtn, "chair-popover-substitute-chair-1 must exist");
		assert.strictEqual(substituteBtn.disabled, false, "Mandate 8e: substitute button must not be disabled");

		// Click substitute button
		await clickNode(substituteBtn);

		// Verify onAssignChairDoctor called with substitute doctor (doc-2)
		assert.ok(onAssignChairDoctor.calls.length >= 1);
		const lastCall = onAssignChairDoctor.calls[onAssignChairDoctor.calls.length - 1]!;
		assert.strictEqual(lastCall[0], "chair-1");
		assert.strictEqual(lastCall[1].doctorId, "doc-2");
		assert.strictEqual(lastCall[1].doctorName, "Петрова Анна Сергеевна");

		// Verify localStorage was updated
		const saved = storage[`dente_chair_doctor_assignments_${dateKey}`];
		assert.ok(saved);
		const parsed = JSON.parse(saved);
		assert.strictEqual(parsed["chair-1"].doctorId, "doc-2");
	});

	it("6. Mandate 8d п. 7: 0 cartoon emojis in Russian text and tooltips", async () => {
		const dateKey = "2026-09-08";

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey={dateKey}
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		const allElements = findAllNodes(container, () => true);
		for (const el of allElements) {
			if (el.textContent) {
				assert.strictEqual(
					hasCartoonEmojis(el.textContent),
					false,
					`Mandate 8d п. 7: text content must not contain cartoon emojis: "${el.textContent}"`,
				);
			}
			const title = el.getAttribute ? el.getAttribute("title") : null;
			if (title) {
				assert.strictEqual(
					hasCartoonEmojis(title),
					false,
					`Mandate 8d п. 7: title attribute must not contain cartoon emojis: "${title}"`,
				);
			}
		}
	});

	it("7. Mandate 8e: 0 disabled buttons without guidance", async () => {
		const dateKey = "2026-09-08";

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey={dateKey}
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		const buttons = findAllNodes(container, (n) => n.tagName === "BUTTON");
		assert.ok(buttons.length >= 5, "Toolbar buttons must be present");

		for (const btn of buttons) {
			assert.strictEqual(
				btn.disabled,
				false,
				`Mandate 8e: Button [${btn.dataset?.testid || btn.textContent}] must not be disabled`,
			);
		}
	});

	it("8. Mandate 8c: Touch targets >= 44x44px in popovers and actions", async () => {
		const dateKey = "2026-09-08";

		await act(async () => {
			root.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey={dateKey}
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
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

		// Open doctor popover
		const chairHeaderBtn = findNodeByTestId(container, "btn-chair-doctor-popover-chair-1");
		assert.ok(chairHeaderBtn);
		await clickNode(chairHeaderBtn);

		const monthBtn = findNodeByTestId(container, "chair-popover-shift-month-chair-1");
		assert.ok(monthBtn);
		assert.strictEqual(
			monthBtn.style?.minHeight,
			"44px",
			"Mandate 8c: chair-popover-shift-month-chair-1 must have minHeight 44px",
		);

		const substituteBtn = findNodeByTestId(container, "chair-popover-substitute-chair-1");
		assert.ok(substituteBtn);
		assert.strictEqual(
			substituteBtn.style?.minHeight,
			"44px",
			"Mandate 8c: chair-popover-substitute-chair-1 must have minHeight 44px",
		);
	});
});
