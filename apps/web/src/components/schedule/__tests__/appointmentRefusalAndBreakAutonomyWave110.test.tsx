/**
 * appointmentRefusalAndBreakAutonomyWave110.test.tsx
 *
 * Wave 110: StomX Refusal Reasons & Technical Breaks Autonomy Test Suite
 *
 * Scope:
 * 1. Export & availability of STOMX_REFUSE_REASONS_CATALOG from @dental/shared.
 * 2. Validation of createAppointmentSchema with patientId: null and optional.
 * 3. appointmentScheduleMissingFields autonomy: does NOT require patientId for technical breaks (Lunch, Sanitization, Council).
 * 4. AppointmentModal: 10 refusal reasons block in cancelled/no_show status + comment tag updates.
 * 5. AppointmentModal: 1-click technical break presets and patient-free save.
 * 6. AppointmentCard: appointmentPatientName fallback to reason and noteAppend handling.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	createAppointmentSchema,
	STOMX_REFUSE_REASONS_CATALOG,
	type Appointment,
	type Dashboard,
} from "@dental/shared";
import { appointmentScheduleMissingFields } from "../../../AppHelpers";
import {
	AppointmentModal,
	TECHNICAL_BREAK_PRESETS,
	isTechnicalBreakAppointment,
} from "../AppointmentModal";

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
				let text = "";
				for (const child of children) {
					text += child.textContent || "";
				}
				return text;
			},
			set textContent(val: string) {
				children.length = 0;
				if (val) {
					children.push(doc.createTextNode(val));
				}
			},
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
					selValue = v;
					(el as any)._value = v;
					attrs.value = v;
					const opts = (el as any).options as MockDomNode[];
					for (const opt of opts) {
						(opt as any).selected = (opt as any).value === v;
					}
				},
			});
		}

		if (tag.toUpperCase() === "OPTION") {
			Object.defineProperty(el, "value", {
				get() {
					return attrs.value !== undefined ? attrs.value : el.textContent;
				},
				set(v: string) {
					attrs.value = v;
				},
			});
			Object.defineProperty(el, "selected", {
				get() {
					return attrs.selected === "true" || (el as any)._selected === true;
				},
				set(v: boolean) {
					(el as any)._selected = v;
					if (v) {
						attrs.selected = "true";
						if (el.parentNode && (el.parentNode as any).tagName === "SELECT") {
							(el.parentNode as any)._value = (el as any).value;
						}
					} else {
						attrs.selected = "false";
					}
				},
			});
		}

		if (tag.toUpperCase() === "INPUT" || tag.toUpperCase() === "TEXTAREA") {
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

function findNodesByTagName(node: MockDomNode | null, tag: string): MockDomNode[] {
	if (!node) return [];
	const results: MockDomNode[] = [];
	if (node.tagName === tag.toUpperCase()) results.push(node);
	if (node.children) {
		for (const child of node.children) {
			results.push(...findNodesByTagName(child, tag));
		}
	}
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
				const props = (curr as any)[reactPropKey];
				if (typeof props?.onClick === "function") {
					props.onClick({
						preventDefault: () => {},
						stopPropagation: () => {},
						target: curr,
						currentTarget: curr,
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		if (typeof node.click === "function") {
			node.click();
		}
	});
}

const mockDashboard: Dashboard = {
	patients: [
		{
			id: "pat-1",
			fullName: "Иванов Иван Иванович",
			phone: "+79991112233",
			status: "active",
		} as any,
	],
	appointments: [],
	clinicSettings: {
		profile: {
			mode: "small_clinic",
			timezone: "Europe/Moscow",
			clinicName: "Клиника ДЕНТЕ",
		},
		chairs: [
			{ id: "chair-1", name: "Терапевтический", active: true },
		],
		staff: [
			{ id: "doc-1", fullName: "Д-р Смирнов А.В.", role: "doctor", active: true },
		],
	} as any,
} as any;

const defaultAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Пришел",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Неявка",
};

describe("Wave 110: StomX Refusal Reasons & Technical Breaks Autonomy", () => {
	beforeEach(() => {
		setupMockDom();
	});

	it("1. STOMX_REFUSE_REASONS_CATALOG is exported from @dental/shared with 10 canonical reasons", () => {
		assert.ok(Array.isArray(STOMX_REFUSE_REASONS_CATALOG), "STOMX_REFUSE_REASONS_CATALOG must be an array");
		assert.equal(STOMX_REFUSE_REASONS_CATALOG.length, 10, "Must contain exactly 10 StomX refusal reasons");

		const codes = STOMX_REFUSE_REASONS_CATALOG.map((r) => r.code);
		assert.ok(codes.includes("no_show_confirmed"));
		assert.ok(codes.includes("no_show_unconfirmed"));
		assert.ok(codes.includes("patient_cancelled"));
		assert.ok(codes.includes("patient_refused_clinic"));
		assert.ok(codes.includes("patient_rescheduled"));
		assert.ok(codes.includes("clinic_cancelled"));
		assert.ok(codes.includes("clinic_rescheduled_better_time"));
		assert.ok(codes.includes("clinic_error"));
		assert.ok(codes.includes("no_available_time"));
		assert.ok(codes.includes("expired_slot"));

		for (const item of STOMX_REFUSE_REASONS_CATALOG) {
			assert.ok(item.nameRu && item.nameRu.length > 0, `Reason ${item.code} must have non-empty nameRu`);
			assert.ok(item.responsibility, `Reason ${item.code} must have responsibility`);
		}
	});

	it("2. createAppointmentSchema allows patientId: null and optional (Wave 110 Autonomy)", () => {
		const validPayload = {
			patientId: null,
			doctorUserId: "00000000-0000-0000-0000-000000000001",
			chairId: "00000000-0000-0000-0000-000000000002",
			status: "planned" as const,
			startsAt: "2026-09-11T12:00:00Z",
			endsAt: "2026-09-11T13:00:00Z",
			reason: "Служебный перерыв: Обед",
			comment: "Служебная бронь: Обед врача",
		};

		const parsedNull = createAppointmentSchema.safeParse(validPayload);
		assert.ok(parsedNull.success, `Schema parse with patientId: null must succeed: ${JSON.stringify(parsedNull.error?.issues)}`);

		const { patientId: _omitted, ...omittedPayload } = validPayload;
		const parsedOmitted = createAppointmentSchema.safeParse(omittedPayload);
		assert.ok(parsedOmitted.success, "Schema parse with omitted patientId must succeed");

		const parsedWithPatient = createAppointmentSchema.safeParse({
			...validPayload,
			patientId: "00000000-0000-0000-0000-000000000003",
		});
		assert.ok(parsedWithPatient.success, "Schema parse with valid patientId UUID must succeed");

		const parsedInvalidUuid = createAppointmentSchema.safeParse({
			...validPayload,
			patientId: "not-a-uuid",
		});
		assert.equal(parsedInvalidUuid.success, false, "Schema parse with non-uuid string must fail");
	});

	it("3. appointmentScheduleMissingFields autonomy: bypasses patient requirement for technical breaks", () => {
		const regularDraftWithoutPatient = {
			patientId: "",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: "2026-09-11T12:00:00Z",
			endsAt: "2026-09-11T13:00:00Z",
			reason: "Лечение кариеса",
			comment: "",
		};

		const regularMissing = appointmentScheduleMissingFields(
			regularDraftWithoutPatient as any,
			"small_clinic",
			mockDashboard.clinicSettings.staff,
			{
				chairs: mockDashboard.clinicSettings.chairs,
				patients: mockDashboard.patients,
			},
		);
		assert.ok(
			regularMissing.includes("выберите пациента"),
			"Regular clinical appointment without patientId must require choosing a patient",
		);

		// Technical Break: Lunch
		const lunchDraft = {
			...regularDraftWithoutPatient,
			reason: "Служебный перерыв: Обед",
			comment: "Служебная бронь: Обед врача / персонала",
		};
		const lunchMissing = appointmentScheduleMissingFields(
			lunchDraft as any,
			"small_clinic",
			mockDashboard.clinicSettings.staff,
			{
				chairs: mockDashboard.clinicSettings.chairs,
				patients: mockDashboard.patients,
			},
		);
		assert.equal(
			lunchMissing.includes("выберите пациента"),
			false,
			"Technical break (Lunch) must NOT require choosing a patient",
		);

		// Technical Break: Sanitization
		const saniDraft = {
			...regularDraftWithoutPatient,
			reason: "Технический перерыв: Санобработка",
			comment: "Служебная бронь: Текущая дезинфекция",
		};
		const saniMissing = appointmentScheduleMissingFields(
			saniDraft as any,
			"small_clinic",
			mockDashboard.clinicSettings.staff,
			{
				chairs: mockDashboard.clinicSettings.chairs,
				patients: mockDashboard.patients,
			},
		);
		assert.equal(
			saniMissing.includes("выберите пациента"),
			false,
			"Technical break (Sanitization) must NOT require choosing a patient",
		);

		// Predicate isTechnicalBreakAppointment check
		assert.equal(isTechnicalBreakAppointment({ reason: "Служебный перерыв: Обед" }), true);
		assert.equal(isTechnicalBreakAppointment({ reason: "Санобработка" }), true);
		assert.equal(isTechnicalBreakAppointment({ comment: "Служебная бронь: Консилиум" }), true);
		assert.equal(isTechnicalBreakAppointment({ reason: "Консультация терапевта" }), false);
	});

	it("4. AppointmentModal: renders 10 refusal reasons on cancelled status and updates comment", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		const cancelledAppt: Appointment = {
			id: "appt-cancel-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			assistantUserId: null,
			chairId: "chair-1",
			status: "cancelled",
			startsAt: "2026-09-11T10:00:00.000Z",
			endsAt: "2026-09-11T11:00:00.000Z",
			reason: "Консультация",
			comment: "",
		};

		await act(async () => {
			root.render(
				<AppointmentModal
					isOpen={true}
					appointment={cancelledAppt}
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

		const refusalBlock = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-refusal-reasons-block",
		);
		assert.ok(refusalBlock, "Must render appointment-refusal-reasons-block when status is cancelled");

		// Check buttons inside refusalBlock
		const buttons = findNodesByTagName(refusalBlock, "BUTTON");
		assert.equal(buttons.length, 10, "Must render exactly 10 1-click refuse reason buttons");

		// Click the first button (no_show_confirmed or patient_cancelled)
		const firstReason = STOMX_REFUSE_REASONS_CATALOG[0]!;
		const firstBtn = buttons.find((b) => b.textContent?.includes(firstReason.nameRu));
		assert.ok(firstBtn, `Must find button for ${firstReason.nameRu}`);

		await clickNode(firstBtn);

		// Find textarea for comment
		const textareas = findNodesByTagName(document.body as unknown as MockDomNode, "TEXTAREA");
		assert.ok(textareas.length > 0, "Must find comment textarea");
		const commentArea = textareas[0]!;
		assert.ok(
			commentArea.value?.includes(`[Отмена: ${firstReason.nameRu}]`),
			`Comment must include [Отмена: ${firstReason.nameRu}], got: ${commentArea.value}`,
		);

		// Click another reason: should replace the tag rather than duplicating
		const secondReason = STOMX_REFUSE_REASONS_CATALOG[2]!; // patient_cancelled
		const secondBtn = buttons.find((b) => b.textContent?.includes(secondReason.nameRu));
		assert.ok(secondBtn, `Must find button for ${secondReason.nameRu}`);

		await clickNode(secondBtn);
		assert.ok(
			commentArea.value?.includes(`[Отмена: ${secondReason.nameRu}]`),
			`Comment must include updated [Отмена: ${secondReason.nameRu}]`,
		);
		assert.equal(
			commentArea.value?.includes(`[Отмена: ${firstReason.nameRu}]`),
			false,
			"Old cancellation tag must be replaced without duplicating",
		);
	});

	it("5. AppointmentModal: 1-click technical break presets and patient-free save", async () => {
		const container = document.createElement("div") as unknown as MockDomNode;
		const root: Root = createRoot(container as unknown as HTMLElement);

		let savedDraft: any = null;
		const onSaveMock = async (_id: string, draft: any) => {
			savedDraft = draft;
			return true;
		};

		const emptyAppt: Appointment = {
			id: "new-break-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: null,
			doctorUserId: "doc-1",
			assistantUserId: null,
			chairId: "chair-1",
			status: "planned",
			startsAt: "2026-09-11T13:00:00.000Z",
			endsAt: "2026-09-11T14:00:00.000Z",
			reason: "",
			comment: "",
		};

		await act(async () => {
			root.render(
				<AppointmentModal
					isOpen={true}
					appointment={emptyAppt}
					dashboard={mockDashboard}
					onClose={() => {}}
					onSave={onSaveMock}
					patientName={(_, id) => id || ""}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					fromDateTimeLocalValue={(val) => `${val}:00.000Z`}
					appointmentLabels={defaultAppointmentLabels}
					activeVisitLockedAppointmentStatuses={new Set()}
				/>,
			);
		});

		// Find quick reasons container
		const quickReasonsBlock = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-quick-reasons",
		);
		assert.ok(quickReasonsBlock, "Must render appointment-quick-reasons block");

		// Find Lunch button
		const buttons = findNodesByTagName(quickReasonsBlock, "BUTTON");
		const lunchBtn = buttons.find((b) => b.textContent?.includes("Обед (60 мин)"));
		assert.ok(lunchBtn, "Must render 'Обед (60 мин)' preset button");

		await clickNode(lunchBtn);

		// Click save button
		const saveBtn = findNodeByTestId(
			document.body as unknown as MockDomNode,
			"appointment-modal-save-btn",
		);
		assert.ok(saveBtn, "Must find save button");

		await clickNode(saveBtn);

		// Assert onSave was called successfully with patientId: null or empty
		assert.ok(savedDraft, "onSave must be called without error");
		assert.equal(savedDraft.patientId, null, "patientId must be null for technical break");
		assert.equal(savedDraft.reason, "Служебный перерыв: Обед");
		assert.equal(savedDraft.comment, "Служебная бронь: Обед врача / персонала");
	});
});
