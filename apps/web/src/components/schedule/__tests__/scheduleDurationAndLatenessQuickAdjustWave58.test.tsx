/**
 * scheduleDurationAndLatenessQuickAdjustWave58.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 247 (Wave 58):
 * «расписание_прием::1_клик_быстрое_изменение_длительности_сдвиг_при_опоздании_и_возврат_в_лист_ожидания»
 * (StomX / DentalPRO / IDENT Parity)
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Mandate 8c: Dominant Workspace & touch targets floor (>= 44x44px in menus and drawers).
 * - Mandate 8d п. 7: 0 cartoon emojis (Lucide vector icons only).
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, soft overbooking, non-blocking defaults).
 * - Mandate 8k: CRM != Reality Simulator (friction-killer law: 1-click duration adjust without opening heavy modal).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Dashboard, Appointment } from "@dental/shared";

import { ScheduleGrid, DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";
import { ChairScheduleView } from "../ChairScheduleView";

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
let lastCopiedText = "";

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
			options: [],
			selectedIndex: 0,
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
			for (const fn of list) fn(ev as unknown as Event);
			return true;
		},
		setTimeout,
		clearTimeout,
		setInterval,
		clearInterval,
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

	// Clipboard mock
	lastCopiedText = "";
	try {
		Object.defineProperty(globalThis.navigator, "clipboard", {
			value: {
				writeText: async (text: string) => {
					lastCopiedText = text;
					return Promise.resolve();
				},
			},
			configurable: true,
			writable: true,
		});
	} catch {
		(globalThis as any).navigator = {
			clipboard: {
				writeText: async (text: string) => {
					lastCopiedText = text;
					return Promise.resolve();
				},
			},
		};
	}

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

async function mouseEnterNode(node: MockDomNode | null) {
	if (!node) return;
	await act(async () => {
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onMouseEnter === "function") {
					await props.onMouseEnter({
						type: "mouseenter",
						preventDefault: () => {},
						stopPropagation: () => {},
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
		node.dispatchEvent({ type: "mouseenter" });
	});
}

const mockAppointmentLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Прибыл",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

const baseSampleAppointment: Appointment = {
	id: "appt-wave58-1",
	patientId: "pat-1",
	doctorUserId: "doc-1",
	chairId: "chair-1",
	startsAt: "2026-09-09T09:00:00.000Z",
	endsAt: "2026-09-09T09:30:00.000Z", // 30 mins
	organizationId: "clinic-test",
	status: "planned",
	reason: "Лечение кариеса 16",
	comment: "Пациент просил без укола",
};

const mockDashboard: any = {
	stats: {},
	todayAppointments: [],
	patients: [
		{
			id: "pat-1",
			fullName: "Кузнецов Алексей Сергеевич",
			phone: "+7 (999) 111-22-33",
			balance: 0,
		},
	],
	clinicSettings: {
		clinicName: "Стоматология DENTE",
		profile: {
			organizationId: "clinic-test",
			clinicName: "Стоматология DENTE",
			timezone: "Europe/Moscow",
			address: "г. Москва, ул. Клиническая 10",
			phone: "+7 (495) 123-45-67",
		},
		chairs: [
			{ id: "chair-1", name: "Кресло 1 (Терапия)", active: true, color: "#0d9488" },
		],
		staff: [
			{ id: "doc-1", fullName: "Иванов Иван Иванович", role: "doctor", active: true },
		],
	},
};

describe("Wave 58 (Feature 247) — Quick Adjust Duration, Lateness Shift & Free Slot to Waitlist", () => {
	let rootNode: MockDomNode;
	let reactRoot: Root;

	beforeEach(() => {
		const { doc } = setupMockDom();
		rootNode = doc.createElement("div");
		doc.body.appendChild(rootNode);
		reactRoot = createRoot(rootNode as unknown as HTMLElement);
	});

	it("1-click +15 and +30 min duration adjustment in context menu invokes onAppointmentMove with updated endsAt", async () => {
		const onAppointmentMove = vi.fn();
		const onQuickStatusChange = vi.fn();

		await act(async () => {
			reactRoot.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[baseSampleAppointment]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAppointmentMove={onAppointmentMove}
					onQuickStatusChange={onQuickStatusChange}
					patientName={(_p, id) => (id === "pat-1" ? "Кузнецов А.С." : "Пациент")}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={mockAppointmentLabels}
				/>,
			);
		});

		// 1. Open context menu
		const menuBtn = findNodeByTestId(mockDoc.body, `menu-btn-${baseSampleAppointment.id}`) ||
			findAllNodesByTag(mockDoc.body, "button").find((b) => b.getAttribute("aria-label") === "Дополнительные действия визита");
		assert.ok(menuBtn, "More actions button (...) must exist");

		await clickNode(menuBtn);

		// 2. Check duration buttons exist in menu
		const plus15Btn = findNodeByTestId(mockDoc.body, `menu-duration-plus-15-${baseSampleAppointment.id}`);
		const plus30Btn = findNodeByTestId(mockDoc.body, `menu-duration-plus-30-${baseSampleAppointment.id}`);
		const minus15Btn = findNodeByTestId(mockDoc.body, `menu-duration-minus-15-${baseSampleAppointment.id}`);
		const shiftLateBtn = findNodeByTestId(mockDoc.body, `menu-shift-late-15-${baseSampleAppointment.id}`);
		const freeSlotBtn = findNodeByTestId(mockDoc.body, `menu-free-slot-waitlist-${baseSampleAppointment.id}`);

		assert.ok(plus15Btn, "menu-duration-plus-15 button must exist in context menu");
		assert.ok(plus30Btn, "menu-duration-plus-30 button must exist in context menu");
		assert.ok(minus15Btn, "menu-duration-minus-15 button must exist in context menu");
		assert.ok(shiftLateBtn, "menu-shift-late-15 button must exist in context menu");
		assert.ok(freeSlotBtn, "menu-free-slot-waitlist button must exist in context menu");

		// 3. Test +15 min click
		await clickNode(plus15Btn);
		assert.equal(onAppointmentMove.calls.length, 1, "onAppointmentMove should be called once for +15 min");
		const [apptId1, updates1] = (onAppointmentMove.calls[0] ?? []) as [string, any];
		assert.equal(apptId1, baseSampleAppointment.id);
		assert.equal(updates1?.endsAt, "2026-09-09T09:45:00.000Z", "+15 min should change endsAt from 09:30 to 09:45");
		assert.equal(updates1?.allowOverbooking, true, "allowOverbooking must be true per Mandate 8e");

		// 4. Test +30 min click (re-open menu)
		await clickNode(menuBtn);
		const plus30BtnReopened = findNodeByTestId(mockDoc.body, `menu-duration-plus-30-${baseSampleAppointment.id}`);
		assert.ok(plus30BtnReopened);
		await clickNode(plus30BtnReopened);
		assert.equal(onAppointmentMove.calls.length, 2, "onAppointmentMove should be called for +30 min");
		const [apptId2, updates2] = (onAppointmentMove.calls[1] ?? []) as [string, any];
		assert.equal(apptId2, baseSampleAppointment.id);
		assert.equal(updates2?.endsAt, "2026-09-09T10:00:00.000Z", "+30 min should change endsAt from 09:30 to 10:00");
	});

	it("1-click -15 min duration reduction with protection against shrinking below 15 minutes", async () => {
		const onAppointmentMove = vi.fn();

		// Case A: 30 min appointment reduced to 15 min succeeds
		await act(async () => {
			reactRoot.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[baseSampleAppointment]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAppointmentMove={onAppointmentMove}
					patientName={() => "Кузнецов А.С."}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={mockAppointmentLabels}
				/>,
			);
		});

		const menuBtn = findAllNodesByTag(mockDoc.body, "button").find(
			(b) => b.getAttribute("aria-label") === "Дополнительные действия визита",
		);
		assert.ok(menuBtn);
		await clickNode(menuBtn);

		const minus15Btn = findNodeByTestId(mockDoc.body, `menu-duration-minus-15-${baseSampleAppointment.id}`);
		assert.ok(minus15Btn);
		await clickNode(minus15Btn);

		assert.equal(onAppointmentMove.calls.length, 1);
		const [, updates] = (onAppointmentMove.calls[0] ?? []) as [string, any];
		assert.equal(updates?.endsAt, "2026-09-09T09:15:00.000Z", "-15 min should reduce 30 min appointment to 15 min");

		// Case B: Appointment already at 15 min duration — reduction blocked by protection
		const fifteenMinAppt: Appointment = {
			...baseSampleAppointment,
			id: "appt-15min",
			startsAt: "2026-09-09T09:00:00.000Z",
			endsAt: "2026-09-09T09:15:00.000Z",
		};

		const moveCallsBefore = onAppointmentMove.calls.length;

		await act(async () => {
			reactRoot.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[fifteenMinAppt]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAppointmentMove={onAppointmentMove}
					patientName={() => "Кузнецов А.С."}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={mockAppointmentLabels}
				/>,
			);
		});

		const menuBtn15 = findAllNodesByTag(mockDoc.body, "button").find(
			(b) => b.getAttribute("aria-label") === "Дополнительные действия визита",
		);
		assert.ok(menuBtn15);
		await clickNode(menuBtn15);

		const minusBtn15 = findNodeByTestId(mockDoc.body, `menu-duration-minus-15-${fifteenMinAppt.id}`);
		assert.ok(minusBtn15);
		await clickNode(minusBtn15);

		assert.equal(
			onAppointmentMove.calls.length,
			moveCallsBefore,
			"15-minute appointment must NOT be shrunk further below 15 mins (protection check)",
		);
	});

	it("1-click shift lateness +15 min shifts both startsAt and endsAt and prepares SMS / WhatsApp notification", async () => {
		const onAppointmentMove = vi.fn();

		await act(async () => {
			reactRoot.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[baseSampleAppointment]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAppointmentMove={onAppointmentMove}
					patientName={() => "Кузнецов А.С."}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={mockAppointmentLabels}
				/>,
			);
		});

		const menuBtn = findAllNodesByTag(mockDoc.body, "button").find(
			(b) => b.getAttribute("aria-label") === "Дополнительные действия визита",
		);
		assert.ok(menuBtn);
		await clickNode(menuBtn);

		const shiftBtn = findNodeByTestId(mockDoc.body, `menu-shift-late-15-${baseSampleAppointment.id}`);
		assert.ok(shiftBtn);
		await clickNode(shiftBtn);

		assert.equal(onAppointmentMove.calls.length, 1);
		const [apptId, updates] = (onAppointmentMove.calls[0] ?? []) as [string, any];
		assert.equal(apptId, baseSampleAppointment.id);
		assert.equal(updates?.startsAt, "2026-09-09T09:15:00.000Z", "startsAt must be shifted by +15 min (09:00 -> 09:15)");
		assert.equal(updates?.endsAt, "2026-09-09T09:45:00.000Z", "endsAt must be shifted by +15 min (09:30 -> 09:45)");
		assert.equal(updates?.allowOverbooking, true, "allowOverbooking must be true per Mandate 8e");

		// Check clipboard notification text
		assert.ok(lastCopiedText.includes("Кузнецов А.С."), "Notification must address the patient");
		assert.ok(lastCopiedText.includes("перенесен на 09:15"), "Notification must mention new start time 09:15");
	});

	it("Action «Освободить слот -> в лист ожидания» cancels appointment via onQuickStatusChange", async () => {
		const onQuickStatusChange = vi.fn();

		await act(async () => {
			reactRoot.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[baseSampleAppointment]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onQuickStatusChange={onQuickStatusChange}
					patientName={() => "Кузнецов А.С."}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={mockAppointmentLabels}
				/>,
			);
		});

		const menuBtn = findAllNodesByTag(mockDoc.body, "button").find(
			(b) => b.getAttribute("aria-label") === "Дополнительные действия визита",
		);
		assert.ok(menuBtn);
		await clickNode(menuBtn);

		const freeSlotBtn = findNodeByTestId(mockDoc.body, `menu-free-slot-waitlist-${baseSampleAppointment.id}`);
		assert.ok(freeSlotBtn);
		await clickNode(freeSlotBtn);

		assert.equal(onQuickStatusChange.calls.length, 1, "onQuickStatusChange must be called once");
		assert.equal(onQuickStatusChange.calls[0]?.[0], baseSampleAppointment.id);
		assert.equal(onQuickStatusChange.calls[0]?.[1], "cancelled", "Status must be set to cancelled");
	});

	it("Hover HUD renders fast buttons: +15, +30, -15, and shift lateness +15 min", async () => {
		const onAppointmentMove = vi.fn();

		await act(async () => {
			reactRoot.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[baseSampleAppointment]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAppointmentMove={onAppointmentMove}
					patientName={() => "Кузнецов А.С."}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={mockAppointmentLabels}
				/>,
			);
		});

		// Trigger mouse enter on appointment container
		const apptCard = findNodeByTestId(mockDoc.body, `appointment-card-${baseSampleAppointment.id}`);
		assert.ok(apptCard, "Appointment card element must exist");

		await mouseEnterNode(apptCard);
		// Wait for 150ms hover delay
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 250));
		});

		const hoverPlus15 = findNodeByTestId(mockDoc.body, `hover-duration-plus-15-${baseSampleAppointment.id}`);
		const hoverPlus30 = findNodeByTestId(mockDoc.body, `hover-duration-plus-30-${baseSampleAppointment.id}`);
		const hoverMinus15 = findNodeByTestId(mockDoc.body, `hover-duration-minus-15-${baseSampleAppointment.id}`);
		const hoverShiftLate = findNodeByTestId(mockDoc.body, `hover-shift-late-15-${baseSampleAppointment.id}`);

		assert.ok(hoverPlus15, "hover-duration-plus-15 button must exist in Hover HUD");
		assert.ok(hoverPlus30, "hover-duration-plus-30 button must exist in Hover HUD");
		assert.ok(hoverMinus15, "hover-duration-minus-15 button must exist in Hover HUD");
		assert.ok(hoverShiftLate, "hover-shift-late-15 button must exist in Hover HUD");

		// Click hover +15 min
		await clickNode(hoverPlus15);
		assert.equal(onAppointmentMove.calls.length, 1);
		assert.equal(onAppointmentMove.calls[0]?.[1]?.endsAt, "2026-09-09T09:45:00.000Z");

		// Click hover shift late +15 min
		await clickNode(hoverShiftLate);
		assert.equal(onAppointmentMove.calls.length, 2);
		assert.equal(onAppointmentMove.calls[1]?.[1]?.startsAt, "2026-09-09T09:15:00.000Z");
		assert.equal(onAppointmentMove.calls[1]?.[1]?.endsAt, "2026-09-09T09:45:00.000Z");
	});

	it("Mobile drawer renders quick duration (+15, +30, -15), shift lateness, and waitlist buttons with >=44px touch targets", async () => {
		const onAppointmentMove = vi.fn();
		const onQuickStatusChange = vi.fn();

		(globalThis as any).window.innerWidth = 400; // Mobile viewport

		await act(async () => {
			reactRoot.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[baseSampleAppointment]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAppointmentMove={onAppointmentMove}
					onQuickStatusChange={onQuickStatusChange}
					patientName={() => "Кузнецов А.С."}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={mockAppointmentLabels}
				/>,
			);
		});

		// Find appointment clickable card in grid
		const innerClickable = findNodeByTestId(mockDoc.body, `appointment-card-clickable-${baseSampleAppointment.id}`);
		assert.ok(innerClickable, "Inner clickable element in card must exist");
		await clickNode(innerClickable);

		const mobilePlus15 = findNodeByTestId(mockDoc.body, `mobile-duration-plus-15-${baseSampleAppointment.id}`);
		const mobilePlus30 = findNodeByTestId(mockDoc.body, `mobile-duration-plus-30-${baseSampleAppointment.id}`);
		const mobileMinus15 = findNodeByTestId(mockDoc.body, `mobile-duration-minus-15-${baseSampleAppointment.id}`);
		const mobileShiftLate = findNodeByTestId(mockDoc.body, `mobile-shift-late-15-${baseSampleAppointment.id}`);
		const mobileWaitlist = findNodeByTestId(mockDoc.body, `mobile-free-slot-waitlist-${baseSampleAppointment.id}`);

		assert.ok(mobilePlus15, "mobile-duration-plus-15 must exist in mobile drawer");
		assert.ok(mobilePlus30, "mobile-duration-plus-30 must exist in mobile drawer");
		assert.ok(mobileMinus15, "mobile-duration-minus-15 must exist in mobile drawer");
		assert.ok(mobileShiftLate, "mobile-shift-late-15 must exist in mobile drawer");
		assert.ok(mobileWaitlist, "mobile-free-slot-waitlist must exist in mobile drawer");

		// Touch targets >= 44px
		assert.ok(mobilePlus15.className?.includes("min-h-[44px]"), "mobilePlus15 touch target >= 44px");
		assert.ok(mobilePlus30.className?.includes("min-h-[44px]"), "mobilePlus30 touch target >= 44px");
		assert.ok(mobileMinus15.className?.includes("min-h-[44px]"), "mobileMinus15 touch target >= 44px");
		assert.ok(mobileShiftLate.className?.includes("min-h-[44px]"), "mobileShiftLate touch target >= 44px");
		assert.ok(mobileWaitlist.className?.includes("min-h-[44px]"), "mobileWaitlist touch target >= 44px");

		// Test clicking in mobile drawer
		await clickNode(mobilePlus15);
		assert.equal(onAppointmentMove.calls.length, 1);
		assert.equal(onAppointmentMove.calls[0]?.[1]?.endsAt, "2026-09-09T09:45:00.000Z");

		await clickNode(mobileWaitlist);
		assert.equal(onQuickStatusChange.calls.length, 1);
		assert.equal(onQuickStatusChange.calls[0]?.[1], "cancelled");
	});

	it("Mandate 8e & 8d: 0 disabled buttons and 0 cartoon emojis in all quick adjust controls", async () => {
		await act(async () => {
			reactRoot.render(
				<ScheduleGrid
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[baseSampleAppointment]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAppointmentMove={() => {}}
					onQuickStatusChange={() => {}}
					patientName={() => "Кузнецов А.С."}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={mockAppointmentLabels}
				/>,
			);
		});

		// Open menu
		const menuBtn = findAllNodesByTag(mockDoc.body, "button").find(
			(b) => b.getAttribute("aria-label") === "Дополнительные действия визита",
		);
		assert.ok(menuBtn);
		await clickNode(menuBtn);

		const allButtons = findAllNodesByTag(mockDoc.body, "button");
		for (const btn of allButtons) {
			assert.equal(btn.disabled, false, `Button ${btn.getAttribute("data-testid") || btn.textContent} must not be disabled (Mandate 8e)`);
		}

		const fullText = collectAllText(mockDoc.body);
		assert.equal(hasCartoonEmojis(fullText), false, "ScheduleGrid must contain 0 cartoon emojis (Mandate 8d п. 7)");
	});

	it("ChairScheduleView passes onAppointmentMove and onQuickStatusChange to ScheduleGrid and functions seamlessly", async () => {
		const onAppointmentMove = vi.fn();
		const onQuickStatusChange = vi.fn();

		await act(async () => {
			reactRoot.render(
				<ChairScheduleView
					dashboard={mockDashboard}
					dateKey="2026-09-09"
					appointments={[baseSampleAppointment]}
					onSlotClick={() => {}}
					onAppointmentClick={() => {}}
					onAppointmentMove={onAppointmentMove}
					onQuickStatusChange={onQuickStatusChange}
					patientName={() => "Кузнецов А.С."}
					formatTime={(iso) => iso.slice(11, 16)}
					toDateTimeLocalValue={(iso) => iso.slice(0, 16)}
					appointmentLabels={mockAppointmentLabels}
				/>,
			);
		});

		const menuBtn = findAllNodesByTag(mockDoc.body, "button").find(
			(b) => b.getAttribute("aria-label") === "Дополнительные действия визита",
		);
		assert.ok(menuBtn, "More actions button must exist inside ChairScheduleView");
		await clickNode(menuBtn);

		const plus15Btn = findNodeByTestId(mockDoc.body, `menu-duration-plus-15-${baseSampleAppointment.id}`);
		assert.ok(plus15Btn, "Duration button must exist inside ChairScheduleView");
		await clickNode(plus15Btn);

		assert.equal(onAppointmentMove.calls.length, 1, "ChairScheduleView must forward onAppointmentMove call");
		assert.equal(onAppointmentMove.calls[0]?.[1]?.endsAt, "2026-09-09T09:45:00.000Z");

		// Test free slot to waitlist via ChairScheduleView
		await clickNode(menuBtn);
		const freeSlotBtn = findNodeByTestId(mockDoc.body, `menu-free-slot-waitlist-${baseSampleAppointment.id}`);
		assert.ok(freeSlotBtn);
		await clickNode(freeSlotBtn);

		assert.equal(onQuickStatusChange.calls.length, 1, "ChairScheduleView must forward onQuickStatusChange call");
		assert.equal(onQuickStatusChange.calls[0]?.[1], "cancelled");
	});
});
