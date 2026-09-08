/**
 * scheduleWave42StomxParity.test.tsx
 *
 * DENTE Dental CRM — Wave 42 StomX & IDENT Parity Test Suite
 *
 * Scope:
 * 1. ScheduleFilterStrip: Dedicated "По креслам" mode switch (StomX / IDENT Parity).
 * 2. ChairScheduleView: Unified Compact Toolbar (32-36px, Hick's Law & Mandate 8d).
 * 3. ChairScheduleView: 1-Click Doctor Shift Binding Popover & Presets (Mandate 8e, StomX Parity).
 * 4. ChairScheduleView: Doctor Name without Truncation (Russian Long Surnames).
 * 5. AppointmentModal: Unblocked Patient Select on Active Visit (Mandate 8e Doctor Autonomy).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Appointment, Dashboard } from "@dental/shared";
import { ScheduleFilterStrip } from "../ScheduleFilterStrip";
import { ChairScheduleView } from "../ChairScheduleView";
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
					const opts = (el as any).options as MockDomNode[];
					const selectedOpts = opts.filter((o) => (o as any).selected);
					if (selectedOpts.length > 0) return (selectedOpts[selectedOpts.length - 1] as any).value;
					if (attrs.value !== undefined) return attrs.value;
					if ((el as any)._value !== undefined) return (el as any)._value;
					return selValue;
				},
				set(v: string) {
					selValue = v;
					(el as any)._value = v;
					const opts = (el as any).options as MockDomNode[];
					for (const opt of opts) {
						(opt as any).selected = (opt as any).value === v;
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

	return { doc, win };
}

function findNodeByTestId(
	node: MockDomNode | null,
	testId: string,
): MockDomNode | null {
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
		node.dispatchEvent({ type: "click" });
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
		fullName: "Петров Петр Сергеевич",
		role: "doctor",
		specialty: "Стоматолог-хирург",
		active: true,
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		room: "1",
		color: "#0d9488",
		defaultDoctorId: "doc-1",
		active: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		room: "2",
		color: "#2563eb",
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
	},
	{
		id: "pat-2",
		fullName: "Кузнецова Мария Ивановна",
		phone: "+7 999 444-55-66",
		status: "active",
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

describe("Wave 42 StomX Parity: Dedicated Chair View Mode, Doctor Shift Binding, Unblocked Patient Select", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
	});

	describe("1. ScheduleFilterStrip: Dedicated 'По креслам' View Mode Switch (StomX / IDENT)", () => {
		it("renders segmented control with 'По креслам' option and fires setScheduleViewMode('chairs')", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let selectedMode = "grid";
			const setScheduleViewMode = (mode: "timeline" | "grid" | "chairs") => {
				selectedMode = mode;
			};

			await act(async () => {
				root.render(
					<ScheduleFilterStrip
						selectedDate="2026-09-08"
						setSelectedDate={() => {}}
						selectedDoctorId={null}
						setSelectedDoctorId={() => {}}
						doctors={mockDoctors as any}
						selectedStatus="all"
						setSelectedStatus={() => {}}
						scheduleViewMode={selectedMode as any}
						setScheduleViewMode={setScheduleViewMode}
						selectedCabinet="all"
						setSelectedCabinet={() => {}}
						cabinets={["1", "2"]}
						appointmentCount={5}
					/>,
				);
			});

			const chairsModeBtn = findNodeByTestId(container, "schedule-view-mode-chairs");
			assert.ok(chairsModeBtn, "Should render button with data-testid='schedule-view-mode-chairs'");
			assert.match(chairsModeBtn.textContent, /кресл/i, "Button should contain 'кресл' text");

			await clickNode(chairsModeBtn);
			assert.equal(selectedMode, "chairs", "Clicking 'По креслам' should change mode to 'chairs'");
		});
	});

	describe("2. ChairScheduleView: Unified Compact Toolbar (Hick's Law & Mandate 8d) & No Doctor Truncation", () => {
		it("renders single unified toolbar with установки count, actions and chair strip", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onOpenRosterModal={() => {}}
						onAddChair={() => {}}
					/>,
				);
			});

			const toolbar = findNodeByTestId(container, "chair-schedule-palette-strip");
			assert.ok(toolbar, "Palette strip toolbar must exist");
			assert.equal(toolbar.getAttribute("role"), "toolbar", "Toolbar role must be present");

			const countBadge = findNodeByTestId(container, "chair-view-count-badge");
			assert.ok(countBadge, "Count badge must exist");
			assert.match(countBadge.textContent, /2 кресла/i, "Should show '2 кресла'");

			const rosterBtn = findNodeByTestId(container, "btn-open-chair-roster");
			assert.ok(rosterBtn, "Roster button must be in toolbar");

			const addChairBtn = findNodeByTestId(container, "btn-add-chair-header");
			assert.ok(addChairBtn, "Add chair button must be in toolbar");

			// Check Russian long doctor name is NOT cut with max-w-[100px]
			const chair1Badge = findNodeByTestId(container, "chair-view-badge-chair-1");
			assert.ok(chair1Badge, "Chair 1 badge must exist");
			assert.match(
				chair1Badge.textContent,
				/Константинопольский/,
				"Doctor long surname must be rendered without truncation",
			);
		});
	});

	describe("3. ChairScheduleView: 1-Click Doctor Shift Binding Popover & Presets (Mandate 8e, StomX)", () => {
		it("opens shift popover and assigns morning shift (08:00–14:00) on click", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedChairId: string | null = null;
			let assignedShift: ChairDoctorShiftAssignment | null = null;

			const onAssignChairDoctor = (chairId: string, assignment: ChairDoctorShiftAssignment | null) => {
				assignedChairId = chairId;
				assignedShift = assignment;
			};

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={onAssignChairDoctor}
					/>,
				);
			});

			// Trigger button to open popover
			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			assert.ok(triggerBtn, "Doctor assign trigger button must exist");

			await clickNode(triggerBtn);

			// Popover must now be rendered
			const popover = findNodeByTestId(container, "chair-view-shift-popover-chair-1");
			assert.ok(popover, "Shift popover must open on click");

			// Click Morning Shift preset (08-14)
			const morningBtn = findNodeByTestId(container, "chair-view-shift-morning-chair-1");
			assert.ok(morningBtn, "Morning shift preset button must exist");
			await clickNode(morningBtn);

			// Verify callback was called with morning preset
			assert.equal(assignedChairId, "chair-1");
			assert.ok(assignedShift);
			assert.equal(assignedShift.shiftPreset, "morning");
			assert.equal(assignedShift.shiftLabel, "Утро 08-14");
			assert.equal(assignedShift.shiftHours, "08:00–14:00");
			assert.equal(assignedShift.startHour, 8);
			assert.equal(assignedShift.endHour, 14);
		});

		it("assigns '2 через 2' shift preset on click", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let assignedShift: ChairDoctorShiftAssignment | null = null;

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onAssignChairDoctor={(_id, assignment) => {
							assignedShift = assignment;
						}}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-2");
			await clickNode(triggerBtn);

			const twoByTwoBtn = findNodeByTestId(container, "chair-view-shift-2x2-chair-2");
			assert.ok(twoByTwoBtn, "2x2 shift preset button must exist");
			await clickNode(twoByTwoBtn);

			assert.ok(assignedShift);
			assert.equal(assignedShift.shiftPreset, "two_shifts");
			assert.equal(assignedShift.shiftLabel, "2 через 2");
			assert.equal(assignedShift.shiftHours, "08:00–20:00");
		});

		it("unassigns doctor when clicking unassign button", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			let unassignedCalled = false;

			const existingAssignments: Record<string, ChairDoctorShiftAssignment> = {
				"chair-1": {
					chairId: "chair-1",
					doctorId: "doc-1",
					doctorName: "Константинопольский А.В.",
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
						onAssignChairDoctor={(_id, assignment) => {
							if (assignment === null) {
								unassignedCalled = true;
							}
						}}
					/>,
				);
			});

			const triggerBtn = findNodeByTestId(container, "chair-view-assign-doctor-chair-1");
			await clickNode(triggerBtn);

			const unassignBtn = findNodeByTestId(container, "chair-view-unassign-chair-1");
			assert.ok(unassignBtn, "Unassign button must exist when doctor is assigned");
			await clickNode(unassignBtn);

			assert.equal(unassignedCalled, true, "Clicking unassign must call onAssignChairDoctor with null");
		});
	});

	describe("4. AppointmentModal: Unblocked Patient Select on Active Visit (Mandate 8e)", () => {
		it("does NOT disable patient selector when hasOpenVisit is true and shows warning badge", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const appointmentWithOpenVisit: Appointment = {
				id: "apt-1",
				organizationId: "org-1",
				patientId: "pat-1",
				doctorId: "doc-1",
				cabinet: "1",
				startTime: "2026-09-08T10:00:00.000Z",
				endTime: "2026-09-08T11:00:00.000Z",
				status: "in_treatment",
				type: "treatment",
				notes: "Лечение кариеса",
				createdAt: "2026-09-08T09:00:00.000Z",
				updatedAt: "2026-09-08T09:00:00.000Z",
			};

			const mockDashboardWithActiveVisit = {
				...mockDashboard,
				activeVisit: {
					id: "visit-1",
					appointmentId: "apt-1",
					patientId: "pat-1",
					doctorId: "doc-1",
				},
			};

			await act(async () => {
				root.render(
					<AppointmentModal
						isOpen={true}
						onClose={() => {}}
						appointment={appointmentWithOpenVisit}
						onSave={async () => {}}
						patients={mockPatients as any}
						doctors={mockDoctors as any}
						dashboard={mockDashboardWithActiveVisit as any}
						patientName={(_p, id) => id || ""}
						formatTime={(iso) => iso ? iso.slice(11, 16) : ""}
						toDateTimeLocalValue={(iso) => iso ? iso.slice(0, 16) : ""}
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
						onOpenActiveVisit={() => {}}
					/>,
				);
			});

			// Verify patient select is NOT disabled per Mandate 8e
			const targetRoot = (document.body as unknown as MockDomNode);
			const patientSelect = findNodeByTestId(targetRoot, "select-appointment-patient");
			assert.ok(patientSelect, "Patient select must exist");
			assert.equal(
				Boolean(patientSelect.disabled),
				false,
				"Patient select must NOT be disabled even when hasOpenVisit is true (Mandate 8e Doctor Autonomy)",
			);

			// Verify informative warning banner is displayed instead of blocking error
			const warningBadge = findNodeByTestId(targetRoot, "appointment-open-visit-warning");
			assert.ok(warningBadge, "Informative warning badge must be displayed");
			assert.match(
				warningBadge.textContent,
				/активный визит.*новую карту/i,
				"Warning should inform that active visit will be moved to new patient card",
			);
		});
	});
});
