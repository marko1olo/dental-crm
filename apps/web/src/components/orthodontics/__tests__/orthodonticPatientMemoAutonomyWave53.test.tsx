/**
 * orthodonticPatientMemoAutonomyWave53.test.tsx
 *
 * Unit tests for Wave 53 / Feature 240:
 * «ортодонтия_мессенджеры::1_клик_копирование_памятки_по_ношению_эластиков_и_уходу_за_брекетами_элайнерами_для_пациента»
 *
 * CONSTITUTION & MANDATES:
 * - THE_HAMMER_MASTER_PROMPT.md & .agents/AGENTS.md
 * - Mandate 8c: Universal 3-Tier Architecture & Ergonomic Invariants (touch target >= 44x44px)
 * - Mandate 8d (pt 2, 7): Hick's Density & Zero cartoon emojis in medical documents
 * - Mandate 8e (pt 1, 2): Doctor & Staff Autonomy (No dead/disabled buttons, friction killer)
 * - Mandate 8i: Specialized Outpatient Context (Form 043/u & star standards)
 * - Mandate 8k: CRM != Reality Simulator (Instant 1-click patient instructions for messengers)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
	formatOrthodonticPatientMemo,
	type OrthodonticPatientMemoParams,
	OrthodonticVisitProtocolWidget,
} from "../OrthodonticVisitProtocolWidget.js";

interface MockDomNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	className: string;
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
	dispatchEvent: (ev: { type: string; detail?: unknown }) => boolean;
	focus: () => void;
	blur: () => void;
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
	let lastDispatchedToast: { text: string; type: string } | null = null;
	let lastCopiedClipboard = "";

	function createMockElement(tag = "div"): MockDomNode {
		const children: MockDomNode[] = [];
		const options: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};

		let rawTextContent = "";
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
			disabled: false,
			value: "",
			multiple: false,
			attributes: [],
			ownerDocument: null,
			parentNode: null,
			get textContent() {
				if (children.length === 0) return rawTextContent;
				return children.map((c) => c.textContent || "").join("");
			},
			set textContent(val: string) {
				rawTextContent = val;
			},
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
				if (name === "class" || name === "className") {
					el.className = value;
				}
				if (name === "value") {
					el.value = value;
				}
				if (name.startsWith("data-")) {
					el.dataset[name.slice(5)] = value;
				}
			},
			getAttribute: (name: string): string | null => {
				if (name === "class" || name === "className") {
					return el.className || attrs[name] || null;
				}
				const val = attrs[name];
				return val !== undefined ? val : null;
			},
			removeAttribute: (name: string) => {
				delete attrs[name];
			},
			dispatchEvent: (ev: { type: string; detail?: unknown }) => {
				const list = listeners[ev.type] || [];
				for (const fn of list) {
					fn(ev as unknown as Event);
				}
				return true;
			},
			focus: () => {},
			blur: () => {},
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

	const winListeners: Record<string, EventListener[]> = {};

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
		dispatchEvent: (ev: { type: string; detail?: unknown }) => {
			if (ev.type === "dente-toast") {
				lastDispatchedToast = ev.detail as { text: string; type: string };
			}
			const list = winListeners[ev.type] || [];
			for (const fn of list) {
				fn(ev as unknown as Event);
			}
			return true;
		},
		navigator: {
			clipboard: {
				writeText: async (text: string) => {
					lastCopiedClipboard = text;
					return Promise.resolve();
				},
			},
		},
		print: () => {},
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {},
		CustomEvent: globalThis.CustomEvent || class CustomEvent {
			type: string;
			detail: unknown;
			constructor(type: string, params: { detail?: unknown } = {}) {
				this.type = type;
				this.detail = params.detail;
			}
		},
	};
	(doc as unknown as { defaultView: typeof win }).defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	const prevDocument = g.document;
	const prevWindow = g.window;
	const originalClipboard = globalThis.navigator?.clipboard;

	g.document = doc;
	g.window = win;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	if (globalThis.navigator) {
		Object.defineProperty(globalThis.navigator, "clipboard", {
			value: {
				writeText: async (text: string) => {
					lastCopiedClipboard = text;
					return Promise.resolve();
				},
			},
			configurable: true,
			writable: true,
		});
	}

	return {
		doc,
		win,
		getLastDispatchedToast: () => lastDispatchedToast,
		getLastCopiedClipboard: () => lastCopiedClipboard,
		restore: () => {
			g.document = prevDocument;
			g.window = prevWindow;
			if (globalThis.navigator && originalClipboard) {
				Object.defineProperty(globalThis.navigator, "clipboard", {
					value: originalClipboard,
					configurable: true,
					writable: true,
				});
			}
		},
	};
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

describe("Wave 53 / Feature 240: 1-Click Patient Orthodontic Memo for Messengers (WhatsApp/Telegram)", () => {
	describe("1. formatOrthodonticPatientMemo pure function", () => {
		it("formatOrthodonticPatientMemo forms structured text with clinic, doctor, patient, wire, elastics and safety memo without emojis", () => {
			const params: OrthodonticPatientMemoParams = {
				clinicName: "Стоматология DENTE Премиум",
				clinicPhone: "+7 (495) 777-99-00",
				doctorName: "Д-р Кузнецова Е.В.",
				patientName: "Смирнова Ольга Владимировна",
				visitDate: "15.09.2026",
				bracketSystem: "damon_q2",
				archwireMaterial: "CuNiTi",
				archwireSection: ".016",
				targetArch: "both",
				elasticScheme: "class_ii",
				elasticSize: "kangaroo_1_4",
				elasticWear: "22 часа/сутки",
				isAligners: false,
			};

			const text = formatOrthodonticPatientMemo(params);

			// Header with clinic
			assert.ok(
				text.includes("Ортодонтические рекомендации после приёма (клиника «Стоматология DENTE Премиум»):"),
				"Must contain clinic header",
			);
			assert.ok(
				text.includes("Пациент: Смирнова Ольга Владимировна"),
				"Must contain patient name",
			);
			assert.ok(
				text.includes("Лечащий врач: Д-р Кузнецова Е.В."),
				"Must contain doctor name",
			);
			assert.ok(
				text.includes("Дата приёма: 15.09.2026"),
				"Must contain visit date",
			);
			assert.ok(
				text.includes("Аппаратура: Damon Q2"),
				"Must map bracket system id to label",
			);

			// Wire and arch
			assert.ok(
				text.includes("Установленная дуга: CuNiTi .016 (обе челюсти)"),
				"Must display archwire details",
			);

			// Elastics block
			assert.ok(
				text.includes("Схема межчелюстных эластиков (тяг):"),
				"Must include elastics header",
			);
			assert.ok(
				text.includes("- Направление: II класс (дистализирующая)"),
				"Must map elastic scheme id to clinical label",
			);
			assert.ok(
				text.includes("- Размер/сила: 1/4\" 4.5 oz (Кенгуру) (Medium)"),
				"Must map elastic size and force strength",
			);
			assert.ok(
				text.includes("- Режим ношения: 22 часа/сутки (смена на свежие 2 раза в день)"),
				"Must display wear mode instructions",
			);

			// Safety memo 1-4 points
			assert.ok(
				text.includes("Памятка пациенту:"),
				"Must include memo header",
			);
			assert.ok(
				text.includes("1. Первые 2-3 дня возможна умеренная чувствительность зубов при накусывании (физиологическая норма перемещения зубов)."),
				"Must include pain/adaptation memo",
			);
			assert.ok(
				text.includes("2. Эластики снимаются только во время еды и чистки зубов. При обрыве эластика надеть новый из упаковки."),
				"Must include elastics handling rules",
			);
			assert.ok(
				text.includes("3. При натирании щеки или губы нанесите защитный ортодонтический воск на выступающий элемент."),
				"Must include wax application rules",
			);
			assert.ok(
				text.includes("4. При отклейке брекета, утере кнопки или дискомфорте от дуги немедленно свяжитесь с клиникой: +7 (495) 777-99-00."),
				"Must include emergency contact with clinic phone",
			);
			assert.ok(
				text.includes("Следующий контрольный визит: через 4–6 недель."),
				"Must include follow-up schedule",
			);

			// Zero cartoon emojis check (Mandate 8d pt 7)
			assert.strictEqual(
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text),
				false,
				"Must contain zero cartoon emojis",
			);
		});

		it("formatOrthodonticPatientMemo correctly formats aligner block when isAligners=true", () => {
			const text = formatOrthodonticPatientMemo({
				clinicName: "DENTE",
				clinicPhone: "+7 (495) 777-11-22",
				doctorName: "Д-р Кузнецова",
				patientName: "Алексей Иванов",
				visitDate: "10.09.2026",
				bracketSystem: "aligners",
				isAligners: true,
				currentAligner: 12,
				totalAligners: 36,
				elasticScheme: "none",
			});

			assert.ok(text.includes("Аппаратура: Элайнеры"), "Must state aligners apparatus");
			assert.ok(
				text.includes("Текущий этап: Каппа №12 из 36"),
				"Must state current aligner step",
			);
			assert.ok(
				text.includes("Режим: ношение 22 часа/сутки, смена через 10-14 дней."),
				"Must state aligner wear regime",
			);
			assert.strictEqual(
				text.includes("Установленная дуга:"),
				false,
				"Must not contain wire line when aligners are used",
			);
			assert.strictEqual(
				text.includes("Схема межчелюстных эластиков (тяг):"),
				false,
				"Must omit elastics section when elasticScheme is none",
			);

			// Zero cartoon emojis
			assert.strictEqual(
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text),
				false,
				"Must contain zero cartoon emojis",
			);
		});

		it("formatOrthodonticPatientMemo falls back to sensible defaults when optional fields are empty", () => {
			const text = formatOrthodonticPatientMemo({
				clinicName: "",
				clinicPhone: "",
				doctorName: "",
				patientName: "",
				bracketSystem: "damon_q2",
			});

			assert.ok(
				text.includes("клиника «Стоматологическая клиника DENTE»"),
				"Falls back to default clinic name",
			);
			assert.ok(
				text.includes("Пациент: Пациент"),
				"Falls back to default patient name",
			);
			assert.ok(
				text.includes("Лечащий врач: Лечащий врач-ортодонт"),
				"Falls back to default doctor",
			);
			assert.ok(
				!text.includes("+7 (495) 123-45-67"),
				"Does not fall back to fake phone number when omitted",
			);
			assert.ok(
				text.includes("немедленно свяжитесь с клиникой."),
				"Outputs clean contact text without trailing colon/empty number",
			);
			assert.ok(
				text.includes("Установленная дуга: CuNiTi .016 (обе челюсти)"),
				"Falls back to default workhorse archwire CuNiTi .016",
			);
		});
	});

	describe("2. UI Rendering & 1-Click Action Bar placement", () => {
		it("renders ortho-copy-patient-memo-btn with touch target >= 44px (min-h-[48px]) in Action Bar", () => {
			const html = renderToString(
				<OrthodonticVisitProtocolWidget
					isOpen={true}
					onClose={() => {}}
					patientId="pat-1"
					patientName="Иванов И.И."
					clinicName="DENTE Clinic"
					clinicPhone="+7 (495) 000-11-22"
					doctorName="Д-р Ортодонт"
				/>,
			);

			// Testid presence
			assert.ok(
				html.includes('data-testid="ortho-copy-patient-memo-btn"'),
				"Must render button with data-testid='ortho-copy-patient-memo-btn'",
			);

			// Touch target min-h-[48px] (>= 44px Mandate 8c)
			assert.ok(
				html.includes("min-h-[48px] px-3.5 py-2 rounded-xl"),
				"Must have min-h-[48px] touch target class",
			);

			// Labels
			assert.ok(
				html.includes("Скопировать для пациента"),
				"Must include visible desktop label 'Скопировать для пациента'",
			);
			assert.ok(
				html.includes("Памятка"),
				"Must include responsive mobile label 'Памятка'",
			);

			// Title for messenger integration
			assert.ok(
				html.includes("title=\"Скопировать памятку по эластикам и уходу для отправки пациенту в WhatsApp/Telegram\""),
				"Must include descriptive title mentioning WhatsApp/Telegram",
			);

			// Quick copy protocol button updated to min-h-[44px]
			assert.ok(
				html.includes("title=\"Скопировать протокол в буфер\""),
				"Protocol copy button exists",
			);
			assert.ok(
				html.includes("min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border"),
				"Protocol copy button raised to min-h-[44px] touch target",
			);

			// Lucide vector icon inside button (no cartoon emojis)
			assert.ok(
				html.includes("<svg") && html.includes("lucide-copy"),
				"Must render vector Lucide Copy icon",
			);
			assert.strictEqual(
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(html),
				false,
				"Must contain zero cartoon emojis in HTML",
			);
		});
	});

	describe("3. Interactive Click & Clipboard Action", () => {
		it("clicking ortho-copy-patient-memo-btn writes formatted patient memo to clipboard and dispatches success toast", async () => {
			const mockDom = setupMockDom();
			const root: Root = createRoot(mockDom.doc.body as unknown as HTMLElement);

			try {
				await act(async () => {
					root.render(
						<OrthodonticVisitProtocolWidget
							isOpen={true}
							onClose={() => {}}
							patientId="pat-42"
							patientName="Петров Петр"
							clinicName="Стоматология DENTE"
							clinicPhone="+7 (495) 333-22-11"
							doctorName="Врач Ортодонтов"
						/>,
					);
				});

				const copyBtn = findNodeByTestId(mockDom.doc.body, "ortho-copy-patient-memo-btn");
				assert.ok(copyBtn, "Must find ortho-copy-patient-memo-btn in DOM");

				await clickNode(copyBtn);

				// Verify clipboard contents
				const copied = mockDom.getLastCopiedClipboard();
				assert.ok(copied.length > 0, "Clipboard must receive text");
				assert.ok(
					copied.includes("Ортодонтические рекомендации после приёма (клиника «Стоматология DENTE»):"),
					"Must contain clinic title",
				);
				assert.ok(
					copied.includes("Пациент: Петров Петр"),
					"Must contain patient name",
				);
				assert.ok(
					copied.includes("Лечащий врач: Врач Ортодонтов"),
					"Must contain doctor name",
				);
				assert.ok(
					copied.includes("Памятка пациенту:"),
					"Must contain patient memo header",
				);
				assert.ok(
					copied.includes("+7 (495) 333-22-11"),
					"Must contain clinic phone number",
				);

				// Verify success toast was dispatched
				const toast = mockDom.getLastDispatchedToast();
				assert.ok(toast, "Toast must be dispatched");
				assert.strictEqual(toast.type, "success", "Toast type must be success");
				assert.strictEqual(
					toast.text,
					"Памятка пациенту по эластикам и уходу скопирована для мессенджера",
					"Toast text must confirm memo copy for messengers",
				);

				// Verify zero emojis
				assert.strictEqual(
					/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(copied),
					false,
					"Copied text must not contain cartoon emojis",
				);
			} finally {
				await act(async () => {
					root.unmount();
				});
				mockDom.restore();
			}
		});
	});
});
