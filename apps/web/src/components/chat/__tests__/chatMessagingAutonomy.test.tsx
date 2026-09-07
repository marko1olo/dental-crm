/**
 * chatMessagingAutonomy.test.tsx
 *
 * Unit tests for Chat & Omnichannel Messaging Autonomy:
 * - Mandate 8e: Doctor & Staff Autonomy (Send buttons are NEVER disabled on empty text; 1-click fallback reminder preset).
 * - Mandate 8d: 7 Deadly Sins & Touch Targets (Touch targets strictly >= 44x44px).
 * - Mandate 8k: CRM != Reality Simulator (Friction-Killer Law; instant clinical preset populates without blocking).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No bureaucracy, unblocked communication).
 * - Mandate 8o: Scope-Bounded Verifiable Assertions.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";

// Mock GlobalToast so showToast can be spied on directly
vi.mock("../../GlobalToast", () => ({
	showToast: vi.fn(),
}));

import { showToast } from "../../GlobalToast";
import { PatientOmnichannelHubModal } from "../../messaging/PatientOmnichannelHubModal";
import { WhatsAppChatPanel } from "../WhatsAppChatPanel";

interface MockDomNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	children: MockDomNode[];
	childNodes: MockDomNode[];
	options?: MockDomNode[];
	selected?: boolean;
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

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	// biome-ignore lint/suspicious/noExplicitAny: mock DOM
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
				right: 1200,
				bottom: 900,
				width: 1200,
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
		HTMLSelectElement: class {},
		HTMLOptionElement: class {},
	};
	(doc as unknown as { defaultView: typeof win }).defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill globals
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.HTMLSelectElement = win.HTMLSelectElement;
	g.HTMLOptionElement = win.HTMLOptionElement;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	if (!g.fetch) {
		g.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({}),
		});
	}

	return { doc, win };
}

function findNode(
	node: MockDomNode | null,
	predicate: (n: MockDomNode) => boolean,
): MockDomNode | null {
	if (!node) return null;
	if (predicate(node)) return node;
	if (node.children) {
		for (const child of node.children) {
			const res = findNode(child, predicate);
			if (res) return res;
		}
	}
	return null;
}

function isNodeDisabled(node: MockDomNode): boolean {
	if (Boolean(node.disabled)) return true;
	if (
		node.getAttribute?.("disabled") !== null &&
		node.getAttribute?.("disabled") !== undefined &&
		node.getAttribute?.("disabled") !== "false"
	)
		return true;
	const reactPropKey = Object.keys(node).find((k) =>
		k.startsWith("__reactProps$"),
	);
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

const mockAppLogicContext = {
	dashboard: {
		patients: [
			{
				id: "pat-101",
				fullName: "Смирнов Алексей Викторович",
				phone: "+7 (999) 111-22-33",
			},
		],
		patientInsights: [],
		insuranceContracts: [],
		appointments: [],
		clinicSettings: {
			name: "ДЕНТЕ",
			staff: [],
		},
		todayIso: "2026-09-07",
	},
} as unknown as AppLogicContextType;

describe("Chat & Omnichannel Messaging Autonomy Suite (Mandates 8e, 8d, 8k, 8n, 8o)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("WhatsAppChatPanel Autonomy", () => {
		it("send button is NOT disabled when input text is empty (disabled === false)", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<AppLogicProvider value={mockAppLogicContext}>
						<WhatsAppChatPanel
							patientId="pat-101"
							patientName="Смирнов Алексей Викторович"
							patientPhone="+7 (999) 111-22-33"
						/>
					</AppLogicProvider>,
				);
			});

			const sendButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.getAttribute("aria-label") === "Отправить сообщение",
			);

			expect(sendButton).not.toBeNull();
			if (sendButton) {
				// Assert send button is active and NOT disabled when text is empty
				expect(isNodeDisabled(sendButton)).toBe(false);
				expect(sendButton.disabled).toBe(false);
				// Assert disabled:pointer-events-none is NOT present so clicks are received
				expect(sendButton.className).not.toContain("disabled:pointer-events-none");
			}
		});

		it("send button is disabled ONLY when isSending is true", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			// Setup fetch with a pending delay to observe isSending state
			let resolveFetch!: (val: unknown) => void;
			const pendingFetch = new Promise((resolve) => {
				resolveFetch = resolve;
			});
			// biome-ignore lint/suspicious/noExplicitAny: mock fetch
			(globalThis as any).fetch = vi.fn().mockImplementation(() => pendingFetch);

			await act(async () => {
				root.render(
					<AppLogicProvider value={mockAppLogicContext}>
						<WhatsAppChatPanel
							patientId="pat-101"
							patientName="Смирнов Алексей Викторович"
							patientPhone="+7 (999) 111-22-33"
						/>
					</AppLogicProvider>,
				);
			});

			const sendButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.getAttribute("aria-label") === "Отправить сообщение",
			);
			expect(sendButton).not.toBeNull();

			// First click with empty text triggers reminder preset population
			if (sendButton) {
				await clickNode(sendButton);
			}

			// Second click sends the message and transitions to isSending === true
			if (sendButton) {
				await act(async () => {
					// We invoke click without waiting for fetch resolution
					const reactPropKey = Object.keys(sendButton).find((k) =>
						k.startsWith("__reactProps$"),
					);
					if (reactPropKey) {
						// biome-ignore lint/suspicious/noExplicitAny: trigger onClick
						(sendButton as any)[reactPropKey]?.onClick?.({
							type: "click",
							preventDefault: () => {},
							stopPropagation: () => {},
						});
					}
				});

				// While sending, button is disabled and indicates "Отправка..."
				expect(isNodeDisabled(sendButton)).toBe(true);
			}

			// Complete the request
			await act(async () => {
				resolveFetch({
					ok: true,
					status: 200,
					json: async () => ({ success: true }),
				});
			});

			// Once completed, send button is re-enabled
			if (sendButton) {
				expect(isNodeDisabled(sendButton)).toBe(false);
			}
		});

		it("clicking send with empty text populates standard clinical reminder preset and triggers toast", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<AppLogicProvider value={mockAppLogicContext}>
						<WhatsAppChatPanel
							patientId="pat-101"
							patientName="Смирнов Алексей Викторович"
							patientPhone="+7 (999) 111-22-33"
						/>
					</AppLogicProvider>,
				);
			});

			const sendButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.getAttribute("aria-label") === "Отправить сообщение",
			);
			const textarea = findNode(container, (n) => n.tagName === "TEXTAREA");

			expect(sendButton).not.toBeNull();
			expect(textarea).not.toBeNull();

			// Click send with empty text
			if (sendButton) {
				await clickNode(sendButton);
			}

			// Verify showToast was triggered with required guidance message
			expect(showToast).toHaveBeenCalledWith(
				"Подставлен стандартный шаблон напоминания. Нажмите Enter или «Отправить»",
				"info",
			);

			// Verify textarea is populated with the standard clinical reminder preset
			const expectedPreset =
				"Здравствуйте! Напоминаем о вашей записи на приём в клинику ДЕНТЕ. Если у вас возникли вопросы, пожалуйста, сообщите нам.";

			// Check textarea value or React state
			const reactPropKey = Object.keys(textarea!).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				// biome-ignore lint/suspicious/noExplicitAny: verify react props value
				const props = (textarea as any)[reactPropKey];
				expect(props.value).toBe(expectedPreset);
			}
		});

		it("touch targets meet >= 44x44px ergonomic law (Mandate 8d)", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<AppLogicProvider value={mockAppLogicContext}>
						<WhatsAppChatPanel
							patientId="pat-101"
							patientName="Смирнов Алексей Викторович"
							patientPhone="+7 (999) 111-22-33"
							onClose={() => {}}
						/>
					</AppLogicProvider>,
				);
			});

			const sendButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.getAttribute("aria-label") === "Отправить сообщение",
			);
			expect(sendButton).not.toBeNull();
			if (sendButton) {
				expect(sendButton.className).toContain("min-h-[44px]");
				expect(sendButton.className).toContain("min-w-[44px]");
			}

			const backButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.getAttribute("aria-label") === "Назад / Закрыть чат",
			);
			expect(backButton).not.toBeNull();
			if (backButton) {
				expect(backButton.className).toContain("min-h-[44px]");
				expect(backButton.className).toContain("min-w-[44px]");
			}
		});
	});

	describe("PatientOmnichannelHubModal Autonomy", () => {
		it("send button is NOT disabled when messageText is empty (disabled === false)", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<PatientOmnichannelHubModal
						isOpen={true}
						onClose={() => {}}
						initialPatientId="pat-101"
						clinicName="ДЕНТЕ"
					/>,
				);
			});

			const sendButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.className?.includes("hub-btn-send"),
			);

			expect(sendButton).not.toBeNull();
			if (sendButton) {
				expect(isNodeDisabled(sendButton)).toBe(false);
				expect(sendButton.disabled).toBe(false);
			}
		});

		it("clicking send with empty text populates standard clinical template and triggers toast", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<PatientOmnichannelHubModal
						isOpen={true}
						onClose={() => {}}
						initialPatientId="pat-101"
						clinicName="ДЕНТЕ"
					/>,
				);
			});

			const sendButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.className?.includes("hub-btn-send"),
			);
			const textarea = findNode(
				container,
				(n) => n.tagName === "TEXTAREA" && n.className?.includes("hub-message-textarea"),
			);

			expect(sendButton).not.toBeNull();
			expect(textarea).not.toBeNull();

			// Click send with empty text
			if (sendButton) {
				await clickNode(sendButton);
			}

			// Verify showToast was triggered with required guidance message
			expect(showToast).toHaveBeenCalledWith(
				"Подставлен шаблон сообщения. Нажмите «Отправить»",
				"info",
			);

			// Verify textarea is populated with clinical template
			const reactPropKey = Object.keys(textarea!).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				// biome-ignore lint/suspicious/noExplicitAny: verify react props value
				const props = (textarea as any)[reactPropKey];
				expect(props.value).toBeTruthy();
				expect(typeof props.value).toBe("string");
				expect(props.value.length).toBeGreaterThan(0);
				expect(props.value).toContain("ДЕНТЕ");
			}
		});

		it("touch targets meet >= 44px ergonomic law (Mandate 8d)", async () => {
			const { doc } = setupMockDom();
			const container = doc.createElement("div");
			doc.body.appendChild(container);
			const root: Root = createRoot(container as unknown as HTMLElement);

			await act(async () => {
				root.render(
					<PatientOmnichannelHubModal
						isOpen={true}
						onClose={() => {}}
						initialPatientId="pat-101"
						clinicName="ДЕНТЕ"
					/>,
				);
			});

			const sendButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.className?.includes("hub-btn-send"),
			);
			expect(sendButton).not.toBeNull();
			if (sendButton) {
				expect(sendButton.className).toContain("min-h-[44px]");
				expect(sendButton.className).toContain("min-w-[44px]");
				expect(sendButton.style.minHeight).toBe("44px");
				expect(sendButton.style.minWidth).toBe("44px");
			}

			const attachButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.className?.includes("hub-icon-action-btn"),
			);
			expect(attachButton).not.toBeNull();
			if (attachButton) {
				expect(attachButton.className).toContain("min-h-[44px]");
				expect(attachButton.className).toContain("min-w-[44px]");
				expect(attachButton.style.minHeight).toBe("44px");
				expect(attachButton.style.minWidth).toBe("44px");
			}

			const closeButton = findNode(
				container,
				(n) => n.tagName === "BUTTON" && n.className?.includes("omnichannel-modal-close"),
			);
			expect(closeButton).not.toBeNull();
			if (closeButton) {
				expect(closeButton.className).toContain("min-h-[44px]");
				expect(closeButton.className).toContain("min-w-[44px]");
				expect(closeButton.style.minHeight).toBe("44px");
				expect(closeButton.style.minWidth).toBe("44px");
			}
		});
	});
});
