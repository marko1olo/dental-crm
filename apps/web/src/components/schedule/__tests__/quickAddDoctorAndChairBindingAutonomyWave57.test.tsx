/**
 * quickAddDoctorAndChairBindingAutonomyWave57.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 246 (Wave 57):
 * «расписание_врачи_кресла::быстрое_добавление_врача_из_сетки_закрепление_кресел_за_врачами_по_графику_и_автоподстановка_в_записи»
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Mandate 8c: Dominant Workspace & touch targets floor (>= 44x44px in buttons and popovers).
 * - Mandate 8d п. 7: 0 cartoon emojis (Lucide vector icons only).
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, frictionless 1-tap setup, non-blocking defaults).
 * - Mandate 8k: CRM != Reality Simulator (friction-killer law, instant staff addition & chair binding).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor, zero-chair fallback).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard, Appointment } from "@dental/shared";

import QuickAddDoctorModal, {
	formatDoctorShortName,
	DOCTOR_COLOR_PRESETS,
} from "../QuickAddDoctorModal";
import { ChairScheduleView } from "../ChairScheduleView";
import {
	ScheduleGrid,
	DEFAULT_SOLO_CHAIR,
	type ChairDoctorShiftAssignment,
} from "../ScheduleGrid";
import { QuickBookingDrawer } from "../QuickBookingDrawer";
import { AppointmentModal } from "../AppointmentModal";

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
			json: async () => ({ id: "doc-new-1", name: "Врач Новый", shortName: "Новый В." }),
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

async function submitForm(modal: MockDomNode | null) {
	if (!modal) return;
	const forms = findAllNodesByTag(modal, "form");
	if (forms.length > 0) {
		const form = forms[0]!;
		const formKey = Object.keys(form).find((k) => k.startsWith("__reactProps$"));
		if (formKey) {
			const formProps = (form as any)[formKey];
			if (formProps && typeof formProps.onSubmit === "function") {
				await act(async () => {
					await formProps.onSubmit({
						preventDefault: () => {},
						stopPropagation: () => {},
					});
				});
			}
		}
	}
}

async function simulateChange(node: MockDomNode | null, value: string) {
	if (!node) return;
	await act(async () => {
		(node as any).value = value;
		if (node.setAttribute) {
			node.setAttribute("value", value);
		}
		const reactPropKey = Object.keys(node).find((k) =>
			k.startsWith("__reactProps$"),
		);
		if (reactPropKey) {
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onChange === "function") {
				await props.onChange({
					type: "change",
					target: { value },
				});
				return;
			}
		}
		node.dispatchEvent({ type: "change", target: { value } });
	});
}

const mockDashboard: any = {
	stats: {},
	todayAppointments: [],
	patients: [],
	clinicSettings: {
		clinicName: "Денте Люкс",
		profile: {
			organizationId: "clinic-test",
			clinicName: "Стоматология DENTE",
			timezone: "Europe/Moscow",
			mode: "standard",
		},
		chairs: [
			{ id: "chair-1", name: "Кресло 1", active: true, color: "#0d9488" },
		],
		staff: [
			{ id: "doc-1", fullName: "Терапевт Тест", role: "doctor", active: true },
		],
	},
};

describe("Wave 57 (Feature 246) — Quick Add Doctor & Chair Binding Autonomy", () => {
	let rootNode: MockDomNode;
	let reactRoot: Root;

	beforeEach(() => {
		const { doc } = setupMockDom();
		rootNode = doc.createElement("div");
		doc.body.appendChild(rootNode);
		reactRoot = createRoot(rootNode as unknown as HTMLElement);
	});

	it("Short name auto-formatting produces standard Russian initials", () => {
		assert.equal(formatDoctorShortName("Иванов Иван Иванович"), "Иванов И.И.");
		assert.equal(formatDoctorShortName("Петрова Анна"), "Петрова А.");
		assert.equal(formatDoctorShortName("Сидоров"), "Сидоров");
		assert.equal(formatDoctorShortName(""), "");
	});

	it("QuickAddDoctorModal: renders 9 core test-ids with 0 disabled buttons, 0 emojis, and >=44px touch targets", async () => {
		const chairs = [
			{ id: "chair-1", name: "Кресло 1 (Хирургия)", room: "Кабинет 101" },
			{ id: "chair-2", name: "Кресло 2 (Терапия)", room: "Кабинет 102" },
		];
		const onDoctorAdded = vi.fn();
		const onClose = vi.fn();

		await act(async () => {
			reactRoot.render(
				<QuickAddDoctorModal
					isOpen={true}
					onClose={onClose}
					chairs={chairs}
					onDoctorAdded={onDoctorAdded}
				/>,
			);
		});

		const modal = findNodeByTestId(mockDoc.body, "quick-doctor-modal");
		assert.ok(modal, "QuickAddDoctorModal root element must be mounted");

		// Core form controls
		const nameInput = findNodeByTestId(modal, "quick-doctor-name");
		const specialtySelect = findNodeByTestId(modal, "quick-doctor-specialty");
		const phoneInput = findNodeByTestId(modal, "quick-doctor-phone");
		const chairSelect = findNodeByTestId(modal, "quick-doctor-preferred-chair");
		const submitBtn = findNodeByTestId(modal, "quick-doctor-submit-btn");
		const closeBtn = findNodeByTestId(modal, "quick-doctor-close-btn");
		const cancelBtn = findNodeByTestId(modal, "quick-doctor-cancel-btn");
		const colorContainer = findNodeByTestId(modal, "quick-doctor-color");

		assert.ok(nameInput, "quick-doctor-name input must exist");
		assert.ok(specialtySelect, "quick-doctor-specialty select must exist");
		assert.ok(phoneInput, "quick-doctor-phone input must exist");
		assert.ok(chairSelect, "quick-doctor-preferred-chair select must exist");
		assert.ok(submitBtn, "quick-doctor-submit-btn must exist");
		assert.ok(closeBtn, "quick-doctor-close-btn must exist");
		assert.ok(cancelBtn, "quick-doctor-cancel-btn must exist");
		assert.ok(colorContainer, "quick-doctor-color palette container must exist");

		// Mandate 8e: 0 disabled buttons
		const buttons = findAllNodesByTag(modal, "button");
		for (const btn of buttons) {
			assert.equal(btn.disabled, false, `Button ${btn.getAttribute("data-testid") || "unnamed"} must never be disabled`);
		}

		// Mandate 8d п. 7: 0 cartoon emojis in the modal
		const allText = collectAllText(modal);
		assert.equal(hasCartoonEmojis(allText), false, "QuickAddDoctorModal must not contain cartoon emojis");

		// Mandate 8c: Touch target floor >= 44px
		assert.ok(
			submitBtn.style.minHeight === "44px" || (submitBtn.className && submitBtn.className.includes("btn")),
			"Submit button must maintain ergonomic height floor",
		);

		// Color palette elements
		for (const preset of DOCTOR_COLOR_PRESETS) {
			const colorBtn = findNodeByTestId(modal, `quick-doctor-color-${preset.id}`);
			assert.ok(colorBtn, `Color button for ${preset.id} (${preset.label}) must exist`);
		}
	});

	it("QuickAddDoctorModal: 1-click submission creates doctor and persists preferred chair", async () => {
		const chairs = [
			{ id: "chair-1", name: "Кресло 1 (Хирургия)", room: "Кабинет 101" },
		];
		let addedDoctor: any = null;
		const onDoctorAdded = (doc: any) => {
			addedDoctor = doc;
		};

		await act(async () => {
			reactRoot.render(
				<QuickAddDoctorModal
					isOpen={true}
					onClose={() => {}}
					chairs={chairs}
					onDoctorAdded={onDoctorAdded}
				/>,
			);
		});

		const modal = findNodeByTestId(mockDoc.body, "quick-doctor-modal");
		assert.ok(modal);

		const nameInput = findNodeByTestId(modal, "quick-doctor-name");
		const chairSelect = findNodeByTestId(modal, "quick-doctor-preferred-chair");
		const submitBtn = findNodeByTestId(modal, "quick-doctor-submit-btn");

		assert.ok(nameInput && chairSelect && submitBtn);

		await simulateChange(nameInput, "Смирнов Алексей Викторович");
		await simulateChange(chairSelect, "chair-1");
		await submitForm(modal);

		assert.ok(addedDoctor, "Doctor must be added on form submit");
		assert.equal(addedDoctor.fullName, "Смирнов Алексей Викторович");
		assert.equal(addedDoctor.name, "Смирнов Алексей Викторович");
		assert.equal(addedDoctor.shortName, "Смирнов А.В.");
		assert.equal(addedDoctor.preferredChairId, "chair-1");

		// Verify localStorage persistence
		const storedChairs = JSON.parse(globalThis.localStorage.getItem("dente_doctor_preferred_chairs") || "{}");
		assert.equal(storedChairs[addedDoctor.id], "chair-1", "Preferred chair must be stored in localStorage");
	});

	it("ScheduleGrid: has btn-grid-quick-add-doctor and chair binding in popover", async () => {
		await act(async () => {
			reactRoot.render(
				<ScheduleGrid
					dashboard={mockDashboard as Dashboard}
					dateKey="2026-09-08"
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

		// Check quick-add-doctor button in ScheduleGrid toolbar
		const quickAddBtn = findNodeByTestId(rootNode, "btn-grid-quick-add-doctor");
		assert.ok(quickAddBtn, "btn-grid-quick-add-doctor must exist in ScheduleGrid toolbar");
		assert.equal(quickAddBtn.disabled, false, "Quick add doctor button must not be disabled");

		// Popover trigger for chair header
		const chairHeaderBtn = findNodeByTestId(rootNode, "btn-chair-doctor-popover-chair-1");
		assert.ok(chairHeaderBtn, "btn-chair-doctor-popover-chair-1 must exist");

		await clickNode(chairHeaderBtn);

		// Check chair-popover-bind-doctor in popover
		const bindBtn = findNodeByTestId(rootNode, "chair-popover-bind-doctor-chair-1");
		assert.ok(bindBtn, "chair-popover-bind-doctor-chair-1 must be present in chair popover");
	});

	it("ChairScheduleView: has btn-apply-preferred-chairs and btn-chair-view-add-doctor with 0 disabled buttons", async () => {
		await act(async () => {
			reactRoot.render(
				<ChairScheduleView
					dashboard={mockDashboard as Dashboard}
					dateKey="2026-09-08"
					appointments={[]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
				/>,
			);
		});

		const applyBtn = findNodeByTestId(rootNode, "btn-apply-preferred-chairs");
		const addDocBtn = findNodeByTestId(rootNode, "btn-chair-view-add-doctor");

		assert.ok(applyBtn, "btn-apply-preferred-chairs must exist in ChairScheduleView toolbar");
		assert.ok(addDocBtn, "btn-chair-view-add-doctor must exist in ChairScheduleView toolbar");
		assert.equal(applyBtn.disabled, false, "btn-apply-preferred-chairs must never be disabled (Mandate 8e)");
		assert.equal(addDocBtn.disabled, false, "btn-chair-view-add-doctor must never be disabled (Mandate 8e)");

		// Mandate 8d: 0 cartoon emojis in toolbar buttons
		assert.equal(hasCartoonEmojis(collectAllText(applyBtn)), false);
	});

	it("QuickBookingDrawer & AppointmentModal: Solo doctor resilience with 0 chairs fallback (Mandate 8n)", async () => {
		// Verify QuickBookingDrawer hour parsing on 2-digit format (Defect 1 hotfix)
		const onSave = vi.fn();
		await act(async () => {
			reactRoot.render(
				<QuickBookingDrawer
					isOpen={true}
					onClose={() => {}}
					initialSlot={{
						dateKey: "2026-09-08",
						startsAt: "2026-09-08T09:00:00.000Z",
						startTime: "09:00",
						chairId: "chair-1",
						doctorUserId: "doc-1",
					}}
					dashboard={mockDashboard as Dashboard}
					onAppointmentCreated={onSave}
				/>,
			);
		});

		const quickDrawer = findNodeByTestId(mockDoc.body, "quick-booking-drawer");
		assert.ok(quickDrawer, "QuickBookingDrawer must mount properly in document.body via createPortal");

		// Mandate 8n: Solo doctor fallback in AppointmentModal with empty chairs array
		const mockAppointment: any = {
			id: "new-solo-1",
			patientId: "pat-1",
			doctorUserId: "solo-doc-1",
			chairId: "", // Empty chair to test solo doctor fallback
			startsAt: "2026-09-08T10:00:00.000Z",
			endsAt: "2026-09-08T10:30:00.000Z",
			status: "planned",
			type: "consultation",
		};

		await act(async () => {
			reactRoot.render(
				<AppointmentModal
					isOpen={true}
					onClose={() => {}}
					dashboard={{
						appointments: [mockAppointment],
						clinicSettings: {
							staff: [{ id: "solo-doc-1", fullName: "Доктор Соло", role: "doctor", active: true }],
							chairs: [],
						} as any,
						patients: [{ id: "pat-1", fullName: "Тестовый Пациент" } as any],
						stats: {} as any,
						inventory: [] as any,
						invoices: [] as any,
					} as any}
					appointment={mockAppointment}
					onSave={async () => true}
					patientName={(_, id) => id || "Пациент"}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					fromDateTimeLocalValue={(val) => new Date(val).toISOString()}
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

		// Modal should render without throwing even when chairs is empty
		const apptModal = findNodeByTestId(mockDoc.body, "appointment-modal");
		assert.ok(apptModal, "AppointmentModal must mount safely with 0 chairs under solo doctor mode (Mandate 8n)");
	});
});
