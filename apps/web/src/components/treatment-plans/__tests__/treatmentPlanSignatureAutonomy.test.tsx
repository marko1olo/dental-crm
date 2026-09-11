/**
 * treatmentPlanSignatureAutonomy.test.tsx
 *
 * DENTE Dental CRM — Treatment Plan Signature & Estimator Paper-First Autonomy Suite
 *
 * Governed by:
 * - Mandate 8e (Doctor & Staff Autonomy): Absolute ban on blocked/disabled buttons without reason.
 *   Instant print in 1 click; 0 disabled buttons due to missing digital canvas signature.
 * - Mandate 8i (Specialized Outpatient Context): Private clinic chairside workflow.
 * - Mandate 8k (CRM != Reality Simulator & Friction-Killer Law): Paper-first outpatient reality.
 *   Doctors print plans on A4 for physical patient signature, confirmed in 1 click.
 * - Mandate 8n (Solo Doctor & Small Clinic Sovereignty): Instant unblocked workflow without friction.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { TreatmentEstimator } from "../../odontogram/TreatmentEstimator";
import { TreatmentPlanSignatureModal } from "../TreatmentPlanSignatureModal";
import type {
	DigitalSignatureAgreementData,
	TreatmentPlanTier,
} from "../types";

function expect(actual: any) {
	return {
		toBe(expected: any) {
			assert.equal(actual, expected);
		},
		not: {
			toBeNull() {
				assert.notEqual(actual, null);
				assert.notEqual(actual, undefined);
			},
			toContain(str: string) {
				assert.ok(!String(actual).includes(str), `Expected not to contain ${str}`);
			},
			toMatch(re: RegExp) {
				assert.ok(!re.test(String(actual)), `Expected not to match ${re}`);
			},
		},
		toBeNull() {
			assert.equal(actual, null);
		},
		toContain(str: string) {
			assert.ok(String(actual).includes(str), `Expected to contain ${str}`);
		},
		toHaveBeenCalled() {
			assert.ok(actual.mock.calls.length > 0, "Expected mock to have been called");
		},
		toHaveBeenCalledTimes(n: number) {
			assert.equal(actual.mock.calls.length, n);
		},
	};
}

const vi = {
	fn() {
		const calls: any[][] = [];
		const mockFn = (...args: any[]) => {
			calls.push(args);
		};
		mockFn.mock = { calls };
		return mockFn;
	},
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
	// biome-ignore lint/suspicious/noExplicitAny: mock document reference
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
			ownerDocument: doc,
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

	doc = {
		nodeType: 9,
		createElement: createMockElement,
		createElementNS: (_ns: string, tag: string) => createMockElement(tag),
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
		documentElement: null as any,
		body: null as any,
		activeElement: null,
	};
	doc.documentElement = createMockElement("html");
	doc.body = createMockElement("body");
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

const sampleTier: TreatmentPlanTier = {
	tierId: "standard",
	title: "Комплексный стандартный план",
	subtitle: "Оптимальный клинический протокол по приказу 804н",
	badge: "Рекомендуемый",
	badgeClass: "badge-teal",
	borderClass: "border-teal",
	isRecommended: true,
	totalRub: 125000,
	totalKopecks: 12500000 as any,
	durationWeeks: 4,
	durationVisits: 5,
	warrantyYears: 3,
	materialsHeadline: "Премиальные наногибридные композиты",
	materialsList: ["Filtek Supreme XTE", "Gradia Direct"],
	keyAdvantages: ["Долговечность", "Высокая эстетика", "Гарантия 3 года"],
	stages: [],
	itemsCount: 4,
	ndflRefundRub: 16250,
	priceWithNdflRefundRub: 108750,
	monthlyInstallment12Rub: 10416,
	installments: {} as any,
	ndflDetails: {} as any,
};

describe("Treatment Plan Signature & Estimator Paper-First Autonomy (Mandates 8e, 8k, 8n)", () => {
	describe("1. TreatmentPlanSignatureModal — Paper-First Autonomy & Zero Disabled Buttons", () => {
		it("renders print button and 1-click paper confirmation button, eradicating SignaturePad canvas", () => {
			const html = renderToString(
				<TreatmentPlanSignatureModal
					isOpen={true}
					tier={sampleTier}
					patientName="Иванова Анна Сергеевна"
					patientId="PAT-2026-1042"
					doctorFullName="Д-р Воронова М.А."
					clinicName="Стоматология ДЕНТЕ"
					onClose={() => {}}
					onSignedSuccess={() => {}}
				/>,
			);

			// Verify presence of A4 print button
			expect(html).toContain('data-testid="print-treatment-plan-btn"');
			expect(html).toContain("Печать плана (А4)");

			// Verify presence of 1-click paper confirmation button
			expect(html).toContain('data-testid="paper-signature-confirm-btn"');
			expect(html).toContain("Утвердить и подписать на бумаге (1 клик)");

			// Verify presence of main approval button
			expect(html).toContain('data-testid="confirm-sign-plan-btn"');
			expect(html).toContain("Утвердить и подписать");

			// Verify that SignaturePad canvas is eradicated
			expect(html).not.toContain("<canvas");
			expect(html).not.toContain("Личная подпись пациента (нарисуйте на экране)");
		});

		it("ensures button 'Утвердить и подписать' is NOT disabled when signature is empty (Mandate 8e)", () => {
			const html = renderToString(
				<TreatmentPlanSignatureModal
					isOpen={true}
					tier={sampleTier}
					patientName="Иванова Анна Сергеевна"
					patientId="PAT-2026-1042"
					onClose={() => {}}
					onSignedSuccess={() => {}}
				/>,
			);

			// Find confirm button in HTML and verify the HTML attribute disabled is NOT present
			const confirmBtnMatch = html.match(
				/<button[^>]*data-testid="confirm-sign-plan-btn"[^>]*>/,
			);
			expect(confirmBtnMatch).not.toBeNull();
			const confirmBtnHtml = confirmBtnMatch?.[0] ?? "";
			// Match disabled as an attribute (disabled or disabled="") rather than class prefix disabled:
			expect(confirmBtnHtml).not.toMatch(/\sdisabled(?:=|\s|>)/);
		});

		it("interactively triggers 1-click paper confirmation and passes paper agreement data", async () => {
			const { doc, win } = setupMockDom();
			let root: Root | null = null;
			let receivedAgreement: DigitalSignatureAgreementData | null = null;

			const container = doc.createElement("div");
			doc.body.appendChild(container);

			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<TreatmentPlanSignatureModal
						isOpen={true}
						tier={sampleTier}
						patientName="Иванова Анна Сергеевна"
						patientId="PAT-2026-1042"
						doctorFullName="Д-р Воронова М.А."
						clinicName="Стоматология ДЕНТЕ"
						onClose={() => {}}
						onSignedSuccess={(agreement) => {
							receivedAgreement = agreement;
						}}
					/>,
				);
			});

			// Find and click the 1-click paper confirmation button
			const paperConfirmBtn = findNodeByTestId(
				doc.body,
				"paper-signature-confirm-btn",
			);
			expect(paperConfirmBtn).not.toBeNull();

			await clickNode(paperConfirmBtn!);

			expect(receivedAgreement).not.toBeNull();
			const agreement = receivedAgreement as unknown as DigitalSignatureAgreementData;
			expect(agreement.patientId).toBe("PAT-2026-1042");
			expect(agreement.patientName).toBe("Иванова Анна Сергеевна");
			expect(agreement.planTierId).toBe("standard");
			expect(agreement.totalAmountRub).toBe(125000);
			expect(agreement.termsAccepted).toBe(true);
			expect(agreement.signatureBase64).toContain("Подписано на бумаге");

			// Clean up
			await act(async () => {
				root?.unmount();
			});
		});

		it("allows clicking 'Утвердить и подписать' directly without prior drawing, defaulting to paper signature", async () => {
			const { doc } = setupMockDom();
			let root: Root | null = null;
			let receivedAgreement: DigitalSignatureAgreementData | null = null;

			const container = doc.createElement("div");
			doc.body.appendChild(container);

			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<TreatmentPlanSignatureModal
						isOpen={true}
						tier={sampleTier}
						patientName="Иванова Анна Сергеевна"
						patientId="PAT-2026-1042"
						onClose={() => {}}
						onSignedSuccess={(agreement) => {
							receivedAgreement = agreement;
						}}
					/>,
				);
			});

			// Find and click the confirm button directly
			const confirmBtn = findNodeByTestId(doc.body, "confirm-sign-plan-btn");
			expect(confirmBtn).not.toBeNull();

			await clickNode(confirmBtn!);

			// Doctor is never blocked: agreement is successfully signed with paper fallback
			expect(receivedAgreement).not.toBeNull();
			const fallbackAgreement = receivedAgreement as unknown as DigitalSignatureAgreementData;
			expect(fallbackAgreement.signatureBase64).toContain("Подписано на бумаге");

			await act(async () => {
				root?.unmount();
			});
		});

		it("triggers window.print() when print button is clicked", async () => {
			const { doc, win } = setupMockDom();
			let root: Root | null = null;

			const container = doc.createElement("div");
			doc.body.appendChild(container);

			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<TreatmentPlanSignatureModal
						isOpen={true}
						tier={sampleTier}
						patientName="Иванова Анна Сергеевна"
						patientId="PAT-2026-1042"
						onClose={() => {}}
						onSignedSuccess={() => {}}
					/>,
				);
			});

			const printBtn = findNodeByTestId(doc.body, "print-treatment-plan-btn");
			expect(printBtn).not.toBeNull();

			await clickNode(printBtn!);

			expect(win.print).toHaveBeenCalledTimes(1);

			await act(async () => {
				root?.unmount();
			});
		});
	});

	describe("2. TreatmentEstimator — 1-Click Paper Confirmation Toolbar Button", () => {
		it("renders 1-click paper confirmation button in estimator toolbar", () => {
			const mockAppContext = {
				dashboard: {
					patients: [{ id: "PAT-001", fullName: "Кузнецов П.Р." }],
					serviceCatalog: [],
				},
			};

			const html = renderToString(
				<AppLogicProvider value={mockAppContext as any}>
					<TreatmentEstimator patientId="PAT-001" currentTeeth={[]} />
				</AppLogicProvider>,
			);

			// Verify presence of 1-click paper confirmation button
			expect(html).toContain('data-testid="estimator-paper-confirm-btn"');
			expect(html).toContain("На бумаге (1 клик)");
			expect(html).toContain(
				"Пациент подписал распечатанную смету — подтвердить в 1 клик",
			);
		});

		it("opens sign modal in TreatmentEstimator and verifies paper confirm & print buttons with zero canvas elements", async () => {
			const { doc, win } = setupMockDom();
			let root: Root | null = null;
			const mockAppContext = {
				dashboard: {
					patients: [{ id: "PAT-001", fullName: "Кузнецов П.Р." }],
					serviceCatalog: [],
				},
			};

			const container = doc.createElement("div");
			doc.body.appendChild(container);

			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					<AppLogicProvider value={mockAppContext as any}>
						<TreatmentEstimator patientId="PAT-001" currentTeeth={[]} />
					</AppLogicProvider>,
				);
			});

			const openSignBtn = findNodeByTestId(
				doc.body,
				"estimator-open-sign-modal-btn",
			);
			expect(openSignBtn).not.toBeNull();
			await clickNode(openSignBtn!);

			// Verify presence of 1-click paper confirmation button in modal
			const paperConfirmBtn = findNodeByTestId(
				doc.body,
				"estimator-modal-paper-confirm-btn",
			);
			expect(paperConfirmBtn).not.toBeNull();

			// Verify presence of print button in modal
			const printBtn = findNodeByTestId(
				doc.body,
				"estimator-modal-print-btn",
			);
			expect(printBtn).not.toBeNull();

			// Verify zero <canvas> drawing elements in entire DOM
			const hasCanvasElement = (node: MockDomNode): boolean => {
				if (node.tagName === "CANVAS") return true;
				return node.children?.some(hasCanvasElement) ?? false;
			};
			expect(hasCanvasElement(doc.body)).toBe(false);

			// Trigger print button -> verifies window.print() called
			await clickNode(printBtn!);
			expect(win.print).toHaveBeenCalled();

			// Trigger paper confirm button -> closes modal
			await clickNode(paperConfirmBtn!);
			const closedModalBtn = findNodeByTestId(
				doc.body,
				"estimator-modal-paper-confirm-btn",
			);
			expect(closedModalBtn).toBeNull();

			await act(async () => {
				root?.unmount();
			});
		});
	});
});
