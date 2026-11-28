import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Patient } from "@dental/shared";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PatientDetailsPanel } from "../components/patients/PatientDetailsPanel";
import { PatientOverviewTab } from "../components/patients/PatientOverviewTab";
import { AppLogicProvider, type AppLogicContextType } from "../contexts/AppLogicContext";
import { usePatientStore } from "../store/patientStore";

const testPatient: Patient = {
	id: "pat-grid-1",
	organizationId: "org-1",
	status: "active",
	fullName: "Смирнов Алексей Игоревич",
	phone: "+7 (999) 111-22-33",
	email: null,
	notes: null,
	gender: "male",
	birthDate: "1985-03-14",
	balanceRub: 1500,
	administrativeProfile: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const baseAppContext = {
	dashboard: {
		patients: [testPatient],
		staff: [],
		appointments: [],
		clinicSettings: { profile: { clinicName: "ДЕНТЕ" } },
	},
	selectedPatient: testPatient,
	auth: {
		currentUser: { name: "Администратор" },
		denteClinicalReadHeaders: () => ({}),
		denteClinicalMutationHeaders: () => ({}),
	},
} as unknown as AppLogicContextType;

interface DomNodeStub {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	children: DomNodeStub[];
	childNodes: DomNodeStub[];
	attrs: Record<string, string>;
	ownerDocument: unknown;
	parentNode: DomNodeStub | null;
	textContent: string;
	nodeValue?: string;
	data?: string;
	className?: string;
	appendChild: (c: DomNodeStub) => DomNodeStub;
	insertBefore: (c: DomNodeStub, b: DomNodeStub | null) => DomNodeStub;
	removeChild: (c: DomNodeStub) => DomNodeStub;
	addEventListener: () => void;
	removeEventListener: () => void;
	setAttribute: (name: string, val: string) => void;
	getAttribute: (name: string) => string | null;
	hasAttribute: (name: string) => boolean;
	removeAttribute: (name: string) => void;
	dispatchEvent: () => boolean;
	getBoundingClientRect: () => { top: number; left: number; right: number; bottom: number; width: number; height: number };
	focus: () => void;
	blur: () => void;
	contains: (other?: unknown) => boolean;
}

function renderClientToHtml(element: React.ReactElement): Promise<string> {
	const prevGlobals = {
		window: (globalThis as { window?: unknown }).window,
		document: (globalThis as { document?: unknown }).document,
		fetch: (globalThis as { fetch?: unknown }).fetch,
		HTMLElement: (globalThis as { HTMLElement?: unknown }).HTMLElement,
		Element: (globalThis as { Element?: unknown }).Element,
		Node: (globalThis as { Node?: unknown }).Node,
		HTMLIFrameElement: (globalThis as { HTMLIFrameElement?: unknown }).HTMLIFrameElement,
		IS_REACT_ACT_ENVIRONMENT: (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT,
	};

	class FakeIFrame {}
	class FakeEl {}
	class FakeHtmlEl {}
	class FakeNode {}

	const doc: Record<string, unknown> = {
		nodeType: 9,
		activeElement: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
		createTextNode: (text: string): DomNodeStub => ({
			nodeType: 3,
			tagName: "#text",
			nodeName: "#text",
			style: {},
			dataset: {},
			children: [],
			childNodes: [],
			attrs: {},
			ownerDocument: doc,
			parentNode: null,
			textContent: String(text ?? ""),
			nodeValue: String(text ?? ""),
			data: String(text ?? ""),
			appendChild: (c) => c,
			insertBefore: (c) => c,
			removeChild: (c) => c,
			addEventListener: () => {},
			removeEventListener: () => {},
			setAttribute: () => {},
			getAttribute: () => null,
			hasAttribute: () => false,
			removeAttribute: () => {},
			dispatchEvent: () => true,
			getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
			focus: () => {},
			blur: () => {},
			contains: () => false,
		}),
	};

	const makeEl = (tag = "div"): DomNodeStub => {
		const children: DomNodeStub[] = [];
		const attrs: Record<string, string> = {};
		const el: DomNodeStub = {
			nodeType: 1,
			tagName: tag.toUpperCase(),
			nodeName: tag.toUpperCase(),
			style: {},
			dataset: {},
			children,
			childNodes: children,
			attrs,
			ownerDocument: doc,
			parentNode: null,
			textContent: "",
			appendChild: (c) => {
				children.push(c);
				c.parentNode = el;
				return c;
			},
			insertBefore: (c, b) => {
				const idx = b ? children.indexOf(b) : -1;
				if (idx >= 0) children.splice(idx, 0, c);
				else children.push(c);
				c.parentNode = el;
				return c;
			},
			removeChild: (c) => {
				const idx = children.indexOf(c);
				if (idx >= 0) children.splice(idx, 1);
				c.parentNode = null;
				return c;
			},
			addEventListener: () => {},
			removeEventListener: () => {},
			setAttribute: (name, value) => {
				attrs[name] = value;
				if (name === "class" || name === "className") el.className = value;
			},
			getAttribute: (name) => attrs[name] ?? null,
			hasAttribute: (name) => name in attrs,
			removeAttribute: (name) => {
				delete attrs[name];
			},
			dispatchEvent: () => true,
			getBoundingClientRect: () => ({ top: 0, left: 0, right: 1200, bottom: 900, width: 1200, height: 900 }),
			focus: () => {},
			blur: () => {},
			contains: (other) => {
				let curr = other as DomNodeStub | null | undefined;
				while (curr) {
					if (curr === el) return true;
					curr = curr.parentNode;
				}
				return false;
			},
		};
		return el;
	};

	doc.createElement = (tag: string) => makeEl(tag);
	doc.createElementNS = (_ns: string, tag: string) => makeEl(tag);
	const body = makeEl("body");
	doc.body = body;
	doc.documentElement = makeEl("html");

	const serialize = (node: DomNodeStub): string => {
		if (node.nodeType === 3) return node.data ?? node.textContent ?? "";
		if (node.nodeType !== 1) return "";
		const tag = node.tagName.toLowerCase();
		const attrEntries: Array<[string, string]> = Object.entries(node.attrs);
		if (node.className && !("class" in node.attrs)) {
			attrEntries.push(["class", node.className]);
		}
		const styleStr = Object.entries(node.style)
			.filter(([, v]) => Boolean(v))
			.map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`)
			.join(";");
		if (styleStr) attrEntries.push(["style", styleStr]);
		const attrHtml = attrEntries.map(([k, v]) => ` ${k}="${v}"`).join("");
		const inner = node.children.length > 0 ? node.children.map(serialize).join("") : (node.textContent ?? "");
		return `<${tag}${attrHtml}>${inner}</${tag}>`;
	};

	(globalThis as { fetch: unknown }).fetch = async () =>
		new Response(JSON.stringify({ data: {} }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	(globalThis as { window: unknown }).window = {
		document: doc,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => true,
		HTMLIFrameElement: FakeIFrame,
		Element: FakeEl,
		HTMLElement: FakeHtmlEl,
		Node: FakeNode,
		navigator: { userAgent: "node" },
	};
	(globalThis as { document: unknown }).document = doc;
	(globalThis as { HTMLElement: unknown }).HTMLElement = FakeHtmlEl;
	(globalThis as { Element: unknown }).Element = FakeEl;
	(globalThis as { Node: unknown }).Node = FakeNode;
	(globalThis as { HTMLIFrameElement: unknown }).HTMLIFrameElement = FakeIFrame;
	(globalThis as { IS_REACT_ACT_ENVIRONMENT: unknown }).IS_REACT_ACT_ENVIRONMENT = true;

	const container = makeEl("div");
	let root: Root | null = null;
	return (async () => {
		try {
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(element);
				await new Promise((r) => setTimeout(r, 15));
			});
			return container.children.map(serialize).join("");
		} finally {
			if (root) {
				act(() => {
					root?.unmount();
				});
			}
			(globalThis as { window?: unknown }).window = prevGlobals.window;
			(globalThis as { document?: unknown }).document = prevGlobals.document;
			(globalThis as { fetch?: unknown }).fetch = prevGlobals.fetch;
			(globalThis as { HTMLElement?: unknown }).HTMLElement = prevGlobals.HTMLElement;
			(globalThis as { Element?: unknown }).Element = prevGlobals.Element;
			(globalThis as { Node?: unknown }).Node = prevGlobals.Node;
			(globalThis as { HTMLIFrameElement?: unknown }).HTMLIFrameElement = prevGlobals.HTMLIFrameElement;
			(globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT = prevGlobals.IS_REACT_ACT_ENVIRONMENT;
		}
	})();
}

describe("Patients widgets grid & panel layout (Live 6G SUT)", () => {
	afterEach(() => {
		usePatientStore.setState({ selectedPatientId: null });
	});

	it("renders empty PatientOverviewTab as empty string when no patient is selected", async () => {
		usePatientStore.setState({ selectedPatientId: null });
		const html = await renderClientToHtml(
			React.createElement(
				AppLogicProvider,
				{ value: baseAppContext },
				React.createElement(PatientOverviewTab),
			),
		);
		assert.equal(html, "");
	});

	it("renders PatientOverviewTab with CSS grid classes (1-col mobile, 2-col lg) and no inline gridTemplateColumns", async () => {
		usePatientStore.setState({ selectedPatientId: testPatient.id });
		const html = await renderClientToHtml(
			React.createElement(
				AppLogicProvider,
				{ value: baseAppContext },
				React.createElement(PatientOverviewTab, { patientBalance: 1500 }),
			),
		);
		assert.ok(html.includes('data-testid="patient-overview-tab"'));
		assert.ok(html.includes("patient-clinical-grid grid grid-cols-1 lg:grid-cols-2"));
		assert.equal(html.includes("grid-template-columns"), false);
		assert.equal(html.includes("minmax(min(280px"), false);
	});

	it("mounts PatientFamilyAndInsuranceWidget and PatientCommunicationTimelineWidget cleanly inside overview grid", async () => {
		usePatientStore.setState({ selectedPatientId: testPatient.id });
		const html = await renderClientToHtml(
			React.createElement(
				AppLogicProvider,
				{ value: baseAppContext },
				React.createElement(PatientOverviewTab, { patientBalance: 1500 }),
			),
		);
		assert.ok(html.includes('data-testid="patient-family-and-insurance-widget"'));
		assert.ok(html.includes('data-testid="patient-communication-timeline-widget"'));
		assert.ok(html.includes("patient-secondary-accordion"));
		assert.ok(html.includes("История коммуникаций и CRM"));
	});

	it("renders PatientDetailsPanel with min-w-0 layout protection for both empty and selected patient states", async () => {
		usePatientStore.setState({ selectedPatientId: null });
		const emptyHtml = await renderClientToHtml(
			React.createElement(
				AppLogicProvider,
				{ value: { ...baseAppContext, selectedPatient: null } as unknown as AppLogicContextType },
				React.createElement(PatientDetailsPanel, {
					selectedPatient: null,
					onBackToList: () => {},
					onOpenVisit: () => {},
					onOpenPatientCardModal: () => {},
					onOpenLoyaltyModal: () => {},
					patientCoreDraft: { fullName: "", phone: "", birthDate: "", notes: "" } as never,
					patientCoreSaveState: "idle",
					patientCoreDirty: false,
					savePatientCore: () => {},
					patientAdministrativeProfileDraft: {} as never,
					updatePatientAdministrativeProfileDraft: () => {},
					patientAdministrativeProfileSaveState: "idle",
					patientAdministrativeProfileDirty: false,
					patientAdministrativeSaveGuidance: null,
					patientAdministrativeSaveGuidanceId: "guid-1",
					patientAdministrativeProfileValidationMessage: null,
					savePatientAdministrativeProfile: () => {},
					weekdayOptions: [],
					executePatientSomaticNorm: () => {},
					executeBookAppointment: () => {},
				}),
			),
		);
		assert.ok(emptyHtml.includes("patient-admin-panel w-full min-w-0"));
		assert.ok(emptyHtml.includes("Карточка пациента"));

		usePatientStore.setState({ selectedPatientId: testPatient.id });
		const populatedHtml = await renderClientToHtml(
			React.createElement(
				AppLogicProvider,
				{ value: baseAppContext },
				React.createElement(PatientDetailsPanel, {
					selectedPatient: testPatient,
					onBackToList: () => {},
					onOpenVisit: () => {},
					onOpenPatientCardModal: () => {},
					onOpenLoyaltyModal: () => {},
					patientCoreDraft: { fullName: testPatient.fullName, phone: testPatient.phone ?? "", birthDate: testPatient.birthDate ?? "", notes: "" } as never,
					patientCoreSaveState: "idle",
					patientCoreDirty: false,
					savePatientCore: () => {},
					patientAdministrativeProfileDraft: {} as never,
					updatePatientAdministrativeProfileDraft: () => {},
					patientAdministrativeProfileSaveState: "idle",
					patientAdministrativeProfileDirty: false,
					patientAdministrativeSaveGuidance: null,
					patientAdministrativeSaveGuidanceId: "guid-1",
					patientAdministrativeProfileValidationMessage: null,
					savePatientAdministrativeProfile: () => {},
					weekdayOptions: [],
					executePatientSomaticNorm: () => {},
					executeBookAppointment: () => {},
				}),
			),
		);
		assert.ok(populatedHtml.includes('data-testid="patient-overview-tab"'));
		assert.ok(populatedHtml.includes("patient-docs-collapsible"));
		assert.ok(populatedHtml.includes("Смирнов Алексей Игоревич"));
	});
});
