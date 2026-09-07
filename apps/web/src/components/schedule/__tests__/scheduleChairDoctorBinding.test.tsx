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
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Dashboard } from "@dental/shared";
import {
	ScheduleGrid,
	DEFAULT_SOLO_CHAIR,
	CHAIR_SHIFT_PRESETS,
	formatDoctorShortName,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";
import { QuickBookingDrawer } from "../QuickBookingDrawer";

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
					const selectedOpt = opts.find((o) => (o as any).selected);
					if (selectedOpt) return (selectedOpt as any).value;
					return attrs.value !== undefined ? attrs.value : ((el as any)._value ?? "");
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
					return attrs.selected === "true" || attrs.selected === "" || Boolean((el as any)._selected);
				},
				set(v) {
					(el as any)._selected = Boolean(v);
					if (v) {
						attrs.selected = "true";
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
	});

	it("exports standard shift presets conforming to Mandate 8k (Morning, Evening, Full Day)", () => {
		expect(CHAIR_SHIFT_PRESETS.length).toBe(3);
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

		// onSlotClick must carry doctorUserId: "doc-1"
		expect(onSlotClick).toHaveBeenCalledTimes(1);
		expect(onSlotClick).toHaveBeenCalledWith(
			(expect as any).objectContaining({
				dateKey: "2026-09-07",
				startTime: "10:00",
				chairId: "chair-1",
				doctorUserId: "doc-1",
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
});
