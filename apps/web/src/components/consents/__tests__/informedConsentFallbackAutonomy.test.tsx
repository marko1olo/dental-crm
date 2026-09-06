/**
 * informedConsentFallbackAutonomy.test.tsx
 *
 * Unit tests for 1-Click Paper Fallback Autonomy in InformedConsentModal:
 * - In tablet_stylus mode with empty strokes: btn-stylus-paper-fallback unblocks signing in 1 click
 * - In sms_otp mode with unverified OTP: btn-sms-paper-fallback unblocks signing in 1 click
 *
 * CONSTITUTION & RULES:
 * - THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (No disabled buttons holding clinicians hostage)
 * - Mandate 8k: CRM != Reality Simulator (Friction-Killer Law)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
	InformedConsentModal,
	type SignedConsentPayload,
} from "../InformedConsentModal.js";

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
	getContext?: (type: string) => unknown;
	toDataURL?: (type?: string) => string;
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
				right: 600,
				bottom: 200,
				width: 600,
				height: 200,
			}),
			getContext: () => null,
			toDataURL: () =>
				"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
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

async function clickNode(node: MockDomNode) {
	await act(async () => {
		// Look up React props attached to node
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
		// Fallback to dispatchEvent
		node.dispatchEvent({ type: "click" });
	});
}

describe("Informed Consent 1-Click Stylus & SMS Fallback Autonomy (Mandates 8e, 8k, 8n)", () => {
	const mockPatient = {
		fullName: "Сидоров Алексей Петрович",
		birthDate: "12.04.1988",
		passport: "4510 № 888999",
		phone: "+7 (916) 555-44-33",
		cardNumber: "043-2026/89",
	};

	it("renders fallback button markup in tablet_stylus mode", () => {
		const html = renderToString(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				initialMode="single"
				initialVerificationMethod="tablet_stylus"
				patient={mockPatient}
				doctorName="Д-р Смирнов А. В."
				diagnosisIcd="K02.1"
				toothNumbers="1.6"
			/>,
		);

		expect(html).toContain('data-testid="btn-stylus-paper-fallback"');
		expect(html).toContain("На бумаге (1 клик)");
		expect(html).toContain(
			"Пациент расписался на бумаге — подтвердить в 1 клик (Мандат 8e)",
		);
		// Main confirm button is disabled because strokes are empty
		expect(html).toContain('data-testid="btn-confirm-sign" disabled');
	});

	it("renders fallback button markup in sms_otp mode", () => {
		const html = renderToString(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				initialMode="single"
				initialVerificationMethod="sms_otp"
				patient={mockPatient}
				doctorName="Д-р Смирнов А. В."
				diagnosisIcd="K02.1"
				toothNumbers="1.6"
			/>,
		);

		expect(html).toContain('data-testid="btn-sms-paper-fallback"');
		expect(html).toContain("На бумаге при сбое SMS (1 клик)");
		expect(html).toContain(
			"Код SMS не пришел — подтвердить на бумаге в 1 клик (Мандат 8e)",
		);
		// Main confirm button is disabled because OTP is unverified
		expect(html).toContain('data-testid="btn-confirm-sign" disabled');
	});

	it("in tablet_stylus mode with empty strokes: clicking btn-stylus-paper-fallback triggers onConsentSigned with verificationMethod: paper_physical", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onConsentSigned = vi.fn();
		const onClose = vi.fn();

		await act(async () => {
			root.render(
				<InformedConsentModal
					isOpen={true}
					onClose={onClose}
					initialMode="single"
					initialVerificationMethod="tablet_stylus"
					patient={mockPatient}
					doctorName="Д-р Смирнов А. В."
					diagnosisIcd="K02.1"
					toothNumbers="1.6"
					onConsentSigned={onConsentSigned}
				/>,
			);
		});

		const fallbackBtn = findNodeByTestId(
			doc.body,
			"btn-stylus-paper-fallback",
		);
		expect(fallbackBtn).not.toBeNull();

		await clickNode(fallbackBtn!);

		expect(onConsentSigned).toHaveBeenCalledTimes(1);
		const payload: SignedConsentPayload = onConsentSigned.mock.calls[0][0];
		expect(payload.verificationMethod).toBe("paper_physical");
		expect(payload.paperOriginalStored).toBe(true);
		expect(payload.attachedToForm043u).toBe(true);
		expect(payload.patientName).toBe("Сидоров Алексей Петрович");
		expect(payload.signatureSvg).toContain("ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ");
		expect(onClose).toHaveBeenCalledTimes(1);

		await act(async () => {
			root.unmount();
		});
	});

	it("in sms_otp mode with unverified OTP: clicking btn-sms-paper-fallback triggers onConsentSigned with verificationMethod: paper_physical", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onConsentSigned = vi.fn();
		const onClose = vi.fn();

		await act(async () => {
			root.render(
				<InformedConsentModal
					isOpen={true}
					onClose={onClose}
					initialMode="single"
					initialVerificationMethod="sms_otp"
					patient={mockPatient}
					doctorName="Д-р Смирнов А. В."
					diagnosisIcd="K02.1"
					toothNumbers="1.6"
					onConsentSigned={onConsentSigned}
				/>,
			);
		});

		const fallbackBtn = findNodeByTestId(doc.body, "btn-sms-paper-fallback");
		expect(fallbackBtn).not.toBeNull();

		await clickNode(fallbackBtn!);

		expect(onConsentSigned).toHaveBeenCalledTimes(1);
		const payload: SignedConsentPayload = onConsentSigned.mock.calls[0][0];
		expect(payload.verificationMethod).toBe("paper_physical");
		expect(payload.paperOriginalStored).toBe(true);
		expect(payload.attachedToForm043u).toBe(true);
		expect(payload.patientName).toBe("Сидоров Алексей Петрович");
		expect(payload.signatureSvg).toContain("ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ");
		expect(onClose).toHaveBeenCalledTimes(1);

		await act(async () => {
			root.unmount();
		});
	});

	it("in package batch mode: clicking stylus fallback signs all package documents with paper_physical", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onConsentSigned = vi.fn();
		const onPackageSigned = vi.fn();
		const onClose = vi.fn();

		await act(async () => {
			root.render(
				<InformedConsentModal
					isOpen={true}
					onClose={onClose}
					initialMode="packages"
					initialPackageKey="PACKAGE_PRIMARY_VISIT"
					initialVerificationMethod="tablet_stylus"
					patient={mockPatient}
					doctorName="Д-р Смирнов А. В."
					onConsentSigned={onConsentSigned}
					onPackageSigned={onPackageSigned}
				/>,
			);
		});

		const fallbackBtn = findNodeByTestId(
			doc.body,
			"btn-stylus-paper-fallback",
		);
		expect(fallbackBtn).not.toBeNull();

		await clickNode(fallbackBtn!);

		// PACKAGE_PRIMARY_VISIT has 4 documents (152-FZ, 1051n, Anesthesia, Therapy)
		expect(onConsentSigned).toHaveBeenCalledTimes(4);
		expect(onPackageSigned).toHaveBeenCalledTimes(1);

		const packagePayloads: SignedConsentPayload[] =
			onPackageSigned.mock.calls[0][0];
		expect(packagePayloads.length).toBe(4);
		for (const p of packagePayloads) {
			expect(p.verificationMethod).toBe("paper_physical");
			expect(p.paperOriginalStored).toBe(true);
			expect(p.attachedToForm043u).toBe(true);
		}
		expect(onClose).toHaveBeenCalledTimes(1);

		await act(async () => {
			root.unmount();
		});
	});
});
