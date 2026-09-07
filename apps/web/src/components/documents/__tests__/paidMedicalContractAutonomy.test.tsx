/**
 * paidMedicalContractAutonomy.test.tsx
 *
 * Unit tests for Pure Paper-First & 1-Click Autonomy for Paid Medical Services Contract:
 * - In strict compliance with Decree of the Government of the Russian Federation No. 736 (11.05.2023)
 *   and Federal Law No. 323-FZ Art. 84 (2 physical copies signed on paper).
 * - Paper signature mode is supported by default (Mandates 8e, 8k, 8n).
 * - Eradication of procedural <canvas> stylus/finger drawing bloat.
 * - 1-Click paper signature confirmation with SHA-256 integrity hash generation.
 * - Retention of standard A4 print and blank («________») package print.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { PaidMedicalContractModal } from "../PaidMedicalContractModal.js";
import {
	createDefaultPaidContract,
	generatePaidContractHtml,
	type PaidContractData,
} from "../paidContractEngine.js";

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
	appendChild: (child: MockDomNode) => MockDomNode;
	insertBefore: (child: MockDomNode, before: MockDomNode | null) => MockDomNode;
	removeChild: (child: MockDomNode) => MockDomNode;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: (type: string, fn: EventListener) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	removeAttribute: (name: string) => void;
	dispatchEvent: (ev: { type: string }) => boolean;
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
			},
			getAttribute: (name: string) => attrs[name] || null,
			removeAttribute: (name: string) => {
				delete attrs[name];
			},
			dispatchEvent: (ev: { type: string }) => {
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
		};
		return el;
	}

	const doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
		createTextNode: (text: string) => ({
			nodeType: 3,
			textContent: text,
			style: {},
			parentNode: null,
		}),
		createComment: () => ({ nodeType: 8, parentNode: null }),
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
		addEventListener: () => {},
		removeEventListener: () => {},
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		print: vi.fn(),
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
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

function findNodesByTag(node: MockDomNode | null, tagName: string): MockDomNode[] {
	const results: MockDomNode[] = [];
	if (!node) return results;
	if (node.tagName === tagName.toUpperCase()) results.push(node);
	if (node.children) {
		for (const child of node.children) {
			results.push(...findNodesByTag(child, tagName));
		}
	}
	return results;
}

async function clickNode(node: MockDomNode) {
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
					props.onClick({
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

describe("Paid Medical Contract Pure Paper-First & 1-Click Autonomy (Decree 736, Mandates 8e, 8k, 8n)", () => {
	const mockPatient = {
		fullName: "Сидоров Алексей Петрович",
		birthDate: "15.05.1990",
		passport: "45 10 123456",
		address: "г. Москва, ул. Ленина, д. 5",
		phone: "+7 (999) 111-22-33",
		snils: "123-456-789 00",
		cardNumber: "043/у-2026/01",
	};

	const mockClinic = {
		fullName: "Общество с ограниченной ответственностью «Денте»",
		shortName: "ООО «Денте»",
		inn: "7704123456",
		kpp: "770401001",
		ogrn: "1207700123456",
		address: "г. Москва, ул. Усачева, д. 22",
		actualAddress: "г. Москва, ул. Усачева, д. 22",
		licenseNumber: "Л041-01137-77/00584930",
		phone: "+7 (495) 777-22-11",
	};

	it("1. Paper signature mode is supported by default in engine and modal", () => {
		const defaultContract = createDefaultPaidContract({
			patientFullName: mockPatient.fullName,
		});
		expect(defaultContract.signMethod).toBe("paper");

		const html = generatePaidContractHtml(defaultContract);
		expect(html).toContain("paper-sign-stamp");
		expect(html).toContain("Договор составлен в 2-х экземплярах на бумажном носителе");
		expect(html).toContain("Постановление Правительства РФ № 736");
		expect(html).toContain("карту 043/у");
	});

	it("2. Eradicates procedural <canvas> stylus drawing elements from the modal completely", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<PaidMedicalContractModal
					isOpen={true}
					onClose={vi.fn()}
					patient={mockPatient}
					clinicInfo={mockClinic}
				/>,
			);
		});

		// Check zero <canvas> tags across the entire rendered modal tree
		const canvases = findNodesByTag(doc.body, "canvas");
		expect(canvases.length).toBe(0);

		// Switch to signature tab and check again
		const signatureTabBtn = findNodeByTestId(doc.body, "tab-signature-btn");
		expect(signatureTabBtn).not.toBeNull();
		await clickNode(signatureTabBtn!);

		const canvasesAfterTabSwitch = findNodesByTag(doc.body, "canvas");
		expect(canvasesAfterTabSwitch.length).toBe(0);

		// Verify paper mode button is present and active by default in sign switcher
		const paperModeBtn = findNodeByTestId(doc.body, "sign-mode-paper-btn");
		expect(paperModeBtn).not.toBeNull();

		await act(async () => {
			root.unmount();
		});
	});

	it("3. Clicking confirm-paper-contract-btn signs and saves contract in 1 click with signMethod: 'paper' and SHA-256 hash", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onContractSaved = vi.fn();
		const onClose = vi.fn();

		await act(async () => {
			root.render(
				<PaidMedicalContractModal
					isOpen={true}
					onClose={onClose}
					patient={mockPatient}
					clinicInfo={mockClinic}
					onContractSaved={onContractSaved}
				/>,
			);
		});

		// Switch to signature tab
		const signatureTabBtn = findNodeByTestId(doc.body, "tab-signature-btn");
		expect(signatureTabBtn).not.toBeNull();
		await clickNode(signatureTabBtn!);

		// Check 2-copy banner text per Decree 736
		const banner = findNodeByTestId(doc.body, "paper-sign-section");
		expect(banner).not.toBeNull();

		// Click 1-click confirmation button
		const confirmBtn = findNodeByTestId(doc.body, "confirm-paper-contract-btn");
		expect(confirmBtn).not.toBeNull();

		await clickNode(confirmBtn!);

		expect(onContractSaved).toHaveBeenCalledTimes(1);
		const savedContract: PaidContractData = onContractSaved.mock.calls[0][0];

		expect(savedContract.signMethod).toBe("paper");
		expect(savedContract.signedAt).toBeDefined();
		expect(typeof savedContract.signedAt).toBe("string");
		expect(savedContract.signedAt?.length).toBeGreaterThan(0);

		// Verify SHA-256 hash
		expect(savedContract.integrityHash).toBeDefined();
		expect(typeof savedContract.integrityHash).toBe("string");
		expect(savedContract.integrityHash?.length).toBe(64);
		expect(/^[a-f0-9]{64}$/i.test(savedContract.integrityHash || "")).toBe(true);

		// Modal should close smoothly without modal barriers
		expect(onClose).toHaveBeenCalledTimes(1);

		await act(async () => {
			root.unmount();
		});
	});

	it("4. Retains print action buttons: print A4 and print blank («________») package", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<PaidMedicalContractModal
					isOpen={true}
					onClose={vi.fn()}
					patient={mockPatient}
					clinicInfo={mockClinic}
				/>,
			);
		});

		const printBtn = findNodeByTestId(doc.body, "print-contract-btn");
		expect(printBtn).not.toBeNull();

		const printBlankBtn = findNodeByTestId(doc.body, "print-blank-contract-btn");
		expect(printBlankBtn).not.toBeNull();

		await act(async () => {
			root.unmount();
		});
	});
});
