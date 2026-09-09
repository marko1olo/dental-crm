/**
 * quickBookingAutonomyWave50.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Feature 234 (Wave 50):
 * «расписание_квик_букинг::неблокирующее_создание_пациента_по_телефону_и_1_клик_копирование_деталей_записи_для_мессенджеров»
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT (cto supremacy, zero mocks, Apple HIG).
 * - Mandate 8c: Dominant Workspace & 44x44px touch targets floor.
 * - Mandate 8d п. 4 & 7: WCAG contrast, 0 cartoon emojis (Lucide icons only).
 * - Mandate 8e п. 2, 8, 9: Doctor & Staff Autonomy (NO disabled buttons due to secondary fields, non-blocking reception).
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
import type { Appointment, Dashboard, Patient } from "@dental/shared";

import { QuickBookingDrawer } from "../QuickBookingDrawer";

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
let interceptedFetchCalls: Array<{ url: string; method: string; body?: any }> = [];

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
			getAttribute: (name: string) => {
				if (name in attrs) return attrs[name]!;
				if (name === "type" && (el as any).type !== undefined) return (el as any).type;
				if (name === "placeholder" && (el as any).placeholder !== undefined) return (el as any).placeholder;
				if (name === "value" && el.value !== undefined) return el.value;
				return null;
			},
			hasAttribute: (name: string) => {
				if (name in attrs) return true;
				if (name === "type" && (el as any).type !== undefined) return true;
				if (name === "placeholder" && (el as any).placeholder !== undefined) return true;
				return false;
			},
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

	// Polyfill CustomEvent
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

	// Mock localStorage
	const storage: Record<string, string> = {};
	const localStorageMock = {
		getItem: (k: string) => storage[k] ?? null,
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
	g.localStorage = localStorageMock;
	win.localStorage = localStorageMock;

	return {
		doc,
		win,
		localStorage: localStorageMock,
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

function findNodeByText(
	node: MockDomNode | null,
	text: string,
): MockDomNode | null {
	if (!node) return null;
	if (node.textContent && node.textContent.includes(text)) {
		// check children for more specific match
		for (const child of node.children || []) {
			const sub = findNodeByText(child, text);
			if (sub) return sub;
		}
		return node;
	}
	return null;
}

async function clickNode(node: MockDomNode | null) {
	if (!node) return;
	const isSubmit =
		node.tagName === "BUTTON" &&
		(node.getAttribute?.("type") === "submit" || (node as any).type === "submit");

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

	if (isSubmit) {
		let form: MockDomNode | null = node;
		while (form && form.tagName !== "FORM") {
			form = form.parentNode;
		}
		if (form) {
			await act(async () => {
				const reactPropKey = Object.keys(form!).find((k) =>
					k.startsWith("__reactProps$"),
				);
				if (reactPropKey) {
					const props = (form as any)[reactPropKey];
					if (props && typeof props.onSubmit === "function") {
						await props.onSubmit({
							type: "submit",
							preventDefault: () => {},
							stopPropagation: () => {},
						});
						return;
					}
				}
				form!.dispatchEvent({ type: "submit" });
			});
		}
	}
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

// Test Dashboard Fixture
const mockDashboard: Dashboard = {
	clinicSettings: {
		profile: {
			clinicName: "Тестовая Стоматология ДЕНТЕ",
			legalName: "ООО ДЕНТЕ ПРЕМИУМ",
			timezone: "Europe/Moscow",
			address: "г. Москва, ул. Клиническая, 10",
			phone: "+7 (495) 123-45-67",
			mode: "clinic",
		} as any,
		chairs: [
			{ id: "chair-1", name: "Кресло 1", room: "1", active: true },
			{ id: "chair-2", name: "Кресло 2", room: "2", active: true },
		],
		staff: [
			{
				id: "doc-1",
				fullName: "Д-р Тестов В.В.",
				role: "doctor",
				active: true,
				specialties: ["therapy"],
			},
			{
				id: "doc-2",
				fullName: "Д-р Врачев А.А.",
				role: "doctor",
				active: true,
				specialties: ["surgery"],
			},
		],
	} as any,
	appointments: [],
	patients: [
		{
			id: "patient-1",
			fullName: "Иванов Иван Иванович",
			phone: "+7 999 111-22-33",
			status: "active",
			balanceRub: 0,
		} as any,
	],
} as any;

describe("Feature 234 (Wave 50): QuickBookingDrawer Autonomy & 1-Click Messenger Copy", () => {
	let mockDomEnv: ReturnType<typeof setupMockDom>;
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		mockDomEnv = setupMockDom();
		mockDomEnv.clearClipboard();
		mockDomEnv.clearToastEvents();
		interceptedFetchCalls = [];

		container = mockDomEnv.doc.createElement("div");
		mockDomEnv.doc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);

		// Global fetch mock
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = typeof input === "string" ? input : input.toString();
			const method = init?.method || "GET";
			const body = init?.body ? JSON.parse(init.body as string) : undefined;
			interceptedFetchCalls.push({ url, method, body });

			if (url.includes("/api/patients") && method === "POST") {
				const createdPatient: Patient = {
					id: `pat-new-${Date.now()}`,
					organizationId: "org-1",
					status: "active",
					fullName: body?.fullName || "Пациент",
					phone: body?.phone || null,
					birthDate: body?.birthDate || null,
					email: null,
					notes: null,
					administrativeProfile: null,
					balanceRub: 0,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
				return {
					ok: true,
					status: 201,
					json: async () => createdPatient,
				} as Response;
			}

			if (url.includes("/api/appointments") && method === "POST") {
				const createdAppt: Appointment = {
					id: `appt-${Date.now()}`,
					organizationId: "org-1",
					patientId: body?.patientId,
					chairId: body?.chairId,
					doctorUserId: body?.doctorUserId,
					startsAt: body?.startsAt,
					endsAt: body?.endsAt,
					status: body?.status || "planned",
					reason: body?.reason || "Первичный осмотр",
					comment: body?.comment || null,
					costRub: 0,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				} as any;
				const updatedDashboard = {
					...mockDashboard,
					appointments: [createdAppt],
				};
				return {
					ok: true,
					status: 200,
					json: async () => updatedDashboard,
				} as Response;
			}

			return {
				ok: true,
				status: 200,
				json: async () => ({}),
			} as Response;
		}) as any;
	});

	// --- TEST 1: Presence of 1-Click Copy Confirmation Button & WCAG / HIG Invariants ---
	it("1. Renders 1-click messenger copy confirmation button with min-h-[44px] and Lucide vector icon without cartoon emojis", async () => {
		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-09",
						startTime: "10:00",
						doctorUserId: "doc-1",
						patientId: "patient-1",
					},
					dashboard: mockDashboard,
				}),
			);
		});

		const bodyNode = mockDomEnv.doc.body as unknown as MockDomNode;
		const copyBtn = findNodeByTestId(bodyNode, "quick-booking-copy-confirmation-btn");

		assert.ok(copyBtn, "Button quick-booking-copy-confirmation-btn must be rendered in the footer");
		assert.ok(
			copyBtn.className?.includes("min-h-[44px]"),
			"Copy confirmation button must satisfy Mandate 8c touch target >= 44x44px",
		);

		// Verify zero cartoon emojis in the button content
		assert.equal(
			hasCartoonEmojis(copyBtn.textContent || ""),
			false,
			"Button must not contain cartoon emojis per Mandate 8d п. 7",
		);
	});

	// --- TEST 2: 1-Click Copy Confirmation Copies Clean Formatted Text for WhatsApp/Telegram ---
	it("2. 1-Click copy confirmation copies formatted message for messengers (WhatsApp/Telegram) and displays success toast", async () => {
		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-09",
						startTime: "10:00",
						doctorUserId: "doc-1",
						patientId: "patient-1",
						durationMinutes: 45,
					},
					dashboard: mockDashboard,
				}),
			);
		});

		const bodyNode = mockDomEnv.doc.body as unknown as MockDomNode;
		const copyBtn = findNodeByTestId(bodyNode, "quick-booking-copy-confirmation-btn");
		assert.ok(copyBtn, "Copy button must exist");

		// Click the copy button
		await clickNode(copyBtn);

		const text = mockDomEnv.getClipboardText();
		assert.ok(text.length > 0, "Clipboard text must not be empty after clicking copy button");

		// Check required lines per specification:
		// Запись на приём в клинику «{clinicName}»:
		// Пациент: {patientName}
		// Дата и время: {formattedDate}, {formattedTime} ({durationMinutes} мин)
		// Врач: {doctorName}
		// Кабинет / кресло: {chairName}
		// Адрес клиники: {clinicAddress}
		// Телефон для справок: {clinicPhone}
		// Пожалуйста, приходите за 10 минут до начала приёма.
		assert.ok(
			text.includes("Запись на приём в клинику «Тестовая Стоматология ДЕНТЕ»:"),
			`Must include clinic name. Got: ${text}`,
		);
		assert.ok(
			text.includes("Пациент: Иванов Иван Иванович"),
			`Must include patient name. Got: ${text}`,
		);
		assert.ok(
			text.includes("09.09.2026") && text.includes("10:00") && text.includes("мин)"),
			`Must include date, time and duration. Got: ${text}`,
		);
		assert.ok(
			text.includes("Врач: Д-р Тестов В.В."),
			`Must include doctor name. Got: ${text}`,
		);
		assert.ok(
			text.includes("Кабинет / кресло: Кресло 1"),
			`Must include chair name. Got: ${text}`,
		);
		assert.ok(
			text.includes("Адрес клиники: г. Москва, ул. Клиническая, 10"),
			`Must include clinic address. Got: ${text}`,
		);
		assert.ok(
			text.includes("Телефон для справок: +7 (495) 123-45-67"),
			`Must include clinic phone. Got: ${text}`,
		);
		assert.ok(
			text.includes("Пожалуйста, приходите за 10 минут до начала приёма."),
			`Must include arrival reminder note. Got: ${text}`,
		);

		// Zero cartoon emojis in the message text
		assert.equal(
			hasCartoonEmojis(text),
			false,
			"Confirmation text must contain zero cartoon emojis per Mandate 8d п. 7",
		);

		// Verify success toast was triggered
		const toasts = mockDomEnv.getToastEvents();
		const successToast = toasts.find(
			(t) =>
				t.text.includes("Детали записи скопированы в буфер обмена") &&
				t.type === "success",
		);
		assert.ok(successToast, "Success toast must be displayed when copying booking confirmation");
	});

	// --- TEST 3: Non-Blocking Candidate Name Fallback When ONLY Phone Is Provided ---
	it("3. Non-blocking candidateName fallback: entering ONLY phone number forms 'Пациент (+7...)' and enables appointment booking (Mandate 8e, 8k)", async () => {
		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-09",
						startTime: "11:30",
						doctorUserId: "doc-1",
						patientPhone: "+7 999 123-45-67", // Only phone provided in slot!
					},
					dashboard: mockDashboard,
					toDateTimeLocalValue: (iso: string) => (iso ? iso.slice(0, 16) : ""),
					fromDateTimeLocalValue: (local: string) => (local ? (local.endsWith("Z") ? local : `${local}:00.000Z`) : ""),
				}),
			);
		});

		const bodyNode = mockDomEnv.doc.body as unknown as MockDomNode;

		// Submit booking button
		const submitButtons = bodyNode.children
			.flatMap(function getAll(n): MockDomNode[] {
				return [n, ...(n.children ? n.children.flatMap(getAll) : [])];
			})
			.filter(
				(n) =>
					n.tagName === "BUTTON" &&
					(n.textContent?.includes("Создать запись") || n.textContent?.includes("Ctrl+Enter")),
			);

		assert.ok(submitButtons.length > 0, "Submit button must exist");
		const submitBtn = submitButtons[0]!;

		// Click Create Booking
		await clickNode(submitBtn);
		await act(async () => {
			await new Promise((r) => setTimeout(r, 80));
		});

		// Verify that POST /api/patients was called with candidateName fallback
		const patientCreationCall = interceptedFetchCalls.find(
			(c) => c.url.includes("/api/patients") && c.method === "POST",
		);
		assert.ok(
			patientCreationCall,
			"Auto-creation of patient must be called when phone is provided without name",
		);
		assert.equal(
			patientCreationCall.body?.fullName,
			"Пациент (+7 999 123-45-67)",
			"Candidate full name must fall back to 'Пациент (+7 999 123-45-67)'",
		);
		assert.equal(
			patientCreationCall.body?.phone,
			"+7 999 123-45-67",
			"Patient phone must be passed correctly",
		);

		// Verify appointment creation was called
		const apptCreationCall = interceptedFetchCalls.find(
			(c) => c.url.includes("/api/appointments") && c.method === "POST",
		);
		assert.ok(
			apptCreationCall,
			"Appointment creation must succeed without blocking with 'Укажите имя пациента'",
		);

		// Verify no blocking toast error "Укажите имя пациента для записи" was shown
		const errorToasts = mockDomEnv
			.getToastEvents()
			.filter((t) => t.type === "error" && t.text.includes("Укажите имя пациента"));
		assert.equal(
			errorToasts.length,
			0,
			"Must NOT trigger error toast 'Укажите имя пациента для записи' when phone is filled!",
		);
	});

	// --- TEST 4: Inline Patient Creation Form Validation and Phone Fallback ---
	it("4. Inline patient creation: handleCreateInlinePatient falls back to phone and gives soft warning if both empty", async () => {
		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-09",
						startTime: "12:00",
						doctorUserId: "doc-1",
					},
					dashboard: mockDashboard,
				}),
			);
		});

		const bodyNode = mockDomEnv.doc.body as unknown as MockDomNode;

		// Expand inline new patient form
		const newPatientToggleBtn = findNodeByTestId(bodyNode, "quick-booking-new-patient-toggle");
		assert.ok(newPatientToggleBtn, "New patient toggle button must exist");
		await clickNode(newPatientToggleBtn);

		// Find inline create patient button
		const createPatientBtn = findNodeByTestId(bodyNode, "quick-booking-create-inline-patient-btn");
		assert.ok(createPatientBtn, "Inline create patient button must exist");

		// When both name and phone are empty: click create
		await clickNode(createPatientBtn);

		const warningToasts = mockDomEnv
			.getToastEvents()
			.filter((t) => t.type === "warning" && t.text.includes("Укажите имя или телефон"));
		assert.ok(
			warningToasts.length > 0,
			"Soft warning toast 'Укажите имя или телефон пациента для создания карты' must be shown when both empty",
		);

		// Now find phone input and fill it
		const phoneInput =
			findNodeByTestId(bodyNode, "quick-booking-new-patient-phone-input") ||
			bodyNode.children
				.flatMap(function getAll(n): MockDomNode[] {
					return [n, ...(n.children ? n.children.flatMap(getAll) : [])];
				})
				.find((n) => n.tagName === "INPUT" && n.getAttribute("type") === "tel");

		assert.ok(phoneInput, "Phone input must be found");
		await changeNode(phoneInput, "+7 916 555-44-33");

		// Click create patient again with only phone filled
		interceptedFetchCalls = [];
		await clickNode(createPatientBtn);
		await act(async () => {
			await new Promise((r) => setTimeout(r, 80));
		});

		const patientCall = interceptedFetchCalls.find(
			(c) => c.url.includes("/api/patients") && c.method === "POST",
		);
		assert.ok(
			patientCall,
			"Inline patient creation should succeed when phone is filled even without name",
		);
		assert.equal(
			patientCall.body?.fullName,
			"Пациент (+7 916 555-44-33)",
			"Full name should fall back to 'Пациент (+7 916 555-44-33)'",
		);
	});

	// --- TEST 5: HTML5 Validation: newPatientFullName Does NOT Have 'required' Attribute ---
	it("5. HTML5 form validation: input newPatientFullName does NOT have required attribute (Mandate 8e)", async () => {
		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-09",
						startTime: "12:00",
						doctorUserId: "doc-1",
					},
					dashboard: mockDashboard,
				}),
			);
		});

		const bodyNode = mockDomEnv.doc.body as unknown as MockDomNode;
		const newPatientToggleBtn = findNodeByTestId(bodyNode, "quick-booking-new-patient-toggle");
		await clickNode(newPatientToggleBtn);

		const nameInput = findNodeByTestId(bodyNode, "quick-booking-new-patient-name-input");
		assert.ok(nameInput, "newPatientFullName input must be found in inline form");
		assert.equal(
			nameInput.hasAttribute("required"),
			false,
			"Mandate 8e: newPatientFullName must NOT have 'required' attribute to avoid blocking phone-only bookings",
		);
	});

	// --- TEST 6: 1-Click Copy Confirmation Uses Candidate Fallback Name When No Selected Patient ---
	it("6. 1-Click copy confirmation when patient is not yet selected uses phone fallback candidate name", async () => {
		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-09",
						startTime: "14:00",
						doctorUserId: "doc-1",
						patientPhone: "+7 999 777-66-55",
						durationMinutes: 30,
					},
					dashboard: mockDashboard,
				}),
			);
		});

		const bodyNode = mockDomEnv.doc.body as unknown as MockDomNode;
		const copyBtn = findNodeByTestId(bodyNode, "quick-booking-copy-confirmation-btn");
		assert.ok(copyBtn, "Copy button must exist");

		await clickNode(copyBtn);

		const text = mockDomEnv.getClipboardText();
		assert.ok(
			text.includes("Пациент: Пациент (+7 999 777-66-55)"),
			`Clipboard text must use phone fallback candidate name. Got: ${text}`,
		);
		assert.ok(
			text.includes("14:00 (30 мин)"),
			`Clipboard text must include time and duration. Got: ${text}`,
		);
	});

	// --- TEST 7: Anti-Matryoshka - Closing dirty drawer auto-persists draft without modal popup ---
	it("7. Anti-Matryoshka: Closing dirty drawer automatically saves draft without blocking modal popup", async () => {
		let closed = false;
		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {
						closed = true;
					},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-09",
						startTime: "15:00",
						doctorUserId: "doc-1",
						patientPhone: "+7 999 888-77-66",
						durationMinutes: 30,
					},
					dashboard: mockDashboard,
				}),
			);
		});

		const bodyNode = mockDomEnv.doc.body as unknown as MockDomNode;
		// Cancel/Close button
		const cancelBtn = findNodeByTestId(bodyNode, "quick-booking-cancel-btn");
		assert.ok(cancelBtn, "quick-booking-cancel-btn must exist");

		await clickNode(cancelBtn);

		assert.equal(closed, true, "Closing dirty drawer must immediately call onClose");

		// Verify no nested alertdialog exists
		const dirtyConfirmDialog = findNodeByTestId(bodyNode, "quick-booking-dirty-confirm-dialog");
		assert.equal(
			dirtyConfirmDialog,
			null,
			"Mandate 8d/8e: Nested alertdialog confirmation must NEVER block closing",
		);

		// Verify draft was saved to localStorage
		const savedDraft = globalThis.localStorage.getItem("dente_quick_booking_draft");
		assert.ok(savedDraft, "Draft data must be automatically persisted in localStorage on close");
	});

	// --- TEST 8: Discard draft button in footer clears draft without modal popup ---
	it("8. 1-Click discard button in footer allows discarding draft in 1 click without modal confirmation", async () => {
		let closed = false;
		globalThis.localStorage.setItem("dente_quick_booking_draft", JSON.stringify({ test: "data" }));

		await act(async () => {
			root.render(
				React.createElement(QuickBookingDrawer, {
					isOpen: true,
					onClose: () => {
						closed = true;
					},
					initialSlot: {
						chairId: "chair-1",
						dateKey: "2026-09-09",
						startTime: "16:00",
						doctorUserId: "doc-1",
						patientPhone: "+7 999 111-22-33",
						durationMinutes: 30,
					},
					dashboard: mockDashboard,
				}),
			);
		});

		const bodyNode = mockDomEnv.doc.body as unknown as MockDomNode;
		const discardBtn = findNodeByTestId(bodyNode, "quick-booking-discard-draft-btn");
		assert.ok(discardBtn, "1-Click discard button must exist in footer when dirty");

		await clickNode(discardBtn);

		assert.equal(closed, true, "Clicking discard button must close the drawer");
		const remainingDraft = globalThis.localStorage.getItem("dente_quick_booking_draft");
		assert.equal(remainingDraft, null, "Discarding draft must remove it from localStorage");
	});
});
