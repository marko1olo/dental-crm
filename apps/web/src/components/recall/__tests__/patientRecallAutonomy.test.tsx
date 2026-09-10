/**
 * patientRecallAutonomy.test.tsx
 *
 * Unit tests for Patient Recall & Prophylaxis Autonomy:
 * - Mandate 8d: 7 Deadly Sins & Touch Targets (Apple HIG min-height >= 44px, zero unicode checkmarks).
 * - Mandate 8e: Doctor & Staff Autonomy (Zero unexplained disabled/dead buttons, active guidance feedback).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 * - Mandate 8o: Task-Scope Reporting.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock GlobalToast so showToast can be spied on directly
vi.mock("../../GlobalToast", () => ({
	showToast: vi.fn(),
}));

import { showToast } from "../../GlobalToast";
import {
	PatientRecallManagerModal,
	type PatientRecallItem,
} from "../PatientRecallManagerModal";
import {
	PatientRecallsHubModal,
} from "../../recalls/PatientRecallsHubModal";
import type { PatientRecallRecord } from "../../recalls/patientRecallEngine";

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
	className: string;
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
	scrollIntoView: () => void;
	contains: (other: MockDomNode) => boolean;
	[key: string]: unknown;
}

let testDoc: any;
let testWin: any;

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	let doc: any;

	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const options: MockDomNode[] = [];
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
			options,
			selected: false,
			selectedIndex: 0,
			attributes: [],
			ownerDocument: null,
			parentNode: null,
			textContent: "",
			disabled: false,
			value: "",
			className: "",
			appendChild: (child: MockDomNode) => {
				children.push(child);
				if (child.tagName === "OPTION") {
					options.push(child);
				}
				child.parentNode = el;
				return child;
			},
			insertBefore: (child: MockDomNode, before: MockDomNode | null) => {
				const idx = before ? children.indexOf(before) : -1;
				if (idx >= 0) children.splice(idx, 0, child);
				else children.push(child);
				if (child.tagName === "OPTION") {
					options.push(child);
				}
				child.parentNode = el;
				return child;
			},
			removeChild: (child: MockDomNode) => {
				const idx = children.indexOf(child);
				if (idx >= 0) children.splice(idx, 1);
				if (child.tagName === "OPTION") {
					const optIdx = options.indexOf(child);
					if (optIdx >= 0) options.splice(optIdx, 1);
				}
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
					el.disabled = value !== "false" && value !== null;
				}
				if (name === "class") {
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
				if (name === "class") {
					el.className = "";
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
				right: 1280,
				bottom: 900,
				width: 1280,
				height: 900,
			}),
			focus: () => {},
			blur: () => {},
			scrollIntoView: () => {},
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
		createElementNS: (_ns: string, tag: string) => {
			const el = createMockElement(tag);
			el.ownerDocument = doc;
			return el;
		},
		createTextNode: (text: string) => ({
			nodeType: 3,
			textContent: text,
			style: {},
			parentNode: null,
			ownerDocument: doc,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: doc }),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

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
		open: vi.fn(),
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
	};
	(doc as unknown as { defaultView: typeof win }).defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	testDoc = doc;
	testWin = win;
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

describe("Patient Recall & Prophylaxis Autonomy (Mandates 8d, 8e, 8n)", () => {
	let container: MockDomNode;
	let root: Root;

	beforeEach(() => {
		vi.clearAllMocks();
		setupMockDom();
		container = testDoc.createElement("div");
		testDoc.body.appendChild(container);
		root = createRoot(container as unknown as HTMLElement);
	});

	describe("1. PatientRecallManagerModal Autonomy & Active Feedback", () => {
		const candidateWithoutPhone: PatientRecallItem = {
			id: "rec-test-no-phone",
			patientId: "pat-no-phone",
			fullName: "Козлов Иван Петрович",
			phone: null,
			category: "hygiene",
			categoryLabel: "Гигиена 6 мес.",
			lastVisitDate: "2026-02-01",
			dueDate: "2026-08-01",
			daysOverdue: 20,
			urgency: "due_now",
			status: "pending",
		};

		it("action buttons are NOT disabled when candidate has no phone (Mandate 8e)", async () => {
			await act(async () => {
				root.render(
					<PatientRecallManagerModal
						isOpen={true}
						initialCandidates={[candidateWithoutPhone]}
					/>,
				);
			});

			const waBtn = findNodeByTestId(container, "pr-whatsapp-btn-rec-test-no-phone");
			const tgBtn = findNodeByTestId(container, "pr-telegram-btn-rec-test-no-phone");
			const callBtn = findNodeByTestId(container, "pr-call-btn-rec-test-no-phone");
			const bookBtn = findNodeByTestId(container, "pr-book-btn-rec-test-no-phone");
			const previewBtn = findNodeByTestId(container, "pr-preview-btn-rec-test-no-phone");

			expect(waBtn).not.toBeNull();
			expect(tgBtn).not.toBeNull();
			expect(callBtn).not.toBeNull();
			expect(bookBtn).not.toBeNull();
			expect(previewBtn).not.toBeNull();

			// Doctor autonomy: Buttons MUST NOT be disabled
			expect(waBtn?.disabled).toBe(false);
			expect(tgBtn?.disabled).toBe(false);
			expect(callBtn?.disabled).toBe(false);
			expect(bookBtn?.disabled).toBe(false);
			expect(previewBtn?.disabled).toBe(false);
		});

		it("touch targets meet Apple HIG min-height >= 44px (Mandate 8d)", async () => {
			await act(async () => {
				root.render(
					<PatientRecallManagerModal
						isOpen={true}
						initialCandidates={[candidateWithoutPhone]}
					/>,
				);
			});

			const waBtn = findNodeByTestId(container, "pr-whatsapp-btn-rec-test-no-phone");
			const tgBtn = findNodeByTestId(container, "pr-telegram-btn-rec-test-no-phone");
			const callBtn = findNodeByTestId(container, "pr-call-btn-rec-test-no-phone");
			const bookBtn = findNodeByTestId(container, "pr-book-btn-rec-test-no-phone");
			const previewBtn = findNodeByTestId(container, "pr-preview-btn-rec-test-no-phone");

			expect(waBtn?.style.minHeight).toBe("44px");
			expect(tgBtn?.style.minHeight).toBe("44px");
			expect(callBtn?.style.minHeight).toBe("44px");
			expect(bookBtn?.style.minHeight).toBe("44px");
			expect(previewBtn?.style.minHeight).toBe("44px");
			expect(previewBtn?.style.minWidth).toBe("44px");
		});

		it("clicking WhatsApp with empty phone triggers active warning toast instead of dead click", async () => {
			await act(async () => {
				root.render(
					<PatientRecallManagerModal
						isOpen={true}
						initialCandidates={[candidateWithoutPhone]}
					/>,
				);
			});

			const waBtn = findNodeByTestId(container, "pr-whatsapp-btn-rec-test-no-phone");
			expect(waBtn).not.toBeNull();

			await clickNode(waBtn!);

			expect(vi.mocked(showToast)).toHaveBeenCalledWith(
				"У пациента не указан номер телефона. Укажите номер в карточке пациента",
				"warning",
			);
		});

		it("clicking Telegram with empty phone triggers active warning toast", async () => {
			await act(async () => {
				root.render(
					<PatientRecallManagerModal
						isOpen={true}
						initialCandidates={[candidateWithoutPhone]}
					/>,
				);
			});

			const tgBtn = findNodeByTestId(container, "pr-telegram-btn-rec-test-no-phone");
			expect(tgBtn).not.toBeNull();

			await clickNode(tgBtn!);

			expect(vi.mocked(showToast)).toHaveBeenCalledWith(
				"У пациента не указан номер телефона. Укажите номер в карточке пациента",
				"warning",
			);
		});

		it("clicking Call with empty phone triggers active warning toast", async () => {
			await act(async () => {
				root.render(
					<PatientRecallManagerModal
						isOpen={true}
						initialCandidates={[candidateWithoutPhone]}
					/>,
				);
			});

			const callBtn = findNodeByTestId(container, "pr-call-btn-rec-test-no-phone");
			expect(callBtn).not.toBeNull();

			await clickNode(callBtn!);

			expect(vi.mocked(showToast)).toHaveBeenCalledWith(
				"У пациента не указан номер телефона. Укажите номер в карточке пациента",
				"warning",
			);
		});

		it("mobile cards actions have min-height >= 44px and are not disabled", async () => {
			await act(async () => {
				root.render(
					<PatientRecallManagerModal
						isOpen={true}
						initialCandidates={[candidateWithoutPhone]}
					/>,
				);
			});

			const mobWaBtn = findNodeByTestId(container, "pr-mobile-whatsapp-btn-rec-test-no-phone");
			const mobTgBtn = findNodeByTestId(container, "pr-mobile-telegram-btn-rec-test-no-phone");
			const mobCallBtn = findNodeByTestId(container, "pr-mobile-call-btn-rec-test-no-phone");
			const mobBookBtn = findNodeByTestId(container, "pr-mobile-book-btn-rec-test-no-phone");

			expect(mobWaBtn?.disabled).toBe(false);
			expect(mobTgBtn?.disabled).toBe(false);
			expect(mobCallBtn?.disabled).toBe(false);
			expect(mobBookBtn?.disabled).toBe(false);

			expect(mobWaBtn?.style.minHeight).toBe("44px");
			expect(mobTgBtn?.style.minHeight).toBe("44px");
			expect(mobCallBtn?.style.minHeight).toBe("44px");
			expect(mobBookBtn?.style.minHeight).toBe("44px");
		});
	});

	describe("2. PatientRecallsHubModal Autonomy & HIG Standards", () => {
		const hubCandidateWithoutPhone: PatientRecallRecord = {
			id: "hub-rec-no-phone",
			patientId: "pat-hub-no-phone",
			fullName: "Семенова Ольга Дмитриевна",
			phone: "",
			cycleType: "standard_prophylaxis",
			lastVisitDate: "2026-02-15",
			dueDate: "2026-08-15",
			daysOverdue: 10,
			urgencyStatus: "due_now",
			status: "due_now",
			historicalRevenueRub: 25000,
			visitsCount: 3,
		};

		it("candidate action buttons are NOT disabled when phone is empty (Mandate 8e)", async () => {
			await act(async () => {
				root.render(
					<PatientRecallsHubModal
						isOpen={true}
						initialCandidates={[hubCandidateWithoutPhone]}
					/>,
				);
			});

			const waBtn = findNodeByTestId(container, "recall-whatsapp-btn-hub-rec-no-phone");
			const tgBtn = findNodeByTestId(container, "recall-telegram-btn-hub-rec-no-phone");
			const scriptBtn = findNodeByTestId(container, "recall-script-btn-hub-rec-no-phone");
			const bookBtn = findNodeByTestId(container, "recall-book-btn-hub-rec-no-phone");
			const smsBtn = findNodeByTestId(container, "recall-sms-btn-hub-rec-no-phone");

			expect(waBtn).not.toBeNull();
			expect(tgBtn).not.toBeNull();
			expect(scriptBtn).not.toBeNull();
			expect(bookBtn).not.toBeNull();
			expect(smsBtn).not.toBeNull();

			expect(waBtn?.disabled).toBe(false);
			expect(tgBtn?.disabled).toBe(false);
			expect(scriptBtn?.disabled).toBe(false);
			expect(bookBtn?.disabled).toBe(false);
			expect(smsBtn?.disabled).toBe(false);
		});

		it("candidate action buttons have Apple HIG touch target min-height >= 44px (Mandate 8d)", async () => {
			await act(async () => {
				root.render(
					<PatientRecallsHubModal
						isOpen={true}
						initialCandidates={[hubCandidateWithoutPhone]}
					/>,
				);
			});

			const waBtn = findNodeByTestId(container, "recall-whatsapp-btn-hub-rec-no-phone");
			const tgBtn = findNodeByTestId(container, "recall-telegram-btn-hub-rec-no-phone");
			const scriptBtn = findNodeByTestId(container, "recall-script-btn-hub-rec-no-phone");
			const bookBtn = findNodeByTestId(container, "recall-book-btn-hub-rec-no-phone");
			const smsBtn = findNodeByTestId(container, "recall-sms-btn-hub-rec-no-phone");

			expect(waBtn?.style.minHeight).toBe("44px");
			expect(tgBtn?.style.minHeight).toBe("44px");
			expect(scriptBtn?.style.minHeight).toBe("44px");
			expect(bookBtn?.style.minHeight).toBe("44px");
			expect(smsBtn?.style.minHeight).toBe("44px");
		});

		it("clicking WhatsApp, Telegram, or SMS with empty phone triggers active warning toast", async () => {
			await act(async () => {
				root.render(
					<PatientRecallsHubModal
						isOpen={true}
						initialCandidates={[hubCandidateWithoutPhone]}
					/>,
				);
			});

			const waBtn = findNodeByTestId(container, "recall-whatsapp-btn-hub-rec-no-phone");
			const tgBtn = findNodeByTestId(container, "recall-telegram-btn-hub-rec-no-phone");
			const smsBtn = findNodeByTestId(container, "recall-sms-btn-hub-rec-no-phone");

			// Test WhatsApp click
			await clickNode(waBtn!);
			expect(vi.mocked(showToast)).toHaveBeenCalledWith(
				"У пациента не указан номер телефона. Укажите номер в карточке пациента",
				"warning",
			);

			// Test Telegram click
			await clickNode(tgBtn!);
			expect(vi.mocked(showToast)).toHaveBeenCalledWith(
				"У пациента не указан номер телефона. Укажите номер в карточке пациента",
				"warning",
			);

			// Test SMS click
			await clickNode(smsBtn!);
			expect(vi.mocked(showToast)).toHaveBeenCalledWith(
				"У пациента не указан номер телефона. Укажите номер в карточке пациента",
				"warning",
			);
		});

		it("zero emojis or raw unicode checkmarks in SMS copy button (Mandate 8d)", async () => {
			await act(async () => {
				root.render(
					<PatientRecallsHubModal
						isOpen={true}
						initialCandidates={[hubCandidateWithoutPhone]}
					/>,
				);
			});

			const smsBtn = findNodeByTestId(container, "recall-sms-btn-hub-rec-no-phone");
			expect(smsBtn).not.toBeNull();

			// Verify initial state has no unicode checkmark
			expect(smsBtn?.textContent).not.toContain("✓");
			// Check for emoji ranges
			const hasEmoji = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(smsBtn?.textContent || "");
			expect(hasEmoji).toBe(false);
		});
	});
});
