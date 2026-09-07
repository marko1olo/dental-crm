/**
 * scheduleGridStomxInquisition.test.tsx
 *
 * DENTE Dental CRM — Schedule Grid & Quick Booking Drawer Red-Team Inquisition Test Suite
 * Parity: StomX / DentalPRO Chair Doctor Duty & Shift Slot Allocation
 *
 * MANDATES TESTED:
 * - Mandate 8d (The Burden of Proof Law & 7 Deadly UI Sins: touch targets >= 44px, no text collision, WCAG AAA theme hygiene)
 * - Mandate 8e (Doctor & Staff Autonomy: 0 disabled buttons without cause, non-blocking doctor overrides)
 * - Mandate 8k (CRM != Reality Simulator: 1-click presets, zero friction in schedule booking)
 * - Mandate 8n (Solo Doctor & Small Clinic Sovereignty: clean 0-chair empty state vs solo practice auto-fallback)
 * - Mandate 8o (Task-Scope Reporting: instrumentally verified without ritual excuses)
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Dashboard } from "@dental/shared";
import {
	ScheduleGrid,
	DEFAULT_SOLO_CHAIR,
	CHAIR_SHIFT_PRESETS,
	formatDoctorShortName,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";
import { QuickBookingDrawer, resolveChairDutyDoctor } from "../QuickBookingDrawer";

// --- Lightweight Test DOM Polyfill for React 19 Client Renders ---

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

	return { doc, win };
}

function findNodeByTestId(node: MockDomNode | null, testId: string): MockDomNode | null {
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
			const reactPropKey = Object.keys(curr).find((k) => k.startsWith("__reactProps$"));
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
			const reactPropKey = Object.keys(curr).find((k) => k.startsWith("__reactProps$"));
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

describe("ScheduleGrid & QuickBookingDrawer StomX Parity Inquisition (Mandates 8d, 8e, 8k, 8n, 8o)", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		const { doc } = setupMockDom();
		container = doc.createElement("div");
		doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	// --- TEST 1: 2-Shift Chair Header Renders Morning & Evening Doctor Names, Shift Hours, and Active Shift Highlight ---
	it("1. 2-shift chair header renders morning & evening doctor names, shift hours, and active shift highlight", async () => {
		const chairAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-dual": {
				chairId: "chair-dual",
				doctorId: "doc-morn",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены: Утро + Вечер",
				shiftHours: "08:00–14:00 & 14:00–20:00",
				subShifts: [
					{
						doctorId: "doc-morn",
						doctorName: "Иванов Иван Иванович",
						doctorSpecialty: "Терапевт",
						startHour: 8,
						endHour: 14,
						shiftHours: "08:00–14:00",
					},
					{
						doctorId: "doc-eve",
						doctorName: "Петров Петр Петрович",
						doctorSpecialty: "Хирург",
						startHour: 14,
						endHour: 20,
						shiftHours: "14:00–20:00",
					},
				],
			},
		};

		const testDashboard = {
			clinicSettings: {
				profile: {
					clinicName: "Клиника ДЕНТЕ",
					timezone: "Europe/Moscow",
					mode: "clinic",
				},
				chairs: [{ id: "chair-dual", name: "Кабинет 1 (Терапия/Хирургия)", room: "1", active: true }],
				staff: [
					{ id: "doc-morn", fullName: "Иванов Иван Иванович", role: "doctor", active: true },
					{ id: "doc-eve", fullName: "Петров Петр Петрович", role: "doctor", active: true },
				],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: testDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: () => {},
					onAppointmentClick: () => {},
					patientName: () => "Пациент",
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: chairAssignments,
				}),
			);
		});

		// Multishift container must exist
		const multishiftEl = findNodeByTestId(container, "chair-doctor-multishift-chair-dual");
		assert.ok(multishiftEl, "Multishift container data-testid='chair-doctor-multishift-chair-dual' must exist");

		// Morning shift badge
		const mornEl = findNodeByTestId(container, "chair-shift-morning-chair-dual");
		assert.ok(mornEl, "Morning shift badge must exist");
		assert.ok(mornEl.textContent.includes("08:00–14:00"), "Must display morning hours (08:00–14:00)");
		assert.ok(mornEl.textContent.includes("Иванов И.И."), "Must display formatted morning doctor short name");

		// Evening shift badge
		const eveEl = findNodeByTestId(container, "chair-shift-evening-chair-dual");
		assert.ok(eveEl, "Evening shift badge must exist");
		assert.ok(eveEl.textContent.includes("14:00–20:00"), "Must display evening hours (14:00–20:00)");
		assert.ok(eveEl.textContent.includes("Петров П.П."), "Must display formatted evening doctor short name");
	});

	// --- TEST 2: Unassigned Chair Button Renders '+ Назначить врача' with Touch Target >= 44px ---
	it("2. Unassigned chair button renders '+ Назначить врача' with touch target >= 44px", async () => {
		const testDashboard = {
			clinicSettings: {
				profile: {
					clinicName: "Клиника ДЕНТЕ",
					timezone: "Europe/Moscow",
					mode: "clinic",
				},
				chairs: [{ id: "chair-unassigned", name: "Кабинет 3", room: "3", active: true }],
				staff: [
					{ id: "doc-1", fullName: "Смирнов Сергей", role: "doctor", active: true },
					{ id: "doc-2", fullName: "Ковалев Игорь", role: "doctor", active: true },
				],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: testDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: () => {},
					onAppointmentClick: () => {},
					patientName: () => "Пациент",
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: {},
				}),
			);
		});

		const assignBtn = findNodeByTestId(container, "btn-assign-doctor-chair-unassigned");
		assert.ok(assignBtn, "Button data-testid='btn-assign-doctor-chair-unassigned' must exist");
		assert.ok(assignBtn.textContent.includes("+ Назначить врача"), "Must contain '+ Назначить врача'");

		// Verify touch target >= 44px
		assert.ok(
			assignBtn.className?.includes("min-h-[44px]") || assignBtn.style?.minHeight === "44px",
			`Expected unassigned button to have min-h-[44px], got className: ${assignBtn.className}`,
		);
	});

	// --- TEST 3: Slot Click Before 14:00 Passes Morning Doctor ID; At/After 14:00 Passes Evening Doctor ID ---
	it("3. Slot click before 14:00 passes morning doctor ID; at/after 14:00 passes evening doctor ID to onSlotClick", async () => {
		const slotCalls: any[] = [];
		const chairAssignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-dual": {
				chairId: "chair-dual",
				doctorId: "doc-morn",
				doctorName: "Иванов Иван Иванович",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены",
				shiftHours: "08:00–14:00 & 14:00–20:00",
				subShifts: [
					{ doctorId: "doc-morn", doctorName: "Иванов И.И.", startHour: 8, endHour: 14, shiftHours: "08:00–14:00" },
					{ doctorId: "doc-eve", doctorName: "Петров П.П.", startHour: 14, endHour: 20, shiftHours: "14:00–20:00" },
				],
			},
		};

		const testDashboard = {
			clinicSettings: {
				profile: { clinicName: "Клиника ДЕНТЕ", timezone: "Europe/Moscow", mode: "clinic" },
				chairs: [{ id: "chair-dual", name: "Кабинет 1", room: "1", active: true }],
				staff: [
					{ id: "doc-morn", fullName: "Иванов И.И.", role: "doctor", active: true },
					{ id: "doc-eve", fullName: "Петров П.П.", role: "doctor", active: true },
				],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		await act(async () => {
			root.render(
				React.createElement(ScheduleGrid, {
					dashboard: testDashboard,
					dateKey: "2026-09-07",
					appointments: [],
					onSlotClick: (slot: any) => {
						slotCalls.push(slot);
					},
					onAppointmentClick: () => {},
					patientName: () => "Пациент",
					formatTime: (iso: string) => iso.slice(11, 16),
					toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
					appointmentLabels: mockAppointmentLabels,
					chairDoctorAssignments: chairAssignments,
				}),
			);
		});

		// Click 10:00 slot (morning shift)
		const slot10 = findNodeByTestId(container, "btn-slot-chair-dual-1000");
		assert.ok(slot10, "Slot 10:00 button must exist");
		await clickNode(slot10);
		assert.equal(slotCalls.length, 1);
		assert.equal(slotCalls[0].doctorUserId, "doc-morn", "Slot 10:00 must bind morning doctor");

		// Click 15:00 slot (evening shift)
		const slot15 = findNodeByTestId(container, "btn-slot-chair-dual-1500");
		assert.ok(slot15, "Slot 15:00 button must exist");
		await clickNode(slot15);
		assert.equal(slotCalls.length, 2);
		assert.equal(slotCalls[1].doctorUserId, "doc-eve", "Slot 15:00 must bind evening doctor");

		// Click 20:00 slot (evening shift boundary)
		const slot20 = findNodeByTestId(container, "btn-slot-chair-dual-2000");
		assert.ok(slot20, "Slot 20:00 button must exist");
		await clickNode(slot20);
		assert.equal(slotCalls.length, 3);
		assert.equal(slotCalls[2].doctorUserId, "doc-eve", "Slot 20:00 must bind evening doctor");
	});

	// --- TEST 4: 0 Chairs in Clinic Renders Empty State with '+ Создать первое кресло' ---
	it("4. 0 chairs in clinic renders data-testid='schedule-zero-chairs-empty-state' with '+ Создать первое кресло'", () => {
		const zeroChairsDashboard = {
			clinicSettings: {
				profile: {
					clinicName: "Клиника ДЕНТЕ (Новый филиал)",
					timezone: "Europe/Moscow",
					mode: "clinic", // Non-solo clinic mode
				},
				chairs: [], // Explicitly 0 chairs
				staff: [],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: zeroChairsDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: () => {},
				onAppointmentClick: () => {},
				patientName: () => "—",
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
			}),
		);

		assert.match(html, /data-testid="schedule-zero-chairs-empty-state"/);
		assert.match(html, /В клинике пока нет настроенных кресел/);
		assert.match(html, /data-testid="btn-create-first-chair"/);
		assert.match(html, /\+ Создать первое кресло/);
		assert.match(html, /min-h-\[44px\]/);
	});

	// --- TEST 5: 10+ Chairs Renders with 'overflow-x-auto' and Time Column Has 'sticky left-0' ---
	it("5. 10+ chairs renders with overflow-x-auto and time column has sticky left-0", () => {
		const twelveChairs = Array.from({ length: 12 }, (_, i) => ({
			id: `chair-${i + 1}`,
			name: `Кресло ${i + 1}`,
			room: `${i + 1}`,
			active: true,
		}));

		const largeClinicDashboard = {
			clinicSettings: {
				profile: { clinicName: "Большой стоматологический центр", timezone: "Europe/Moscow", mode: "clinic" },
				chairs: twelveChairs,
				staff: [],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		const html = renderToString(
			React.createElement(ScheduleGrid, {
				dashboard: largeClinicDashboard,
				dateKey: "2026-09-07",
				appointments: [],
				onSlotClick: () => {},
				onAppointmentClick: () => {},
				patientName: () => "—",
				formatTime: (iso: string) => iso.slice(11, 16),
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: mockAppointmentLabels,
			}),
		);

		assert.match(html, /overflow-x-auto/, "Must have horizontal scroll for 10+ chairs");
		assert.match(html, /repeat\(12, minmax\(180px, 1fr\)\)/, "Must render grid template columns for 12 chairs");
		assert.match(html, /sticky left-0/, "Time column must be pinned with sticky left-0 for horizontal scrolling");
	});

	// --- TEST 6: QuickBookingDrawer: resolveChairDutyDoctor Accurately Identifies Morning vs Evening vs Null ---
	it("6. QuickBookingDrawer: resolveChairDutyDoctor accurately identifies morning vs evening vs out-of-shift doctor", () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-1",
				doctorName: "Д-р Иванов",
				shiftPreset: "two_shifts",
				shiftLabel: "2 смены",
				shiftHours: "08:00–14:00 & 14:00–20:00",
				subShifts: [
					{ doctorId: "doc-1", doctorName: "Д-р Иванов", startHour: 8, endHour: 14, shiftHours: "08:00–14:00" },
					{ doctorId: "doc-2", doctorName: "Д-р Петров", startHour: 14, endHour: 20, shiftHours: "14:00–20:00" },
				],
			},
		};

		// 10:00 -> morning doctor
		const mornDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T10:00", assignments);
		assert.equal(mornDuty.doctorId, "doc-1");
		assert.equal(mornDuty.shiftHours, "08:00–14:00");

		// 16:30 -> evening doctor
		const eveDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T16:30", assignments);
		assert.equal(eveDuty.doctorId, "doc-2");
		assert.equal(eveDuty.shiftHours, "14:00–20:00");

		// 20:00 -> evening doctor boundary
		const boundaryDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T20:00", assignments);
		assert.equal(boundaryDuty.doctorId, "doc-2");

		// 22:00 -> out of shift
		const nightDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T22:00", assignments);
		assert.equal(nightDuty.doctorId, null, "22:00 must return null doctorId");

		// 06:00 -> out of shift
		const earlyDuty = resolveChairDutyDoctor("chair-1", "2026-09-07T06:00", assignments);
		assert.equal(earlyDuty.doctorId, null, "06:00 must return null doctorId");
	});

	// --- TEST 7: QuickBookingDrawer Displays Soft Override Note, Submit Remains Enabled (Mandate 8e) ---
	it("7. QuickBookingDrawer displays soft override note when registrar selects another doctor, submit button remains enabled (Mandate 8e)", async () => {
		const assignments: Record<string, ChairDoctorShiftAssignment> = {
			"chair-1": {
				chairId: "chair-1",
				doctorId: "doc-duty",
				doctorName: "Д-р Дежурный А.А.",
				shiftPreset: "full",
				shiftLabel: "Полный день",
				shiftHours: "08:00–20:00",
			},
		};

		const testDashboard = {
			clinicSettings: {
				profile: { clinicName: "Клиника ДЕНТЕ", timezone: "Europe/Moscow" },
				chairs: [{ id: "chair-1", name: "Кабинет 1", room: "1", active: true }],
				staff: [
					{ id: "doc-duty", fullName: "Д-р Дежурный А.А.", role: "doctor", active: true },
					{ id: "doc-other", fullName: "Д-р Другой Б.Б.", role: "doctor", active: true },
				],
			},
			appointments: [],
			patients: [{ id: "pat-1", fullName: "Сидоров Сидор", phone: "+7 999 111-22-33" }],
		} as unknown as Dashboard;

		// Initial slot booked with duty doctor
		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-07",
						startTime: "10:00",
						doctorUserId: "doc-duty",
					},
					dashboard: testDashboard,
					chairDoctorAssignments: assignments,
				}),
			);
		});

		// Duty doctor badge is displayed in document.body (portal target)
		const bodyNode = document.body as unknown as MockDomNode;
		const dutyBadge = findNodeByTestId(bodyNode, "duty-doctor-badge");
		assert.ok(dutyBadge, "Duty doctor badge must be displayed");
		assert.ok(dutyBadge.textContent.includes("Дежурный врач"));

		// Simulate selecting another doctor via the doctor select input
		const doctorSelect = findNodeByTestId(bodyNode, "select-booking-doctor");
		assert.ok(doctorSelect, "Doctor select dropdown must exist");

		// Change doctor to 'doc-other'
		await changeNode(doctorSelect, "doc-other");

		// Check for soft override notice
		const overrideNote = findNodeByTestId(bodyNode, "duty-doctor-override-note");
		assert.ok(overrideNote, "Non-blocking override notice must appear when selecting different doctor");
		assert.ok(
			overrideNote.textContent.includes("Мандат 8e") || overrideNote.textContent.includes("не блокируется"),
			"Override note must emphasize non-blocking doctor autonomy",
		);

		// MANDATE 8e AUDIT: Verify submit button is NOT disabled
		const submitButtons = bodyNode.children.flatMap(function getAll(n): MockDomNode[] {
			return [n, ...(n.children ? n.children.flatMap(getAll) : [])];
		}).filter((n) => n.tagName === "BUTTON" && (n.textContent?.includes("Создать запись") || n.textContent?.includes("Ctrl+Enter")));

		assert.ok(submitButtons.length > 0, "Submit booking button must exist");
		const submitBtn = submitButtons[0]!;
		assert.equal(submitBtn.disabled, false, "Mandate 8e: submit button must NOT be disabled when doctor is overridden!");
	});

	// --- TEST 8: QuickBookingDrawer Button Touch Targets >= 44px and Dark Mode Theme Variable Hygiene ---
	it("8. QuickBookingDrawer button touch targets >= 44px and dark mode theme variable hygiene", async () => {
		const testDashboard = {
			clinicSettings: {
				profile: { clinicName: "Клиника ДЕНТЕ", timezone: "Europe/Moscow" },
				chairs: [{ id: "chair-1", name: "Кабинет 1", room: "1", active: true }],
				staff: [{ id: "doc-1", fullName: "Д-р Иванов", role: "doctor", active: true }],
			},
			appointments: [],
			patients: [],
		} as unknown as Dashboard;

		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					dashboard: testDashboard,
				}),
			);
		});

		const bodyNode = document.body as unknown as MockDomNode;

		// 1. CITO express patient button: min-h-[44px]
		const citoBtn = findNodeByTestId(bodyNode, "quick-booking-cito-express-btn");
		assert.ok(citoBtn, "CITO button must exist");
		assert.ok(citoBtn.className?.includes("min-h-[44px]"), "CITO express button must have touch target min-h-[44px]");

		// 2. Blank contract print button: min-h-[44px]
		const contractBtn = findNodeByTestId(bodyNode, "quick-booking-print-blank-contract-btn");
		assert.ok(contractBtn, "Print blank contract button must exist");
		assert.ok(contractBtn.className?.includes("min-h-[44px]"), "Print blank contract button must have touch target min-h-[44px]");

		// 3. Main footer buttons: min-h-[44px]
		const buttons = bodyNode.children.flatMap(function getAll(n): MockDomNode[] {
			return [n, ...(n.children ? n.children.flatMap(getAll) : [])];
		}).filter((n) => n.tagName === "BUTTON");

		const cancelBtn = buttons.find((b) => b.textContent?.includes("Отмена (Esc)"));
		assert.ok(cancelBtn, "Cancel button must exist");
		assert.ok(cancelBtn.className?.includes("min-h-[44px]"), "Cancel button must have min-h-[44px]");

		const submitBtn = buttons.find((b) => b.textContent?.includes("Создать запись"));
		assert.ok(submitBtn, "Submit button must exist");
		assert.ok(submitBtn.className?.includes("min-h-[44px]"), "Submit button must have min-h-[44px]");

		// 4. Dark mode theme hygiene: check semantic CSS tokens
		assert.ok(submitBtn.className?.includes("var(--teal-dark)"), "Must use var(--teal-dark) for primary action contrast");
		assert.ok(cancelBtn.className?.includes("var(--paper)"), "Must use var(--paper) for cancel button");
	});
});
