import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PublicEstimateDetail, PublicEstimateMeta } from "@dental/shared";
import { PublicEstimatePortal } from "../PublicEstimatePortal";
import { PatientBranchTransferModal } from "../../patients/transfer/PatientBranchTransferModal";
import { PatientCabinetModal } from "../../portal/patientCabinet/PatientCabinetModal";
import { DEMO_PATIENT_CABINET } from "../../portal/patientCabinet/patientCabinetPresets";

interface SpyMock {
	// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
	(...args: any[]): any;
	// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
	calls: any[][];
	mock: {
		// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
		calls: any[][];
	};
	// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
	mockImplementation: (fn: (...args: any[]) => any) => SpyMock;
	// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
	mockResolvedValue: (val: any) => SpyMock;
	toHaveBeenCalledWith: (...expectedArgs: unknown[]) => void;
	toHaveBeenCalled: () => void;
}

const vi = {
	// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
	fn: (impl?: (...args: any[]) => any): SpyMock => {
		// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
		let currentImpl = impl || (() => undefined);
		// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
		const calls: any[][] = [];
		// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
		const fnObj = ((...args: any[]) => {
			calls.push(args);
			return currentImpl(...args);
		}) as SpyMock;
		fnObj.calls = calls;
		fnObj.mock = { calls };
		// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
		fnObj.mockImplementation = (newImpl: (...args: any[]) => any) => {
			currentImpl = newImpl;
			return fnObj;
		};
		// biome-ignore lint/suspicious/noExplicitAny: generic spy signature
		fnObj.mockResolvedValue = (val: any) => {
			currentImpl = () => Promise.resolve(val);
			return fnObj;
		};
		fnObj.toHaveBeenCalledWith = (...expectedArgs: unknown[]) => {
			const found = calls.some((actual) =>
				expectedArgs.every((arg, idx) => actual[idx] === arg),
			);
			assert.ok(
				found,
				`Expected call with ${JSON.stringify(expectedArgs)}, but actual calls were: ${JSON.stringify(calls)}`,
			);
		};
		fnObj.toHaveBeenCalled = () => {
			assert.ok(
				calls.length > 0,
				"Expected function to have been called, but was called 0 times",
			);
		};
		return fnObj;
	},
};

function expect(actual: unknown) {
	return {
		toBe: (expected: unknown) => {
			assert.strictEqual(actual, expected);
		},
		toBeDefined: () => {
			assert.notStrictEqual(actual, undefined, "Expected value to be defined");
		},
		toBeNull: () => {
			assert.strictEqual(actual, null, "Expected value to be null");
		},
		toBeFalsy: () => {
			assert.ok(!actual, `Expected falsy, but got ${actual}`);
		},
		toBeTruthy: () => {
			assert.ok(actual, `Expected truthy, but got ${actual}`);
		},
		toContain: (expected: string) => {
			assert.ok(
				typeof actual === "string" && actual.includes(expected),
				`Expected "${actual}" to contain "${expected}"`,
			);
		},
		toMatch: (regex: RegExp) => {
			assert.ok(
				typeof actual === "string" && regex.test(actual),
				`Expected "${actual}" to match ${regex}`,
			);
		},
		toHaveBeenCalled: () => {
			// biome-ignore lint/suspicious/noExplicitAny: spy assertion helper
			if (actual && typeof (actual as any).toHaveBeenCalled === "function") {
				// biome-ignore lint/suspicious/noExplicitAny: spy assertion helper
				(actual as any).toHaveBeenCalled();
			} else {
				assert.fail("actual is not a spy mock");
			}
		},
		toHaveBeenCalledWith: (...expectedArgs: unknown[]) => {
			// biome-ignore lint/suspicious/noExplicitAny: spy assertion helper
			if (actual && typeof (actual as any).toHaveBeenCalledWith === "function") {
				// biome-ignore lint/suspicious/noExplicitAny: spy assertion helper
				(actual as any).toHaveBeenCalledWith(...expectedArgs);
			} else {
				assert.fail("actual is not a spy mock");
			}
		},
		not: {
			toBeNull: () => {
				assert.notStrictEqual(actual, null, "Expected value not to be null");
				assert.notStrictEqual(actual, undefined, "Expected value not to be undefined");
			},
			toContain: (expected: string) => {
				assert.ok(
					typeof actual === "string" && !actual.includes(expected),
					`Expected "${actual}" NOT to contain "${expected}"`,
				);
			},
			toMatch: (regex: RegExp) => {
				assert.ok(
					typeof actual === "string" && !regex.test(actual),
					`Expected "${actual}" NOT to match ${regex}`,
				);
			},
		},
	};
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
	selected?: boolean;
	options?: MockDomNode[];
	appendChild: (child: MockDomNode) => MockDomNode;
	insertBefore: (child: MockDomNode, before: MockDomNode | null) => MockDomNode;
	removeChild: (child: MockDomNode) => MockDomNode;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: (type: string, fn: EventListener) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	hasAttribute: (name: string) => boolean;
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
			selected: false,
			get options() {
				return children.filter((c) => c.tagName === "OPTION");
			},
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
				const existing = el.attributes.find((a) => a.name === name);
				if (existing) {
					existing.value = value;
				} else {
					el.attributes.push({ name, value });
				}
				if (name.startsWith("data-")) {
					el.dataset[name.slice(5)] = value;
				}
			},
			getAttribute: (name: string) => attrs[name] || null,
			hasAttribute: (name: string) => name in attrs,
			get textContent() {
				let text = "";
				for (const child of children) {
					if (child.nodeType === 3) {
						text += (child as unknown as { textContent?: string }).textContent || "";
					} else if (child.textContent) {
						text += child.textContent;
					}
				}
				return text;
			},
			set textContent(val: string) {
				children.length = 0;
				if (val) {
					children.push({
						nodeType: 3,
						textContent: val,
						style: {},
						parentNode: el,
					} as unknown as MockDomNode);
				}
			},
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
			toDataURL: () => "",
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

function teardownMockDom() {
	// Keep window/document alive on globalThis so trailing async operations don't fail
}

function nodeToHtml(node: MockDomNode | null): string {
	if (!node) return "";
	if (node.nodeType === 3) {
		return (node as unknown as { textContent?: string }).textContent || "";
	}
	const tag = (node.tagName || "div").toLowerCase();
	const attrs = (node.attributes || [])
		.map((a) => `${a.name}="${a.value}"`)
		.join(" ");
	const attrStr = attrs ? ` ${attrs}` : "";
	const childrenStr = (node.children || []).map(nodeToHtml).join("");
	return `<${tag}${attrStr}>${childrenStr}</${tag}>`;
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

describe("Public Portal & Statutory Signature Autonomy (Mandates 8e, 8i, 8k & 63-FZ / 323-FZ)", () => {
	const mockMeta: PublicEstimateMeta = {
		requires_verification: false,
		method: "none",
		locked: false,
		expired: false,
		already_decided: false,
		decided_status: null,
		clinic_name: "Стоматология ДЕНТЕ",
		clinic_phone: "+7 (495) 123-45-67",
		clinic_email: "clinic@example.com",
		clinic_address_line: "г. Москва, ул. Клиническая, д. 10",
		clinic_currency: "RUB",
		patient_first_name: "Иван",
		estimate_number: "СМ-2026-001",
		estimate_total: "45000",
		valid_until: "2026-10-01",
	};

	const mockEstimate: PublicEstimateDetail = {
		id: "est-123",
		estimate_number: "СМ-2026-001",
		status: "sent",
		valid_from: "2026-09-01",
		valid_until: "2026-10-01",
		subtotal_rub: 45000,
		total_discount_rub: 0,
		total_tax_rub: 0,
		total_rub: 45000,
		patient_notes: null,
		items: [
			{
				id: "item-1",
				title: "Комплексная профессиональная гигиена полости рта",
				tooth_number: null,
				quantity: 1,
				unit_price_rub: 15000,
				line_total_rub: 15000,
				discount_rub: 0,
				net_line_total_rub: 15000,
			},
			{
				id: "item-2",
				title: "Лечение кариеса с постановкой композитной пломбы",
				tooth_number: "16",
				quantity: 1,
				unit_price_rub: 30000,
				line_total_rub: 30000,
				discount_rub: 0,
				net_line_total_rub: 30000,
			},
		],
	};

	it("PublicEstimatePortal: renders clean statutory approval block without any <canvas> drawing pad", () => {
		const html = renderToString(
			<PublicEstimatePortal
				token="test-token-uuid-123"
				initialMeta={mockMeta}
				initialEstimate={mockEstimate}
				initialShowAcceptModal={true}
			/>,
		);

		// 1. Zero canvas element or procedural drawing simulator
		expect(html).not.toContain("<canvas");
		expect(html).not.toContain("Нарисуйте подпись на экране");
		expect(html).not.toContain("Очистить");

		// 2. Statutory 323-FZ & 63-FZ statutory consent text
		expect(html).toContain("Электронное согласование (ст. 20 323-ФЗ / 63-ФЗ)");
		expect(html).toContain(
			"Ознакомлен(а) со стоимостью, перечнем процедур и даю информированное согласие на лечение (ст. 20 323-ФЗ)",
		);

		// 3. 1-click Approval button is present
		expect(html).toContain("Утвердить план");
		expect(html).toContain("ФИО подписанта:");
	});

	it("PublicEstimatePortal: approval button is never disabled when modal opens and consentAgreed defaults to true (Mandates 8e, 8k)", () => {
		const html = renderToString(
			<PublicEstimatePortal
				token="test-token-uuid-123"
				initialMeta={mockMeta}
				initialEstimate={mockEstimate}
				initialShowAcceptModal={true}
			/>,
		);

		// 1. Approval button is present and NOT disabled (no disabled attribute)
		expect(html).toContain('data-testid="btn-accept-estimate"');
		expect(html).not.toMatch(/data-testid="btn-accept-estimate"[^>]*\sdisabled(?:=""|\s|>)/);
		expect(html).not.toMatch(/\sdisabled(?:=""|\s|>)[^>]*data-testid="btn-accept-estimate"/);

		// 2. consentAgreed defaults to true (checkbox is checked)
		expect(html).toContain('data-testid="checkbox-statutory-consent"');
		expect(html).toMatch(/data-testid="checkbox-statutory-consent"[^>]*checked/);

		// 3. Signer input displays fallback patient name
		expect(html).toContain('data-testid="input-signer-name"');
		expect(html).toContain('value="Иван"');
	});

	it("PublicEstimatePortal: submitting approval without typing custom signer name uses patientName fallback and submits (Mandate 8e)", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onAccepted = vi.fn();

		const originalFetch = globalThis.fetch;
		const mockFetch = vi.fn(async (url: unknown) => {
			const urlStr = String(url);
			if (urlStr.includes("/accept")) {
				return {
					ok: true,
					json: async () => ({ success: true, message: "OK" }),
				};
			}
			return {
				ok: true,
				json: async () => ({ data: { ...mockEstimate, status: "accepted" } }),
			};
		});
		globalThis.fetch = mockFetch as any;

		try {
			await act(async () => {
				root.render(
					<PublicEstimatePortal
						token="test-token-uuid-123"
						apiBaseUrl="http://localhost:3000"
						initialMeta={mockMeta}
						initialEstimate={{
							...mockEstimate,
							patientName: "Кузнецов Алексей Сергеевич",
						}}
						initialShowAcceptModal={true}
						onAccepted={onAccepted}
					/>,
				);
			});

			const acceptBtn = findNodeByTestId(doc.body, "btn-accept-estimate");
			expect(acceptBtn).not.toBeNull();
			expect(acceptBtn?.hasAttribute("disabled")).toBe(false);

			await clickNode(acceptBtn!);

			// Verify API call payload uses patientName fallback
			expect(mockFetch).toHaveBeenCalled();
			const acceptCall = mockFetch.mock.calls.find((call) =>
				String(call[0]).includes("/accept"),
			);
			expect(acceptCall).toBeDefined();
			const acceptInit = acceptCall?.[1] as RequestInit | undefined;
			const body = JSON.parse(String(acceptInit?.body || "{}"));
			expect(body.signerName).toBe("Кузнецов Алексей Сергеевич");
			expect(body.signatureMethod).toBe("click_accept");

			// Verify onAccepted callback
			expect(onAccepted).toHaveBeenCalled();
			expect(onAccepted.mock.calls[0]![0]).toBe("СМ-2026-001");
		} finally {
			globalThis.fetch = originalFetch;
			try {
				await act(async () => {
					root.unmount();
				});
			} finally {
				teardownMockDom();
			}
		}
	});

	it("PublicEstimatePortal: submitting approval with empty signer name falls back to 'Пациент' without blocking (Mandates 8e, 8n)", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onAccepted = vi.fn();

		const originalFetch = globalThis.fetch;
		const mockFetch = vi.fn(async (url: unknown) => {
			const urlStr = String(url);
			if (urlStr.includes("/accept")) {
				return {
					ok: true,
					json: async () => ({ success: true, message: "OK" }),
				};
			}
			return {
				ok: true,
				json: async () => ({ data: { ...mockEstimate, status: "accepted" } }),
			};
		});
		globalThis.fetch = mockFetch as any;

		const anonymousMeta: PublicEstimateMeta = {
			...mockMeta,
			patient_first_name: null,
		};

		try {
			await act(async () => {
				root.render(
					<PublicEstimatePortal
						token="test-token-uuid-123"
						apiBaseUrl="http://localhost:3000"
						initialMeta={anonymousMeta}
						initialEstimate={{
							...mockEstimate,
							patientName: undefined,
						}}
						initialShowAcceptModal={true}
						onAccepted={onAccepted}
					/>,
				);
			});

			const acceptBtn = findNodeByTestId(doc.body, "btn-accept-estimate");
			expect(acceptBtn).not.toBeNull();
			expect(acceptBtn?.hasAttribute("disabled")).toBe(false);

			await clickNode(acceptBtn!);

			const acceptCall = mockFetch.mock.calls.find((call) =>
				String(call[0]).includes("/accept"),
			);
			expect(acceptCall).toBeDefined();
			const acceptInit = acceptCall?.[1] as RequestInit | undefined;
			const body = JSON.parse(String(acceptInit?.body || "{}"));
			expect(body.signerName).toBe("Пациент");
			expect(body.signatureMethod).toBe("click_accept");
		} finally {
			globalThis.fetch = originalFetch;
			try {
				await act(async () => {
					root.unmount();
				});
			} finally {
				teardownMockDom();
			}
		}
	});

	it("PatientBranchTransferModal: uses statutory paper consent instead of biometric stylus fiction", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		try {
			await act(async () => {
				root.render(
					<PatientBranchTransferModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-42"
						patientFullName="Смирнов Петр Алексеевич"
						initialSourceBranchId="branch_center"
						initialTargetBranchId="branch_north"
					/>,
				);
			});

			const html = nodeToHtml(doc.body);

			// 1. Must contain statutory paper consent
			expect(html).toContain('value="paper_signed_consent"');
			expect(html).toContain("Бумажное заявление пациента (подшито в карту 043/у)");

			// 2. Biometric fiction must be completely eradicated
			expect(html).not.toContain("tablet_stylus_biometric");
			expect(html).not.toContain("биометрический росчерк");
		} finally {
			try {
				await act(async () => {
					root.unmount();
				});
			} finally {
				teardownMockDom();
			}
		}
	});

	it("PatientCabinetModal: eliminates fake finger signature canvas and provides statutory PEP confirmation", () => {
		const html = renderToString(
			<PatientCabinetModal
				isOpen={true}
				onClose={() => {}}
				initialData={DEMO_PATIENT_CABINET}
				initialSigningConsent={DEMO_PATIENT_CABINET.consents[0]}
				initialConsentSignMode="cabinet_pep"
			/>,
		);

		// 1. Zero canvas or fake touch signature pads
		expect(html).not.toContain("<canvas");
		expect(html).not.toContain("Распишитесь пальцем или стилусом на экране");
		expect(html).not.toContain("Подтвердить росчерк (63-ФЗ)");

		// 2. Contains statutory cabinet confirmation
		expect(html).toContain("Подтверждение в ЛК (63-ФЗ)");
		expect(html).toContain("Подтвердить согласие в личном кабинете (63-ФЗ ПЭП)");
	});
});
