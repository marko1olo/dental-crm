/**
 * chairsideConsentPaperAutonomy.test.tsx
 *
 * Unit tests for Chairside Tablet Consent Pure Autonomy & Paper Fallback (Mandates 8e, 8i, 8k, 8n):
 * 1. signPackageWithPaperPhysical produces signed package with verificationMethod: "paper_physical"
 * 2. chairside-print-package-btn renders in ChairsideTabletConsentModal
 * 3. chairside-paper-confirm-btn renders in ChairsideTabletConsentModal and confirms package without requiring 4-digit SMS OTP
 * 4. Doctor is NEVER blocked if SMS fails, cell signal is lost, or patient has no phone
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const vi = {
	fn: (impl?: any) => {
		const f: any = (...args: any[]) => {
			f.mock.calls.push(args);
			return impl?.(...args);
		};
		f.mock = { calls: [] };
		return f;
	},
};

const expect = (val: any) => {
	const notObj = {
		toBeNull: () => assert.notStrictEqual(val, null),
		toContain: (str: string) => assert.ok(!String(val).includes(str), `Expected ${val} not to contain ${str}`),
	};
	return {
		not: notObj,
		toBe: (expected: any) => assert.strictEqual(val, expected),
		toEqual: (expected: any) => assert.deepStrictEqual(val, expected),
		toBeDefined: () => assert.ok(val !== undefined && val !== null),
		toBeNull: () => assert.strictEqual(val, null),
		toMatch: (regex: RegExp) => assert.match(String(val), regex),
		toContain: (str: string) => assert.ok(String(val).includes(str), `Expected ${val} to contain ${str}`),
		toHaveBeenCalled: () => assert.ok((val as any)?.mock?.calls?.length > 0),
		toHaveBeenCalledTimes: (times: number) => assert.strictEqual((val as any)?.mock?.calls?.length, times),
	};
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
	createChairsideConsentPackage,
	sendChairsideSmsOtpToPatient,
	signPackageWithPaperPhysical,
	type ChairsideConsentPackage,
	type ChairsideDoctorProfile,
	type ChairsidePatientProfile,
	type ChairsideTreatmentItem,
} from "../chairsideConsentEngine.js";
import { InformedConsentModal } from "../../consents/InformedConsentModal.js";

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
	focus?: () => void;
	blur?: () => void;
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
				right: 1024,
				bottom: 768,
				width: 1024,
				height: 768,
			}),
			getContext: () => null,
			focus: () => {},
			blur: () => {},
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

function findAllNodesByTestId(
	node: MockDomNode | null,
	testId: string,
	acc: MockDomNode[] = [],
): MockDomNode[] {
	if (!node) return acc;
	if (node.getAttribute?.("data-testid") === testId) {
		acc.push(node);
	}
	if (node.children) {
		for (const child of node.children) {
			findAllNodesByTestId(child, testId, acc);
		}
	}
	return acc;
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

function findNodeById(node: MockDomNode | null, id: string): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.("id") === id || node.id === id) return node;
	if (node.children) {
		for (const child of node.children) {
			const res = findNodeById(child, id);
			if (res) return res;
		}
	}
	return null;
}

async function changeInput(node: MockDomNode, value: string) {
	await act(async () => {
		const reactPropKey = Object.keys(node).find((k) =>
			k.startsWith("__reactProps$"),
		);
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onChange === "function") {
				props.onChange({
					target: { value },
				});
				return;
			}
		}
	});
}

function getNodeText(node: MockDomNode | null): string {
	if (!node) return "";
	let text = typeof node.textContent === "string" ? node.textContent : "";
	if (node.childNodes) {
		for (const child of node.childNodes) {
			text += getNodeText(child);
		}
	}
	return text;
}

describe("Chairside Tablet Consent Paper Autonomy Suite (Mandates 8e, 8i, 8k, 8n)", () => {
	const mockPatient: ChairsidePatientProfile = {
		fullName: "Кузнецова Мария Викторовна",
		birthDate: "20.10.1992",
		passport: "Паспорт РФ 4512 № 789123",
		phone: "+7 (926) 333-22-11",
		snils: "145-678-901 22",
		cardNumber: "043/у-5514",
	};

	const mockDoctor: ChairsideDoctorProfile = {
		fullName: "Ковалев Андрей Васильевич",
		specialty: "Врач-стоматолог-ортопед, хирург",
		licenseNumber: "ЛО-77-01-098765",
	};

	const mockItems: ChairsideTreatmentItem[] = [
		{
			id: "trt-1",
			serviceCode: "A16.07.002.001",
			title: "Препарирование твердых тканей зуба 1.6",
			toothNumber: "16",
			stageTitle: "Этап 1: Терапия",
			quantity: 1,
			unitPriceKopecks: 350000,
			discountPercent: 0,
			totalKopecks: 350000,
		},
	];

	it("1. signPackageWithPaperPhysical produces signed package with verificationMethod: paper_physical", () => {
		const pkg = createChairsideConsentPackage({
			patient: mockPatient,
			doctor: mockDoctor,
			treatmentItems: mockItems,
		});

		expect(pkg.status).toBe("ready_for_patient");
		expect(pkg.documents.every((d) => !d.isSigned)).toBe(true);

		const signedPkg = signPackageWithPaperPhysical(pkg);

		// Status and documents
		expect(signedPkg.status).toBe("signed");
		expect(signedPkg.documents.every((d) => d.isSigned)).toBe(true);
		expect(signedPkg.documents.every((d) => Boolean(d.integrityHash))).toBe(true);

		// Signature record verification
		expect(signedPkg.signature).toBeDefined();
		expect(signedPkg.signature?.verificationMethod).toBe("paper_physical");
		expect(signedPkg.signature?.legalStampText).toBe(
			"ДОКУМЕНТЫ ОФОРМЛЕНЫ НА БУМАГЕ (ст. 20 323-ФЗ, 152-ФЗ, ПП РФ № 736). Личная подпись пациента подшита в карту 043/у",
		);
		expect(signedPkg.signature?.signedByFullName).toBe("Кузнецова Мария Викторовна");
		expect(signedPkg.signature?.form043uRecordId).toBe("043/у-5514");
		expect(signedPkg.signature?.integrityHash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("2. btn-confirm-paper-signed renders in InformedConsentModal (SSOT)", () => {
		const prevDoc = (globalThis as any).document;
		delete (globalThis as any).document;
		try {
			const html = renderToString(
				<InformedConsentModal
					isOpen={true}
					onClose={() => {}}
					patient={mockPatient}
					initialMode="single"
				/>,
			);

			// Paper confirmation button
			expect(html).toContain('data-testid="btn-confirm-paper-signed"');
			expect(html).toContain("Подтвердить подписание на бумаге");
		} finally {
			if (prevDoc) (globalThis as any).document = prevDoc;
		}
	});

	it("3. clicking btn-confirm-paper-signed confirms package without requiring SMS OTP", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		const onConsentSigned = vi.fn();
		const onClose = vi.fn();

		await act(async () => {
			root.render(
				<InformedConsentModal
					isOpen={true}
					onClose={onClose}
					patient={mockPatient}
					initialMode="single"
					onConsentSigned={onConsentSigned}
				/>,
			);
		});

		const paperBtn = findNodeByTestId(doc.body, "btn-confirm-paper-signed");
		expect(paperBtn).not.toBeNull();

		if (paperBtn) {
			await clickNode(paperBtn);
		}

		expect(onConsentSigned).toHaveBeenCalledTimes(1);
		const payload = onConsentSigned.mock.calls[0][0];
		expect(payload.verificationMethod).toBe("paper_physical");
		expect(payload.paperOriginalStored).toBe(true);
	});

	it("4. ChairsideTabletConsentModal is eradicated per Mandate 8s & Wave 199", () => {
		const modalPath = path.resolve(__dirname, "../ChairsideTabletConsentModal.tsx");
		expect(fs.existsSync(modalPath)).toBe(false);
	});

	it("5. Doctor autonomy is preserved: zero disabled action buttons on paper signing path (Mandate 8e)", () => {
		const prevDoc = (globalThis as any).document;
		delete (globalThis as any).document;
		try {
			const html = renderToString(
				<InformedConsentModal
					isOpen={true}
					onClose={() => {}}
					patient={mockPatient}
					initialMode="single"
				/>,
			);
			expect(html).toContain('data-testid="btn-confirm-paper-signed"');
			expect(html).not.toContain('disabled=""');
		} finally {
			if (prevDoc) (globalThis as any).document = prevDoc;
		}
	});
});
