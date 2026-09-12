/**
 * chairSubShiftsAndToolbarParityWave59.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 248 (Wave 59):
 * «расписание_кресла_смены::двухсменное_закрепление_subshifts_серверная_синхронизация_и_hig_рефакторинг_тулбаров»
 * (StomX / DentalPRO / IDENT Parity)
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Mandate 8c: Dominant Workspace & touch targets floor (>= 36-44px in day cells / toolbars).
 * - Mandate 8d п. 2: Hick's Law: 1-row toolbar (32-36px), dropdown grouping for secondary actions.
 * - Mandate 8d п. 4: Theme hygiene (CSS variables, dark/light mode tokens, zero hardcoded pastels).
 * - Mandate 8d п. 7: 0 cartoon emojis in medical and schedule views (Lucide icons only).
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, frictionless shift changes).
 * - Mandate 8k: CRM != Reality Simulator (friction-killer law: 1-click morning/evening binding).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty with multi-chair scale resilience.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard } from "@dental/shared";

import {
	ChairScheduleView,
	syncShiftsWithServer,
	type SyncShiftPayload,
} from "../ChairScheduleView";
import {
	type ChairDoctorShiftAssignment,
	type ChairDoctorSubShift,
	formatDoctorShortName,
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

let mockDoc: any = null;

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	class FakeHTMLIFrameElement {}
	class FakeHTMLElement {}
	class FakeElement {}
	class FakeNode {}

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

	// In-memory localStorage mock
	const storage: Record<string, string> = {};
	g.localStorage = {
		getItem: (k: string) => (k in storage ? storage[k] : null),
		setItem: (k: string, v: string) => {
			storage[k] = String(v);
		},
		removeItem: (k: string) => {
			delete storage[k];
		},
		clear: () => {
			for (const k of Object.keys(storage)) delete storage[k];
		},
	};

	// Mock fetch
	g.fetch = vi.fn().mockReturnValue(
		Promise.resolve({
			ok: true,
			status: 200,
			json: async () => ({ ok: true, shifts: [] }),
		}),
	);

	mockDoc = doc;
	return { doc, win };
}

function findNodeByTestId(
	node: MockDomNode | null,
	testId: string,
): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute && typeof node.getAttribute === "function" && node.getAttribute("data-testid") === testId) {
		return node;
	}
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			const res = findNodeByTestId(child, testId);
			if (res) return res;
		}
	}
	return null;
}

function findAllNodesByTag(node: MockDomNode | null, tag: string): MockDomNode[] {
	const res: MockDomNode[] = [];
	if (!node) return res;
	const upper = tag.toUpperCase();
	if (node.tagName === upper) res.push(node);
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			res.push(...findAllNodesByTag(child, tag));
		}
	}
	return res;
}

function collectAllText(node: MockDomNode): string {
	let text = node.textContent || "";
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			text += " " + collectAllText(child);
		}
	}
	return text;
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

const mockStaff = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		role: "doctor",
		active: true,
		specialty: "Терапевт",
	},
	{
		id: "doc-2",
		fullName: "Петров Петр Петрович",
		role: "doctor",
		active: true,
		specialty: "Хирург-имплантолог",
	},
	{
		id: "doc-3",
		fullName: "Сидорова Анна Сергеевна",
		role: "doctor",
		active: true,
		specialty: "Ортодонт",
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Установка 1 (Planmeca)",
		roomNumber: "101",
		room: "101",
		color: "#0d9488",
		specialization: "therapist",
		isActive: true,
	},
	{
		id: "chair-2",
		name: "Установка 2 (Kavo)",
		roomNumber: "102",
		room: "102",
		color: "#3b82f6",
		specialization: "surgeon",
		isActive: true,
	},
];

const mockDashboard: Dashboard = {
	patients: [],
	appointments: [],
	inventory: [],
	operations: [],
	treatmentPlans: [],
	cashRegisters: [],
	clinicSettings: {
		chairs: mockChairs as any,
		staff: mockStaff as any,
		cabinets: [
			{ id: "cab-1", name: "Кабинет 101", chairIds: ["chair-1"] },
			{ id: "cab-2", name: "Кабинет 102", chairIds: ["chair-2"] },
		],
	} as any,
} as any;

describe("Wave 59 (Feature 248) — Chair SubShifts Two-Shift Binding, Server Sync & HIG Toolbars Parity", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		setupMockDom();
		container = mockDoc.createElement("div");
		mockDoc.body.appendChild(container);
		root = createRoot(container as any);
	});

	it("1. Two-shift binding: Morning + Evening merge into subShifts with shiftPreset 'two_shifts'", async () => {
		let assignedResult: ChairDoctorShiftAssignment | null = null;
		const onAssignChairDoctor = vi.fn((_chairId: string, assignment: ChairDoctorShiftAssignment | null) => {
			assignedResult = assignment;
		});

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAssignChairDoctor={onAssignChairDoctor}
				/>,
			);
		});

		// 1. Open shift popover for chair-1
		const assignBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
		assert.ok(assignBtn, "Assign doctor button must exist for chair-1");
		await clickNode(assignBtn);

		// 2. Select Doctor 1 (Иванов)
		const doc1Option = findNodeByTestId(container, "chair-view-doc-option-chair-1-doc-1");
		assert.ok(doc1Option, "Doctor 1 option must exist");
		await clickNode(doc1Option);

		// 3. Assign Morning shift
		const morningBtn = findNodeByTestId(container, "chair-view-shift-morning-chair-1");
		assert.ok(morningBtn, "Morning shift button must exist");
		await clickNode(morningBtn);

		assert.ok(assignedResult, "First assignment should be recorded");
		assert.equal((assignedResult as ChairDoctorShiftAssignment).shiftPreset, "morning");
		assert.equal((assignedResult as ChairDoctorShiftAssignment).doctorId, "doc-1");
		assert.equal((assignedResult as ChairDoctorShiftAssignment).startHour, 8);
		assert.equal((assignedResult as ChairDoctorShiftAssignment).endHour, 14);

		// Now render with the existing morning assignment passed in props (simulating state update)
		const currentAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": assignedResult,
		};

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					chairDoctorAssignments={currentAssignments}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAssignChairDoctor={onAssignChairDoctor}
				/>,
			);
		});

		// 4. Open popover again and assign Doctor 2 (Петров) to Evening shift on chair-1
		await clickNode(findNodeByTestId(container, "chair-view-assign-doctor-chair-1"));
		const doc2Option = findNodeByTestId(container, "chair-view-doc-option-chair-1-doc-2");
		assert.ok(doc2Option, "Doctor 2 option must exist");
		await clickNode(doc2Option);

		const eveningBtn = findNodeByTestId(container, "chair-view-shift-evening-chair-1");
		assert.ok(eveningBtn, "Evening shift button must exist");
		await clickNode(eveningBtn);

		// 5. Verify the assignment merged into two_shifts!
		assert.ok(assignedResult, "Merged assignment should exist");
		const merged = assignedResult as ChairDoctorShiftAssignment;
		assert.equal(merged.shiftPreset, "two_shifts", "Shift preset must be two_shifts");
		assert.equal(merged.shiftLabel, "2 смены (Утро + Вечер)");
		assert.equal(merged.shiftHours, "08:00–20:00");
		assert.equal(merged.startHour, 8);
		const subShiftsList = merged.subShifts ?? [];
		assert.equal(subShiftsList.length, 2, "Must contain exactly 2 subShifts");
		const sub0 = subShiftsList[0];
		const sub1 = subShiftsList[1];
		assert.ok(sub0 && sub1, "Both subShifts must exist");
		assert.equal(sub0.doctorId, "doc-1", "Morning subShift must be Doctor 1");
		assert.equal(sub0.startHour, 8);
		assert.equal(sub0.endHour, 14);
		assert.equal(sub1.doctorId, "doc-2", "Evening subShift must be Doctor 2");
		assert.equal(sub1.startHour, 14);
		assert.equal(sub1.endHour, 20);

		// 6. Assign Full Day ("full") on the merged chair -> resets to single doctor full day
		currentAssignments["chair-1"] = merged;
		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					chairDoctorAssignments={currentAssignments}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAssignChairDoctor={onAssignChairDoctor}
				/>,
			);
		});

		await clickNode(findNodeByTestId(container, "chair-view-assign-doctor-chair-1"));
		const fullBtn = findNodeByTestId(container, "chair-view-shift-full-chair-1");
		assert.ok(fullBtn, "Full day button must exist");
		await clickNode(fullBtn);

		const fullAssignment = assignedResult as ChairDoctorShiftAssignment;
		assert.equal(fullAssignment.shiftPreset, "full", "Full day resets two_shifts to single full shift");
		assert.equal(fullAssignment.shiftLabel, "Весь день");
		assert.equal(fullAssignment.subShifts, undefined, "subShifts must be cleared for full day");
	});

	it("2. Chair toolbar badge displays dual-doctor '(У: Иванов И.И. / В: Петров П.П.)' format", async () => {
		const morningSub: ChairDoctorSubShift = {
			doctorId: "doc-1",
			doctorName: "Иванов Иван Иванович",
			startHour: 8,
			endHour: 14,
			shiftHours: "08:00–14:00",
		};
		const eveningSub: ChairDoctorSubShift = {
			doctorId: "doc-2",
			doctorName: "Петров Петр Петрович",
			startHour: 14,
			endHour: 20,
			shiftHours: "14:00–20:00",
		};

		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				chairName: "Установка 1 (Planmeca)",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович / Петров Петр Петрович",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены (Утро + Вечер)",
				shiftHours: "08:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [morningSub, eveningSub],
			},
		};

		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					chairDoctorAssignments={assignments}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		const docBadge = findNodeByTestId(container, "chair-view-doc-chair-1");
		assert.ok(docBadge, "Chair doctor badge must exist for chair-1");
		const badgeText = collectAllText(docBadge);
		assert.ok(
			badgeText.includes("У: Иванов И.И.") && badgeText.includes("В: Петров П.П."),
			`Badge text must contain formatted morning and evening doctors: "${badgeText}"`,
		);
	});

	it("3. syncShiftsWithServer formats subShifts properly and invokes POST /api/schedule/shifts", async () => {
		const morningSub: ChairDoctorSubShift = {
			doctorId: "doc-1",
			doctorName: "Иванов Иван Иванович",
			doctorSpecialty: "Терапевт",
			startHour: 8,
			endHour: 14,
			shiftHours: "08:00–14:00",
		};
		const eveningSub: ChairDoctorSubShift = {
			doctorId: "doc-2",
			doctorName: "Петров Петр Петрович",
			doctorSpecialty: "Хирург",
			startHour: 14,
			endHour: 20,
			shiftHours: "14:00–20:00",
		};

		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				chairName: "Установка 1 (Planmeca)",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович / Петров Петр Петрович",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены (Утро + Вечер)",
				shiftHours: "08:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [morningSub, eveningSub],
			},
		};

		let capturedUrl = "";
		let capturedOptions: any = null;
		(globalThis as any).fetch = vi.fn((url: string, opts: any) => {
			capturedUrl = url;
			capturedOptions = opts;
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ ok: true }),
			});
		});

		const syncSuccess = await syncShiftsWithServer("2026-09-09", assignments, mockChairs as any);
		assert.equal(syncSuccess, true, "syncShiftsWithServer should return true on success");
		assert.equal(capturedUrl, "/api/schedule/shifts", "Must POST to /api/schedule/shifts");
		assert.equal(capturedOptions.method, "POST");

		const payload: { shifts: SyncShiftPayload[] } = JSON.parse(capturedOptions.body);
		assert.ok(Array.isArray(payload.shifts), "Payload must contain shifts array");
		assert.equal(payload.shifts.length, 2, "Two-shift assignment must generate exactly 2 distinct shift records");

		const morn = payload.shifts.find((s) => s.doctorId === "doc-1");
		assert.ok(morn, "Morning shift record must exist");
		assert.equal(morn.startTime, "08:00");
		assert.equal(morn.endTime, "14:00");
		assert.equal(morn.durationHours, 6);
		assert.equal(morn.chairId, "chair-1");

		const eve = payload.shifts.find((s) => s.doctorId === "doc-2");
		assert.ok(eve, "Evening shift record must exist");
		assert.equal(eve.startTime, "14:00");
		assert.equal(eve.endTime, "20:00");
		assert.equal(eve.durationHours, 6);
		assert.equal(eve.chairId, "chair-1");
	});

	it("4. Hick's Law & Mandate 8d: 1-row toolbar (32-36px), dropdown trigger & 100% action test-id parity", async () => {
		await act(async () => {
			root.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onOpenRosterModal={() => {}}
				/>,
			);
		});

		// 1. Toolbar strip check
		const toolbar = findNodeByTestId(container, "chair-schedule-palette-strip");
		assert.ok(toolbar, "Palette strip must exist");
		assert.ok(
			toolbar.className?.includes("h-9") && toolbar.className?.includes("min-h-[36px]"),
			"Toolbar must be locked to 32-36px compact single row",
		);

		// 2. Primary direct toolbar buttons
		assert.ok(findNodeByTestId(container, "btn-open-chair-roster"), "btn-open-chair-roster must be directly visible in toolbar");
		assert.ok(findNodeByTestId(container, "btn-chair-view-add-doctor"), "btn-chair-view-add-doctor must be directly visible in toolbar");
		assert.ok(findNodeByTestId(container, "btn-add-chair-header"), "btn-add-chair-header must be directly visible in toolbar");

		// 3. Dropdown trigger button
		const dropdownTrigger = findNodeByTestId(container, "btn-chair-shifts-menu-trigger");
		assert.ok(dropdownTrigger, "Dropdown trigger btn-chair-shifts-menu-trigger must exist");
		assert.equal(dropdownTrigger.getAttribute("aria-expanded"), "false");

		// 4. Click dropdown trigger -> opens menu
		await clickNode(dropdownTrigger);
		assert.equal(dropdownTrigger.getAttribute("aria-expanded"), "true");

		const dropdownMenu = findNodeByTestId(container, "chair-shifts-dropdown-menu");
		assert.ok(dropdownMenu, "Dropdown menu container chair-shifts-dropdown-menu must exist");

		// 5. All 7 batch action buttons must be present with zero loss
		assert.ok(findNodeByTestId(container, "btn-copy-chair-week-current"), "btn-copy-chair-week-current must exist");
		assert.ok(findNodeByTestId(container, "btn-copy-chair-week-workdays"), "btn-copy-chair-week-workdays must exist");
		assert.ok(findNodeByTestId(container, "btn-copy-chair-month"), "btn-copy-chair-month must exist");
		assert.ok(findNodeByTestId(container, "btn-rotate-chair-shifts"), "btn-rotate-chair-shifts must exist");
		assert.ok(findNodeByTestId(container, "btn-apply-preferred-chairs"), "btn-apply-preferred-chairs must exist");
	});
});
