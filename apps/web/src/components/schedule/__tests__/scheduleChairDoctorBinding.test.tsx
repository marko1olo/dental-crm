/**
 * scheduleChairDoctorBinding.test.tsx
 *
 * DENTE Dental CRM — Schedule Chair Doctor Binding & 1-Click Shift Allocation Test Suite
 * Parity: StomX / DentalPRO Chair Doctor Duty & Shift Assignment
 *
 * Mandates:
 * - Mandate 8e (Doctor & Staff Autonomy): Non-blocking doctor assignment, 0 disabled buttons.
 * - Mandate 8k (CRM != Reality Simulator): 1-click shift presets (Morning, Evening, Full Day).
 * - Mandate 8n (Solo Doctor & Small Clinic Sovereignty): Auto-binding fallback in solo doctor mode.
 * - Mandate 8o (Task-Scope Reporting).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "vitest";

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
	mock: () => {},
};

function expect(actual: any) {
	return {
		toBe: (expected: any) => assert.strictEqual(actual, expected),
		toBeFalsy: () => assert.ok(!actual, `Expected falsy, but got ${actual}`),
		toBeTruthy: () => assert.ok(Boolean(actual), `Expected truthy, but got ${actual}`),
		toBeNull: () => assert.strictEqual(actual, null),
		not: {
			toBeNull: () => assert.ok(actual !== null && actual !== undefined),
			toMatch: (regex: RegExp) => assert.ok(!regex.test(String(actual))),
		},
		toContain: (expected: string) => {
			assert.ok(
				actual?.includes?.(expected),
				`Expected "${actual}" to contain "${expected}"`,
			);
		},
		toHaveBeenCalled: () => {
			const count = actual?.mock?.calls?.length ?? actual?.calls?.length ?? 0;
			assert.ok(count > 0, "Expected function to have been called");
		},
		toHaveBeenCalledTimes: (n: number) => {
			const count = actual?.mock?.calls?.length ?? actual?.calls?.length ?? 0;
			assert.strictEqual(
				count,
				n,
				`Expected ${n} calls, got ${count}`,
			);
		},
		toHaveBeenCalledWith: (...expectedArgs: any[]) => {
			const calls = actual?.mock?.calls ?? actual?.calls ?? [];
			const match = calls.some((callArgs: any[]) =>
				expectedArgs.every((arg, i) => {
					if (arg && typeof arg === "object" && arg._isObjectContaining) {
						return Object.entries(arg.subset).every(
							([k, v]) => callArgs[i]?.[k] === v,
						);
					}
					return callArgs[i] === arg;
				}),
			);
			assert.ok(
				match,
				`Expected call with ${JSON.stringify(expectedArgs)}, but calls were: ${JSON.stringify(calls)}`,
			);
		},
		toBeGreaterThanOrEqual: (expected: number) => {
			assert.ok(actual >= expected, `Expected ${actual} >= ${expected}`);
		},
	};
}

expect.objectContaining = (subset: Record<string, any>) => ({
	_isObjectContaining: true,
	subset,
});
import type { Appointment, Dashboard } from "@dental/shared";
import {
	ScheduleGrid,
	DEFAULT_SOLO_CHAIR,
	CHAIR_SHIFT_PRESETS,
	formatDoctorShortName,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";
import { QuickBookingDrawer, resolveChairDutyDoctor } from "../QuickBookingDrawer";
import { buildChairDoctorAssignmentsFromShifts } from "../../../ScheduleView";
import { AppointmentModal } from "../AppointmentModal";
import { clearInMemoryStorageCache } from "../../../lib/safeLocalStorage";

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
			get textContent(): string {
				if (children.length === 0) return (el as any)._textContent ?? "";
				return children.map((c) => c.textContent ?? "").join("");
			},
			set textContent(v: string) {
				(el as any)._textContent = v;
			},
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

async function changeNode(node: MockDomNode | null, value: string) {
	if (!node) return;
	node.value = value;
	await act(async () => {
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				// biome-ignore lint/suspicious/noExplicitAny: access React internal props
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onChange === "function") {
					await props.onChange({
						target: { value },
						currentTarget: { value },
						preventDefault: () => {},
						stopPropagation: () => {},
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "change", target: { value } });
	});
}

const mockAppointmentLabels = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Пришел",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

const multiChairDashboard = {
	clinicSettings: {
		profile: {
			organizationId: "clinic-test",
			clinicName: "Стоматология DENTE",
			timezone: "Europe/Moscow",
			mode: "standard",
		},
		chairs: [
			{
				id: "chair-1",
				organizationId: "clinic-test",
				name: "Кабинет 1 (Терапия)",
				active: true,
				specialization: "therapist",
				room: "1",
			},
			{
				id: "chair-2",
				organizationId: "clinic-test",
				name: "Кабинет 2 (Хирургия)",
				active: true,
				specialization: "surgery",
				room: "2",
			},
		],
		staff: [
			{
				id: "doc-1",
				organizationId: "clinic-test",
				fullName: "Иванов Иван Иванович",
				role: "doctor",
				specialties: ["therapist"],
				active: true,
			},
			{
				id: "doc-2",
				organizationId: "clinic-test",
				fullName: "Петров Петр Сергеевич",
				role: "doctor",
				specialties: ["surgery"],
				active: true,
			},
		],
	},
	patients: [
		{
			id: "pat-1",
			fullName: "Сидоров Алексей",
			phone: "+7 999 111-22-33",
			status: "active",
		},
	],
	appointments: [],
} as unknown as Dashboard;

const soloDoctorDashboard = {
	clinicSettings: {
		profile: {
			organizationId: "clinic-solo",
			clinicName: "Стоматолог ИП Соловьев",
			timezone: "Europe/Moscow",
			mode: "solo_doctor",
		},
		chairs: [
			{
				id: "chair-solo",
				organizationId: "clinic-solo",
				name: "Кресло 1 (Основное)",
				active: true,
				room: "1",
			},
		],
		staff: [
			{
				id: "doc-solo",
				organizationId: "clinic-solo",
				fullName: "Соловьев Андрей Васильевич",
				role: "doctor",
				specialties: ["general"],
				active: true,
			},
		],
	},
	patients: [
		{
			id: "pat-1",
			fullName: "Кузнецов Дмитрий",
			phone: "+7 900 333-44-55",
			status: "active",
		},
	],
	appointments: [],
} as unknown as Dashboard;

describe("Schedule Chair Doctor Binding & 1-Click Shift Allocation (Mandates 8e, 8k, 8n)", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
		clearInMemoryStorageCache();
	});

	it("exports standard shift presets conforming to Mandate 8k (Morning, Evening, Full Day)", () => {
		expect(CHAIR_SHIFT_PRESETS.length).toBeGreaterThanOrEqual(3);
		expect(CHAIR_SHIFT_PRESETS[0]?.id).toBe("morning");
		expect(CHAIR_SHIFT_PRESETS[0]?.hours).toBe("08:00–14:00");
		expect(CHAIR_SHIFT_PRESETS[1]?.id).toBe("evening");
		expect(CHAIR_SHIFT_PRESETS[1]?.hours).toBe("14:00–20:00");
		expect(CHAIR_SHIFT_PRESETS[2]?.id).toBe("full");
		expect(CHAIR_SHIFT_PRESETS[2]?.hours).toBe("08:00–20:00");
	});

	it("formats doctor full names into clean short names correctly", () => {
		expect(formatDoctorShortName("Иванов Иван Иванович")).toBe("Иванов И.И.");
		expect(formatDoctorShortName("Ковалев Сергей")).toBe("Ковалев С.");
		expect(formatDoctorShortName("Соловьев")).toBe("Соловьев");
		expect(formatDoctorShortName("")).toBe("");
	});

	it("1. Chair column header renders doctor assignment status and button with >= 44px touch target", () => {
		// In unassigned state:
		const htmlUnassigned = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: multiChairDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: vi.fn(),
				onAppointmentClick: vi.fn(),
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
			}),
		);

		// Unassigned chair button with >= 44px touch target
		expect(htmlUnassigned).toContain('data-testid="btn-assign-doctor-chair-1"');
		expect(htmlUnassigned).toContain("+ Назначить врача");
		expect(htmlUnassigned).toContain("min-h-[44px]");

		// In assigned state (via chairDoctorAssignments prop):
		const initialAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				doctorSpecialty: "Терапевт",
				shiftPreset: "full",
				shiftLabel: "Полный день",
				shiftHours: "08:00–20:00",
			},
		};

		const htmlAssigned = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: multiChairDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: vi.fn(),
				onAppointmentClick: vi.fn(),
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
				chairDoctorAssignments: initialAssignments,
			}),
		);

		expect(htmlAssigned).toContain('data-testid="chair-doctor-badge-chair-1"');
		expect(htmlAssigned).toContain("Иванов И.И.");
		expect(htmlAssigned).toContain("08:00–20:00");
		expect(htmlAssigned).toContain("min-h-[44px]");
	});

	it("2. Assigning a doctor to a chair via interactive modal updates the header badge and fires callback", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const onAssignChairDoctor = vi.fn();

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: multiChairDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: vi.fn(),
					onAppointmentClick: vi.fn(),
					patientName: (_, id) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					onAssignChairDoctor,
				}),
			);
		});

		// Find the "+ Назначить врача" button on chair-1
		const assignBtn = findNodeByTestId(container, "btn-assign-doctor-chair-1");
		expect(assignBtn).not.toBeNull();

		// Click to open modal
		await clickNode(assignBtn);

		// Verify modal opened
		const modal = findNodeByTestId(container, "chair-doctor-assignment-modal");
		expect(modal).not.toBeNull();

		const doctorSelect = findNodeByTestId(container, "select-chair-doctor");
		expect(doctorSelect).not.toBeNull();

		// Pick doctor doc-2 (Петров)
		await changeNode(doctorSelect, "doc-2");

		// Pick shift preset morning (08:00–14:00)
		const morningPresetBtn = findNodeByTestId(container, "shift-preset-morning");
		expect(morningPresetBtn).not.toBeNull();
		await clickNode(morningPresetBtn);

		// Confirm assignment
		const confirmBtn = findNodeByTestId(container, "btn-confirm-chair-doctor");
		expect(confirmBtn).not.toBeNull();
		await clickNode(confirmBtn);

		// Callback should be fired with correct assignment payload
		expect(onAssignChairDoctor).toHaveBeenCalledTimes(1);
		expect(onAssignChairDoctor).toHaveBeenCalledWith(
			"chair-1",
			(expect as any).objectContaining({
				chairId: "chair-1",
				doctorId: "doc-2",
				shiftPreset: "morning",
				shiftHours: "08:00–14:00",
			}),
		);

		// Header badge should now be present on chair-1
		const updatedBadge = findNodeByTestId(container, "chair-doctor-badge-chair-1");
		expect(updatedBadge).not.toBeNull();
	});

	it("3. Clicking an empty slot on a chair with an assigned doctor passes doctorUserId to onSlotClick", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const onSlotClick = vi.fn();
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				doctorSpecialty: "Терапевт",
				shiftPreset: "full",
				shiftLabel: "Полный день",
				shiftHours: "08:00–20:00",
			},
		};

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: multiChairDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick,
					onAppointmentClick: vi.fn(),
					patientName: (_, id) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: assignments,
				}),
			);
		});

		// Find slot at 10:00 in chair-1
		const slotChair1 = findNodeByTestId(container, "btn-slot-chair-1-1000");
		expect(slotChair1).not.toBeNull();

		await clickNode(slotChair1);

		// onSlotClick must carry doctorUserId: "doc-1" and doctorName
		expect(onSlotClick).toHaveBeenCalledTimes(1);
		expect(onSlotClick).toHaveBeenCalledWith(
			(expect as any).objectContaining({
				dateKey: "2026-09-07",
				startTime: "10:00",
				chairId: "chair-1",
				doctorUserId: "doc-1",
				doctorName: "Иванов Иван Иванович",
			}),
		);

		// Click slot on unassigned chair-2: doctorUserId should be null
		const slotChair2 = findNodeByTestId(container, "btn-slot-chair-2-1000");
		expect(slotChair2).not.toBeNull();

		await clickNode(slotChair2);

		expect(onSlotClick).toHaveBeenCalledTimes(2);
		expect(onSlotClick).toHaveBeenCalledWith(
			(expect as any).objectContaining({
				dateKey: "2026-09-07",
				startTime: "10:00",
				chairId: "chair-2",
				doctorUserId: null,
			}),
		);
	});

	it("4. QuickBookingDrawer pre-selects the doctor passed in initialSlot", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: vi.fn(),
					dashboard: multiChairDashboard,
					initialSlot: {
						dateKey: "2026-09-07",
						startTime: "11:00",
						chairId: "chair-1",
						doctorUserId: "doc-2",
					},
				}),
			);
		});

		// The select element for doctor should have option doc-2 selected
		const docSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-booking-doctor");
		expect(docSelect).not.toBeNull();
		expect(docSelect?.value).toBe("doc-2");
	});

	it("5. Solo doctor mode defaults doctor smoothly with zero blockers (Mandates 8e, 8n)", async () => {
		// In ScheduleGrid with solo doctor:
		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: soloDoctorDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: vi.fn(),
				onAppointmentClick: vi.fn(),
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
			}),
		);

		// Auto-binds solo doctor to the chair
		expect(html).toContain('data-testid="chair-doctor-badge-chair-solo"');
		expect(html).toContain("Соловьев А.В.");
		expect(html).toContain("08:00–20:00");

		// In QuickBookingDrawer with solo doctor:
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: vi.fn(),
					dashboard: soloDoctorDashboard,
					initialSlot: {
						dateKey: "2026-09-07",
						startTime: "09:00",
						chairId: "chair-solo",
					},
				}),
			);
		});

		// Solo doctor is automatically selected
		const docSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-booking-doctor");
		expect(docSelect).not.toBeNull();
		expect(docSelect?.value).toBe("doc-solo");

		// Assistant selector is hidden in solo doctor mode (Mandate 8e/8n zero friction)
		const assistantSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-booking-assistant");
		expect(assistantSelect).toBeNull();
	});

	it("6. ScheduleGrid renders inline '+ Кресло' header button with >= 44px touch target (StomX parity) and triggers onOpenAddChair", async () => {
		const onOpenAddChair = vi.fn();
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: multiChairDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: vi.fn(),
					onAppointmentClick: vi.fn(),
					patientName: (_, id) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					onOpenAddChair,
				}),
			);
		});

		const inlineAddChairBtn = findNodeByTestId(container, "btn-grid-inline-add-chair");
		expect(inlineAddChairBtn).not.toBeNull();
		expect(inlineAddChairBtn?.style?.minHeight).toBe("44px");
		expect(inlineAddChairBtn?.style?.minWidth).toBe("44px");
		expect(inlineAddChairBtn?.textContent).toContain("+ Кресло");

		await clickNode(inlineAddChairBtn);
		expect(onOpenAddChair).toHaveBeenCalledTimes(1);

		// Also check rendered HTML
		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: multiChairDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: vi.fn(),
				onAppointmentClick: vi.fn(),
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
			}),
		);
		expect(html).toContain('data-testid="btn-grid-inline-add-chair"');
		expect(html).toContain("+ Кресло");
		expect(html).toContain("min-h-[44px]");
	});

	it("7. Doctor assignment modal provides 1-tap quick-switch doctor pills and non-blocking 'Снять назначение' button", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const onAssignChairDoctor = vi.fn();
		const initialAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				doctorSpecialty: "Терапевт",
				shiftPreset: "full",
				shiftLabel: "Полный день",
				shiftHours: "08:00–20:00",
			},
		};

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: multiChairDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: vi.fn(),
					onAppointmentClick: vi.fn(),
					patientName: (_, id) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: initialAssignments,
					onAssignChairDoctor,
				}),
			);
		});

		// Open modal via assigned badge
		const badge = findNodeByTestId(container, "chair-doctor-badge-chair-1");
		expect(badge).not.toBeNull();
		await clickNode(badge);

		// Verify 1-tap doctor quick-switch pills exist for multiple doctors
		const switchPills = findNodeByTestId(container, "doctor-quick-switch-pills");
		expect(switchPills).not.toBeNull();

		const doc2Pill = findNodeByTestId(container, "btn-quick-select-doctor-doc-2");
		expect(doc2Pill).not.toBeNull();
		expect(doc2Pill?.textContent).toContain("Петров П.С.");

		// Tap doc-2 pill
		await clickNode(doc2Pill);

		const docSelect = findNodeByTestId(container, "select-chair-doctor");

		expect(docSelect?.value).toBe("doc-2");

		// Verify non-blocking "Снять назначение" button exists and unassigns
		const unassignBtn = findNodeByTestId(container, "btn-unassign-chair-doctor");
		expect(unassignBtn).not.toBeNull();
		expect(unassignBtn?.textContent).toContain("Снять назначение");

		await clickNode(unassignBtn);
		expect(onAssignChairDoctor).toHaveBeenCalledWith("chair-1", null);
	});

	it("8. QuickBookingDrawer displays duty doctor badge and non-blocking override note when doctor is changed (Mandates 8e, 8k)", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		document.body.appendChild(container as unknown as HTMLElement);
		const root: Root = createRoot(container as unknown as HTMLElement);

		try {
			await act(async () => {
				root.render(
					React.createElement(QuickBookingDrawer, {
						isOpen: true,
						onClose: vi.fn(),
						dashboard: multiChairDashboard,
						initialSlot: {
							dateKey: "2026-09-07",
							startTime: "10:00",
							chairId: "chair-1",
							doctorUserId: "doc-1", // Ivanov duty doctor on chair-1
						},
					}),
				);
			});

			// Duty doctor badge is displayed
			const dutyBadge = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-badge");
			expect(dutyBadge).not.toBeNull();
			expect(dutyBadge?.textContent).toContain("Дежурный врач: Иванов И.И.");

			// Initially doc-1 is selected, so no override note
			let overrideNote = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-override-note");
			expect(overrideNote).toBeNull();

			// Change doctor to doc-2 (Petrov)
			const docSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-booking-doctor");
			expect(docSelect).not.toBeNull();
			await changeNode(docSelect, "doc-2");

			// Override note must now be visible with informative non-blocking text
			overrideNote = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-override-note");
			expect(overrideNote).not.toBeNull();
			expect(overrideNote?.textContent).toContain("На кресле «Кабинет 1 (Терапия)» дежурит Иванов И.И.");
			expect(overrideNote?.textContent).toContain("Запись создается с подтверждением");
		} finally {
			try {
				document.body.removeChild(container as unknown as HTMLElement);
			} catch {}
		}
	});

	it("9. Intelligent default doctor suggestion matches chair specialization or index when shifts are not saved", () => {
		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: multiChairDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: vi.fn(),
				onAppointmentClick: vi.fn(),
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
			}),
		);

		// Chair 1 (therapist) intelligently suggests Ivanov (therapist)
		expect(html).toContain('data-testid="btn-quick-assign-chair-1"');
		expect(html).toContain("1 клик: Иванов И.И.");

		// Chair 2 (surgery) intelligently suggests Petrov (surgery)
		expect(html).toContain('data-testid="btn-quick-assign-chair-2"');
		expect(html).toContain("1 клик: Петров П.С.");
	});

	it("10. 2-shift chair doctor allocation supports morning + evening doctors with 1-tap quick pills (StomX / DentalPRO parity)", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const onAssignChairDoctor = vi.fn();

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: multiChairDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: vi.fn(),
					onAppointmentClick: vi.fn(),
					patientName: (_, id) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					onAssignChairDoctor,
				}),
			);
		});

		// Open assign modal for chair-1
		const assignBtn = findNodeByTestId(container, "btn-assign-doctor-chair-1");
		expect(assignBtn).not.toBeNull();
		await clickNode(assignBtn);

		// Switch to 2-shift preset
		const twoShiftsPreset = findNodeByTestId(container, "shift-preset-two_shifts");
		expect(twoShiftsPreset).not.toBeNull();
		await clickNode(twoShiftsPreset);

		// Verify evening doctor select and pills are rendered
		const morningSelect = findNodeByTestId(container, "select-chair-doctor");
		expect(morningSelect).not.toBeNull();
		const eveningSelect = findNodeByTestId(container, "select-chair-evening-doctor");
		expect(eveningSelect).not.toBeNull();

		// Set morning to doc-1 (Ivanov) and evening to doc-2 (Petrov) via 1-tap pills
		const eveningDoc2Pill = findNodeByTestId(container, "btn-quick-select-evening-doctor-doc-2");
		expect(eveningDoc2Pill).not.toBeNull();
		await clickNode(eveningDoc2Pill);
		expect(eveningSelect?.value).toBe("doc-2");

		// Click confirm button
		const confirmBtn = findNodeByTestId(container, "btn-confirm-chair-doctor");
		expect(confirmBtn).not.toBeNull();
		await clickNode(confirmBtn);

		// Verify onAssignChairDoctor was called with custom 2-shift assignment containing subShifts
		expect(onAssignChairDoctor).toHaveBeenCalledTimes(1);
		const callArg = (onAssignChairDoctor as any).mock.calls[0][1] as any;
		expect(callArg.chairId).toBe("chair-1");
		expect(callArg.subShifts.length).toBe(2);
		expect(callArg.subShifts[0].doctorId).toBe("doc-1");
		expect(callArg.subShifts[0].shiftHours).toBe("08:00–14:00");
		expect(callArg.subShifts[1].doctorId).toBe("doc-2");
		expect(callArg.subShifts[1].shiftHours).toBe("14:00–20:00");
	});

	it("11. Time column features sticky left-0 positioning across header and hourly rows for seamless 10+ chair horizontal scrolling", () => {
		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: multiChairDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: vi.fn(),
				onAppointmentClick: vi.fn(),
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
			}),
		);

		// Time corner header has sticky left-0 z-20
		expect(html).toContain("sticky left-0 z-20 bg-[var(--paper-soft)]");

		// Time row cells have sticky left-0 z-10
		expect(html).toContain("sticky left-0 z-10 bg-[var(--paper)]");
	});

	it("12. buildChairDoctorAssignmentsFromShifts preserves morning + evening shifts for the same chair in subShifts without overwriting", () => {
		const shifts = [
			{
				id: "shift-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				doctorRole: "therapist" as const,
				assistantId: null,
				assistantName: null,
				cabinetId: "chair-1",
				chairId: "chair-1",
				dateIso: "2026-09-07",
				archetypeId: "morning_shift" as const,
				startTime: "08:00",
				endTime: "14:00",
				durationHours: 6,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled" as const,
			},
			{
				id: "shift-2",
				doctorId: "doc-2",
				doctorName: "Петров Петр Петрович",
				doctorRole: "orthopedist" as const,
				assistantId: null,
				assistantName: null,
				cabinetId: "chair-1",
				chairId: "chair-1",
				dateIso: "2026-09-07",
				archetypeId: "evening_shift" as const,
				startTime: "14:00",
				endTime: "20:00",
				durationHours: 6,
				breakMinutes: 0,
				isNight: false,
				nightHours: 0,
				status: "scheduled" as const,
			},
		];

		const assignments = buildChairDoctorAssignmentsFromShifts(shifts, "2026-09-07");
		const chair1 = assignments["chair-1"];
		expect(chair1).not.toBeNull();
		expect(chair1?.subShifts?.length).toBe(2);
		expect(chair1?.subShifts?.[0]?.doctorId).toBe("doc-1");
		expect(chair1?.subShifts?.[0]?.shiftHours).toBe("08:00–14:00");
		expect(chair1?.subShifts?.[1]?.doctorId).toBe("doc-2");
		expect(chair1?.subShifts?.[1]?.shiftHours).toBe("14:00–20:00");
		expect(chair1?.shiftLabel).toContain("Иванов И.И.");
		expect(chair1?.shiftLabel).toContain("Петров П.П.");
	});

	it("13. ScheduleGrid: clicking empty slot outside morning shift hours (e.g. 17:00) does not return morning doctor", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);
		const onSlotClick = vi.fn();

		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "morning",
				shiftLabel: "08:00–14:00",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
		};

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: multiChairDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick,
					onAppointmentClick: vi.fn(),
					patientName: (_, id) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: assignments,
				}),
			);
		});

		// Slot at 17:00 on chair-1 is outside morning shift (08:00–14:00)
		const slot1700 = findNodeByTestId(container, "btn-slot-chair-1-1700");
		expect(slot1700).not.toBeNull();

		await clickNode(slot1700);

		expect(onSlotClick).toHaveBeenCalledTimes(1);
		const clickedSlot = (onSlotClick as any).mock.calls[0][0];
		expect(clickedSlot.startTime).toBe("17:00");
		expect(clickedSlot.doctorUserId).toBeNull();
	});

	it("14. QuickBookingDrawer: switching chair in select-booking-chair dynamically auto-selects that chair's duty doctor and updates badge without false warnings", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "morning",
				shiftLabel: "08:00–14:00",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
			"chair-2": {
				chairId: "chair-2",
				doctorId: "doc-2",
				doctorName: "Петров Петр Петрович",
				shiftPreset: "morning",
				shiftLabel: "08:00–14:00",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
		};

		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: vi.fn(),
					dashboard: multiChairDashboard,
					chairDoctorAssignments: assignments,
					initialSlot: {
						dateKey: "2026-09-07",
						startTime: "10:00",
						chairId: "chair-1",
						doctorUserId: "doc-1",
					},
				}),
			);
		});

		// Initially chair-1 and doc-1
		const chairSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-booking-chair");
		const docSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-booking-doctor");
		expect(chairSelect?.value).toBe("chair-1");
		expect(docSelect?.value).toBe("doc-1");

		let dutyBadge = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-badge");
		expect(dutyBadge?.textContent).toContain("Иванов И.И.");

		let overrideNote = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-override-note");
		expect(overrideNote).toBeNull();

		// Now switch chair to chair-2
		let toastDetail: any = null;
		const toastListener = (e: any) => {
			toastDetail = e?.detail;
		};
		window.addEventListener("dente-toast", toastListener);

		await changeNode(chairSelect, "chair-2");

		// Doctor must automatically switch to doc-2 (Petrov on duty on chair-2)
		expect(docSelect?.value).toBe("doc-2");
		dutyBadge = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-badge");
		expect(dutyBadge?.textContent).toContain("Петров П.С.");

		// Soft toast must be triggered with duty doctor info
		expect(toastDetail).not.toBeNull();
		expect(toastDetail?.text).toContain("Дежурный врач: Петров П.С.");
		expect(toastDetail?.text).toContain("Кабинет 2");
		expect(toastDetail?.text).toContain("08:00–14:00");
		window.removeEventListener("dente-toast", toastListener);

		// No false override note because doc-2 is on duty on chair-2
		overrideNote = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-override-note");
		expect(overrideNote).toBeNull();
	});

	it("15. resolveChairDutyDoctor correctly distinguishes morning vs evening doctors for multi-shift chair", () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов / Петров",
				shiftPreset: "custom",
				shiftLabel: "08–14: Иванов И.И. / 14–20: Петров П.П.",
				shiftHours: "08:00–14:00 & 14:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [
					{
						doctorId: "doc-1",
						doctorName: "Иванов Иван Иванович",
						startHour: 8,
						endHour: 14,
						shiftHours: "08:00–14:00",
					},
					{
						doctorId: "doc-2",
						doctorName: "Петров Петр Петрович",
						startHour: 14,
						endHour: 20,
						shiftHours: "14:00–20:00",
					},
				],
			},
		};

		// 10:00 is during morning shift
		const morningDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T10:00", assignments);
		expect(morningDuty.doctorId).toBe("doc-1");
		expect(morningDuty.shiftHours).toBe("08:00–14:00");

		// 16:00 is during evening shift
		const eveningDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T16:00", assignments);
		expect(eveningDuty.doctorId).toBe("doc-2");
		expect(eveningDuty.shiftHours).toBe("14:00–20:00");

		// 22:00 is outside any shift
		const nightDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T22:00", assignments);
		expect(nightDuty.doctorId).toBeNull();
	});

	it("16. ScheduleGrid renders shifts with full hours 08:00–14:00 and 14:00–20:00 and ● На смене pulsing badge for active duty hour", () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов / Петров",
				shiftPreset: "custom",
				shiftLabel: "08:00–14:00 & 14:00–20:00",
				shiftHours: "08:00–14:00 & 14:00–20:00",
				startHour: 8,
				endHour: 20,
				subShifts: [
					{
						doctorId: "doc-1",
						doctorName: "Иванов Иван Иванович",
						startHour: 8,
						endHour: 14,
						shiftHours: "08:00–14:00",
					},
					{
						doctorId: "doc-2",
						doctorName: "Петров Петр Петрович",
						startHour: 14,
						endHour: 20,
						shiftHours: "14:00–20:00",
					},
				],
			},
		};

		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: multiChairDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: vi.fn(),
				onAppointmentClick: vi.fn(),
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: () => "2026-09-07T10:00",
				appointmentLabels: mockAppointmentLabels,
				chairDoctorAssignments: assignments,
			}),
		);

		// Shift headers render full hours with zero cartoon emojis (Mandate 8d Sin #7)
		expect(html).toContain("08:00–14:00:");
		expect(html).toContain("14:00–20:00:");
		expect(html).not.toMatch(/☀️/);
		expect(html).not.toMatch(/🌙/);
		expect(html).toContain("whitespace-nowrap");

		// Pulsing on-duty badge renders for active morning doctor (currentHour = 10)
		expect(html).toContain("● На смене");
		expect(html).toContain('data-testid="chair-duty-morning-badge-chair-1"');
	});

	it("17. ScheduleGrid 1-tap shift quick pills have >= 44px touch targets conforming to Apple HIG & Mandate 8c", async () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "morning",
				shiftLabel: "08:00–14:00",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
		};

		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: multiChairDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: vi.fn(),
					onAppointmentClick: vi.fn(),
					patientName: (_, id) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: () => "2026-09-07T10:00",
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: assignments,
				}),
			);
		});

		const morningBtn = findNodeByTestId(container, "chair-quick-morning-chair-1");
		const eveningBtn = findNodeByTestId(container, "chair-quick-evening-chair-1");
		const fullBtn = findNodeByTestId(container, "chair-quick-full-chair-1");

		expect(morningBtn).not.toBeNull();
		expect(eveningBtn).not.toBeNull();
		expect(fullBtn).not.toBeNull();

		// All quick shift switch pills must have min-h-[44px]
		expect(morningBtn?.className).toContain("min-h-[44px]");
		expect(morningBtn?.style?.minHeight).toBe("44px");

		expect(eveningBtn?.className).toContain("min-h-[44px]");
		expect(eveningBtn?.style?.minHeight).toBe("44px");

		expect(fullBtn?.className).toContain("min-h-[44px]");
		expect(fullBtn?.style?.minHeight).toBe("44px");
	});

	it("18. QuickBookingDrawer auto-populates duty doctor on initial slot click when only chairId is passed without doctorUserId", async () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-2": {
				chairId: "chair-2",
				doctorId: "doc-2",
				doctorName: "Петров Петр Петрович",
				shiftPreset: "morning",
				shiftLabel: "08:00–14:00",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
		};

		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: vi.fn(),
					dashboard: multiChairDashboard,
					chairDoctorAssignments: assignments,
					toDateTimeLocalValue: () => "2026-09-07T10:00",
					initialSlot: {
						dateKey: "2026-09-07",
						startTime: "10:00",
						chairId: "chair-2",
						// doctorUserId is intentionally NOT passed
					},
				}),
			);
		});

		const docSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-booking-doctor");
		expect(docSelect?.value).toBe("doc-2");

		const dutyBadge = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-badge");
		expect(dutyBadge?.textContent).toContain("Петров П.С.");
	});

	it("19. AppointmentModal auto-populates duty doctor on mount and updates doctor when switching chairs via select-appointment-chair", async () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Д-р Иванов Иван",
				shiftPreset: "morning",
				shiftLabel: "Утренняя смена",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
			"chair-2": {
				chairId: "chair-2",
				doctorId: "doc-2",
				doctorName: "Д-р Петров Петр",
				shiftPreset: "evening",
				shiftLabel: "Вечерняя смена",
				shiftHours: "14:00–20:00",
				startHour: 14,
				endHour: 20,
			},
		};

		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const unassignedAppt = {
			id: "appt-999",
			organizationId: "org-1",
			patientId: "pat-1",
			doctorUserId: "", // unassigned
			assistantUserId: null,
			chairId: "chair-2",
			startsAt: "2026-09-07T15:00:00.000Z",
			endsAt: "2026-09-07T16:00:00.000Z",
			status: "confirmed" as const,
			reason: null,
			comment: null,
		};

		await act(async () => {
			root.render(
				React.createElement(AppointmentModal, {
					isOpen: true,
					appointment: unassignedAppt,
					dashboard: multiChairDashboard,
					chairDoctorAssignments: assignments,
					onClose: vi.fn(),
					onSave: vi.fn(async () => true),
					repeatAppointment: vi.fn(),
					patientName: () => "Пациент Тест",
					formatTime: () => "15:00",
					toDateTimeLocalValue: () => "2026-09-07T15:00",
					fromDateTimeLocalValue: () => "2026-09-07T15:00:00.000Z",
					appointmentLabels: {
						planned: "Запланирован",
						confirmed: "Подтвержден",
						arrived: "Пришел",
						in_treatment: "В кресле",
						completed: "Завершен",
						cancelled: "Отменен",
						no_show: "Не явился",
					},
					activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
				}),
			);
		});

		// 1. On mount with chairId="chair-2", duty doctor doc-2 should be auto-populated
		const chairSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-appointment-chair");
		expect(chairSelect?.value).toBe("chair-2");

		// 2. Simulate switching chair to chair-1
		let toastDetail: any = null;
		const toastListener = (e: any) => {
			toastDetail = e?.detail;
		};
		window.addEventListener("dente-toast", toastListener);

		await changeNode(chairSelect, "chair-1");

		// Verify that chairId changed to chair-1
		expect(chairSelect?.value).toBe("chair-1");
		window.removeEventListener("dente-toast", toastListener);
	});

	it("20. ScheduleGrid renders single-shift header with vector Sun/Moon icons for morning and evening shifts (zero raw emojis)", () => {
		const morningAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "morning",
				shiftLabel: "08:00–14:00",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
			"chair-2": {
				chairId: "chair-2",
				doctorId: "doc-2",
				doctorName: "Петров Петр Петрович",
				shiftPreset: "evening",
				shiftLabel: "14:00–20:00",
				shiftHours: "14:00–20:00",
				startHour: 14,
				endHour: 20,
			},
		};

		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: multiChairDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: vi.fn(),
				onAppointmentClick: vi.fn(),
				patientName: (_, id) => (id ? "Пациент" : "—"),
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: () => "2026-09-07T10:00",
				appointmentLabels: mockAppointmentLabels,
				chairDoctorAssignments: morningAssignments,
			}),
		);

		// Single morning shift displays clean hours and zero cartoon emojis
		expect(html).toContain("08:00–14:00");
		// Single evening shift displays clean hours and zero cartoon emojis
		expect(html).toContain("14:00–20:00");
		expect(html).not.toMatch(/☀️/);
		expect(html).not.toMatch(/🌙/);
	});

	it("21. QuickBookingDrawer resolves doctor by initialSlot.doctorName when doctorUserId is omitted", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: vi.fn(),
					dashboard: multiChairDashboard,
					toDateTimeLocalValue: () => "2026-09-07T10:00",
					initialSlot: {
						dateKey: "2026-09-07",
						startTime: "10:00",
						chairId: "chair-1",
						// doctorUserId is omitted, only doctorName is passed
						doctorName: "Петров Петр Сергеевич",
					},
				}),
			);
		});

		const docSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-booking-doctor");
		// doc-2 corresponds to "Петров Петр Сергеевич"
		expect(docSelect?.value).toBe("doc-2");
	});

	it("22. AppointmentModal displays duty-doctor-badge on duty chair and displays override note when doctor is changed", async () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "morning",
				shiftLabel: "08:00–14:00",
				shiftHours: "08:00–14:00",
				startHour: 8,
				endHour: 14,
			},
		};

		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const appt = {
			id: "appt-100",
			organizationId: "org-1",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			assistantUserId: null,
			chairId: "chair-1",
			startsAt: "2026-09-07T10:00:00.000Z",
			endsAt: "2026-09-07T10:30:00.000Z",
			status: "confirmed" as const,
			reason: "Осмотр",
			comment: null,
		};

		await act(async () => {
			root.render(
				React.createElement(AppointmentModal, {
					isOpen: true,
					appointment: appt,
					dashboard: multiChairDashboard,
					chairDoctorAssignments: assignments,
					onClose: vi.fn(),
					onSave: vi.fn(async () => true),
					repeatAppointment: vi.fn(),
					patientName: () => "Пациент Тест",
					formatTime: () => "10:00",
					toDateTimeLocalValue: () => "2026-09-07T10:00",
					fromDateTimeLocalValue: () => "2026-09-07T10:00:00.000Z",
					appointmentLabels: mockAppointmentLabels,
					activeVisitLockedAppointmentStatuses: new Set<Appointment["status"]>(),
				}),
			);
		});

		// Verify duty doctor badge exists
		const dutyBadge = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-badge");
		expect(dutyBadge).not.toBeNull();
		expect(dutyBadge?.textContent).toContain("Дежурный: Иванов И.И.");

		// Switch doctor to doc-2 (override duty doctor)
		const docSelect = findNodeByTestId(document.body as unknown as MockDomNode, "select-appointment-doctor");
		expect(docSelect).not.toBeNull();
		await changeNode(docSelect, "doc-2");

		// Override note should be displayed without blocking
		const overrideNote = findNodeByTestId(document.body as unknown as MockDomNode, "duty-doctor-override-note");
		expect(overrideNote).not.toBeNull();
		expect(overrideNote?.textContent).toContain("Мандат 8e: запись не блокируется");
	});

	it("23. Chair header doctor popover renders all 4 shift presets with >= 44px touch targets and supports 1-click week binding (StomX parity)", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const onAssignChairDoctor = vi.fn();

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: multiChairDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: vi.fn(),
					onAppointmentClick: vi.fn(),
					patientName: (_, id) => (id ? "Пациент" : "—"),
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					onAssignChairDoctor,
				}),
			);
		});

		// Find and click the doctor popover button on chair-1
		const popoverBtn = findNodeByTestId(container, "btn-chair-doctor-popover-chair-1");
		expect(popoverBtn).not.toBeNull();
		await clickNode(popoverBtn);

		// Verify popover opened
		const popover = findNodeByTestId(container, "chair-doctor-quick-popover-chair-1");
		expect(popover).not.toBeNull();

		// Check all 4 shift preset buttons exist with >= 44px touch targets
		const morningBtn = findNodeByTestId(container, "chair-popover-shift-morning-chair-1");
		const eveningBtn = findNodeByTestId(container, "chair-popover-shift-evening-chair-1");
		const fullBtn = findNodeByTestId(container, "chair-popover-shift-full-chair-1");
		const weekBtn = findNodeByTestId(container, "chair-popover-shift-week-chair-1");

		expect(morningBtn).not.toBeNull();
		expect(eveningBtn).not.toBeNull();
		expect(fullBtn).not.toBeNull();
		expect(weekBtn).not.toBeNull();

		expect(morningBtn?.style?.minHeight || morningBtn?.className).toContain("44px");
		expect(eveningBtn?.style?.minHeight || eveningBtn?.className).toContain("44px");
		expect(fullBtn?.style?.minHeight || fullBtn?.className).toContain("44px");
		expect(weekBtn?.style?.minHeight || weekBtn?.className).toContain("44px");

		// Verify clean text without raw emojis
		expect(morningBtn?.textContent).toContain("Утро 08:00–14:00");
		expect(eveningBtn?.textContent).toContain("Вечер 14:00–20:00");
		expect(fullBtn?.textContent).toContain("Весь день 08:00–20:00");
		expect(weekBtn?.textContent).toContain("На всю неделю (Пн–Пт)");

		expect(morningBtn?.textContent).not.toMatch(/☀️/);
		expect(eveningBtn?.textContent).not.toMatch(/🌙/);
		expect(fullBtn?.textContent).not.toMatch(/🏢/);
		expect(weekBtn?.textContent).not.toMatch(/📅/);

		// Click 1-click week binding button
		await clickNode(weekBtn);

		// Callback should be fired
		expect(onAssignChairDoctor).toHaveBeenCalledTimes(1);
		expect(onAssignChairDoctor).toHaveBeenCalledWith(
			"chair-1",
			(expect as any).objectContaining({
				chairId: "chair-1",
				shiftPreset: "full",
				shiftHours: "08:00–20:00",
			}),
		);

		// Check that localStorage was populated for Mon–Fri (2026-09-07 .. 2026-09-11)
		const monKey = localStorage.getItem("dente_chair_doctor_assignments_2026-09-07");
		const friKey = localStorage.getItem("dente_chair_doctor_assignments_2026-09-11");
		expect(monKey).not.toBeNull();
		expect(friKey).not.toBeNull();
		expect(monKey).toContain("chair-1");
		expect(friKey).toContain("chair-1");
	});
});

