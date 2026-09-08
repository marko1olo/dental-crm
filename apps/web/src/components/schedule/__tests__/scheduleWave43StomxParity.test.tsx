/**
 * scheduleWave43StomxParity.test.tsx
 *
 * DENTE Dental CRM — Wave 43 StomX & IDENT Parity Test Suite
 *
 * Scope:
 * 1. ChairScheduleView: 1-Click Doctor Shift Binding on Dental Chair (StomX / IDENT Parity).
 *    - Presets: Morning (08-14), Evening (14-20), Full Day (08-20), 2x2 (08-20, two_shifts).
 *    - Doctor Selection in Popover + Instant Toast.
 *    - Unassign doctor shift.
 * 2. ChairScheduleView: Slot Click Forwarding with resolveChairDutyDoctor.
 *    - Passes chairId, dateKey, startTime, startsAt, doctorUserId, doctorName seamlessly into booking.
 *    - Unified Compact 1-Row Toolbar (32–36px, Hick's Law, Mandate 8d) with visible room and doctor names.
 * 3. QuickBookingDrawer & AppointmentModal: Zero-Blocker Chair Booking (Mandate 8e).
 *    - Soft informative badge displayed when patient has an active open visit in chair.
 *    - Selectors (patient, doctor, chair, status) are never disabled (disabled={false}).
 *    - Duty doctor auto-resolution updates on chair or time change.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Appointment, Dashboard } from "@dental/shared";
import { ChairScheduleView, resolveChairDutyDoctor } from "../ChairScheduleView";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { AppointmentModal } from "../AppointmentModal";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";

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
	click?: () => void;
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

		el.ownerDocument = doc;
		return el;
	}

	doc.createElement = createMockElement;
	doc.createElementNS = (_ns: string, tag: string) => createMockElement(tag);
	doc.documentElement = createMockElement("html");
	doc.body = createMockElement("body");
	doc.documentElement.appendChild(doc.body);

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

	// biome-ignore lint/suspicious/noExplicitAny: mock fetch
	g.fetch = async (_url: string, _opts?: any) => ({
		ok: true,
		status: 200,
		json: async () => ({}),
		text: async () => "{}",
	});
}

function findNodeByTestId(node: MockDomNode | null, testId: string): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.("data-testid") === testId) return node;
	if (node.dataset?.testid === testId) return node;
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
		node.dispatchEvent({ type: "click", bubbles: true });
	});
}

const mockDoctors = [
	{
		id: "doc-1",
		fullName: "Константинопольский Александр Владимирович",
		role: "doctor",
		specialty: "Стоматолог-терапевт",
		active: true,
	},
	{
		id: "doc-2",
		fullName: "Соколова Елена Дмитриевна",
		role: "doctor",
		specialty: "Стоматолог-хирург",
		active: true,
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		roomNumber: "1",
		room: "1",
		color: "#0d9488",
		defaultDoctorId: "doc-1",
		active: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		roomNumber: "2",
		room: "2",
		color: "#0284c7",
		defaultDoctorId: "doc-2",
		active: true,
	},
];

const mockPatients = [
	{
		id: "pat-1",
		fullName: "Смирнов Алексей Владимирович",
		phone: "+7 999 111-22-33",
		status: "active",
		balance: 0,
		totalSpent: 12000,
		gender: "male",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
	{
		id: "pat-2",
		fullName: "Кузнецова Мария Ивановна",
		phone: "+7 999 444-55-66",
		status: "active",
		balance: 5000,
		totalSpent: 45000,
		gender: "female",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
];

const mockDashboard = {
	stats: {
		totalPatients: 2,
		activeTreatmentPlans: 1,
		todayAppointmentsCount: 1,
		monthRevenue: 100000,
	},
	todayAppointments: [],
	recentPatients: [],
	clinicSettings: {
		profile: {
			clinicName: "Клиника ДЕНТЕ",
			timezone: "Europe/Moscow",
		},
		staff: mockDoctors,
		chairs: mockChairs,
	},
	patients: mockPatients,
	appointments: [],
	activeVisit: null,
} as unknown as Dashboard;

describe("Wave 43 StomX Parity: Chair Roster, Duty Doctor Forwarding & Zero-Blocker Booking", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
	});

	describe("1. ChairScheduleView: 1-Click Doctor and Shift Assignment", () => {
		it("opens shift popover and assigns morning shift (08:00–14:00)", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedChairId: string | null = null;
			let assignedShift: any = null;

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={(chairId, assignment) => {
							assignedChairId = chairId;
							assignedShift = assignment;
						}}
					/>,
				);
			});

			// Open popover for Chair 1
			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			assert.ok(triggerBtn, "Assign doctor button must exist for chair 1");
			await clickNode(triggerBtn);

			// Popover must be rendered
			const popover = findNodeByTestId(container, "chair-view-shift-popover-chair-1");
			assert.ok(popover, "Shift popover must be opened");

			// Click Morning preset
			const morningBtn = findNodeByTestId(container, "chair-view-shift-morning-chair-1");
			assert.ok(morningBtn, "Morning preset button must exist");
			await clickNode(morningBtn);

			assert.equal(assignedChairId, "chair-1");
			assert.ok(assignedShift);
			assert.equal(assignedShift.doctorId, "doc-1");
			assert.equal(assignedShift.shiftPreset, "morning");
			assert.equal(assignedShift.shiftLabel, "Утро 08-14");
			assert.equal(assignedShift.shiftHours, "08:00–14:00");
			assert.equal(assignedShift.startHour, 8);
			assert.equal(assignedShift.endHour, 14);
		});

		it("allows selecting a different doctor and assigning evening shift (14:00–20:00)", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedShift: any = null;

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={(_chairId, assignment) => {
							assignedShift = assignment;
						}}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			await clickNode(triggerBtn);

			// Select doctor 2 in the popover list
			const doc2Option = findNodeByTestId(container, "chair-view-doc-option-chair-1-doc-2");
			assert.ok(doc2Option, "Doc 2 option must be in popover");
			await clickNode(doc2Option);

			// Click Evening preset
			const eveningBtn = findNodeByTestId(container, "chair-view-shift-evening-chair-1");
			assert.ok(eveningBtn, "Evening preset button must exist");
			await clickNode(eveningBtn);

			assert.ok(assignedShift);
			assert.equal(assignedShift.doctorId, "doc-2");
			assert.equal(assignedShift.shiftPreset, "evening");
			assert.equal(assignedShift.shiftLabel, "Вечер 14-20");
			assert.equal(assignedShift.shiftHours, "14:00–20:00");
			assert.equal(assignedShift.startHour, 14);
			assert.equal(assignedShift.endHour, 20);
		});

		it("assigns full day (08:00–20:00) and unassigns doctor correctly", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedShift: any = null;

			const existingAssignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский А.В.",
					shiftPreset: "full",
					shiftLabel: "Весь день",
					shiftHours: "08:00–20:00",
				},
			};

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						chairDoctorAssignments={existingAssignments}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={(_chairId, assignment) => {
							assignedShift = assignment;
						}}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			await clickNode(triggerBtn);

			const unassignBtn = findNodeByTestId(container, "chair-view-unassign-chair-1");
			assert.ok(unassignBtn, "Unassign button must exist when assignment is active");
			await clickNode(unassignBtn);

			assert.equal(assignedShift, null, "Unassigning doctor must pass null to onAssignChairDoctor");
		});
	});

	describe("2. ChairScheduleView: Slot Click Forwarding with resolveChairDutyDoctor", () => {
		it("forwards chairId, dateKey, startTime, startsAt and duty doctor into onSlotClick", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let capturedSlot: any = null;

			const existingAssignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский Александр Владимирович",
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
						dateKey="2026-09-08"
						appointments={[]}
						chairDoctorAssignments={existingAssignments}
						onSlotClick={(slot) => {
							capturedSlot = slot;
						}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			// Find slot button for chair-1 at 10:00
			const slot1000 = findNodeByTestId(container, "btn-slot-chair-1-1000");
			assert.ok(slot1000, "Slot button 10:00 on chair-1 must exist");

			await clickNode(slot1000);

			assert.ok(capturedSlot, "onSlotClick must have been called");
			assert.equal(capturedSlot.chairId, "chair-1");
			assert.equal(capturedSlot.dateKey, "2026-09-08");
			assert.equal(capturedSlot.startTime, "10:00");
			assert.equal(capturedSlot.startsAt, "2026-09-08T10:00:00");
			assert.equal(capturedSlot.doctorUserId, "doc-1");
			assert.equal(capturedSlot.doctorName, "Константинопольский Александр Владимирович");
		});

		it("renders unified 1-row toolbar (32-36px) with room and doctor labels without truncation", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const existingAssignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский Александр Владимирович",
					shiftPreset: "morning",
					shiftLabel: "Утро 08-14",
					shiftHours: "08:00–14:00",
				},
			};

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						chairDoctorAssignments={existingAssignments}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
					/>,
				);
			});

			const toolbar = findNodeByTestId(container, "chair-schedule-palette-strip");
			assert.ok(toolbar, "Toolbar must exist");
			assert.equal(toolbar.getAttribute("role"), "toolbar");
			assert.match(toolbar.className || "", /h-9|min-h-\[36px\]/);

			const room1 = findNodeByTestId(container, "chair-view-room-chair-1");
			assert.ok(room1, "Room badge must exist");
			assert.match(room1.textContent, /Каб\. 1/);

			const doc1 = findNodeByTestId(container, "chair-view-doc-chair-1");
			assert.ok(doc1, "Doctor name badge must exist");
			assert.match(doc1.textContent, /Константинопольский/);
		});
	});

	describe("3. QuickBookingDrawer & AppointmentModal: Zero-Blocker Booking (Mandate 8e)", () => {
		it("QuickBookingDrawer: auto-resolves duty doctor and displays soft active visit badge without blocking", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const existingAssignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский Александр Владимирович",
					shiftPreset: "morning",
					shiftLabel: "Утро 08-14",
					shiftHours: "08:00–14:00",
					startHour: 8,
					endHour: 14,
				},
			};

			const mockDashboardWithActiveVisit: Dashboard = {
				...mockDashboard,
				activeVisit: {
					id: "vis-1",
					appointmentId: "apt-1",
					patientId: "pat-1",
					doctorId: "doc-1",
				},
			} as unknown as Dashboard;

			await act(async () => {
				root.render(
					<QuickBookingDrawer
						isOpen={true}
						onClose={() => {}}
						dashboard={mockDashboardWithActiveVisit}
						chairDoctorAssignments={existingAssignments}
						initialSlot={{
							chairId: "chair-1",
							dateKey: "2026-09-08",
							startTime: "10:00",
							startsAt: "2026-09-08T10:00:00.000Z",
							patientId: "pat-1",
						}}
					/>,
				);
			});

			const bodyRoot = document.body as unknown as MockDomNode;

			// Check doctor select is populated with duty doctor
			const docSelect = findNodeByTestId(bodyRoot, "select-booking-doctor");
			assert.ok(docSelect, "Doctor select must exist in QuickBookingDrawer");
			assert.equal(docSelect.value, "doc-1", "Doctor must be auto-populated with duty doctor doc-1");
			assert.equal(Boolean(docSelect.disabled), false, "Doctor select must NOT be disabled");

			// Check chair select
			const chairSelect = findNodeByTestId(bodyRoot, "select-booking-chair");
			assert.ok(chairSelect, "Chair select must exist");
			assert.equal(chairSelect.value, "chair-1");
			assert.equal(Boolean(chairSelect.disabled), false, "Chair select must NOT be disabled");

			// Check active visit informative badge is rendered
			const activeVisitBadge = findNodeByTestId(bodyRoot, "quick-booking-active-visit-warning");
			assert.ok(activeVisitBadge, "Active visit soft badge must be rendered");
			assert.match(
				activeVisitBadge.textContent,
				/активный приём в кресле/i,
				"Must inform that patient currently has an active chair visit",
			);
		});

		it("AppointmentModal: all selectors remain enabled (disabled=false) when hasOpenVisit is true", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const appointmentWithOpenVisit: any = {
				id: "apt-1",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				status: "in_treatment",
			};

			const mockDashboardWithActiveVisit: Dashboard = {
				...mockDashboard,
				activeVisit: {
					id: "vis-1",
					appointmentId: "apt-1",
					patientId: "pat-1",
					doctorId: "doc-1",
				},
			} as unknown as Dashboard;

			await act(async () => {
				root.render(
					<AppointmentModal
						isOpen={true}
						onClose={() => {}}
						appointment={appointmentWithOpenVisit}
						onSave={async () => true}
						dashboard={mockDashboardWithActiveVisit}
						patientName={(_p, id) => id || ""}
						formatTime={(iso) => (iso ? iso.slice(11, 16) : "")}
						toDateTimeLocalValue={(iso) => (iso ? iso.slice(0, 16) : "")}
						fromDateTimeLocalValue={(val) => val}
						appointmentLabels={{
							planned: "Запланирован",
							confirmed: "Подтвержден",
							arrived: "Прибыл",
							in_treatment: "В кресле",
							completed: "Завершен",
							cancelled: "Отменен",
							no_show: "Не явился",
						}}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			const bodyRoot = document.body as unknown as MockDomNode;

			const patientSelect = findNodeByTestId(bodyRoot, "select-appointment-patient");
			assert.ok(patientSelect, "Patient select must exist");
			assert.equal(Boolean(patientSelect.disabled), false, "Patient select must NOT be disabled");

			const doctorSelect = findNodeByTestId(bodyRoot, "select-appointment-doctor");
			assert.ok(doctorSelect, "Doctor select must exist");
			assert.equal(Boolean(doctorSelect.disabled), false, "Doctor select must NOT be disabled");

			const chairSelect = findNodeByTestId(bodyRoot, "select-appointment-chair");
			assert.ok(chairSelect, "Chair select must exist");
			assert.equal(Boolean(chairSelect.disabled), false, "Chair select must NOT be disabled");

			const statusSelect = findNodeByTestId(bodyRoot, "select-appointment-status");
			assert.ok(statusSelect, "Status select must exist");
			assert.equal(Boolean(statusSelect.disabled), false, "Status select must NOT be disabled");

			const warningBadge = findNodeByTestId(bodyRoot, "appointment-open-visit-warning");
			assert.ok(warningBadge, "Open visit warning badge must be displayed");
		});

		it("resolveChairDutyDoctor correctly distinguishes morning vs evening vs out-of-shift hours", () => {
			const assignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский Александр Владимирович",
					shiftPreset: "two_shifts",
					shiftLabel: "2 смены",
					shiftHours: "08:00–20:00",
					subShifts: [
						{
							doctorId: "doc-1",
							doctorName: "Константинопольский Александр Владимирович",
							startHour: 8,
							endHour: 14,
							shiftHours: "08:00–14:00",
						},
						{
							doctorId: "doc-2",
							doctorName: "Соколова Е.Д.",
							startHour: 14,
							endHour: 20,
							shiftHours: "14:00–20:00",
						},
					],
				},
			};

			const morning = resolveChairDutyDoctor("chair-1", "2026-09-08T10:00:00", assignments);
			assert.equal(morning.doctorId, "doc-1");
			assert.equal(morning.shiftHours, "08:00–14:00");

			const evening = resolveChairDutyDoctor("chair-1", "2026-09-08T16:00:00", assignments);
			assert.equal(evening.doctorId, "doc-2");
			assert.equal(evening.shiftHours, "14:00–20:00");

			const night = resolveChairDutyDoctor("chair-1", "2026-09-08T22:00:00", assignments);
			assert.equal(night.doctorId, null);
		});
	});
});
