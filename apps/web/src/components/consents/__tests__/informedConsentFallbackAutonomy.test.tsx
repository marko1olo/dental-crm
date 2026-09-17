/**
 * informedConsentFallbackAutonomy.test.tsx
 *
 * Unit tests for Pure Print-First Informed Consent Autonomy (Mandates 8e, 8i, 8k, 8n):
 * - Eradication of stylus canvas and SMS OTP procedural simulator bloat.
 * - Print-first triggers: filled A4 print and blank («________») package print.
 * - 1-Click Paper Confirmation with SHA-256 integrity hash.
 * - Multi-document package batch confirmation in 1 click.
 *
 * CONSTITUTION & RULES:
 * - THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (Instant print in 1 click; 0 disabled buttons)
 * - Mandate 8i: Specialized Outpatient Context (Form 043/u, 323-FZ Art. 20, 1051n)
 * - Mandate 8k: CRM != Reality Simulator (Friction-Killer Law; paper-first reality)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
	InformedConsentModal,
	type SignedConsentPayload,
} from "../InformedConsentModal.js";

function createMockFn<T extends (...args: any[]) => any>(impl?: T) {
	const calls: any[][] = [];
	const fn = Object.assign(
		(...args: any[]) => {
			calls.push(args);
			return impl ? impl(...args) : undefined;
		},
		{
			mock: { calls },
		},
	);
	return fn;
}

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
		print: createMockFn(),
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

describe("Informed Consent Pure Print-First & Paper Autonomy (Mandates 8e, 8i, 8k, 8n)", () => {
	const mockPatient = {
		fullName: "Сидоров Алексей Петрович",
		birthDate: "12.04.1988",
		passport: "4510 № 888999",
		phone: "+7 (916) 555-44-33",
		cardNumber: "043-2026/89",
	};

	it("renders pure Print-First console with ZERO canvas and ZERO SMS OTP simulator elements", () => {
		const html = renderToString(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				initialMode="single"
				patient={mockPatient}
				doctorName="Д-р Смирнов А. В."
				diagnosisIcd="K02.1"
				toothNumbers="1.6"
			/>,
		);

		// Zero touchscreen canvas simulator
		assert.ok(!html.includes("<canvas"));
		assert.ok(!html.includes("consent-canvas-element"));
		assert.ok(!html.includes("Распишитесь стилусом"));

		// Zero SMS OTP inputs
		assert.ok(!html.includes("consent-otp-digit"));
		assert.ok(!html.includes("otp-digit-0"));
		assert.ok(!html.includes("Отправить код по SMS"));

		// Print and statutory elements are prominent
		assert.ok(html.includes("323-ФЗ • 1051н"));
		assert.ok(html.includes("Подписание на бумажном носителе (323-ФЗ ст. 20, Приказ МЗ РФ № 1051н)"));
		assert.ok(html.includes('data-testid="checkbox-paper-original-stored"'));
		assert.ok(html.includes('data-testid="btn-confirm-sign"'));
		// Mandate 8e: Confirm button is NEVER disabled
		assert.ok(!html.includes('data-testid="btn-confirm-sign" disabled'));
	});

	it("renders prominent print actions: filled A4 print and blank («________») print buttons", () => {
		const html = renderToString(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				initialMode="packages"
				initialPackageKey="PACKAGE_PRIMARY_VISIT"
				patient={mockPatient}
				doctorName="Д-р Смирнов А. В."
			/>,
		);

		assert.ok(html.includes("Печать пакета (А4)"));
		assert.ok(html.includes('data-testid="btn-print-blank-consent"'));
		assert.ok(html.includes("Печать чистых бланков пакета («________»)"));
		assert.ok(html.includes('data-testid="btn-print-blank-consent-inline"'));
	});

	it("clicking btn-confirm-paper-signed confirms in 1 click with verificationMethod: paper_physical", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onConsentSigned = createMockFn();
		const onClose = createMockFn();

		await act(async () => {
			root.render(
				<InformedConsentModal
					isOpen={true}
					onClose={onClose}
					initialMode="single"
					patient={mockPatient}
					doctorName="Д-р Смирнов А. В."
					diagnosisIcd="K02.1"
					toothNumbers="1.6"
					onConsentSigned={onConsentSigned}
				/>,
			);
		});

		const confirmPaperBtn = findNodeByTestId(
			doc.body,
			"btn-confirm-paper-signed",
		);
		assert.ok(confirmPaperBtn !== null);

		await clickNode(confirmPaperBtn!);

		assert.strictEqual(onConsentSigned.mock.calls.length, 1);
		const payload: SignedConsentPayload = onConsentSigned.mock.calls[0]![0];
		assert.strictEqual(payload.verificationMethod, "paper_physical");
		assert.strictEqual(payload.paperOriginalStored, true);
		assert.strictEqual(payload.attachedToForm043u, true);
		assert.strictEqual(payload.patientName, "Сидоров Алексей Петрович");
		assert.ok(payload.signatureSvg.includes("ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ"));
		assert.strictEqual(onClose.mock.calls.length, 1);

		await act(async () => {
			root.unmount();
		});
	});

	it("clicking primary btn-confirm-sign confirms in 1 click without disabling blockers", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onConsentSigned = createMockFn();
		const onConsentConfirmed = createMockFn();
		const onClose = createMockFn();

		await act(async () => {
			root.render(
				<InformedConsentModal
					isOpen={true}
					onClose={onClose}
					initialMode="single"
					patient={mockPatient}
					doctorName="Д-р Смирнов А. В."
					diagnosisIcd="K02.1"
					toothNumbers="1.6"
					onConsentSigned={onConsentSigned}
					onConsentConfirmed={onConsentConfirmed}
				/>,
			);
		});

		const mainConfirmBtn = findNodeByTestId(doc.body, "btn-confirm-sign");
		assert.ok(mainConfirmBtn !== null);

		await clickNode(mainConfirmBtn!);

		assert.strictEqual(onConsentSigned.mock.calls.length, 1);
		const payload: SignedConsentPayload = onConsentSigned.mock.calls[0]![0];
		assert.strictEqual(payload.verificationMethod, "paper_physical");
		assert.strictEqual(payload.paperOriginalStored, true);
		assert.strictEqual(payload.attachedToForm043u, true);
		assert.strictEqual(onConsentConfirmed.mock.calls.length, 1);
		assert.strictEqual(onClose.mock.calls.length, 1);

		await act(async () => {
			root.unmount();
		});
	});

	it("in package batch mode: confirms all 4 documents in 1 click with paper_physical", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onConsentSigned = createMockFn();
		const onPackageSigned = createMockFn();
		const onClose = createMockFn();

		await act(async () => {
			root.render(
				<InformedConsentModal
					isOpen={true}
					onClose={onClose}
					initialMode="packages"
					initialPackageKey="PACKAGE_PRIMARY_VISIT"
					patient={mockPatient}
					doctorName="Д-р Смирнов А. В."
					onConsentSigned={onConsentSigned}
					onPackageSigned={onPackageSigned}
				/>,
			);
		});

		const confirmBtn = findNodeByTestId(doc.body, "btn-confirm-sign");
		assert.ok(confirmBtn !== null);

		await clickNode(confirmBtn!);

		// PACKAGE_PRIMARY_VISIT has 4 documents (152-FZ, 1051n, Anesthesia, Therapy)
		assert.strictEqual(onConsentSigned.mock.calls.length, 4);
		assert.strictEqual(onPackageSigned.mock.calls.length, 1);

		const packagePayloads: SignedConsentPayload[] =
			onPackageSigned.mock.calls[0]![0];
		assert.strictEqual(packagePayloads.length, 4);
		for (const p of packagePayloads) {
			assert.strictEqual(p.verificationMethod, "paper_physical");
			assert.strictEqual(p.paperOriginalStored, true);
			assert.strictEqual(p.attachedToForm043u, true);
			assert.ok(p.statusText?.includes("Бумажный оригинал пакета подписан"));
		}
		assert.strictEqual(onClose.mock.calls.length, 1);

		await act(async () => {
			root.unmount();
		});
	});
});
