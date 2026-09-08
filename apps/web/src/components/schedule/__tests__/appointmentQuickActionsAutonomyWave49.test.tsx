/**
 * appointmentQuickActionsAutonomyWave49.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 232 (Wave 49):
 * «расписание_действие::разблокировка_действий_связи_в_карточке_приёма_и_неблокирующее_создание_пациента_у_кресла»
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT (cto supremacy, zero mocks, Apple HIG).
 * - Mandate 8c: Dominant Workspace & 44x44px touch targets floor.
 * - Mandate 8d п. 4 & 7: WCAG contrast, 0 cartoon emojis (Lucide icons only).
 * - Mandate 8e п. 2: Doctor & Staff Autonomy (NO disabled buttons due to empty secondary fields).
 * - Mandate 8k: CRM != Reality Simulator (friction-killer law, fast 1-click fallback).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it, beforeEach } from "node:test";
import { fileURLToPath } from "node:url";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { Appointment, Dashboard } from "@dental/shared";

import { AppointmentQuickActions } from "../AppointmentQuickActions";
import { AppointmentModal } from "../AppointmentModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji detector per Mandate 8d п. 7
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

// Mock DOM helper for interactive React tests in Node.js test runner
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
	querySelector: (selector: string) => MockDomNode | null;
	querySelectorAll: (selector: string) => MockDomNode[];
	[key: string]: unknown;
}

let clipboardText = "";
const toastEvents: Array<{ text: string; type: string; duration?: number }> = [];

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
		defaultView: null as any,
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
			focus: () => {
				doc.activeElement = el;
			},
			blur: () => {
				if (doc.activeElement === el) doc.activeElement = null;
			},
			contains: (other: MockDomNode) => {
				let curr: MockDomNode | null = other;
				while (curr) {
					if (curr === el) return true;
					curr = curr.parentNode;
				}
				return false;
			},
			querySelector: (selector: string) => {
				return findBySelector(el, selector);
			},
			querySelectorAll: (selector: string) => {
				const results: MockDomNode[] = [];
				collectBySelector(el, selector, results);
				return results;
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

	function findBySelector(rootNode: MockDomNode, selector: string): MockDomNode | null {
		const testIdMatch = selector.match(/\[data-testid="([^"]+)"\]/);
		if (testIdMatch) {
			const targetId = testIdMatch[1];
			return findNodeByTestId(rootNode, targetId!);
		}
		for (const child of rootNode.children) {
			const found = findBySelector(child, selector);
			if (found) return found;
		}
		return null;
	}

	function collectBySelector(rootNode: MockDomNode, selector: string, acc: MockDomNode[]) {
		const testIdMatch = selector.match(/\[data-testid="([^"]+)"\]/);
		if (testIdMatch) {
			const targetId = testIdMatch[1];
			if (rootNode.getAttribute("data-testid") === targetId) {
				acc.push(rootNode);
			}
		}
		for (const child of rootNode.children) {
			collectBySelector(child, selector, acc);
		}
	}

	doc.createElement = createMockElement;
	doc.createElementNS = (_ns: string, tag: string) => createMockElement(tag);
	doc.documentElement = createMockElement("html");
	doc.body = createMockElement("body");
	doc.documentElement.appendChild(doc.body);
	doc.querySelector = (selector: string) => findBySelector(doc.body, selector);

	// Polyfill CustomEvent if not defined in environment
	if (typeof (globalThis as any).CustomEvent === "undefined") {
		class CustomEventMock<T = any> {
			type: string;
			detail: T;
			constructor(type: string, params?: { detail?: T }) {
				this.type = type;
				this.detail = params?.detail as T;
			}
		}
		(globalThis as any).CustomEvent = CustomEventMock;
	}

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
		dispatchEvent: (ev: any) => {
			if (ev?.type === "dente-toast" && ev.detail) {
				toastEvents.push(ev.detail);
			}
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
		getComputedStyle: () => ({ getPropertyValue: () => "" }),
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

	const clipboardObj = {
		writeText: async (text: string) => {
			clipboardText = text;
		},
		readText: async () => clipboardText,
	};
	try {
		Object.defineProperty(globalThis, "navigator", {
			value: { clipboard: clipboardObj },
			configurable: true,
			writable: true,
		});
	} catch {
		if (typeof globalThis.navigator !== "undefined") {
			try {
				Object.defineProperty(globalThis.navigator, "clipboard", {
					value: clipboardObj,
					configurable: true,
					writable: true,
				});
			} catch {
				(globalThis.navigator as any).clipboard = clipboardObj;
			}
		}
	}
	win.navigator = globalThis.navigator;

	return {
		doc,
		win,
		getClipboardText: () => clipboardText,
		clearClipboard: () => {
			clipboardText = "";
		},
		getToastEvents: () => toastEvents,
		clearToastEvents: () => {
			toastEvents.length = 0;
		},
	};
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

const mockAppointment: Appointment = {
	id: "appt-wave49-01",
	organizationId: "00000000-0000-0000-0000-000000000000",
	patientId: "pat-101",
	doctorUserId: "doc-1",
	chairId: "chair-1",
	startsAt: "2026-09-09T14:00:00.000Z",
	endsAt: "2026-09-09T15:00:00.000Z",
	status: "planned",
	reason: "Осмотр и консультация",
	comment: null,
};

const mockDashboard: any = {
	patients: [
		{ id: "pat-101", fullName: "Кузнецов Денис Иванович", phone: "+7 (999) 111-22-33" },
	],
	appointments: [mockAppointment],
	clinicSettings: {
		staff: [
			{ id: "doc-1", fullName: "Д-р Смирнова Анна", role: "doctor", active: true, specialties: ["therapy"] },
		],
		chairs: [
			{ id: "chair-1", name: "Кабинет №1", active: true },
		],
		profile: {
			mode: "solo_doctor",
			timezone: "Europe/Moscow",
		},
	},
};

const mockLabels: Record<Appointment["status"], string> = {
	planned: "Запланирован",
	confirmed: "Подтвержден",
	arrived: "Пришел",
	in_treatment: "В кресле",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Не явился",
};

describe("Wave 49 (Feature 232): Unblocked Communication Actions & Non-blocking Inline Patient", () => {
	const quickActionsPath = path.resolve(__dirname, "../AppointmentQuickActions.tsx");
	const quickActionsSource = fs.readFileSync(quickActionsPath, "utf8");

	const appointmentModalPath = path.resolve(__dirname, "../AppointmentModal.tsx");
	const appointmentModalSource = fs.readFileSync(appointmentModalPath, "utf8");

	let mockDomEnv: ReturnType<typeof setupMockDom>;

	beforeEach(() => {
		mockDomEnv = setupMockDom();
		mockDomEnv.clearClipboard();
		mockDomEnv.clearToastEvents();
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 1: AppointmentQuickActions Communication Buttons Autonomy (Mandate 8e, 8k)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("1. AppointmentQuickActions: Unblocked Communication Buttons", () => {
		it("1.1. Source code no longer gates communication buttons with patientPhone", () => {
			assert.equal(
				quickActionsSource.includes("{patientPhone && startsAt && ("),
				false,
				"Must remove {patientPhone && startsAt && ( blocker condition",
			);
			assert.equal(
				quickActionsSource.includes("{startsAt && ("),
				true,
				"Must render communication buttons when startsAt is present",
			);
		});

		it("1.2. Renders SMS and WhatsApp buttons when patientPhone is null", () => {
			const html = renderToString(
				React.createElement(AppointmentQuickActions, {
					appointmentId: "appt-null-phone",
					currentStatus: "planned",
					patientName: "Алексеев Алексей",
					patientPhone: null,
					startsAt: "2026-09-09T14:00:00.000Z",
					onStatusChange: () => {},
				}),
			);

			assert.ok(html.includes("data-testid=\"appointment-communication-actions\""), "Communication group must render");
			assert.ok(html.includes("data-testid=\"appointment-action-wa-reminder\""), "WA reminder button must render");
			assert.ok(html.includes("data-testid=\"appointment-action-copy-sms\""), "SMS copy button must render");
			assert.ok(html.includes("data-testid=\"appointment-action-wa-confirm\""), "WA confirm button must render");
			assert.ok(html.includes("data-testid=\"appointment-action-wa-shift\""), "WA shift button must render");
		});

		it("1.3. Renders SMS and WhatsApp buttons when patientPhone is undefined", () => {
			const html = renderToString(
				React.createElement(AppointmentQuickActions, {
					appointmentId: "appt-undef-phone",
					currentStatus: "planned",
					patientName: "Сергеев Сергей",
					patientPhone: undefined,
					startsAt: "2026-09-09T14:00:00.000Z",
					onStatusChange: () => {},
				}),
			);

			assert.ok(html.includes("data-testid=\"appointment-action-copy-sms\""), "SMS button must render with undefined phone");
			assert.ok(html.includes("data-testid=\"appointment-action-wa-reminder\""), "WA button must render with undefined phone");
		});

		it("1.4. Renders SMS and WhatsApp buttons when patientPhone is empty string", () => {
			const html = renderToString(
				React.createElement(AppointmentQuickActions, {
					appointmentId: "appt-empty-phone",
					currentStatus: "planned",
					patientName: "Михайлов Михаил",
					patientPhone: "",
					startsAt: "2026-09-09T14:00:00.000Z",
					onStatusChange: () => {},
				}),
			);

			assert.ok(html.includes("data-testid=\"appointment-action-copy-sms\""), "SMS button must render with empty phone");
			assert.ok(html.includes("data-testid=\"appointment-action-wa-reminder\""), "WA button must render with empty phone");
		});

		it("1.5. Communication buttons have disabled={false} and no disabled attributes in rendered HTML", () => {
			const html = renderToString(
				React.createElement(AppointmentQuickActions, {
					appointmentId: "appt-unblocked",
					currentStatus: "planned",
					patientName: "Васильев Василий",
					patientPhone: null,
					startsAt: "2026-09-09T14:00:00.000Z",
					onStatusChange: () => {},
				}),
			);

			const waMatch = html.match(/<button[^>]*data-testid="appointment-action-wa-reminder"[^>]*>/);
			assert.ok(waMatch, "Must find WA reminder button");
			assert.equal(waMatch[0].includes("disabled"), false, "WA button must not have disabled attribute");

			const smsMatch = html.match(/<button[^>]*data-testid="appointment-action-copy-sms"[^>]*>/);
			assert.ok(smsMatch, "Must find SMS button");
			assert.equal(smsMatch[0].includes("disabled"), false, "SMS button must not have disabled attribute");
		});

		it("1.6. Satisfies touch target floor >= 44x44px and zero cartoon emojis (Mandate 8c & 8d)", () => {
			assert.ok(
				quickActionsSource.includes("min-h-[44px] min-w-[44px]"),
				"Communication buttons must enforce min-h-[44px] min-w-[44px] touch target floor",
			);
			assert.equal(hasCartoonEmojis(quickActionsSource), false, "Zero cartoon emojis allowed in source");
		});

		it("1.7. Clicking WhatsApp button without patientPhone triggers warning toast and copies text to clipboard", async () => {
			const container = mockDomEnv.doc.createElement("div");
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					React.createElement(AppointmentQuickActions, {
						appointmentId: "appt-click-wa",
						currentStatus: "planned",
						patientName: "Фёдоров Фёдор",
						patientPhone: null,
						doctorName: "Д-р Смирнова",
						startsAt: "2026-09-09T14:00:00.000Z",
						onStatusChange: () => {},
					}),
				);
			});

			const waBtn = findNodeByTestId(container, "appointment-action-wa-reminder");
			assert.ok(waBtn, "Must find WA reminder button in mounted DOM");

			await clickNode(waBtn);

			// Toast events: warning about missing phone, then info about text copied to clipboard
			const toasts = mockDomEnv.getToastEvents();
			assert.ok(toasts.length >= 2, `Expected at least 2 toast notifications, got ${toasts.length}`);

			const warningToast = toasts.find((t) => t.type === "warning");
			assert.ok(warningToast, "Must show warning toast");
			assert.ok(
				warningToast.text.includes("Укажите номер телефона пациента в карточке приёма для отправки в WhatsApp"),
				`Unexpected toast message: ${warningToast.text}`,
			);

			const infoToast = toasts.find((t) => t.type === "info");
			assert.ok(infoToast, "Must show info toast about copied text");
			assert.ok(
				infoToast.text.includes("Текст сообщения скопирован в буфер обмена"),
				`Unexpected info toast message: ${infoToast.text}`,
			);

			// Clipboard text must contain patient name and appointment details
			const clipboard = mockDomEnv.getClipboardText();
			assert.ok(clipboard.length > 0, "Clipboard must contain generated appointment message");
			assert.ok(clipboard.includes("Фёдоров Фёдор"), "Clipboard text must mention patient name");
		});

		it("1.8. Clicking SMS button copies reminder text to clipboard and triggers success toast", async () => {
			const container = mockDomEnv.doc.createElement("div");
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					React.createElement(AppointmentQuickActions, {
						appointmentId: "appt-click-sms",
						currentStatus: "planned",
						patientName: "Николаев Николай",
						patientPhone: null,
						doctorName: "Д-р Смирнова",
						startsAt: "2026-09-09T14:00:00.000Z",
						onStatusChange: () => {},
					}),
				);
			});

			const smsBtn = findNodeByTestId(container, "appointment-action-copy-sms");
			assert.ok(smsBtn, "Must find SMS button in mounted DOM");

			await clickNode(smsBtn);

			const toasts = mockDomEnv.getToastEvents();
			const successToast = toasts.find((t) => t.type === "success");
			assert.ok(successToast, "Must show success toast for SMS copy");
			assert.ok(
				successToast.text.includes("Николаев Николай"),
				`Success toast must mention patient: ${successToast.text}`,
			);

			const clipboard = mockDomEnv.getClipboardText();
			assert.ok(clipboard.length > 0, "Clipboard must contain generated SMS text");
			assert.ok(clipboard.includes("Николаев Николай"), "Clipboard must mention patient name");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Suite 2: AppointmentModal Non-blocking Inline Patient Creation (Mandates 8e, 8k, 8n)
	// ─────────────────────────────────────────────────────────────────────────────
	describe("2. AppointmentModal: Non-blocking Inline Patient Creation", () => {
		it("2.1. Source code no longer disables save patient button when name is empty", () => {
			assert.equal(
				appointmentModalSource.includes("disabled={isCreatingInlinePatient || !newPatientFullName.trim()}"),
				false,
				"Must eliminate disabled={isCreatingInlinePatient || !newPatientFullName.trim()}",
			);
			assert.equal(
				appointmentModalSource.includes("disabled={isCreatingInlinePatient}"),
				true,
				"Must disable ONLY during active creation (disabled={isCreatingInlinePatient})",
			);
			assert.equal(
				appointmentModalSource.includes("disabled:cursor-not-allowed"),
				false,
				"Must remove disabled:cursor-not-allowed roadblock",
			);
		});

		it("2.2. Save patient button is NOT disabled when inline patient panel opens with empty name", async () => {
			const container = mockDomEnv.doc.createElement("div");
			const root: Root = createRoot(container as unknown as HTMLElement);

			const appt: Partial<Appointment> = {
				id: "appt-modal-inline-01",
				patientId: "",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-09T10:00:00.000Z",
				endsAt: "2026-09-09T11:00:00.000Z",
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
						appointmentLabels={mockLabels}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			const modeCreateBtn = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-patient-mode-create",
			);
			assert.ok(modeCreateBtn, "Must find '+ Новый пациент' mode button");

			await clickNode(modeCreateBtn);

			const savePatientBtn = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-quick-patient-save-btn",
			);
			assert.ok(savePatientBtn, "Must find 'appointment-quick-patient-save-btn'");
			assert.equal(
				savePatientBtn.disabled,
				false,
				"Save patient button must NOT be disabled when name is empty (Mandate 8e п. 2)",
			);
		});

		it("2.3. Clicking save with empty name and empty phone shows soft guidance toast and focuses name input", async () => {
			const container = mockDomEnv.doc.createElement("div");
			const root: Root = createRoot(container as unknown as HTMLElement);

			const appt: Partial<Appointment> = {
				id: "appt-modal-inline-empty",
				patientId: "",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-09T10:00:00.000Z",
				endsAt: "2026-09-09T11:00:00.000Z",
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
						appointmentLabels={mockLabels}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			const modeCreateBtn = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-patient-mode-create",
			);
			await clickNode(modeCreateBtn);

			const savePatientBtn = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-quick-patient-save-btn",
			);
			assert.ok(savePatientBtn, "Must find save patient button");
			await clickNode(savePatientBtn);

			const toasts = mockDomEnv.getToastEvents();
			const warningToast = toasts.find((t) => t.type === "warning");
			assert.ok(warningToast, "Must trigger warning toast when both fields are empty");
			assert.ok(
				warningToast.text.includes("Укажите имя или телефон пациента для быстрой записи"),
				`Unexpected toast message: ${warningToast.text}`,
			);
		});

		it("2.4. Automatically generates fallback name «Пациент (номер)» when name is empty but phone is entered", async () => {
			const container = mockDomEnv.doc.createElement("div");
			const root: Root = createRoot(container as unknown as HTMLElement);

			let createdPatientPayload: { fullName: string; phone?: string | null } | null = null;
			const onQuickCreateMock = async (data: { fullName: string; phone?: string | null }) => {
				createdPatientPayload = data;
				return {
					id: "pat-phone-only-123",
					fullName: data.fullName,
					phone: data.phone,
				};
			};

			const appt: Partial<Appointment> = {
				id: "appt-modal-phone-only",
				patientId: "",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-09T10:00:00.000Z",
				endsAt: "2026-09-09T11:00:00.000Z",
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
						appointmentLabels={mockLabels}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			const modeCreateBtn = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-patient-mode-create",
			);
			await clickNode(modeCreateBtn);

			const phoneInput = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-quick-patient-phone",
			);
			assert.ok(phoneInput, "Must find phone input");

			await changeNode(phoneInput, "+7 (999) 777-88-99");

			const savePatientBtn = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-quick-patient-save-btn",
			);
			await clickNode(savePatientBtn);

			assert.ok(createdPatientPayload, "onQuickCreatePatient must have been called");
			assert.equal(
				(createdPatientPayload as any).fullName,
				"Пациент (+7 (999) 777-88-99)",
				"Must automatically format fallback name with phone number",
			);
			assert.equal((createdPatientPayload as any).phone, "+7 (999) 777-88-99");

			const toasts = mockDomEnv.getToastEvents();
			const successToast = toasts.find((t) => t.type === "success");
			assert.ok(successToast, "Must show success toast for created patient");
			assert.ok(
				successToast.text.includes("Пациент (+7 (999) 777-88-99)"),
				`Success toast must mention patient: ${successToast.text}`,
			);
		});

		it("2.5. Auto-creates inline patient on handleSave when only phone was filled in", async () => {
			const container = mockDomEnv.doc.createElement("div");
			const root: Root = createRoot(container as unknown as HTMLElement);

			let savedApptPatientId = "";
			const onSaveMock = async (_id: string, data: { patientId: string }) => {
				savedApptPatientId = data.patientId || "";
				return true;
			};

			const onQuickCreateMock = async (data: { fullName: string; phone?: string | null }) => {
				return {
					id: "pat-auto-save-phone",
					fullName: data.fullName,
					phone: data.phone,
				};
			};

			const appt: Partial<Appointment> = {
				id: "appt-modal-autosave-phone",
				patientId: "",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-09T10:00:00.000Z",
				endsAt: "2026-09-09T11:00:00.000Z",
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
						appointmentLabels={mockLabels}
						activeVisitLockedAppointmentStatuses={new Set()}
					/>,
				);
			});

			const modeCreateBtn = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-patient-mode-create",
			);
			await clickNode(modeCreateBtn);

			const phoneInput = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-quick-patient-phone",
			);
			await changeNode(phoneInput, "+7 (911) 222-33-44");

			// Click global "Сохранить" in modal footer
			const saveAppointmentBtn = findNodeByTestId(
				mockDomEnv.doc.body as unknown as MockDomNode,
				"appointment-modal-save-btn",
			);
			assert.ok(saveAppointmentBtn, "Must find appointment-modal-save-btn");

			await clickNode(saveAppointmentBtn);

			assert.equal(
				savedApptPatientId,
				"pat-auto-save-phone",
				"Appointment must be saved with auto-created inline patient ID",
			);
		});
	});
});
