/**
 * dentalLabAutonomyWave43.test.tsx
 *
 * Dedicated verification suite for Dental Lab & Patient Document Autonomy (Wave 43):
 * 1. GuestLabPortal.tsx:
 *    - 1-click status transitions without external registration:
 *      * «Взять в работу» (data-testid="btn-status-in-progress", status: "in_progress")
 *      * «Работа готова» (data-testid="btn-status-ready", status: "shipped", comments: "Работа готова")
 *      * «Отправлено курьером» (data-testid="btn-status-shipped", status: "shipped", comments: "Отправлено курьером в клинику")
 *      * «На переделке» (data-testid="btn-status-refitting", status: "refitting", comments: "На переделке")
 *    - Courier delivery waybill with QR-code (Reed-Solomon) and Barcode (Code 128) for clinic reception:
 *      * Toggle: data-testid="toggle-courier-waybill-btn"
 *      * Card: data-testid="courier-waybill-card"
 *      * Barcode: data-testid="courier-waybill-barcode" (generateBarcodeSvg)
 *      * QR-code: data-testid="courier-waybill-qr" (generateQrCodeSvg)
 *      * Print button: data-testid="courier-waybill-print-btn" calling window.print()
 * 2. DentalLabOrderModal.tsx:
 *    - Doctor clinical override when patient advance < 50% without chief medical officer / начмед blocks (Mandates 8e item 7, 8n):
 *      * Button: data-testid="btn-lab-override-financial-gate" with title/text "Отправить наряд в ЗТЛ — клиническое решение лечащего врача"
 *    - 4 express presets in 1 click with working days calculation:
 *      * Коронка ZrO2 (zirconia_crown_express, 5 раб. дней)
 *      * Металлокерамика (pfm_duceram_express, 7 раб. дней)
 *      * E.max CAD / Press (emax_crown_express, 5 раб. дней)
 *      * Временная PMMA (pmma_temporary_express, 2 раб. дня)
 * 3. PaidMedicalContractModal.tsx:
 *    - 0 ₽ / Blank contract print before visit with underlines «_______» without 403 Forbidden errors:
 *      * Stamp «ЧЕРНОВИК (БЛАНК)» when unsigned (data-testid="contract-stamp-badge" and data-testid="contract-preview-stamp")
 *      * Stamp «ПОДПИСАНО ВРАЧОМ» when signed
 *    - Absolute ban on emojis (only vector Lucide icons used).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { GuestLabPortal } from "../../../GuestLabPortal.js";
import {
	DentalLabOrderModal,
	EXPRESS_PRESET_EMAX_CROWN,
	MODAL_EXPRESS_LAB_PRESETS,
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	addWorkingDays,
	generateBarcodeSvg,
	generateQrCodeSvg,
	formatGostOrderNumber,
} from "../DentalLabOrderModal.js";
import { PaidMedicalContractModal } from "../../documents/PaidMedicalContractModal.js";
import {
	createDefaultPaidContract,
	generatePaidContractHtml,
	generatePaidContractText,
} from "../../documents/paidContractEngine.js";

// ─── MOCK DOM & HELPERS ───────────────────────────────────────────────────────

type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
};

function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	return fn;
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
	textContent: string;
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
			textContent: "",
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

	const win = {
		document: doc,
		location: {
			origin: "http://localhost:5173",
			href: "http://localhost:5173/#/portal/lab-order/token123",
			search: "",
			hash: "#/portal/lab-order/token123",
		},
		addEventListener: () => {},
		removeEventListener: () => {},
		navigator: { clipboard: { writeText: () => Promise.resolve() } },
		print: createMockFn(),
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
		let curr: MockDomNode | null = node;
		while (curr) {
			const reactPropKey = Object.keys(curr).find((k) =>
				k.startsWith("__reactProps$"),
			);
			if (reactPropKey) {
				// biome-ignore lint/suspicious/noExplicitAny: access React internal props
				const props = (curr as any)[reactPropKey];
				if (props && typeof props.onClick === "function") {
					props.onClick({
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

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

describe("Wave 43 Autonomy — GuestLabPortal (Dental Technician 1-Click Statuses & Waybill)", () => {
	it("1. Renders 1-click status buttons: in-progress, ready, shipped, refitting", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		const fakeOrder = {
			id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			patientFullName: "Иванов Иван Иванович",
			toothFdi: "16",
			material: "zirconia",
			colorVita: "A2",
			status: "sent",
			clinicalNotes: "Анатомическая коронка ZrO2",
			attachedImageUrl: null,
			createdAt: "2026-09-08T10:00:00.000Z",
		};

		// Mock global fetch for initial order load
		const originalFetch = globalThis.fetch;
		globalThis.fetch = createMockFn(async (url: string) => {
			if (url.includes("/api/portal/lab-order/token123")) {
				return {
					ok: true,
					status: 200,
					json: async () => fakeOrder,
				};
			}
			return { ok: false, status: 404 };
		}) as unknown as typeof fetch;

		try {
			await act(async () => {
				root.render(<GuestLabPortal token="token123" />);
			});

			// Allow state to settle
			await act(async () => {
				await new Promise((r) => setTimeout(r, 10));
			});

			const btnInProgress = findNodeByTestId(doc.body, "btn-status-in-progress");
			const btnReady = findNodeByTestId(doc.body, "btn-status-ready");
			const btnShipped = findNodeByTestId(doc.body, "btn-status-shipped");
			const btnRefitting = findNodeByTestId(doc.body, "btn-status-refitting");

			assert.notStrictEqual(btnInProgress, null, "Кнопка «Взять в работу» должна присутствовать");
			assert.notStrictEqual(btnReady, null, "Кнопка «Работа готова» должна присутствовать");
			assert.notStrictEqual(btnShipped, null, "Кнопка «Отправлено курьером» должна присутствовать");
			assert.notStrictEqual(btnRefitting, null, "Кнопка «На переделке» должна присутствовать");

			// Toggle courier waybill button
			const toggleWaybillBtn = findNodeByTestId(doc.body, "toggle-courier-waybill-btn");
			assert.notStrictEqual(toggleWaybillBtn, null, "Кнопка переключения курьерской накладной должна присутствовать");

			// Initially waybill card is hidden
			let waybillCard = findNodeByTestId(doc.body, "courier-waybill-card");
			assert.strictEqual(waybillCard, null, "Накладная по умолчанию скрыта");

			// Click toggle button to reveal waybill
			await clickNode(toggleWaybillBtn!);

			waybillCard = findNodeByTestId(doc.body, "courier-waybill-card");
			assert.notStrictEqual(waybillCard, null, "Накладная должна отображаться после клика");

			// Verify barcode and QR code elements
			const barcodeEl = findNodeByTestId(doc.body, "courier-waybill-barcode");
			const qrEl = findNodeByTestId(doc.body, "courier-waybill-qr");
			const printBtn = findNodeByTestId(doc.body, "courier-waybill-print-btn");

			assert.notStrictEqual(barcodeEl, null, "Элемент штрихкода накладной должен присутствовать");
			assert.notStrictEqual(qrEl, null, "Элемент QR-кода накладной должен присутствовать");
			assert.notStrictEqual(printBtn, null, "Кнопка печати накладной должна присутствовать");

			// Test window.print trigger
			const win = (doc as unknown as { defaultView: { print: MockFn } }).defaultView;
			await clickNode(printBtn!);
			assert.strictEqual(win.print.calls.length, 1, "Клик на печать накладной должен вызвать window.print()");
		} finally {
			globalThis.fetch = originalFetch;
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("2. Validates Code 128 barcode and Reed-Solomon QR vector generators", () => {
		const orderToken = "order-token-test-43";
		const gostNumber = formatGostOrderNumber(orderToken);
		assert.ok(gostNumber.startsWith("ЗТЛ-"), "Номер заказа по ГОСТ должен начинаться с ЗТЛ-");

		const barcodeSvg = generateBarcodeSvg(orderToken);
		assert.ok(barcodeSvg.includes("<svg"), "Штрихкод должен быть валидным SVG");
		assert.ok(barcodeSvg.includes("<rect"), "Штрихкод Code 128 должен содержать прямоугольные штрихи");
		assert.ok(barcodeSvg.includes(orderToken), "Штрихкод должен содержать закодированный текст");

		const qrSvg = generateQrCodeSvg(`DENTE-ZTL:${orderToken}`);
		assert.ok(qrSvg.includes("<svg"), "QR-код должен быть валидным SVG");
		assert.ok(qrSvg.includes("<rect"), "QR-код Reed-Solomon должен содержать модули rect");
	});
});

describe("Wave 43 Autonomy — DentalLabOrderModal (Clinical Override & Express Presets)", () => {
	it("1. Displays clinical override button when advance < 50% without начмед blocks", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);
		const onOrderSaved = createMockFn();

		const originalFetch = globalThis.fetch;
		globalThis.fetch = createMockFn(async (url: string) => {
			if (url.includes("/api/clinical/lab-orders")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						id: "lab-saved-1",
						patientId: "pat-43",
						doctorName: "Др. Ортопедов В. С.",
						status: "sent",
					}),
				};
			}
			return { ok: false, status: 404 };
		}) as unknown as typeof fetch;

		try {
			await act(async () => {
				root.render(
					<DentalLabOrderModal
						isOpen={true}
						onClose={() => {}}
						patientId="pat-43"
						patientName="Семенов Аркадий Петрович"
						doctorId="doc-1"
						doctorName="Др. Ортопедов В. С."
						initialToothFdi="24"
						patientDepositRub={0}
						stageTotalRub={40000}
						stagePaidRub={0}
						onOrderSaved={onOrderSaved}
					/>,
				);
			});

			// Banner and clinical override button must appear
			const banner = findNodeByTestId(doc.body, "lab-order-clinical-autonomy-banner");
			assert.notStrictEqual(banner, null, "Баннер финансового контроля должен отображаться при авансе < 50%");

			const overrideBtn = findNodeByTestId(doc.body, "btn-lab-override-financial-gate");
			assert.notStrictEqual(overrideBtn, null, "Кнопка клинического оверрайда врача должна присутствовать");

			// Click clinical override button
			await clickNode(overrideBtn!);

			// Check onOrderSaved callback called with clinical override
			assert.strictEqual(onOrderSaved.calls.length, 1, "Заказ должен быть сохранен сразу по решению врача");
			const savedOrder = onOrderSaved.calls[0]![0];
			assert.strictEqual(savedOrder.patientId, "pat-43");
			assert.strictEqual(savedOrder.doctorName, "Др. Ортопедов В. С.");
		} finally {
			globalThis.fetch = originalFetch;
			await act(async () => {
				root.unmount();
			});
		}
	});

	it("2. Contains all 4 canonical 1-click express presets: ZrO2, PFM, e.max, PMMA", () => {
		assert.strictEqual(EXPRESS_PRESET_ZIRCONIA_CROWN.id, "zirconia_crown_express");
		assert.strictEqual(EXPRESS_PRESET_ZIRCONIA_CROWN.workingDays, 5);

		assert.strictEqual(EXPRESS_PRESET_PFM_DUCERAM.id, "pfm_duceram_express");
		assert.strictEqual(EXPRESS_PRESET_PFM_DUCERAM.workingDays, 7);

		assert.strictEqual(EXPRESS_PRESET_EMAX_CROWN.id, "emax_crown_express");
		assert.strictEqual(EXPRESS_PRESET_EMAX_CROWN.materialId, "emax_lithium_disilicate");
		assert.strictEqual(EXPRESS_PRESET_EMAX_CROWN.workingDays, 5);

		assert.strictEqual(EXPRESS_PRESET_PMMA_TEMPORARY.id, "pmma_temporary_express");
		assert.strictEqual(EXPRESS_PRESET_PMMA_TEMPORARY.workingDays, 2);

		// Verify MODAL_EXPRESS_LAB_PRESETS includes all 4 at the beginning
		const presetIds = MODAL_EXPRESS_LAB_PRESETS.map((p) => p.id);
		assert.ok(presetIds.includes("zirconia_crown_express"));
		assert.ok(presetIds.includes("pfm_duceram_express"));
		assert.ok(presetIds.includes("emax_crown_express"));
		assert.ok(presetIds.includes("pmma_temporary_express"));

		// Verify addWorkingDays logic
		const baseDate = new Date("2026-09-07T12:00:00.000Z"); // Monday
		const duePMMA = addWorkingDays(baseDate, 2); // Wednesday (2 working days)
		assert.strictEqual(duePMMA.getDay(), 3, "2 рабочих дня от понедельника — среда (день 3)");

		const dueZrO2 = addWorkingDays(baseDate, 5); // Next Monday (5 working days, skipping weekend)
		assert.strictEqual(dueZrO2.getDay(), 1, "5 рабочих дней от понедельника — следующий понедельник");
	});

	it("3. Renders express preset buttons with testids in modal Tab 1", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<DentalLabOrderModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-43"
					patientName="Семенов Аркадий Петрович"
				/>,
			);
		});

		const btnZrO2 = findNodeByTestId(doc.body, "lab-preset-btn-zirconia_crown_express");
		const btnPFM = findNodeByTestId(doc.body, "lab-preset-btn-pfm_duceram_express");
		const btnEmax = findNodeByTestId(doc.body, "lab-preset-btn-emax_crown_express");
		const btnPMMA = findNodeByTestId(doc.body, "lab-preset-btn-pmma_temporary_express");

		assert.notStrictEqual(btnZrO2, null, "Кнопка пресета ZrO2 должна присутствовать");
		assert.notStrictEqual(btnPFM, null, "Кнопка пресета PFM должна присутствовать");
		assert.notStrictEqual(btnEmax, null, "Кнопка пресета E.max должна присутствовать");
		assert.notStrictEqual(btnPMMA, null, "Кнопка пресета PMMA должна присутствовать");

		await act(async () => {
			root.unmount();
		});
	});
});

describe("Wave 43 Autonomy — PaidMedicalContractModal (0 ₽ Blank Contract & Zero Emojis)", () => {
	const mockPatient = {
		fullName: "Павлова Анна Михайловна",
		birthDate: "15.04.1988",
		passport: "4510 987654",
		address: "г. Москва, пр-т Мира, д. 10",
		phone: "+7 (916) 555-44-33",
		cardNumber: "043/у-2026/99",
	};

	const mockClinic = {
		fullName: "ООО «Денте Стоматология»",
		shortName: "ООО «Денте»",
		inn: "7701234567",
		kpp: "770101001",
		ogrn: "1237700987654",
		licenseNumber: "Л041-01137-77/00123456",
		phone: "+7 (495) 123-45-67",
	};

	it("1. Renders «ЧЕРНОВИК (БЛАНК)» stamp badge and preview stamp for unsigned 0 ₽ contract", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<PaidMedicalContractModal
					isOpen={true}
					onClose={() => {}}
					patient={mockPatient}
					clinicInfo={mockClinic}
					totalAmountKopecks={0}
				/>,
			);
		});

		const stampBadge = findNodeByTestId(doc.body, "contract-stamp-badge");
		assert.notStrictEqual(stampBadge, null);
		assert.ok(
			(stampBadge?.textContent || "").includes("ЧЕРНОВИК (БЛАНК)") ||
			(stampBadge?.children?.[0]?.textContent || "").includes("ЧЕРНОВИК (БЛАНК)"),
			"Штамп должен быть «ЧЕРНОВИК (БЛАНК)»",
		);

		const previewStamp = findNodeByTestId(doc.body, "contract-preview-stamp");
		assert.notStrictEqual(previewStamp, null);
		assert.ok(
			(previewStamp?.textContent || "").includes("ЧЕРНОВИК (БЛАНК)"),
			"Штамп на бланке А4 должен содержать «ЧЕРНОВИК (БЛАНК)»",
		);

		await act(async () => {
			root.unmount();
		});
	});

	it("2. Renders «ПОДПИСАНО ВРАЧОМ» stamp when contract is signed", async () => {
		const { doc } = setupMockDom();
		const root: Root = createRoot(doc.body as unknown as HTMLElement);

		await act(async () => {
			root.render(
				<PaidMedicalContractModal
					isOpen={true}
					onClose={() => {}}
					patient={mockPatient}
					clinicInfo={mockClinic}
					initialData={{
						paperSignHash: "mock-paper-signature-sha256-hash-for-unit-testing",
						signedAt: "08.09.2026",
					}}
				/>,
			);
		});

		const stampBadge = findNodeByTestId(doc.body, "contract-stamp-badge");
		assert.notStrictEqual(stampBadge, null);
		assert.ok(
			(stampBadge?.textContent || "").includes("ПОДПИСАНО ВРАЧОМ"),
			"Штамп подписанного договора должен содержать «ПОДПИСАНО ВРАЧОМ»",
		);

		const previewStamp = findNodeByTestId(doc.body, "contract-preview-stamp");
		assert.notStrictEqual(previewStamp, null);
		assert.ok(
			(previewStamp?.textContent || "").includes("ПОДПИСАНО ВРАЧОМ"),
			"Штамп на бланке А4 должен содержать «ПОДПИСАНО ВРАЧОМ»",
		);

		await act(async () => {
			root.unmount();
		});
	});

	it("3. Strict zero-emoji compliance across contract HTML output and text", () => {
		const contract = createDefaultPaidContract({
			patientFullName: mockPatient.fullName,
			totalAmountKopecks: 0,
		});

		const html = generatePaidContractHtml(contract);
		const text = generatePaidContractText(contract);

		// Comprehensive Unicode emoji range
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

		assert.strictEqual(emojiRegex.test(html), false, "HTML договора не должен содержать эмодзи");
		assert.strictEqual(emojiRegex.test(text), false, "Текст договора не должен содержать эмодзи");
		assert.ok(html.includes("___________"), "Пустой договор при 0 ₽ должен содержать прочерки «___________» для ручного заполнения");
	});
});
