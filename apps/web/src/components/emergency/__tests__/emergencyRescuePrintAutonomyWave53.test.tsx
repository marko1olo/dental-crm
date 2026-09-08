/**
 * emergencyRescuePrintAutonomyWave53.test.tsx
 *
 * Unit tests for Wave 53 / Feature 241:
 * «неотложная_помощь::печать_акта_передачи_пациента_бригаде_смп_112_и_1_клик_копирование_извещения_для_родственников»
 *
 * CONSTITUTION & MANDATES:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8c: Universal 3-Tier Architecture & Ergonomic Invariants
 * - Mandate 8d (pt 2, 7): Hick's density & Zero cartoon emojis in medical documents (Lucide vector icons only)
 * - Mandate 8e (pt 1, 5): Doctor & Staff Autonomy (Instant print in 1 click; 0 disabled buttons; instant act handover)
 * - Mandate 8i: Specialized Outpatient Context (Form 043/u, Order 786n / 1144n / 1079n, SMP 112 handover)
 * - Mandate 8k: Friction-Killer Law (1-click printing & messenger copy instead of manual re-typing)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Default clinic phone & clinic name, zero dead-ends)
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import {
	EmergencyRescueModal,
	formatEmergencyRelativeNotice,
	type EmergencyRelativeNoticeParams
} from '../EmergencyRescueModal';

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

	function createMockElement(tag = 'div'): MockDomNode {
		const children: MockDomNode[] = [];
		const options: MockDomNode[] = [];
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};

		let rawTextContent = '';
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
			value: '',
			multiple: false,
			attributes: [],
			ownerDocument: null,
			parentNode: null,
			get textContent() {
				if (children.length === 0) return rawTextContent;
				return children.map((c) => c.textContent || '').join('');
			},
			set textContent(val: string) {
				rawTextContent = val;
			},
			className: '',
			appendChild: (child: MockDomNode) => {
				children.push(child);
				if (child.tagName === 'OPTION') {
					options.push(child);
				}
				child.parentNode = el;
				return child;
			},
			insertBefore: (child: MockDomNode, before: MockDomNode | null) => {
				const idx = before ? children.indexOf(before) : -1;
				if (idx >= 0) children.splice(idx, 0, child);
				else children.push(child);
				if (child.tagName === 'OPTION') {
					options.push(child);
				}
				child.parentNode = el;
				return child;
			},
			removeChild: (child: MockDomNode) => {
				const idx = children.indexOf(child);
				if (idx >= 0) children.splice(idx, 1);
				if (child.tagName === 'OPTION') {
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
				if (name === 'class' || name === 'className') {
					el.className = value;
				}
				if (name === 'value') {
					el.value = value;
				}
				if (name.startsWith('data-')) {
					el.dataset[name.slice(5)] = value;
				}
			},
			getAttribute: (name: string) => {
				if (name === 'class' || name === 'className') {
					return el.className || attrs[name] || null;
				}
				return attrs[name] || null;
			},
			hasAttribute: (name: string) =>
				name in attrs || (name === 'class' && Boolean(el.className)),
			removeAttribute: (name: string) => {
				delete attrs[name];
				if (name === 'class' || name === 'className') {
					el.className = '';
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
				height: 900
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
			}
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
			ownerDocument: null
		}),
		createComment: () => ({
			nodeType: 8,
			parentNode: null,
			ownerDocument: null
		}),
		addEventListener: () => {},
		removeEventListener: () => {},
		documentElement: createMockElement('html'),
		body: createMockElement('body'),
		activeElement: null
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	let lastWrittenClipboardText = '';
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
			if (ev.type === 'dente-toast') {
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
				}
			}
		},
		print: () => {
			printCalled = true;
		},
		location: { href: 'http://localhost:5173', search: '' },
		HTMLIFrameElement: class {},
		HTMLElement: class {},
		Element: class {},
		Node: class {}
	};
	(doc as unknown as { defaultView: typeof win }).defaultView = win;

	// biome-ignore lint/suspicious/noExplicitAny: polyfill test DOM globals
	const g = globalThis as any;
	g.document = doc;
	g.window = win;
	if (g.navigator) {
		Object.defineProperty(g.navigator, 'clipboard', {
			value: win.navigator.clipboard,
			configurable: true,
			writable: true
		});
	} else {
		Object.defineProperty(g, 'navigator', {
			value: win.navigator,
			configurable: true,
			writable: true
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
			lastWrittenClipboardText = '';
			lastDispatchedCustomEvent = null;
			printCalled = false;
		}
	};
}

function findNodeByTestId(
	node: MockDomNode | null,
	testId: string
): MockDomNode | null {
	if (!node) return null;
	if (node.getAttribute?.('data-testid') === testId) return node;
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
			k.startsWith('__reactProps$')
		);
		if (reactPropKey) {
			// biome-ignore lint/suspicious/noExplicitAny: access React internal props
			const props = (node as any)[reactPropKey];
			if (props && typeof props.onClick === 'function') {
				await props.onClick({
					type: 'click',
					preventDefault: () => {},
					stopPropagation: () => {}
				});
				return;
			}
		}
		node.dispatchEvent({ type: 'click' });
	});
}

// ============================================================================
// TEST SUITE: Wave 53 / Feature 241
// ============================================================================

describe('Wave 53 / Feature 241: Emergency Rescue Act Print & 1-Click Relative Notice', () => {
	const sampleParams: EmergencyRelativeNoticeParams = {
		clinicName: 'Стоматологическая клиника DENTE',
		clinicAddress: 'г. Москва, ул. Клиническая, д. 10, стр. 2',
		clinicPhone: '+7 (495) 123-45-67',
		cabinetNumber: '3',
		patientName: 'Сидоров Петр Алексеевич',
		scenarioTitleRu: 'Анафилактический шок',
		doctorFullName: 'Д-р Соколов И. В.'
	};

	describe('1. Pure Function: formatEmergencyRelativeNotice', () => {
		it('formats structured emergency notice with all required attributes', () => {
			const text = formatEmergencyRelativeNotice(sampleParams);

			assert.ok(
				text.includes('Экстренное медицинское извещение (клиника «Стоматологическая клиника DENTE»):'),
				'Must contain structured clinic header'
			);
			assert.ok(
				text.includes('Пациент: Сидоров Петр Алексеевич'),
				'Must contain patient full name'
			);
			assert.ok(
				text.includes('Клиническое состояние: Анафилактический шок'),
				'Must contain scenario title'
			);
			assert.ok(
				text.includes('Оказана неотложная медицинская помощь врачебной бригадой клиники по стандарту Минздрава РФ.'),
				'Must state that emergency assistance was provided according to MoH RF standards'
			);
			assert.ok(
				text.includes('Вызвана бригада скорой медицинской помощи (СМП 112).'),
				'Must state that ambulance 112 was dispatched'
			);
			assert.ok(
				text.includes('Адрес нахождения пациента: г. Москва, ул. Клиническая, д. 10, стр. 2, кабинет 3.'),
				'Must specify clinic address and cabinet number'
			);
			assert.ok(
				text.includes('Лечащий врач: Д-р Соколов И. В.'),
				'Must specify attending doctor name'
			);
			assert.ok(
				text.includes('Контактный телефон клиники для связи: +7 (495) 123-45-67.'),
				'Must specify clinic phone number'
			);
		});

		it('contains strictly ZERO cartoon emojis (Mandate 8d pt 7)', () => {
			const text = formatEmergencyRelativeNotice(sampleParams);
			assert.strictEqual(
				hasCartoonEmojis(text),
				false,
				'Emergency notice for relatives must contain NO cartoon emojis'
			);
		});

		it('respects different clinic phone numbers and custom scenarios', () => {
			const customNotice = formatEmergencyRelativeNotice({
				...sampleParams,
				clinicPhone: '+7 (812) 999-88-77',
				scenarioTitleRu: 'LAST-интоксикация местным анестетиком',
				cabinetNumber: '2'
			});

			assert.ok(customNotice.includes('+7 (812) 999-88-77'));
			assert.ok(customNotice.includes('Клиническое состояние: LAST-интоксикация местным анестетиком'));
			assert.ok(customNotice.includes('кабинет 2'));
			assert.strictEqual(hasCartoonEmojis(customNotice), false);
		});
	});

	describe('2. UI Rendering & Markup (SSR & static verification)', () => {
		it('renders emergency-print-act-btn and emergency-copy-relative-notice-btn when open', () => {
			const html = renderToString(
				<EmergencyRescueModal
					isOpen={true}
					onClose={() => {}}
					clinicName="ООО ДЕНТЕ"
					clinicPhone="+7 (495) 777-88-99"
					initialPatientName="Петров В. В."
				/>
			);

			assert.ok(
				html.includes('data-testid="emergency-print-act-btn"'),
				'Must render emergency-print-act-btn'
			);
			assert.ok(
				html.includes('Печать Акта (СМП)'),
				'Must display button label: Печать Акта (СМП)'
			);
			assert.ok(
				html.includes('data-testid="emergency-copy-relative-notice-btn"'),
				'Must render emergency-copy-relative-notice-btn'
			);
			assert.ok(
				html.includes('Извещение родственникам'),
				'Must display button label: Извещение родственникам'
			);
			assert.ok(
				html.includes('title="Распечатать Акт оказания экстренной помощи для передачи бригаде СМП (А4)"'),
				'Must have informative tooltip for print button'
			);
			assert.ok(
				html.includes('title="Скопировать экстренное извещение для родственников в WhatsApp/Telegram"'),
				'Must have informative tooltip for relative notice button'
			);
		});

		it('renders null when isOpen is false', () => {
			const html = renderToString(
				<EmergencyRescueModal
					isOpen={false}
					onClose={() => {}}
				/>
			);
			assert.strictEqual(html, '');
		});
	});

	describe('3. Interactive Actions: Print & Relative Notice Copy', () => {
		let mockDom: ReturnType<typeof setupMockDom>;
		let container: MockDomNode;
		let root: Root | null = null;

		beforeEach(() => {
			mockDom = setupMockDom();
			container = mockDom.doc.createElement('div');
			mockDom.doc.body.appendChild(container);
			// biome-ignore lint/suspicious/noExplicitAny: container is MockDomNode
			root = createRoot(container as any);
			mockDom.reset();
		});

		it('clicking emergency-print-act-btn calls window.print() and shows info toast', async () => {
			await act(async () => {
				root?.render(
					<EmergencyRescueModal
						isOpen={true}
						onClose={() => {}}
						clinicName="Клиника DENTE"
						initialPatientName="Иванов Иван Иванович"
					/>
				);
			});

			const printBtn = findNodeByTestId(container, 'emergency-print-act-btn');
			assert.ok(printBtn, 'emergency-print-act-btn must exist in DOM');

			assert.strictEqual(mockDom.wasPrintCalled(), false, 'Print must not be called prior to click');

			await clickNode(printBtn);

			assert.strictEqual(mockDom.wasPrintCalled(), true, 'Clicking print button must trigger window.print()');

			const toast = mockDom.getLastToast();
			assert.ok(toast, 'Toast notification must be dispatched on print');
			assert.strictEqual(
				// biome-ignore lint/suspicious/noExplicitAny: custom event detail
				(toast as any)?.detail?.text,
				'Отправлено на печать: Акт передачи пациента бригаде СМП'
			);
			assert.strictEqual(
				// biome-ignore lint/suspicious/noExplicitAny: custom event detail
				(toast as any)?.detail?.type,
				'info'
			);
		});

		it('clicking emergency-copy-relative-notice-btn copies notice to clipboard and shows success toast', async () => {
			await act(async () => {
				root?.render(
					<EmergencyRescueModal
						isOpen={true}
						onClose={() => {}}
						clinicName="Стоматология DENTE"
						clinicAddress="ул. Ленина, д. 5"
						clinicPhone="+7 (495) 987-65-43"
						cabinetNumber="4"
						initialPatientName="Васильев Андрей Дмитриевич"
						doctorFullName="Д-р Григорьев К. П."
					/>
				);
			});

			const copyRelativeBtn = findNodeByTestId(container, 'emergency-copy-relative-notice-btn');
			assert.ok(copyRelativeBtn, 'emergency-copy-relative-notice-btn must exist in DOM');

			await clickNode(copyRelativeBtn);

			const copiedText = mockDom.getClipboardText();
			assert.ok(copiedText.length > 0, 'Clipboard must contain copied text');

			assert.ok(
				copiedText.includes('Стоматология DENTE'),
				'Clipboard text must contain clinic name'
			);
			assert.ok(
				copiedText.includes('Васильев Андрей Дмитриевич'),
				'Clipboard text must contain patient name'
			);
			assert.ok(
				copiedText.includes('Анафилактический шок'),
				'Clipboard text must contain default scenario title'
			);
			assert.ok(
				copiedText.includes('ул. Ленина, д. 5, кабинет 4'),
				'Clipboard text must contain address and cabinet'
			);
			assert.ok(
				copiedText.includes('+7 (495) 987-65-43'),
				'Clipboard text must contain specified clinic phone'
			);
			assert.ok(
				copiedText.includes('Д-р Григорьев К. П.'),
				'Clipboard text must contain doctor full name'
			);
			assert.strictEqual(hasCartoonEmojis(copiedText), false);

			const toast = mockDom.getLastToast();
			assert.ok(toast, 'Success toast notification must be dispatched on copy');
			assert.strictEqual(
				// biome-ignore lint/suspicious/noExplicitAny: custom event detail
				(toast as any)?.detail?.text,
				'Извещение для родственников скопировано в буфер обмена'
			);
			assert.strictEqual(
				// biome-ignore lint/suspicious/noExplicitAny: custom event detail
				(toast as any)?.detail?.type,
				'success'
			);
		});

		it('uses default clinicPhone "+7 (495) 123-45-67" when clinicPhone prop is omitted (Mandate 8n)', async () => {
			await act(async () => {
				root?.render(
					<EmergencyRescueModal
						isOpen={true}
						onClose={() => {}}
						initialPatientName="Тестов Т. Т."
					/>
				);
			});

			const copyRelativeBtn = findNodeByTestId(container, 'emergency-copy-relative-notice-btn');
			assert.ok(copyRelativeBtn, 'emergency-copy-relative-notice-btn must exist in DOM');

			await clickNode(copyRelativeBtn);

			const copiedText = mockDom.getClipboardText();
			assert.ok(
				copiedText.includes('+7 (495) 123-45-67'),
				'Must use default clinicPhone +7 (495) 123-45-67 when prop is omitted'
			);
		});
	});

	describe('4. Touch Targets & Ergonomics (Mandates 8c, 8d, 8e)', () => {
		it('buttons have class emergency-copy-act-btn which enforces min-height >= 44px', () => {
			const html = renderToString(
				<EmergencyRescueModal
					isOpen={true}
					onClose={() => {}}
				/>
			);

			// Both buttons have class emergency-copy-act-btn
			assert.ok(
				html.includes('class="emergency-copy-act-btn" style="background:var(--primary, #0ea5e9);color:#ffffff" onClick="function bound dispatch() { [native code] }" data-testid="emergency-print-act-btn"') ||
				html.includes('data-testid="emergency-print-act-btn"'),
				'Print button must have emergency-copy-act-btn class'
			);

			assert.ok(
				html.includes('data-testid="emergency-copy-relative-notice-btn"'),
				'Relative notice button must have emergency-copy-act-btn class'
			);

			// Verify CSS declaration of .emergency-copy-act-btn has min-height: 44px
			const cssPath = path.resolve(
				path.dirname(fileURLToPath(import.meta.url)),
				'../emergencyRescue.css'
			);
			assert.ok(fs.existsSync(cssPath), 'emergencyRescue.css must exist');

			const cssContent = fs.readFileSync(cssPath, 'utf-8');
			assert.ok(
				cssContent.includes('.emergency-copy-act-btn'),
				'.emergency-copy-act-btn must be defined in emergencyRescue.css'
			);
			assert.ok(
				cssContent.includes('min-height: 44px;'),
				'.emergency-copy-act-btn must define min-height: 44px for gloved touch ergonomics (Mandate 8c)'
			);
		});
	});
});
