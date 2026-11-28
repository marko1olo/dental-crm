import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Patient } from "@dental/shared";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientCommunicationTimelineWidget } from "../components/patients/PatientCommunicationTimelineWidget";
import { PatientOverviewTab } from "../components/patients/PatientOverviewTab";
import { CommunicationTimelineItem } from "../components/patients/timeline/CommunicationTimelineItem";
import {
	COMMUNICATIONS_SECTION_TITLE,
	STATUS_VIEW,
	asLog,
	countFromServer,
	entryTitle,
	formatMoment,
} from "../components/patients/timeline/timelineConstants";
import { AppLogicProvider, type AppLogicContextType } from "../contexts/AppLogicContext";
import {
	buildCacheKey,
	clearInMemoryClinicalCache,
	inMemoryEntityCacheMap,
} from "../services/storage/clinicalCacheStorage";
import { usePatientStore } from "../store/patientStore";
import { viewLabels } from "../workspaceShell.js";

const mockPatient: Patient = {
	id: "pat-comm-1",
	organizationId: "org-1",
	status: "active",
	fullName: "Волков Дмитрий Олегович",
	phone: "+7 (999) 444-55-66",
	email: null,
	notes: null,
	gender: "male",
	birthDate: "1988-09-01",
	balanceRub: 0,
	administrativeProfile: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const appContext = {
	dashboard: { patients: [mockPatient], staff: [], appointments: [] },
	selectedPatient: mockPatient,
	auth: {
		currentUser: { name: "Администратор" },
		denteClinicalReadHeaders: () => ({}),
		denteClinicalMutationHeaders: () => ({}),
	},
} as unknown as AppLogicContextType;

function seedTimelineCache(patientId: string, payload: unknown) {
	const resourceId = `${patientId}:/api/patients/${patientId}/communication-timelines`;
	const cacheKey = buildCacheKey("patient_resource", resourceId);
	inMemoryEntityCacheMap.set(cacheKey, {
		cacheKey,
		entityKind: "patient_resource",
		entityId: resourceId,
		data: payload,
		cachedAtMs: Date.now(),
		updatedAt: new Date().toISOString(),
	} as never);
}

describe("PatientCommunicationTimelineWidget & overview integration (Live 6G SUT)", () => {
	afterEach(() => {
		clearInMemoryClinicalCache();
		usePatientStore.setState({ selectedPatientId: null });
	});

	it("панель отправляет в канонический раздел реестра viewLabels.communications, а не «Общение» или «Обращения»", () => {
		assert.equal(COMMUNICATIONS_SECTION_TITLE, viewLabels.communications);
		assert.notEqual(COMMUNICATIONS_SECTION_TITLE, "Общение");
		assert.notEqual(COMMUNICATIONS_SECTION_TITLE, viewLabels.leads);

		seedTimelineCache(mockPatient.id, {
			entries: [],
			totalEvents: 0,
			needsCallCount: 2,
			lastNeedsCallAt: "2026-10-01T09:15:00.000Z",
			firstEventAt: null,
			lastEventAt: null,
			truncated: false,
		});

		const html = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: appContext },
				React.createElement(PatientCommunicationTimelineWidget, {
					patientId: mockPatient.id,
				}),
			),
		);
		assert.ok(html.includes(`в разделе «${viewLabels.communications}»`));
		assert.equal(html.includes("в разделе «Общение»"), false);
		assert.equal(html.includes(`в разделе «${viewLabels.leads}»`), false);
	});

	it("пустой журнал честно ограничивает область данных и не выдает отказ за пустоту", () => {
		seedTimelineCache(mockPatient.id, {
			entries: [],
			totalEvents: 0,
			needsCallCount: 0,
			lastNeedsCallAt: null,
			firstEventAt: null,
			lastEventAt: null,
			truncated: false,
		});

		const emptyHtml = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: appContext },
				React.createElement(PatientCommunicationTimelineWidget, {
					patientId: mockPatient.id,
				}),
			),
		);
		assert.ok(emptyHtml.includes("Обращений через систему не записано"));
		assert.ok(emptyHtml.includes("личного телефона врача"));
		assert.equal(emptyHtml.includes("Записи звонков и сообщений с пациентом отсутствуют"), false);

		assert.equal(asLog([]), null, "Array payload must be rejected instead of silently treated as empty log");
		seedTimelineCache(mockPatient.id, []);
		const malformedHtml = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: appContext },
				React.createElement(PatientCommunicationTimelineWidget, {
					patientId: mockPatient.id,
				}),
			),
		);
		assert.ok(malformedHtml.includes("Журнал не прочитан"));
	});

	it("CommunicationTimelineItem и timelineConstants не содержат мертвых полей и ссылки «Прослушать запись»", () => {
		const html = renderToStaticMarkup(
			React.createElement(CommunicationTimelineItem, {
				entry: {
					id: "ev-1",
					direction: "outbound",
					channel: "whatsapp",
					status: "delivered",
					message: "Напоминание о приёме завтра в 10:00",
					createdAt: "2026-10-01T08:00:00.000Z",
					actorName: "Иванова А.",
					recordingUrl: null,
					durationSeconds: null,
				},
			}),
		);
		assert.ok(html.includes("Отправлено в WhatsApp"));
		assert.ok(html.includes(STATUS_VIEW.delivered.label));
		assert.equal(html.includes("Прослушать запись"), false);
		assert.equal(entryTitle({ direction: "inbound", channel: "phone" } as never), "Входящий звонок");
		assert.equal(countFromServer(undefined), 0);
		assert.ok(formatMoment("2026-10-01T08:00:00.000Z"));
	});

	it("PatientOverviewTab монтирует единственный PatientCommunicationTimelineWidget", async () => {
		usePatientStore.setState({ selectedPatientId: mockPatient.id });
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
		interface DomStub {
			nodeType: number;
			tagName: string;
			nodeName: string;
			style: Record<string, string>;
			dataset: Record<string, string>;
			children: DomStub[];
			childNodes: DomStub[];
			attrs: Record<string, string>;
			ownerDocument: unknown;
			parentNode: DomStub | null;
			textContent: string;
			data?: string;
			nodeValue?: string;
			className?: string;
			appendChild: (c: DomStub) => DomStub;
			insertBefore: (c: DomStub, b: DomStub | null) => DomStub;
			removeChild: (c: DomStub) => DomStub;
			addEventListener: () => void;
			removeEventListener: () => void;
			setAttribute: (k: string, v: string) => void;
			getAttribute: (k: string) => string | null;
			hasAttribute: (k: string) => boolean;
			removeAttribute: (k: string) => void;
			dispatchEvent: () => boolean;
			getBoundingClientRect: () => { top: number; left: number; right: number; bottom: number; width: number; height: number };
			focus: () => void;
			blur: () => void;
			contains: (o?: unknown) => boolean;
		}
		const doc: Record<string, unknown> = {
			nodeType: 9,
			activeElement: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
			createTextNode: (text: string): DomStub => ({
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
		const makeEl = (tag = "div"): DomStub => {
			const children: DomStub[] = [];
			const attrs: Record<string, string> = {};
			const el: DomStub = {
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
				appendChild: (c) => { children.push(c); c.parentNode = el; return c; },
				insertBefore: (c, b) => {
					const i = b ? children.indexOf(b) : -1;
					if (i >= 0) children.splice(i, 0, c);
					else children.push(c);
					c.parentNode = el;
					return c;
				},
				removeChild: (c) => { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); c.parentNode = null; return c; },
				addEventListener: () => {},
				removeEventListener: () => {},
				setAttribute: (k, v) => { attrs[k] = v; if (k === "class" || k === "className") el.className = v; },
				getAttribute: (k) => attrs[k] ?? null,
				hasAttribute: (k) => k in attrs,
				removeAttribute: (k) => { delete attrs[k]; },
				dispatchEvent: () => true,
				getBoundingClientRect: () => ({ top: 0, left: 0, right: 1200, bottom: 900, width: 1200, height: 900 }),
				focus: () => {},
				blur: () => {},
				contains: (o) => { let curr = o as DomStub | null | undefined; while (curr) { if (curr === el) return true; curr = curr.parentNode; } return false; },
			};
			return el;
		};
		doc.createElement = (t: string) => makeEl(t);
		doc.createElementNS = (_ns: string, t: string) => makeEl(t);
		doc.body = makeEl("body");
		doc.documentElement = makeEl("html");
		const serialize = (n: DomStub): string => {
			if (n.nodeType === 3) return n.data ?? n.textContent ?? "";
			if (n.nodeType !== 1) return "";
			const attrStr = Object.entries(n.attrs).map(([k, v]) => ` ${k}="${v}"`).join("");
			const inner = n.children.length > 0 ? n.children.map(serialize).join("") : (n.textContent ?? "");
			return `<${n.tagName.toLowerCase()}${attrStr}>${inner}</${n.tagName.toLowerCase()}>`;
		};
		(globalThis as { fetch: unknown }).fetch = async () =>
			new Response(JSON.stringify({ data: {} }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		(globalThis as { window: unknown }).window = { document: doc, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true, HTMLIFrameElement: FakeIFrame, Element: FakeEl, HTMLElement: FakeHtmlEl, Node: FakeNode, navigator: { userAgent: "node" } };
		(globalThis as { document: unknown }).document = doc;
		(globalThis as { HTMLElement: unknown }).HTMLElement = FakeHtmlEl;
		(globalThis as { Element: unknown }).Element = FakeEl;
		(globalThis as { Node: unknown }).Node = FakeNode;
		(globalThis as { HTMLIFrameElement: unknown }).HTMLIFrameElement = FakeIFrame;
		(globalThis as { IS_REACT_ACT_ENVIRONMENT: unknown }).IS_REACT_ACT_ENVIRONMENT = true;
		const container = makeEl("div");
		let root: Root | null = null;
		let html = "";
		try {
			await act(async () => {
				root = createRoot(container as unknown as HTMLElement);
				root.render(
					React.createElement(
						AppLogicProvider,
						{ value: appContext },
						React.createElement(PatientOverviewTab, { patientBalance: 0 }),
					),
				);
				await new Promise((r) => setTimeout(r, 15));
			});
			html = container.children.map(serialize).join("");
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
		const matches = html.match(/data-testid="patient-communication-timeline-widget"/g) ?? [];
		assert.equal(matches.length, 1, "PatientOverviewTab must mount PatientCommunicationTimelineWidget directly once");
	});
});
