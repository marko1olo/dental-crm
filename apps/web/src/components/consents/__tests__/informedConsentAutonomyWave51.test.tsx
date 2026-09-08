/**
 * informedConsentAutonomyWave51.test.tsx
 *
 * Unit tests for Wave 51 / Feature 236:
 * «информированные_согласия::1_клик_копирование_текста_идс_и_памятки_для_пациента_в_мессенджеры_и_печать_пакета_без_симулятора_стилуса»
 *
 * CONSTITUTION & MANDATES:
 * - THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8c: Universal 3-Tier Architecture & Ergonomic Invariants
 * - Mandate 8d (pt 2, 7): Hick's Density & Zero cartoon emojis in medical documents
 * - Mandate 8e (pt 5): Doctor & Staff Autonomy (Instant print in 1 click; 0 disabled buttons)
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
	buildPatientConsentSummary,
	InformedConsentModal,
	type PatientConsentSummaryParams,
} from "../InformedConsentModal.js";
import {
	getAllConsentPackages,
	getAllConsentTemplates,
	getConsentPackage,
	getConsentTemplate,
} from "../consentTemplates.js";

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

	let lastDispatchedEvent: unknown = null;
	const win = {
		document: doc,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: (ev: unknown) => {
			lastDispatchedEvent = ev;
			return true;
		},
		print: () => {},
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

	return {
		doc,
		win,
		getLastDispatchedEvent: () => lastDispatchedEvent,
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

describe("Wave 51 / Feature 236: 1-Click Consent Summary & Patient Memo for Messengers", () => {
	const mockPatient = {
		fullName: "Иванов Иван Иванович",
		birthDate: "15.05.1985",
		passport: "4508 № 123456",
		phone: "+7 (999) 123-45-67",
		cardNumber: "043-2026/102",
	};

	describe("1. Rendering & Footer Placement (Mandates 8c, 8d)", () => {
		it("renders consent-copy-patient-text-btn in footer next to print buttons with touch target >= 44px and vector icon", () => {
			const html = renderToString(
				<InformedConsentModal
					isOpen={true}
					onClose={() => {}}
					initialMode="single"
					patient={mockPatient}
					doctorName="Петрова Анна Сергеевна"
					clinicName="ООО «Стоматологическая клиника ДЕНТЕ»"
					clinicPhone="+7 (495) 123-45-67"
					diagnosisIcd="K02.1 Кариес дентина"
					toothNumbers="1.6"
				/>,
			);

			// Button presence and testid
			assert.ok(
				html.includes('data-testid="consent-copy-patient-text-btn"'),
				"Must render button with data-testid='consent-copy-patient-text-btn'",
			);

			// Text label
			assert.ok(
				html.includes("Скопировать для пациента"),
				"Must include visible label 'Скопировать для пациента'",
			);

			// Title for tooltip
			assert.ok(
				html.includes("Скопировать выжимку ИДС и памятку для отправки пациенту в WhatsApp/Telegram"),
				"Must include descriptive title explaining WhatsApp/Telegram summary copy",
			);

			// Class compliance: consent-action-btn secondary (has min-height: 48px in CSS >= 44px)
			assert.ok(
				html.includes("consent-action-btn secondary"),
				"Must have consent-action-btn secondary CSS class with min-height >= 44px",
			);

			// Vector Lucide icon inside button (SVG element with Lucide attributes, not cartoon emoji)
			assert.ok(
				html.includes("<svg") && html.includes("lucide-copy"),
				"Must render vector Lucide Copy SVG icon",
			);

			// Zero cartoon emoji in button markup
			assert.strictEqual(
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(html),
				false,
				"Must NOT contain cartoon emojis in modal markup (Mandate 8d pt 7)",
			);
		});
	});

	describe("2. Single Consent Mode (activeMode === 'single') Click & Copy Flow", () => {
		it("clicking button in single mode formats structured text with clinic, doctor, patient, SHA-256 and copies to navigator.clipboard", async () => {
			const { doc } = setupMockDom();
			const root: Root = createRoot(doc.body as unknown as HTMLElement);

			let writtenToClipboard = "";
			// Mock navigator.clipboard
			const originalClipboard = globalThis.navigator?.clipboard;
			Object.defineProperty(globalThis.navigator, "clipboard", {
				value: {
					writeText: async (text: string) => {
						writtenToClipboard = text;
					},
				},
				configurable: true,
				writable: true,
			});

			await act(async () => {
				root.render(
					<InformedConsentModal
						isOpen={true}
						onClose={() => {}}
						initialMode="single"
						initialTemplateKey="CONSENT_THERAPY"
						patient={mockPatient}
						doctorName="Петрова Анна Сергеевна"
						clinicName="ООО «Стоматологическая клиника ДЕНТЕ»"
						clinicPhone="+7 (495) 777-88-99"
						diagnosisIcd="K02.1 Кариес дентина"
						toothNumbers="1.6, 1.7"
					/>,
				);
			});

			const copyBtn = findNodeByTestId(doc.body, "consent-copy-patient-text-btn");
			assert.ok(copyBtn, "Must find consent-copy-patient-text-btn in DOM");

			await clickNode(copyBtn);

			// Verify text copied to clipboard
			assert.ok(writtenToClipboard.length > 0, "Text must be written to clipboard");
			assert.ok(
				writtenToClipboard.includes("Информированное добровольное согласие (клиника «ООО «Стоматологическая клиника ДЕНТЕ»»):"),
				"Must include clinic name header in single mode",
			);
			assert.ok(
				writtenToClipboard.includes("Пациент: Иванов Иван Иванович"),
				"Must include patient name",
			);
			const therapyTpl = getConsentTemplate("CONSENT_THERAPY");
			assert.ok(
				writtenToClipboard.includes("Медицинское вмешательство:"),
				"Must include medical intervention field",
			);
			assert.ok(
				writtenToClipboard.includes(therapyTpl.code),
				`Must include template code '${therapyTpl.code}'`,
			);
			assert.ok(
				writtenToClipboard.includes(therapyTpl.title),
				`Must include template title '${therapyTpl.title}'`,
			);
			assert.ok(
				writtenToClipboard.includes("Врач: Петрова Анна Сергеевна"),
				"Must include doctor name",
			);
			assert.ok(
				writtenToClipboard.includes("Область лечения: 1.6, 1.7"),
				"Must include treatment area teeth",
			);
			assert.ok(
				writtenToClipboard.includes("Диагноз МКБ: K02.1 Кариес дентина"),
				"Must include ICD diagnosis",
			);
			assert.ok(
				writtenToClipboard.includes("Ключевые риски и памятка: после вмешательства возможно появление локальной болезненности, отёка и чувствительности (1-3 дня). Строго соблюдайте назначения лечащего врача."),
				"Must include standard outpatient risk memo",
			);
			assert.ok(
				writtenToClipboard.includes("Хеш целостности SHA-256:"),
				"Must include SHA-256 cryptographic integrity hash line",
			);
			assert.ok(
				writtenToClipboard.includes("Телефон клиники: +7 (495) 777-88-99."),
				"Must include clinic phone",
			);

			// Zero emojis in copied text
			assert.strictEqual(
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(writtenToClipboard),
				false,
				"Copied text must not contain cartoon emojis (Mandate 8d pt 7)",
			);

			await act(async () => {
				root.unmount();
			});

			// Restore clipboard
			if (originalClipboard) {
				Object.defineProperty(globalThis.navigator, "clipboard", {
					value: originalClipboard,
					configurable: true,
					writable: true,
				});
			}
		});

		it("single mode provides sensible fallbacks when diagnosis or teeth are omitted", () => {
			const text = buildPatientConsentSummary({
				activeMode: "single",
				patientName: "Сидоров Алексей",
				doctorName: "Д-р Смирнов А. В.",
				clinicName: "ООО «ДЕНТЕ»",
				clinicPhone: "+7 (495) 222-33-44",
				templateKey: "CONSENT_ANESTHESIA",
				integrityHash: "abcdef0123456789fedcba9876543210abcdef0123456789fedcba9876543210",
			});

			assert.ok(text.includes("Область лечения: По показаниям"), "Must fall back to 'По показаниям'");
			assert.ok(text.includes("Диагноз МКБ: По плану лечения"), "Must fall back to 'По плану лечения'");
			assert.ok(text.includes("Хеш целостности SHA-256: abcdef0123456789..."), "Must include 16-char hash prefix");
			assert.ok(text.includes("Телефон клиники: +7 (495) 222-33-44."), "Must include specified clinic phone");
		});
	});

	describe("3. Package Consent Mode (activeMode === 'packages') Click & Copy Flow", () => {
		it("clicking button in packages mode formats structured text with all package documents and copies to clipboard", async () => {
			const { doc } = setupMockDom();
			const root: Root = createRoot(doc.body as unknown as HTMLElement);

			let writtenToClipboard = "";
			const originalClipboard = globalThis.navigator?.clipboard;
			Object.defineProperty(globalThis.navigator, "clipboard", {
				value: {
					writeText: async (text: string) => {
						writtenToClipboard = text;
					},
				},
				configurable: true,
				writable: true,
			});

			await act(async () => {
				root.render(
					<InformedConsentModal
						isOpen={true}
						onClose={() => {}}
						initialMode="packages"
						initialPackageKey="PACKAGE_PRIMARY_VISIT"
						patient={mockPatient}
						doctorName="Петрова Анна Сергеевна"
						clinicName="ООО «Стоматологическая клиника ДЕНТЕ»"
						clinicPhone="+7 (495) 123-45-67"
						toothNumbers="По плану лечения"
					/>,
				);
			});

			const copyBtn = findNodeByTestId(doc.body, "consent-copy-patient-text-btn");
			assert.ok(copyBtn, "Must find consent-copy-patient-text-btn in DOM in packages mode");

			await clickNode(copyBtn);

			// Verify text copied to clipboard
			assert.ok(writtenToClipboard.length > 0, "Package summary text must be written to clipboard");
			assert.ok(
				writtenToClipboard.includes("Информированные согласия на лечение (клиника «ООО «Стоматологическая клиника ДЕНТЕ»»):"),
				"Must include package consents header",
			);
			assert.ok(
				writtenToClipboard.includes("Пациент: Иванов Иван Иванович"),
				"Must include patient name",
			);
			const pkg = getConsentPackage("PACKAGE_PRIMARY_VISIT");
			assert.ok(
				writtenToClipboard.includes(`Пакет: ${pkg.title}`),
				`Must include package title '${pkg.title}'`,
			);

			// Verify all documents in package are listed with codes and titles
			for (const tplKey of pkg.templateKeys) {
				const tpl = getConsentTemplate(tplKey);
				assert.ok(
					writtenToClipboard.includes(tpl.code),
					`Package summary must include template code '${tpl.code}'`,
				);
				assert.ok(
					writtenToClipboard.includes(tpl.title),
					`Package summary must include template title '${tpl.title}'`,
				);
			}

			assert.ok(
				writtenToClipboard.includes("Врач: Петрова Анна Сергеевна"),
				"Must include doctor name",
			);
			assert.ok(
				writtenToClipboard.includes("Область лечения: По плану лечения"),
				"Must include treatment area",
			);
			assert.ok(
				writtenToClipboard.includes("Хеш целостности SHA-256:"),
				"Must include SHA-256 cryptographic hash",
			);
			assert.ok(
				writtenToClipboard.includes("Памятка: перед приёмом ознакомьтесь с противопоказаниями. При возникновении вопросов звоните в клинику: +7 (495) 123-45-67."),
				"Must include package memo with clinic phone",
			);

			// Zero emojis
			assert.strictEqual(
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(writtenToClipboard),
				false,
				"Package summary must not contain cartoon emojis (Mandate 8d pt 7)",
			);

			await act(async () => {
				root.unmount();
			});

			if (originalClipboard) {
				Object.defineProperty(globalThis.navigator, "clipboard", {
					value: originalClipboard,
					configurable: true,
					writable: true,
				});
			}
		});

		it("formats PACKAGE_SURGERY and PACKAGE_ORTHOPEDICS correctly with all respective document titles and codes", () => {
			const surgeryText = buildPatientConsentSummary({
				activeMode: "packages",
				packageKey: "PACKAGE_SURGERY",
				patientName: "Ковалев Дмитрий",
				doctorName: "Д-р Васильев К. М.",
				clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				clinicPhone: "+7 (495) 888-99-00",
				toothNumbers: "3.6, 3.7",
				integrityHash: "112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00",
			});

			const surgeryPkg = getConsentPackage("PACKAGE_SURGERY");
			for (const tplKey of surgeryPkg.templateKeys) {
				const tpl = getConsentTemplate(tplKey);
				assert.ok(surgeryText.includes(tpl.code), `Must include ${tpl.code}`);
				assert.ok(surgeryText.includes(tpl.title), `Must include ${tpl.title}`);
			}
			assert.ok(surgeryText.includes("Область лечения: 3.6, 3.7"));
			assert.ok(surgeryText.includes("Хеш целостности SHA-256: 1122334455667788..."));

			const orthoText = buildPatientConsentSummary({
				activeMode: "packages",
				packageKey: "PACKAGE_ORTHOPEDICS",
				patientName: "Смирнова Ольга",
				doctorName: "Д-р Кузнецов П. В.",
				clinicName: "ООО «ДЕНТЕ»",
				toothNumbers: "",
			});

			const orthoPkg = getConsentPackage("PACKAGE_ORTHOPEDICS");
			for (const tplKey of orthoPkg.templateKeys) {
				const tpl = getConsentTemplate(tplKey);
				assert.ok(orthoText.includes(tpl.code), `Must include ${tpl.code}`);
				assert.ok(orthoText.includes(tpl.title), `Must include ${tpl.title}`);
			}
			assert.ok(orthoText.includes("Область лечения: По плану лечения"));
		});
	});

	describe("4. Zero Cartoon Emojis Guarantee across All Canonical Templates (Mandate 8d pt 7)", () => {
		it("verifies 0 cartoon emojis in generated summary texts across all statutory packages", () => {
			const packages = getAllConsentPackages();
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

			for (const pkg of packages) {
				const summary = buildPatientConsentSummary({
					activeMode: "packages",
					packageKey: pkg.key,
					patientName: "Пациент Тестовый",
					doctorName: "Доктор Стоматолог",
					clinicName: "Клиника ДЕНТЕ",
					clinicPhone: "+7 (495) 123-45-67",
					toothNumbers: "1.1",
					integrityHash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
				});

				assert.strictEqual(
					emojiRegex.test(summary),
					false,
					`Package ${pkg.key} summary must not contain cartoon emojis`,
				);
			}
		});

		it("verifies 0 cartoon emojis in generated summary texts across all individual templates", () => {
			const templates = getAllConsentTemplates();
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

			for (const tpl of templates) {
				const summary = buildPatientConsentSummary({
					activeMode: "single",
					templateKey: tpl.key,
					patientName: "Пациент Тестовый",
					doctorName: "Доктор Стоматолог",
					clinicName: "Клиника ДЕНТЕ",
					clinicPhone: "+7 (495) 123-45-67",
					toothNumbers: "1.1",
					diagnosisIcd: "K02.1",
					integrityHash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
				});

				assert.strictEqual(
					emojiRegex.test(summary),
					false,
					`Template ${tpl.key} summary must not contain cartoon emojis`,
				);
			}
		});
	});
});
