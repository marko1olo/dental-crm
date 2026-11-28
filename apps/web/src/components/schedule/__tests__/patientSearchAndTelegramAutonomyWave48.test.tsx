/**
 * patientSearchAndTelegramAutonomyWave48.test.tsx
 *
 * Targeted Unit Tests for Wave 48 (Feature 231):
 * Eliminating gray disabled buttons and preview barriers (Mandates 8e item 2, 8k, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { Patient } from "@dental/shared";

import { PatientSearchModal } from "../PatientSearchModal";
import {
	SettingsTelegramTab,
	DEFAULT_TELEGRAM_PREVIEW_PATIENT,
	buildDefaultTelegramPreview,
} from "../../settings/SettingsTelegramTab";

const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

interface MinimalDomNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	dataset: Record<string, string>;
	children: MinimalDomNode[];
	childNodes: MinimalDomNode[];
	attributes: { name: string; value: string }[];
	ownerDocument: unknown;
	parentNode: MinimalDomNode | null;
	textContent: string;
	disabled?: boolean;
	value?: string;
	className?: string;
	appendChild: (child: MinimalDomNode) => MinimalDomNode;
	insertBefore: (child: MinimalDomNode, before: MinimalDomNode | null) => MinimalDomNode;
	removeChild: (child: MinimalDomNode) => MinimalDomNode;
	addEventListener: () => void;
	removeEventListener: () => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	hasAttribute: (name: string) => boolean;
	removeAttribute: (name: string) => void;
	dispatchEvent: () => boolean;
	getBoundingClientRect: () => { top: number; left: number; right: number; bottom: number; width: number; height: number };
	focus: () => void;
	blur: () => void;
	contains: () => boolean;
	[key: string]: unknown;
}

function setupMinimalDom() {
	class FakeHTMLIFrameElement {}
	class FakeElement {}
	class FakeHTMLElement {}
	class FakeNode {}

	const doc: Record<string, unknown> = {
		nodeType: 9,
		activeElement: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
		createTextNode: (text: string) => ({
			nodeType: 3,
			textContent: String(text ?? ""),
			nodeValue: String(text ?? ""),
			data: String(text ?? ""),
			style: {},
			parentNode: null,
			ownerDocument: doc,
		}),
	};

	const createEl = (tag = "div"): MinimalDomNode => {
		const children: MinimalDomNode[] = [];
		const attrs: Record<string, string> = {};
		const el: MinimalDomNode = {
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
				if (name.startsWith("data-")) el.dataset[name.slice(5)] = value;
				if (name === "disabled") el.disabled = true;
				if (name === "class" || name === "className") el.className = value;
			},
			getAttribute: (name) => attrs[name] ?? null,
			hasAttribute: (name) => name in attrs,
			removeAttribute: (name) => {
				delete attrs[name];
				if (name === "disabled") el.disabled = false;
			},
			dispatchEvent: () => true,
			getBoundingClientRect: () => ({ top: 0, left: 0, right: 1200, bottom: 900, width: 1200, height: 900 }),
			focus: () => {
				doc.activeElement = el;
			},
			blur: () => {},
			contains: (other?: unknown) => {
				let curr = other as MinimalDomNode | null | undefined;
				while (curr) {
					if (curr === el) return true;
					curr = curr.parentNode;
				}
				return false;
			},
		};
		return el;
	};

	doc.createElement = createEl;
	doc.createElementNS = (_ns: string, tag: string) => createEl(tag);
	doc.documentElement = createEl("html");
	doc.body = createEl("body");

	const g = globalThis as Record<string, unknown>;
	const win = {
		document: doc,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => true,
		HTMLIFrameElement: FakeHTMLIFrameElement,
		HTMLElement: FakeHTMLElement,
		Element: FakeElement,
		Node: FakeNode,
		innerWidth: 1200,
	};
	doc.defaultView = win;
	g.document = doc;
	g.window = win;
	g.HTMLIFrameElement = FakeHTMLIFrameElement;
	g.HTMLElement = FakeHTMLElement;
	g.Element = FakeElement;
	g.Node = FakeNode;
	g.IS_REACT_ACT_ENVIRONMENT = true;
	return { doc, createEl };
}

function findByTestId(node: MinimalDomNode | null, testId: string): MinimalDomNode | null {
	if (!node) return null;
	if (
		(typeof node.getAttribute === "function" && node.getAttribute("data-testid") === testId) ||
		node.dataset?.testid === testId
	) {
		return node;
	}
	if (Array.isArray(node.children)) {
		for (const child of node.children) {
			const hit = findByTestId(child, testId);
			if (hit) return hit;
		}
	}
	return null;
}

async function triggerReactClick(node: MinimalDomNode | null) {
	if (!node) return;
	await act(async () => {
		let curr: MinimalDomNode | null = node;
		while (curr) {
			const propKey = Object.keys(curr).find((k) => k.startsWith("__reactProps$"));
			if (propKey) {
				const props = curr[propKey] as { onClick?: (ev: unknown) => Promise<void> | void } | undefined;
				if (props && typeof props.onClick === "function") {
					await props.onClick({
						type: "click",
						preventDefault: () => {},
						stopPropagation: () => {},
					});
					return;
				}
			}
			curr = curr.parentNode;
		}
	});
}

const mockPatientWithPhone: Patient = {
	id: "pat-w48-phone",
	organizationId: "00000000-0000-0000-0000-000000000000",
	status: "active",
	fullName: "Иванов Иван Иванович",
	phone: "+7 (916) 123-45-67",
	email: null,
	notes: null,
	gender: null,
	administrativeProfile: null,
	birthDate: "1988-04-12",
	balanceRub: 0,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockPatientNoPhone: Patient = {
	id: "pat-w48-no-phone",
	organizationId: "00000000-0000-0000-0000-000000000000",
	status: "active",
	fullName: "Сидоров Сидор Сидорович",
	phone: null,
	email: null,
	notes: null,
	gender: null,
	administrativeProfile: null,
	birthDate: "1980-01-01",
	balanceRub: -1500,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Wave 48 (Feature 231): Zero-Disabled Buttons & Template Preview Autonomy", () => {
	describe("1. PatientSearchModal: WhatsApp Button Autonomy", () => {
		it("1.1. WhatsApp button renders without disabled attribute when phone is null", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatientNoPhone]}
					onClose={() => {}}
				/>,
			);
			const waMatch = html.match(/<button[^>]*data-testid="quick-wa-patient-pat-w48-no-phone"[^>]*>/);
			assert.ok(waMatch, "WhatsApp button must render");
			assert.equal(/\bdisabled(?:=|\s|>)/.test(waMatch[0]), false, "Must not render disabled attribute");
		});

		it("1.2. WhatsApp button does not render cursor-not-allowed or opacity-50 classes", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatientNoPhone]}
					onClose={() => {}}
				/>,
			);
			const waMatch = html.match(/<button[^>]*data-testid="quick-wa-patient-pat-w48-no-phone"[^>]*>/);
			assert.ok(waMatch);
			assert.equal(waMatch[0].includes("cursor-not-allowed"), false);
			assert.equal(waMatch[0].includes("opacity-50"), false);
			assert.equal(waMatch[0].includes("cursor-pointer"), true);
		});

		it("1.3. WhatsApp button satisfies touch target >= 44x44px in rendered markup", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatientNoPhone]}
					onClose={() => {}}
				/>,
			);
			const waMatch = html.match(/<button[^>]*data-testid="quick-wa-patient-pat-w48-no-phone"[^>]*>/);
			assert.ok(waMatch);
			assert.equal(waMatch[0].includes("min-h-[44px]"), true);
			assert.equal(waMatch[0].includes("min-w-[44px]"), true);
		});

		it("1.4. WhatsApp button renders active emerald accent when phone is present", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatientWithPhone]}
					onClose={() => {}}
				/>,
			);
			const waMatch = html.match(/<button[^>]*data-testid="quick-wa-patient-pat-w48-phone"[^>]*>/);
			assert.ok(waMatch);
			assert.equal(waMatch[0].includes("bg-emerald-500"), true);
		});

		it("1.5. clicking WhatsApp button without phone invokes showToastFn with warning guidance", async () => {
			const dom = setupMinimalDom();
			let capturedToastText = "";
			let capturedToastType = "";

			const container = dom.createEl("div");
			const root: Root = createRoot(container as unknown as HTMLElement);
			await act(async () => {
				root.render(
					<PatientSearchModal
						isOpen={true}
						patients={[mockPatientNoPhone]}
						onClose={() => {}}
						showToastFn={(text, type) => {
							capturedToastText = text;
							capturedToastType = type || "";
						}}
					/>,
				);
			});

			const waBtn = findByTestId(container, "quick-wa-patient-pat-w48-no-phone");
			assert.ok(waBtn, "Must mount quick-wa button in DOM");
			await triggerReactClick(waBtn);

			assert.equal(
				capturedToastText,
				"У пациента не указан номер телефона. Заполните телефон в карточке пациента.",
			);
			assert.equal(capturedToastType, "warning");
		});
	});

	describe("2. SettingsTelegramTab: Template Preview Autonomy", () => {
		it("2.1. SettingsTelegramTab hides when settingsTab !== 'telegram' and renders hub when active", () => {
			const hiddenHtml = renderToString(
				<SettingsTelegramTab props={{}} settingsTab="general" />,
			);
			assert.equal(hiddenHtml, "");

			const activeHtml = renderToString(
				<SettingsTelegramTab
					props={{ isTelegramLoading: false, activePatient: null }}
					settingsTab="telegram"
				/>,
			);
			assert.ok(activeHtml.includes('data-testid="telegram-integration-hub"'));
			assert.ok(activeHtml.includes("Бот Telegram"));
			assert.ok(activeHtml.includes("Личный аккаунт Telegram"));
		});

		it("2.2. hub buttons are never blocked by disabled even when isTelegramLoading is true", () => {
			const html = renderToString(
				<SettingsTelegramTab
					props={{ isTelegramLoading: true, activePatient: null }}
					settingsTab="telegram"
				/>,
			);
			const buttons = [...html.matchAll(/<button[^>]*>/g)];
			assert.ok(buttons.length >= 4, "Must render Telegram hub buttons");
			for (const btn of buttons) {
				assert.equal(/\bdisabled\b/.test(btn[0]), false, `Button must not be disabled: ${btn[0]}`);
			}
		});

		it("2.3. exports DEFAULT_TELEGRAM_PREVIEW_PATIENT with realistic clinic demo data", () => {
			assert.equal(DEFAULT_TELEGRAM_PREVIEW_PATIENT.fullName, "");
			assert.equal(DEFAULT_TELEGRAM_PREVIEW_PATIENT.doctorName, "Смирнова Е.А.");
			assert.equal(DEFAULT_TELEGRAM_PREVIEW_PATIENT.appointmentTime, "завтра 14:00");
			assert.equal(DEFAULT_TELEGRAM_PREVIEW_PATIENT.amountRub, 4500);
			assert.equal(DEFAULT_TELEGRAM_PREVIEW_PATIENT.amountFormatted, "4 500 ₽");
		});

		it("2.4. buildDefaultTelegramPreview creates complete preview across all 7 template kinds", () => {
			const templates = [
				"appointment_confirmation",
				"document_ready_notice",
				"payment_reminder_notice",
				"recall_notice",
				"review_request",
				"post_visit_instruction_link",
				"post_visit_checkup",
			] as const;

			for (const template of templates) {
				const preview = buildDefaultTelegramPreview(template);
				assert.equal(preview.templateKind, template);
				assert.equal(preview.allowedByDefault, true);
				assert.equal(preview.classification, "limited_admin");
				assert.ok(preview.text.length > 20, "Preview text must not be empty");
				assert.equal(preview.blockedReason, null);
				assert.ok(preview.variablesUsed.length > 0);
				assert.ok(preview.warnings.some((w) => w.includes("демонстрационные данные")));
			}
		});
	});

	describe("3. Constitutional Mandates: Zero Cartoon Emojis in Rendered Output", () => {
		it("3.1. renders 0 cartoon emojis in PatientSearchModal HTML", () => {
			const html = renderToString(
				<PatientSearchModal
					isOpen={true}
					patients={[mockPatientWithPhone, mockPatientNoPhone]}
					onClose={() => {}}
				/>,
			);
			assert.equal(hasCartoonEmojis(html), false);
		});

		it("3.2. renders 0 cartoon emojis in SettingsTelegramTab HTML and preview text", () => {
			const html = renderToString(
				<SettingsTelegramTab props={{}} settingsTab="telegram" />,
			);
			assert.equal(hasCartoonEmojis(html), false);
			const preview = buildDefaultTelegramPreview("appointment_confirmation");
			assert.equal(hasCartoonEmojis(preview.text), false);
		});
	});
});
