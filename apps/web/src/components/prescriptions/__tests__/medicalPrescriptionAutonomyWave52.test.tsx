/**
 * medicalPrescriptionAutonomyWave52.test.tsx
 *
 * Unit tests for Wave 52 / Feature 238:
 * «рецепты_мессенджеры::1_клик_копирование_схемы_приема_лекарств_для_пациента_в_whatsapp_и_телеграм_с_памяткой_безопасности»
 *
 * CONSTITUTION & MANDATES:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8c: Universal 3-Tier Architecture & Ergonomic Invariants
 * - Mandate 8d (pt 2, 7): Hick's density & Zero cartoon emojis in medical documents (Lucide vector icons only)
 * - Mandate 8e (pt 1, 5): Doctor Autonomy (Instant memo copy, zero blocked disabled buttons)
 * - Mandate 8i: Specialized Outpatient Context (Form 107-1/u, Order 1094n, dental pharmacopeia)
 * - Mandate 8k: Friction-Killer Law (1-click messenger copy instead of manual re-typing or Latin screenshots)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Default clinic phone & clinic name, zero dead-ends)
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
	formatPatientPrescriptionMemo,
	MedicalPrescriptionModal,
	type PatientPrescriptionMemoParams,
} from "../generator/MedicalPrescriptionModal";
import {
	DENTAL_MEDICATIONS_CATALOG,
	type DentalMedicationPreset,
} from "../generator/prescriptionPresets";

// ============================================================================
// Cartoon Emoji Validator per Mandate 8d pt 7
// ============================================================================
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

// ============================================================================
// Lightweight Mock DOM for React 19 Interactive Testing in Node.js
// ============================================================================

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
	className: string;
	options?: MockDomNode[];
	selected?: boolean;
	selectedIndex?: number;
	disabled?: boolean;
	value?: string;
	multiple?: boolean;
	appendChild: (child: MockDomNode) => MockDomNode;
	insertBefore: (child: MockDomNode, before: MockDomNode | null) => MockDomNode;
	removeChild: (child: MockDomNode) => MockDomNode;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: (type: string, fn: EventListener) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	hasAttribute: (name: string) => boolean;
	removeAttribute: (name: string) => void;
	dispatchEvent: (ev: { type: string; [key: string]: unknown }) => boolean;
	getBoundingClientRect: () => {
		top: number;
		left: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	};
	focus: () => void;
	blur: () => void;
	contains: (other: MockDomNode) => boolean;
	[key: string]: unknown;
}

function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};
	// biome-ignore lint/suspicious/noExplicitAny: mock DOM
	let doc: any;

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
			getAttribute: (name: string) => {
				if (name === "class" || name === "className") {
					return el.className || attrs[name] || null;
				}
				return attrs[name] || null;
			},
			hasAttribute: (name: string) =>
				name in attrs || (name === "class" && Boolean(el.className)),
			removeAttribute: (name: string) => {
				delete attrs[name];
				if (name === "class" || name === "className") {
					el.className = "";
				}
			},
			dispatchEvent: (ev: { type: string; [key: string]: unknown }) => {
				const list = listeners[ev.type] || [];
				for (const fn of list) {
					fn(ev as unknown as Event);
				}
				return true;
			},
			getBoundingClientRect: () => ({
				top: 0,
				left: 0,
				right: 1200,
				bottom: 900,
				width: 1200,
				height: 900,
			}),
			focus: () => {},
			blur: () => {},
			contains: (other: MockDomNode) => {
				let curr: MockDomNode | null = other;
				while (curr) {
					if (curr === el) return true;
					curr = curr.parentNode;
				}
				return false;
			},
		};
		el.ownerDocument = doc;
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
			ownerDocument: null,
		}),
		createComment: () => ({
			nodeType: 8,
			parentNode: null,
			ownerDocument: null,
		}),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	let lastWrittenClipboardText = "";
	let lastDispatchedCustomEvent: CustomEvent | null = null;
	let printCalled = false;

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
		dispatchEvent: (ev: { type: string; [key: string]: unknown }) => {
			if (ev.type === "dente-toast") {
				lastDispatchedCustomEvent = ev as unknown as CustomEvent;
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
					lastWrittenClipboardText = text;
					return Promise.resolve();
				},
			},
		},
		print: () => {
			printCalled = true;
		},
		location: { href: "http://localhost:5173", search: "" },
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
	if (g.navigator) {
		Object.defineProperty(g.navigator, "clipboard", {
			value: win.navigator.clipboard,
			configurable: true,
			writable: true,
		});
	} else {
		Object.defineProperty(g, "navigator", {
			value: win.navigator,
			configurable: true,
			writable: true,
		});
	}
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return {
		doc,
		win,
		getClipboardText: () => lastWrittenClipboardText,
		getLastToast: () => lastDispatchedCustomEvent,
		wasPrintCalled: () => printCalled,
		reset: () => {
			lastWrittenClipboardText = "";
			lastDispatchedCustomEvent = null;
			printCalled = false;
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
				await props.onClick({
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

// ============================================================================
// Test Suite: Wave 52 (Feature 238)
// ============================================================================

describe("Wave 52 (Feature 238): 1-Click Patient Prescription Memo for Messengers (Order 1094n Form 107-1/u)", () => {
	describe("1. SSR Structure, Touch Targets & Zero-Emoji Mandate (Mandates 8c, 8d)", () => {
		it("renders med-rx-copy-patient-btn in modal footer with touch target >= 44px", () => {
			const html = renderToString(
				<MedicalPrescriptionModal
					isOpen={true}
					onClose={() => {}}
					patientName="Кузнецов Дмитрий Сергеевич"
					doctorName="Д-р Воронова Е.А."
					clinicName="ООО «Денте Стоматология»"
					clinicPhone="+7 (495) 123-45-67"
				/>,
			);

			assert.ok(
				html.includes('data-testid="med-rx-copy-patient-btn"'),
				"Footer must contain med-rx-copy-patient-btn button",
			);
			assert.ok(
				html.includes("min-h-[44px]"),
				"Button must enforce touch target strictly >= 44px for gloved chairside use",
			);
			assert.ok(
				html.includes("Скопировать для пациента"),
				"Button must display readable Russian text label",
			);
			assert.ok(
				html.includes(
					'title="Скопировать схему приёма и памятку для отправки пациенту в WhatsApp/Telegram"',
				),
				"Button must feature informative tooltip title",
			);
		});

		it("Mandate 8d pt 7: Zero cartoon emojis in rendered modal and buttons", () => {
			const html = renderToString(
				<MedicalPrescriptionModal
					isOpen={true}
					onClose={() => {}}
					patientName="Иванова Светлана Владимировна"
					doctorName="Д-р Смирнов А.П."
					clinicName="Стоматологическая клиника «DENTE»"
				/>,
			);

			assert.strictEqual(
				hasCartoonEmojis(html),
				false,
				"Rendered prescription modal must NOT contain cartoon emojis (vector Lucide only)",
			);
		});

		it("modal does not render when isOpen=false", () => {
			const html = renderToString(
				<MedicalPrescriptionModal isOpen={false} onClose={() => {}} />,
			);

			assert.strictEqual(html, "", "Modal must return null when isOpen=false");
		});
	});

	describe("2. Pure Function formatPatientPrescriptionMemo Formatting & Safety Memo", () => {
		const amoxiclav =
			DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === "amoxiclav_875_125") ??
			DENTAL_MEDICATIONS_CATALOG[0];
		const nimesil =
			DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === "nimesil_100") ??
			DENTAL_MEDICATIONS_CATALOG[1];
		const chlorhexidine =
			DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === "chlorhexidine_005") ??
			DENTAL_MEDICATIONS_CATALOG[2];

		it("formats multi-drug prescription memo with clinic, doctor, patient and cleaned signaRu", () => {
			const params: PatientPrescriptionMemoParams = {
				clinicName: "ООО «Денте Стоматология»",
				clinicPhone: "+7 (495) 777-88-99",
				patientName: "Смирнова Екатерина Васильевна",
				doctorName: "Д-р Смирнов Алексей Петрович",
				prescriptionDate: "2026-09-08",
				medications: [amoxiclav, nimesil, chlorhexidine],
			};

			const memo = formatPatientPrescriptionMemo(params);

			// Assert header details
			assert.ok(
				memo.includes(
					"Схема приёма лекарственных препаратов (клиника «ООО «Денте Стоматология»»):",
				),
				"Must include clinic header",
			);
			assert.ok(
				memo.includes("Пациент: Смирнова Екатерина Васильевна"),
				"Must include patient name",
			);
			assert.ok(
				memo.includes("Лечащий врач: Д-р Смирнов Алексей Петрович"),
				"Must include doctor name",
			);
			assert.ok(
				memo.includes("Дата назначения: 2026-09-08"),
				"Must include prescription date",
			);
			assert.ok(
				memo.includes("Назначенные препараты:"),
				"Must include medications section header",
			);

			// Assert medication items
			assert.ok(
				memo.includes(
					"1. Амоксиклав (Аугментин 875+125 мг) (Амоксициллин + Клавулановая кислота, таблетки диспергируемые):",
				),
				"Must include first drug trade name, active substance and form",
			);
			assert.ok(
				memo.includes(
					"Способ применения: Внутрь по 1 таблетке 2 раза в сутки во время еды, курс 7 дней.",
				),
				"Must clean 'S.' prefix from signaRu",
			);
			assert.ok(
				!memo.includes("S. Внутрь по 1 таблетке"),
				"Must NOT leak Latin 'S.' prefix in patient memo",
			);

			assert.ok(
				memo.includes(
					"2. Нимесил (Нимесулид) (Нимесулид, гранулы для суспензии):",
				),
				"Must include second drug",
			);
			assert.ok(
				memo.includes(
					"Способ применения: Внутрь по 1 пакетику (100 мг) 2 раза в день после еды, растворив в 100 мл воды, при болях (3–5 дней).",
				),
				"Must include second drug instructions",
			);

			assert.ok(
				memo.includes(
					"3. Хлоргексидин 0.05% (Хлоргексидина биглюконат, раствор для местного применения):",
				),
				"Must include third drug",
			);
			assert.ok(
				memo.includes(
					"Способ применения: Ротовые ванночки по 1 минуте 3 раза в день после еды, 7 дней (не полоскать активно!).",
				),
				"Must include third drug instructions",
			);

			// Assert safety memo & clinic phone
			assert.ok(
				memo.includes(
					"Памятка: строго соблюдайте назначенную дозировку и график приёма. Не прекращайте курс антибиотиков раньше указанного срока. При любых признаках непереносимости или аллергии немедленно свяжитесь с клиникой: +7 (495) 777-88-99.",
				),
				"Must include safety instructions with clinic phone",
			);

			// Assert zero cartoon emojis
			assert.strictEqual(
				hasCartoonEmojis(memo),
				false,
				"Generated patient memo must NOT contain cartoon emojis",
			);
		});

		it("falls back to current date when prescriptionDate is omitted", () => {
			const memo = formatPatientPrescriptionMemo({
				clinicName: "Клиника ДЕНТЕ",
				clinicPhone: "+7 (495) 123-45-67",
				patientName: "Петров П.П.",
				doctorName: "Д-р Иванов И.И.",
				medications: [nimesil],
			});

			const todayRu = new Date().toLocaleDateString("ru-RU");
			assert.ok(
				memo.includes(`Дата назначения: ${todayRu}`),
				"Must format current date in ru-RU format when prescriptionDate is undefined",
			);
		});

		it("correctly cleans various signa prefixes ('S.', 'S ', 'D.S.')", () => {
			const customMed: DentalMedicationPreset = {
				id: "custom_test_drug",
				tradeNameRu: "Тестовый Препарат",
				activeSubstanceRu: "Тестовое Вещество",
				category: "other",
				categoryLabelRu: "Тест",
				latinRp: "Rp.: Test 100mg",
				formRu: "капсулы",
				dosageRu: "100 мг",
				quantityLabel: "N. 10",
				dispenseLatin: "D.t.d. N 10 in caps.",
				signaRu: "D.S. Принимать по 1 капсуле 2 раза в день.",
				validityDays: 60,
			};

			const memo = formatPatientPrescriptionMemo({
				clinicName: "Клиника",
				clinicPhone: "+7 (000) 000-00-00",
				patientName: "Тест",
				doctorName: "Врач",
				medications: [customMed],
			});

			assert.ok(
				memo.includes(
					"Способ применения: Принимать по 1 капсуле 2 раза в день.",
				),
				"Must clean 'D.S.' prefix",
			);
		});
	});

	describe("3. Interactive Click & Clipboard Copying (Mandates 8e, 8k, 8n)", () => {
		let mockDom: ReturnType<typeof setupMockDom>;
		let root: Root | null = null;
		let container: MockDomNode | null = null;

		beforeEach(() => {
			mockDom = setupMockDom();
			mockDom.reset();
			container = mockDom.doc.createElement("div");
			mockDom.doc.body.appendChild(container);
			root = createRoot(container as unknown as HTMLElement);
		});

		afterEach(async () => {
			if (root) {
				await act(async () => {
					root?.unmount();
				});
			}
		});

		it("clicking med-rx-copy-patient-btn copies formatted prescription memo to navigator.clipboard", async () => {
			await act(async () => {
				root?.render(
					<MedicalPrescriptionModal
						isOpen={true}
						onClose={() => {}}
						patientName="Смирнова Екатерина Васильевна"
						doctorName="Д-р Смирнов Алексей Петрович"
						clinicName="ООО «Денте Стоматология»"
						clinicPhone="+7 (495) 999-00-11"
					/>,
				);
			});

			const copyBtn = findNodeByTestId(container, "med-rx-copy-patient-btn");
			assert.ok(copyBtn, "med-rx-copy-patient-btn must be present in DOM");

			// Click copy button
			await clickNode(copyBtn);

			const copiedText = mockDom.getClipboardText();
			assert.ok(copiedText.length > 0, "Clipboard text must not be empty");

			assert.ok(
				copiedText.includes(
					"Схема приёма лекарственных препаратов (клиника «ООО «Денте Стоматология»»):",
				),
				"Must contain clinic header in clipboard",
			);
			assert.ok(
				copiedText.includes("Пациент: Смирнова Екатерина Васильевна"),
				"Must contain patient name in clipboard",
			);
			assert.ok(
				copiedText.includes("Лечащий врач: Д-р Смирнов Алексей Петрович"),
				"Must contain doctor name in clipboard",
			);
			assert.ok(
				copiedText.includes("Назначенные препараты:"),
				"Must contain medications section",
			);
			assert.ok(
				copiedText.includes("Памятка: строго соблюдайте назначенную дозировку"),
				"Must contain safety memo in clipboard",
			);
			assert.ok(
				copiedText.includes("+7 (495) 999-00-11"),
				"Must contain clinic phone in clipboard",
			);

			// Toast check
			const lastToast = mockDom.getLastToast();
			assert.ok(lastToast, "Toast event must be triggered");
			assert.strictEqual(
				lastToast?.detail?.text,
				"Схема приёма лекарств скопирована для отправки пациенту в мессенджер",
			);
			assert.strictEqual(lastToast?.detail?.type, "success");
		});

		it("uses default clinicPhone '+7 (495) 123-45-67' when clinicPhone prop is omitted (Mandate 8n)", async () => {
			await act(async () => {
				root?.render(
					<MedicalPrescriptionModal
						isOpen={true}
						onClose={() => {}}
						patientName="Соло Врач Пациент"
						doctorName="Д-р Соло В.В."
					/>,
				);
			});

			const copyBtn = findNodeByTestId(container, "med-rx-copy-patient-btn");
			assert.ok(copyBtn, "med-rx-copy-patient-btn must be present in DOM");

			await clickNode(copyBtn);

			const copiedText = mockDom.getClipboardText();
			assert.ok(
				copiedText.includes("+7 (495) 123-45-67"),
				"Must include default clinic phone '+7 (495) 123-45-67' for solo practitioner",
			);
		});

		it("shows warning toast when attempting to copy with no selected medications", async () => {
			await act(async () => {
				root?.render(
					<MedicalPrescriptionModal
						isOpen={true}
						onClose={() => {}}
						patientName="Тестовый Пациент"
					/>,
				);
			});

			// Find and toggle off initially selected 3 drugs
			// Default selection is nimesil_100, chlorhexidine_005, amoxiclav_875
			// In container, find buttons that toggle these
			const buttons = (container?.children || []).flatMap(function collect(
				node: MockDomNode,
			): MockDomNode[] {
				const list = node.tagName === "BUTTON" ? [node] : [];
				return list.concat((node.children || []).flatMap(collect));
			});

			// Deselect the 3 initial medications
			for (const btn of buttons) {
				const text = btn.textContent || "";
				if (
					text.includes("Нимесил") ||
					text.includes("Хлоргексидин") ||
					text.includes("Амоксиклав")
				) {
					await clickNode(btn);
				}
			}

			// Clear previous clipboard text
			mockDom.reset();

			const copyBtn = findNodeByTestId(container, "med-rx-copy-patient-btn");
			assert.ok(copyBtn, "med-rx-copy-patient-btn must be present");

			await clickNode(copyBtn);

			// Assert warning toast was shown and clipboard was not populated
			const lastToast = mockDom.getLastToast();
			assert.ok(lastToast, "Warning toast must be triggered");
			assert.strictEqual(
				lastToast?.detail?.text,
				"Выберите хотя бы один препарат",
			);
			assert.strictEqual(lastToast?.detail?.type, "warning");
			assert.strictEqual(
				mockDom.getClipboardText(),
				"",
				"Clipboard must not be written when no drugs are selected",
			);
		});
	});
});
