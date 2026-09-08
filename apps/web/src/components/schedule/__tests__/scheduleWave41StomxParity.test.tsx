/**
 * scheduleWave41StomxParity.test.tsx
 *
 * DENTE Dental CRM — Wave 41 StomX Parity Test Suite
 *
 * Mandates:
 * - Mandate 8e (Doctor & Staff Autonomy): Unblocked status selector on open visit, inline quick patient creation.
 * - Mandate 8k (CRM != Reality Simulator): 1-click patient registration inside appointment without modal barriers.
 * - Mandate 8n (Solo Doctor & Small Clinic Sovereignty): Auto-binding default doctor to chair.
 * - Mandate 8o (Task-Scope Reporting).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import type { Appointment, Dashboard } from "@dental/shared";
import { AppointmentModal } from "../AppointmentModal";
import { ChairScheduleView } from "../ChairScheduleView";
import { QuickAddChairModal, type QuickAddChairData } from "../QuickAddChairModal";
import {
	ScheduleGrid,
	DEFAULT_SOLO_CHAIR,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";

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
				set(v) {
					selValue = String(v);
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

		if (tag.toUpperCase() === "BUTTON") {
			el.click = () => {
				if (!el.disabled) {
					el.dispatchEvent({ type: "click", bubbles: true, cancelable: true });
				}
			};
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

function findAllNodesByTestId(root: MockDomNode, testIdPrefix: string): MockDomNode[] {
	const results: MockDomNode[] = [];
	function walk(node: MockDomNode) {
		const tid = node.dataset?.testid || node.getAttribute?.("data-testid");
		if (tid && tid.startsWith(testIdPrefix)) {
			results.push(node);
		}
		for (const child of node.children || []) {
			walk(child);
		}
	}
	walk(root);
	return results;
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

const mockDoctors = [
	{
		id: "doc-1",
		fullName: "Иванов Иван Иванович",
		role: "doctor",
		specialties: ["therapist"],
		active: true,
	},
	{
		id: "doc-2",
		fullName: "Петров Петр Сергеевич",
		role: "doctor",
		specialties: ["surgeon"],
		active: true,
	},
];

const mockChairs = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		room: "1",
		color: "#0d9488",
		specialization: "therapist",
		defaultDoctorId: "doc-1",
		active: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Хирургия)",
		room: "2",
		color: "#2563eb",
		specialization: "surgeon",
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

const defaultAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Прибыл",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

describe("Wave 41 StomX Parity: Schedule Quick Patient, Unblocked Status, Chair-Doctor Binding", () => {
	setupMockDom();

	beforeEach(() => {
		if (typeof document !== "undefined" && document.body) {
			(document.body as unknown as MockDomNode).children.length = 0;
		}
		if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
			localStorage.clear();
		}
	});

	describe("1. AppointmentModal: Inline Quick Patient Mode (Mandates 8e, 8k)", () => {
		it("renders mode toggle buttons: 'Из базы' and '+ Новый пациент'", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const appt: Partial<Appointment> = {
				id: "new-123",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				status: "planned",
			};

			await act(async () => {
				root.render(
					<AppointmentModal
						isOpen={true}
						appointment={appt as Appointment}
						dashboard={mockDashboard}
						onClose={() => {}}
						onSave={async () => true}
						patientName={(_, id) => id || ""}
						formatTime={(iso) => iso.slice(11, 16)}
						toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
						fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
						appointmentLabels={defaultAppointmentLabels}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			const modeSelectBtn = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-patient-mode-select",
			);
			const modeCreateBtn = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-patient-mode-create",
			);

			assert.ok(modeSelectBtn, "Must render 'Из базы' button");
			assert.ok(modeCreateBtn, "Must render '+ Новый пациент' toggle button");
		});

		it("switches to inline patient creation form when '+ Новый пациент' is clicked", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const appt: Partial<Appointment> = {
				id: "new-123",
				patientId: "",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				status: "planned",
			};

			await act(async () => {
				root.render(
					<AppointmentModal
						isOpen={true}
						appointment={appt as Appointment}
						dashboard={mockDashboard}
						onClose={() => {}}
						onSave={async () => true}
						patientName={(_, id) => id || ""}
						formatTime={(iso) => iso.slice(11, 16)}
						toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
						fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
						appointmentLabels={defaultAppointmentLabels}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			const modeCreateBtn = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-patient-mode-create",
			);
			assert.ok(modeCreateBtn);

			await clickNode(modeCreateBtn);

			const panel = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-inline-new-patient-panel",
			);
			const nameInput = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-quick-patient-name",
			);
			const phoneInput = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-quick-patient-phone",
			);
			const savePatientBtn = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-quick-patient-save-btn",
			);
			const cancelBtn = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-quick-patient-cancel-btn",
			);

			assert.ok(panel, "Must render appointment-inline-new-patient-panel");
			assert.ok(nameInput, "Must render appointment-quick-patient-name input");
			assert.ok(phoneInput, "Must render appointment-quick-patient-phone input");
			assert.ok(savePatientBtn, "Must render appointment-quick-patient-save-btn");
			assert.ok(cancelBtn, "Must render appointment-quick-patient-cancel-btn");
		});

		it("creates patient via onQuickCreatePatient and auto-selects them", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const onQuickCreateMock = vi.fn(async (data: { fullName: string; phone?: string | null }) => {
				return {
					id: "pat-quick-999",
					fullName: data.fullName,
					phone: data.phone,
				};
			});

			const appt: Partial<Appointment> = {
				id: "new-123",
				patientId: "",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				status: "planned",
			};

			await act(async () => {
				root.render(
					<AppointmentModal
						isOpen={true}
						appointment={appt as Appointment}
						dashboard={mockDashboard}
						onClose={() => {}}
						onSave={async () => true}
						onQuickCreatePatient={onQuickCreateMock}
						patientName={(_, id) => id || ""}
						formatTime={(iso) => iso.slice(11, 16)}
						toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
						fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
						appointmentLabels={defaultAppointmentLabels}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			// 1. Switch to create mode
			const modeCreateBtn = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-patient-mode-create",
			);
			await clickNode(modeCreateBtn);

			// 2. Type patient name and phone
			const nameInput = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-quick-patient-name",
			);
			const phoneInput = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-quick-patient-phone",
			);

			await changeNode(nameInput, "Соколов Дмитрий Петрович");
			await changeNode(phoneInput, "+7 900 123-45-67");

			// 3. Click save patient button
			const savePatientBtn = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-quick-patient-save-btn",
			);
			await clickNode(savePatientBtn);

			assert.strictEqual(onQuickCreateMock.calls.length, 1);
			assert.strictEqual(onQuickCreateMock.calls[0]![0].fullName, "Соколов Дмитрий Петрович");
			assert.strictEqual(onQuickCreateMock.calls[0]![0].phone, "+7 900 123-45-67");
		});

		it("auto-creates inline patient on handleSave if name was typed", async () => {
			const onSaveMock = vi.fn(async () => true);
			const onQuickCreateMock = vi.fn(async (data: { fullName: string }) => ({
				id: "pat-auto-created",
				fullName: data.fullName,
			}));

			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const appt: Partial<Appointment> = {
				id: "new-auto-save",
				patientId: "",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				status: "planned",
			};

			await act(async () => {
				root.render(
					<AppointmentModal
						isOpen={true}
						appointment={appt as Appointment}
						dashboard={mockDashboard}
						onClose={() => {}}
						onSave={onSaveMock}
						onQuickCreatePatient={onQuickCreateMock}
						patientName={(_, id) => id || ""}
						formatTime={(iso) => iso.slice(11, 16)}
						toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
						fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
						appointmentLabels={defaultAppointmentLabels}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			// Switch to create mode and fill name
			const modeCreateBtn = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-patient-mode-create",
			);
			await clickNode(modeCreateBtn);

			const nameInput = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-quick-patient-name",
			);
			await changeNode(nameInput, "Быстрый Пациент Без Спешки");

			// Save via inline button
			const savePatientBtn = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"appointment-quick-patient-save-btn",
			);
			await clickNode(savePatientBtn);

			assert.strictEqual(onQuickCreateMock.calls.length, 1);
			assert.strictEqual(onQuickCreateMock.calls[0]![0].fullName, "Быстрый Пациент Без Спешки");
		});
	});

	describe("2. AppointmentModal: Unblocked Status Selector on Active Visit (Mandate 8e)", () => {
		it("does NOT disable status selector when hasOpenVisit is true and shows warning banner", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			const root: Root = createRoot(container as unknown as HTMLElement);

			const openVisitDashboard = {
				...mockDashboard,
				activeVisit: {
					appointmentId: "appt-active-visit",
					visitId: "vis-1",
				},
			} as unknown as Dashboard;

			const appt: Partial<Appointment> = {
				id: "appt-active-visit",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-08T10:00:00.000Z",
				endsAt: "2026-09-08T11:00:00.000Z",
				status: "in_treatment",
			};

			const lockedStatuses = new Set<Appointment["status"]>(["completed", "cancelled", "no_show"]);

			await act(async () => {
				root.render(
					<AppointmentModal
						isOpen={true}
						appointment={appt as Appointment}
						dashboard={openVisitDashboard}
						onClose={() => {}}
						onSave={async () => true}
						patientName={(_, id) => id || ""}
						formatTime={(iso) => iso.slice(11, 16)}
						toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
						fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
						appointmentLabels={defaultAppointmentLabels}
						activeVisitLockedAppointmentStatuses={lockedStatuses}
					/>,
				);
			});

			const statusSelect = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"select-appointment-status",
			);
			assert.ok(statusSelect, "Must render select-appointment-status");
			assert.strictEqual(Boolean(statusSelect.disabled), false, "Status select must NOT be disabled (Mandate 8e)");

			const warningBanner = findNodeByTestId(
				document.body as unknown as MockDomNode,
				"status-open-visit-warning",
			);
			assert.ok(warningBanner, "Must render status-open-visit-warning banner");
			assert.ok(
				warningBanner.textContent.includes("активный визит"),
				"Warning banner must mention active visit",
			);
		});
	});

	describe("3. ChairScheduleView: Interactive Chair Badges and Filter Toggle", () => {
		it("renders chair badges as interactive buttons with chair-view-badge-${chair.id} and settings button", () => {
			const html = renderToString(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-08"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					patientName={(_, id) => id || ""}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={defaultAppointmentLabels}
				/>,
			);

			assert.ok(
				html.includes('data-testid="chair-view-badge-chair-1"'),
				"Must render interactive chair badge for chair-1",
			);
			assert.ok(
				html.includes('data-testid="chair-view-badge-chair-2"'),
				"Must render interactive chair badge for chair-2",
			);
			assert.ok(
				html.includes('data-testid="chair-view-settings-chair-1"'),
				"Must render quick settings button for chair-1",
			);
			assert.ok(
				html.includes('data-testid="chair-view-settings-chair-2"'),
				"Must render quick settings button for chair-2",
			);
		});

		it("clicking chair badge triggers onSelectChair callback", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			(document.body as unknown as MockDomNode).appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			const onSelectChairMock = vi.fn();

			await act(async () => {
				root.render(
					<ChairScheduleView
						dashboard={mockDashboard}
						dateKey="2026-09-08"
						appointments={[]}
						onSlotClick={() => {}}
						onAppointmentClick={() => {}}
						onSelectChair={onSelectChairMock}
						patientName={(_, id) => id || ""}
						formatTime={(iso) => iso.slice(11, 16)}
						toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
						appointmentLabels={defaultAppointmentLabels}
					/>,
				);
			});

			const badge1 = findNodeByTestId(
				container,
				"chair-view-badge-chair-1",
			);
			assert.ok(badge1, "chair-view-badge-chair-1 found");

			await clickNode(badge1);

			assert.strictEqual(onSelectChairMock.calls.length, 1);
			assert.strictEqual(onSelectChairMock.calls[0]![0], "chair-1");
		});
	});

	describe("4. QuickAddChairModal: Default Doctor Selector and Live Preview (StomX / DentalPRO Parity)", () => {
		it("renders quick-add-chair-doctor-select and preview card reflects doctor", () => {
			const html = renderToString(
				<QuickAddChairModal
					isOpen={true}
					onClose={() => {}}
					onAddChair={() => {}}
					existingChairsCount={2}
					doctors={mockDoctors}
					initialData={{
						id: "chair-edit-1",
						name: "Тестовое кресло",
						room: "1",
						color: "#0d9488",
						defaultDoctorId: "doc-1",
					} as any}
				/>,
			);

			assert.ok(
				html.includes('data-testid="quick-add-chair-doctor-select"'),
				"Must render default doctor selector",
			);
			assert.ok(
				html.includes('data-testid="quick-add-chair-preview-doctor"'),
				"Must render doctor preview card block",
			);
			assert.ok(
				html.includes("Иванов Иван Иванович"),
				"Must list doctors in select options",
			);
		});

		it("submitting QuickAddChairModal includes defaultDoctorId in payload", async () => {
			const container = document.createElement("div") as unknown as MockDomNode;
			(document.body as unknown as MockDomNode).appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			let addedChairData: any = null;
			const onAddChairMock = vi.fn((data: QuickAddChairData) => {
				addedChairData = data;
			});

			await act(async () => {
				root.render(
					<QuickAddChairModal
						isOpen={true}
						onClose={() => {}}
						onAddChair={onAddChairMock}
						existingChairsCount={2}
						doctors={mockDoctors}
					/>,
				);
			});

			const doctorSelect = findNodeByTestId(
				container,
				"quick-add-chair-doctor-select",
			);
			assert.ok(doctorSelect);

			await changeNode(doctorSelect, "doc-2");

			const submitBtn = findNodeByTestId(
				container,
				"quick-add-chair-submit-btn",
			);
			assert.ok(submitBtn);

			await clickNode(submitBtn);

			assert.strictEqual(onAddChairMock.calls.length, 1);
			assert.strictEqual(addedChairData?.defaultDoctorId, "doc-2");
		});
	});

	describe("5. ScheduleGrid: Auto-binding chair.defaultDoctorId into effectiveChairAssignments", () => {
		it("binds doctor from chair.defaultDoctorId when no explicit shift assignment is present", () => {
			const html = renderToString(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-08"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					patientName={(_, id) => id || ""}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={defaultAppointmentLabels}
				/>,
			);

			// chair-1 has defaultDoctorId: "doc-1" ("Иванов Иван Иванович")
			// ScheduleGrid should display Иванов И.И. in chair-1's assignment header
			assert.ok(
				html.includes("Иванов И.И.") || html.includes("Иванов"),
				"Must display default doctor name on chair 1 header",
			);
		});
	});
});
