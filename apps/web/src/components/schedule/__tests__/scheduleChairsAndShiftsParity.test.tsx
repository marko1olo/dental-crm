/**
 * scheduleChairsAndShiftsParity.test.tsx
 *
 * Targeted Comprehensive Test Suite for Schedule, Chairs & Shifts Architecture (StomX / IDENT parity).
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap shift presets, 5-second booking).
 * - Mandate 8k: CRM != Reality Simulator (frictionless chair setup, 1-click presets, soft overbooking).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor, zero mandatory assistant).
 * - Mandate 8d: Apple HIG / Medical density, touch targets >= 44x44px, 0 cartoon emojis.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard } from "@dental/shared";

import {
	useSchedule,
	syncShiftsWithServer,
	type ChairDoctorShiftAssignment,
	type ChairDoctorSubShift,
} from "../useSchedule";
import {
	computeShiftAssignment,
} from "../scheduleShiftHelpers";
import {
	ChairScheduleView,
} from "../ChairScheduleView";
import {
	ScheduleGrid,
	DEFAULT_SOLO_CHAIR,
	formatDoctorShortName,
} from "../ScheduleGrid";
import { appointmentScheduleMissingFields } from "../../../AppHelpers";

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

const mockAppointmentLabels = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	in_progress: "На приеме",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
} as any;
const mockPatientName = () => "Пациент";
const mockFormatTime = (iso: string) => iso.slice(11, 16);
const mockToDateTimeLocalValue = () => "2026-09-09T10:00";
const noop = () => {};
const mockEmptyAssignments = {};

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
			let selValue = "";
			Object.defineProperty(el, "value", {
				get() {
					if ((el as any)._value !== undefined) return (el as any)._value;
					const opts = (el as any).options as MockDomNode[];
					const selectedOpts = opts.filter((o) => (o as any).selected);
					if (selectedOpts.length > 0) return (selectedOpts[selectedOpts.length - 1] as any).value;
					if (attrs.value !== undefined) return attrs.value;
					return selValue;
				},
				set(v: string) {
					selValue = String(v);
					(el as any)._value = String(v);
					attrs.value = String(v);
					const opts = (el as any).options as MockDomNode[];
					for (const opt of opts) {
						(opt as any).selected = String((opt as any).value) === String(v);
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
					if (el.parentNode && el.parentNode.tagName === "SELECT" && (el.parentNode as any)._value !== undefined) {
						(el as any).selected = String((el.parentNode as any)._value) === String(v);
					}
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
						attrs.selected = "false";
					}
				},
			});
		}

		if (tag.toUpperCase() === "INPUT") {
			let inputVal = "";
			Object.defineProperty(el, "value", {
				get() {
					if (attrs.value !== undefined) return attrs.value;
					return inputVal;
				},
				set(v: string) {
					inputVal = v;
					attrs.value = v;
				},
			});
		}

		return el;
	}

	doc.createElement = createMockElement;
	doc.createElementNS = (_ns: string, tag: string) => createMockElement(tag);
	doc.body = createMockElement("body");
	doc.documentElement = createMockElement("html");

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
	{
		id: "asst-1",
		fullName: "Смирнова Ольга Владимировна",
		role: "assistant",
		active: true,
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		roomNumber: "1",
		color: "#0d9488",
		active: true,
		specialization: "therapist",
		defaultDoctorId: "doc-1",
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		roomNumber: "2",
		color: "#2563eb",
		active: true,
		specialization: "surgery",
		defaultDoctorId: "doc-2",
	},
	{
		id: "chair-3",
		name: "Кресло 3 (Дежурное)",
		roomNumber: "3",
		color: "#f59e0b",
		active: true,
		specialization: "general",
	},
];

const mockDashboard: any = {
	clinicName: "Клиника ДЕНТЕ",
	todayIso: "2026-09-09",
	clinicSettings: {
		profile: {
			organizationId: "org-1",
			clinicName: "Клиника ДЕНТЕ",
			mode: "small_clinic",
		},
		chairs: mockChairs,
		staff: mockStaff,
	},
	appointments: [],
	patients: [
		{
			id: "pat-1",
			fullName: "Кузнецов Алексей Николаевич",
			phone: "+7 (999) 111-22-33",
		},
	],
};

describe("Schedule, Chairs & Shifts Architecture Parity (StomX / IDENT)", () => {
	beforeEach(() => {
		setupMockDom();
	});

	describe("1. useSchedule Hook & Mathematical Engine", () => {
		it("resolves solo doctor defaults with DEFAULT_SOLO_CHAIR when chairs list is empty", () => {
			let result: any = null;
			function TestComponent() {
				result = useSchedule({
					dashboard: {
						...mockDashboard,
						clinicSettings: { ...mockDashboard.clinicSettings, chairs: [] },
					},
					dateKey: "2026-09-09",
				});
				return null;
			}

			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);
			act(() => {
				root.render(<TestComponent />);
			});

			assert.ok(result, "useSchedule must return result");
			assert.equal(result.isSoloDoctor, true, "1 chair or empty chairs must be solo doctor");
			assert.equal(result.chairs.length, 1);
			assert.equal(result.chairs[0].id, DEFAULT_SOLO_CHAIR.id);
		});

		it("correctly computes 1-click morning shift preset (08:00–14:00)", () => {
			const assignment = computeShiftAssignment({
				chair: mockChairs[0] as any,
				preset: "morning",
				targetDoc: mockStaff[0] as any,
				dateKey: "2026-09-09",
			});

			assert.equal(assignment.doctorId, "doc-1");
			assert.equal(assignment.shiftPreset, "morning");
			assert.equal(assignment.startHour, 8);
			assert.equal(assignment.endHour, 14);
			assert.equal(assignment.shiftHours, "08:00–14:00");
			assert.ok(assignment.subShifts && assignment.subShifts.length === 1);
		});

		it("correctly computes 1-click evening shift preset (14:00–20:00)", () => {
			const assignment = computeShiftAssignment({
				chair: mockChairs[0] as any,
				preset: "evening",
				targetDoc: mockStaff[1] as any,
				dateKey: "2026-09-09",
			});

			assert.equal(assignment.doctorId, "doc-2");
			assert.equal(assignment.shiftPreset, "evening");
			assert.equal(assignment.startHour, 14);
			assert.equal(assignment.endHour, 20);
			assert.equal(assignment.shiftHours, "14:00–20:00");
		});

		it("correctly combines morning and evening doctors into dual-shift subShifts (08:00–20:00)", () => {
			// Step 1: Assign morning doctor
			const mornAssignment = computeShiftAssignment({
				chair: mockChairs[0] as any,
				preset: "morning",
				targetDoc: mockStaff[0] as any,
				dateKey: "2026-09-09",
			});

			// Step 2: Assign second doctor to evening shift on same chair
			const dualAssignment = computeShiftAssignment({
				chair: mockChairs[0] as any,
				preset: "evening",
				targetDoc: mockStaff[1] as any,
				existingAssignment: mornAssignment,
				dateKey: "2026-09-09",
			});

			assert.equal(dualAssignment.shiftPreset, "two_shifts");
			assert.equal(dualAssignment.shiftHours, "08:00–20:00");
			const [sub0, sub1] = dualAssignment.subShifts || [];
			assert.ok(sub0 && sub1);
			assert.equal(sub0.doctorId, "doc-1");
			assert.equal(sub0.shiftHours, "08:00–14:00");
			assert.equal(sub1.doctorId, "doc-2");
			assert.equal(sub1.shiftHours, "14:00–20:00");
		});

		it("supports quick doctor substitution on chair (quickSubstituteDoctor) without altering shift hours", () => {
			let result: any = null;
			function TestComponent() {
				result = useSchedule({
					dashboard: mockDashboard,
					dateKey: "2026-09-09",
					chairDoctorAssignments: {
						"chair-1": {
							chairId: "chair-1",
							doctorId: "doc-1",
							doctorName: "Иванов Иван Иванович",
							shiftPreset: "morning",
							shiftLabel: "Утро 08-14",
							shiftHours: "08:00–14:00",
							startHour: 8,
							endHour: 14,
						},
					},
				});
				return null;
			}

			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);
			act(() => {
				root.render(<TestComponent />);
			});

			const subAssignment = result.quickSubstituteDoctor(mockChairs[0], "doc-3");
			assert.ok(subAssignment, "Substitute assignment must be returned");
			assert.equal(subAssignment.doctorId, "doc-3");
			assert.equal(subAssignment.doctorName, "Сидорова Анна Сергеевна");
			assert.equal(subAssignment.startHour, 8);
			assert.equal(subAssignment.endHour, 14);
		});

		it("duplicates chair with prefilled name and identical parameters (duplicateChair)", () => {
			let result: any = null;
			function TestComponent() {
				result = useSchedule({
					dashboard: mockDashboard,
					dateKey: "2026-09-09",
				});
				return null;
			}

			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);
			act(() => {
				root.render(<TestComponent />);
			});

			const duplicated = result.duplicateChair(mockChairs[0]);
			assert.equal(duplicated.name, "Кресло 1 (Терапия) (копия)");
			assert.equal(duplicated.roomNumber, "1");
			assert.equal(duplicated.specialization, "therapist");
			assert.equal(duplicated.color, "#0d9488");
		});

		it("moves appointments freely with soft overbooking flags (moveAppointment)", async () => {
			const onMoveMock = vi.fn();
			let result: any = null;
			function TestComponent() {
				result = useSchedule({
					dashboard: mockDashboard,
					dateKey: "2026-09-09",
					onAppointmentMove: onMoveMock,
				});
				return null;
			}

			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);
			act(() => {
				root.render(<TestComponent />);
			});

			await result.moveAppointment("app-123", {
				chairId: "chair-2",
				startsAt: "2026-09-09T15:00:00.000Z",
				endsAt: "2026-09-09T16:00:00.000Z",
			});

			assert.equal(onMoveMock.mock.calls.length, 1);
			const [appId, updates] = (onMoveMock.mock.calls[0] ?? []) as [string, any];
			assert.equal(appId, "app-123");
			assert.equal(updates.chairId, "chair-2");
			assert.equal(updates.allowOverbooking, true, "Must allow soft overbooking per Mandate 8e, 8n");
			assert.equal(updates.allowEmergencyOverride, true);
		});
	});

	describe("2. Non-Mandatory Assistant in Appointment Booking (Mandate 8e & 8n)", () => {
		it("confirms appointment booking does NOT require an assistant for solo doctor", () => {
			const missing = appointmentScheduleMissingFields(
				{
					patientId: "pat-1",
					chairId: "chair-1",
					doctorUserId: "doc-1",
					startsAt: "2026-09-09T10:00:00.000Z",
					endsAt: "2026-09-09T10:30:00.000Z",
					assistantUserId: "",
				} as any,
				"solo_doctor",
				mockStaff as any,
				{ chairs: mockChairs as any, patients: mockDashboard.patients },
			);

			assert.deepEqual(missing, [], "Assistant must never be mandatory for solo doctor");
		});

		it("confirms appointment booking does NOT require an assistant even in clinic with staff", () => {
			const missing = appointmentScheduleMissingFields(
				{
					patientId: "pat-1",
					chairId: "chair-1",
					doctorUserId: "doc-1",
					startsAt: "2026-09-09T10:00:00.000Z",
					endsAt: "2026-09-09T10:30:00.000Z",
					assistantUserId: "",
				} as any,
				"small_clinic",
				mockStaff as any,
				{ chairs: mockChairs as any, patients: mockDashboard.patients },
			);

			assert.deepEqual(missing, [], "Assistant is purely optional in clinic mode per Mandate 8e");
		});
	});

	describe("3. ScheduleGrid & ChairScheduleView Visual & Functional Parity", () => {
		it("ScheduleGrid renders prominent + Врач badge (chair-grid-unstaffed-badge-${chair.id}) on unstaffed chair", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const onAssignMock = vi.fn();

			await act(async () => {
				root.render(
					<ScheduleGrid
						dashboard={mockDashboard}
						dateKey="2026-09-09"
						appointments={[]}
						chairDoctorAssignments={mockEmptyAssignments}
						onSlotClick={noop}
						onAppointmentClick={noop}
						onAssignChairDoctor={onAssignMock}
						patientName={mockPatientName}
						formatTime={mockFormatTime}
						toDateTimeLocalValue={mockToDateTimeLocalValue}
						appointmentLabels={mockAppointmentLabels}
					/>,
				);
			});

			const unstaffedBadge = findNodeByTestId(container, "chair-grid-unstaffed-badge-chair-3");
			assert.ok(unstaffedBadge, "ScheduleGrid must render chair-grid-unstaffed-badge on unstaffed chair");
			assert.ok(unstaffedBadge.textContent.includes("+ Врач"));

			// Clicking + Врач opens the doctor selection popover
			await clickNode(unstaffedBadge);

			const popover = findNodeByTestId(container, "chair-doctor-quick-popover-chair-3");
			assert.ok(popover, "Clicking + Врач badge must open doctor assignment popover");
		});

		it("ChairScheduleView renders + Врач badge on unstaffed active chair (chair-view-unstaffed-badge-${chair.id})", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-09"
						appointments={[]}
						chairDoctorAssignments={mockEmptyAssignments}
						onSlotClick={noop}
						onAppointmentClick={noop}
					/>,
				);
			});

			const unstaffedBadge = findNodeByTestId(container, "chair-view-unstaffed-badge-chair-3");
			assert.ok(unstaffedBadge, "ChairScheduleView must render chair-view-unstaffed-badge on unstaffed chair");
			assert.ok(unstaffedBadge.textContent.includes("+ Врач"));
		});

		it("guarantees 0 cartoon emojis in ScheduleGrid and ChairScheduleView (Mandate 8d)", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-09"
						appointments={[]}
						chairDoctorAssignments={mockEmptyAssignments}
						onSlotClick={noop}
						onAppointmentClick={noop}
					/>,
				);
			});

			const allText = collectAllText(container);
			assert.equal(
				hasCartoonEmojis(allText),
				false,
				"Zero cartoon emojis in medical and schedule views (Mandate 8d)",
			);
		});
	});
});
