/**
 * doctorMobileShiftAutonomy.test.tsx
 *
 * DENTE Dental CRM — Doctor Mobile Shift Autonomy & Non-Blocking SMS Confirmation Suite
 *
 * Governed by:
 * - Mandate 8e (Doctor & Staff Autonomy): Absolute ban on unexplained disabled buttons.
 *   Active guidance when SMS code is incomplete; zero friction in basement clinics without reception.
 * - Mandate 8i (Specialized Outpatient Dental Context): Form 043/u batch signing.
 * - Mandate 8k (CRM != Reality Simulator & Friction-Killer Law): 1-click fallback to session PEP
 *   (63-FZ Art. 9 & Order 947n) when cell reception drops or SMS is delayed.
 * - Mandate 8n (Solo Doctor & Small Clinic Sovereignty): Immediate unblocked workflow without traps.
 * - Mandate 8o (Task-Scope Reporting).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import {
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	type DoctorShiftAppointment,
} from "@dental/shared";
import { DoctorMobileShiftModal } from "../DoctorMobileShiftModal";

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
	[key: string]: unknown;
}

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	let doc: any;

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
			ownerDocument: null,
			parentNode: null,
			textContent: "",
			disabled: false,
			value: "",
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
				right: 390,
				bottom: 844,
				width: 390,
				height: 844,
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

	doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
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
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	if (typeof globalThis.CustomEvent === "undefined") {
		class CustomEventPolyfill<T = unknown> extends Event {
			detail: T;
			constructor(
				type: string,
				params?: { detail?: T; bubbles?: boolean; cancelable?: boolean },
			) {
				super(type, params);
				this.detail = params?.detail as T;
			}
		}
		// biome-ignore lint/suspicious/noExplicitAny: polyfill CustomEvent
		(globalThis as any).CustomEvent = CustomEventPolyfill;
	}

	const win = {
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
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		print: vi.fn(),
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
		CustomEvent: globalThis.CustomEvent,
	};
	(doc as unknown as { defaultView: typeof win }).defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
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

function isNodeDisabled(node: MockDomNode): boolean {
	if (Boolean(node.disabled)) return true;
	if (node.getAttribute?.("disabled") !== null && node.getAttribute?.("disabled") !== undefined) return true;
	const reactPropKey = Object.keys(node).find((k) => k.startsWith("__reactProps$"));
	if (reactPropKey) {
		// biome-ignore lint/suspicious/noExplicitAny: access React internal props
		const props = (node as any)[reactPropKey];
		if (Boolean(props?.disabled)) return true;
	}
	return false;
}

async function clickNode(node: MockDomNode) {
	await act(async () => {
		const reactPropKey = Object.keys(node).find((k) =>
			k.startsWith("__reactProps$"),
		);
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onClick === "function") {
				props.onClick({
					type: "click",
					preventDefault: () => {},
					stopPropagation: () => {},
				});
				return;
			}
		}
		node.dispatchEvent({ type: "click" });
	});
}

async function changeInput(node: MockDomNode, value: string) {
	await act(async () => {
		node.value = value;
		const reactPropKey = Object.keys(node).find((k) =>
			k.startsWith("__reactProps$"),
		);
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onChange === "function") {
				props.onChange({
					target: { value },
					currentTarget: { value },
				});
				return;
			}
		}
		node.dispatchEvent({ type: "input" });
	});
}

describe("Doctor Mobile Shift Autonomy & Non-Blocking SMS Signing (Mandates 8e, 8n)", () => {
	it("confirm-sms-code-btn is NOT disabled when enteredSmsCode has < 6 characters (e.g. '123' or empty)", async () => {
		const { doc, win } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<DoctorMobileShiftModal
					isOpen={true}
					onClose={() => {}}
					initialDoctorId="doc-1"
					initialDoctorName="Д-р Смирнов Алексей Петрович"
					initialDoctorSpecialty="Терапевт-ортопед"
					initialShiftDateIso="2026-08-29"
					initialAppointments={SAMPLE_DOCTOR_SHIFT_APPOINTMENTS}
				/>,
			);
		});

		// 1. Open SMS Batch Signing Modal
		const signSmsBtn = findNodeByTestId(rootContainer, "sign-all-043u-btn");
		expect(signSmsBtn).not.toBeNull();
		await clickNode(signSmsBtn!);

		// 2. Locate confirm button and input
		const confirmBtn = findNodeByTestId(rootContainer, "confirm-sms-code-btn");
		const smsInput = findNodeByTestId(rootContainer, "sms-code-input");
		expect(confirmBtn).not.toBeNull();
		expect(smsInput).not.toBeNull();

		// Initially code is empty: button must NOT be disabled (Mandate 8e)
		expect(isNodeDisabled(confirmBtn!)).toBe(false);

		// Type short code: "123" (< 6 characters)
		await changeInput(smsInput!, "123");

		// Button must STILL NOT be disabled (Mandate 8e: no unexplained greyed-out traps)
		expect(isNodeDisabled(confirmBtn!)).toBe(false);

		await act(async () => {
			root.unmount();
		});
	});

	it("clicking confirm-sms-code-btn with short code (< 6 chars) triggers warning guidance without submitting", async () => {
		const { doc, win } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		const toasts: { text: string; type: string }[] = [];
		win.addEventListener("dente-toast", (e: Event) => {
			// biome-ignore lint/suspicious/noExplicitAny: event detail inspection
			toasts.push((e as any).detail);
		});

		const onAppointmentUpdate = vi.fn();

		await act(async () => {
			root.render(
				<DoctorMobileShiftModal
					isOpen={true}
					onClose={() => {}}
					initialDoctorId="doc-1"
					initialDoctorName="Д-р Смирнов Алексей Петрович"
					initialDoctorSpecialty="Терапевт-ортопед"
					initialShiftDateIso="2026-08-29"
					initialAppointments={SAMPLE_DOCTOR_SHIFT_APPOINTMENTS}
					onAppointmentUpdate={onAppointmentUpdate}
				/>,
			);
		});

		// 1. Open SMS Batch Signing Modal
		const signSmsBtn = findNodeByTestId(rootContainer, "sign-all-043u-btn");
		await clickNode(signSmsBtn!);

		const confirmBtn = findNodeByTestId(rootContainer, "confirm-sms-code-btn");
		const smsInput = findNodeByTestId(rootContainer, "sms-code-input");
		expect(confirmBtn).not.toBeNull();

		// 2. Set short code "123"
		await changeInput(smsInput!, "123");

		// 3. Click confirm button
		await clickNode(confirmBtn!);

		// 4. Verify warning toast was dispatched with exact guidance per Mandate 8e
		expect(toasts.length).toBeGreaterThan(0);
		const warningToast = toasts.find((t) => t.type === "warning");
		expect(warningToast).toBeDefined();
		expect(warningToast?.text).toBe(
			"Введите 6-значный СМС-код подтверждения или нажмите кнопку ниже для сессионной ПЭП",
		);

		// 5. Verify batch signing was NOT completed (update callback not called, modal remains open)
		expect(onAppointmentUpdate).not.toHaveBeenCalled();
		expect(findNodeByTestId(rootContainer, "doctor-sms-signing-drawer")).not.toBeNull();

		await act(async () => {
			root.unmount();
		});
	});

	it("renders session PEP fallback button with >= 44px touch target and allows 1-click signing without SMS delay", async () => {
		const { doc, win } = setupMockDom();
		const rootContainer = doc.createElement("div");
		doc.body.appendChild(rootContainer);
		const root: Root = createRoot(rootContainer as unknown as HTMLElement);

		const toasts: { text: string; type: string }[] = [];
		win.addEventListener("dente-toast", (e: Event) => {
			// biome-ignore lint/suspicious/noExplicitAny: event detail inspection
			toasts.push((e as any).detail);
		});

		const onAppointmentUpdate = vi.fn();

		await act(async () => {
			root.render(
				<DoctorMobileShiftModal
					isOpen={true}
					onClose={() => {}}
					initialDoctorId="doc-1"
					initialDoctorName="Д-р Смирнов Алексей Петрович"
					initialDoctorSpecialty="Терапевт-ортопед"
					initialShiftDateIso="2026-08-29"
					initialAppointments={SAMPLE_DOCTOR_SHIFT_APPOINTMENTS}
					onAppointmentUpdate={onAppointmentUpdate}
				/>,
			);
		});

		// 1. Open SMS Batch Signing Modal
		const signSmsBtn = findNodeByTestId(rootContainer, "sign-all-043u-btn");
		await clickNode(signSmsBtn!);

		// 2. Locate 1-click fallback PEP button
		const fallbackBtn = findNodeByTestId(
			rootContainer,
			"sms-delay-fallback-pep-btn",
		);
		expect(fallbackBtn).not.toBeNull();

		// Check classes for touch target ergonomics (min-h-[44px])
		const className = fallbackBtn?.getAttribute("class") || "";
		expect(className).toContain("min-h-[44px]");

		// 3. Click session PEP fallback button (1-click doctor autonomy in basement clinics)
		await clickNode(fallbackBtn!);

		// 4. Verify batch signing succeeded immediately
		expect(onAppointmentUpdate).toHaveBeenCalledTimes(1);
		const updatedApts: DoctorShiftAppointment[] = onAppointmentUpdate.mock.calls[0][0];
		expect(updatedApts.length).toBeGreaterThan(0);
		// All completed cards must now be signed
		const unsignedLeft = updatedApts.filter(
			(a) => a.status === "completed" && a.emrCard043uStatus !== "signed",
		);
		expect(unsignedLeft.length).toBe(0);

		// 5. Signing overlay must close after successful session PEP signing
		expect(findNodeByTestId(rootContainer, "doctor-sms-signing-drawer")).toBeNull();

		// 6. Success toast is dispatched
		const successToast = toasts.find((t) => t.type === "success");
		expect(successToast).toBeDefined();

		await act(async () => {
			root.unmount();
		});
	});
});
