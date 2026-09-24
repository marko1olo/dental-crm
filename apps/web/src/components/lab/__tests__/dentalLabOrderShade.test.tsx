/**
 * apps/web/src/components/lab/__tests__/dentalLabOrderShade.test.tsx
 *
 * Dedicated test suite for Mandates 8l / 8e / 8d / 8k / 8n:
 * «Dental Lab 3D Shade & Order Inquisitor — VITA 3D-Master, Print Blank & Autonomy»
 *
 * Invariants tested:
 * 1. VITA Classical palette: 16 shades grouped into 4 distinct tonal categories (A, B, C, D).
 * 2. VITA 3D-Master (1M1–5M3, 26 shades across levels 1-5) and Bleach (0M1–0M3, BL1–BL4).
 * 3. 3-zone gradient stratification (Cervical, Body, Incisal) and clinical presets.
 * 4. Natural Die stump shades (ND1–ND9) for e.max and zirconia restoration planning.
 * 5. 152-FZ courier format for patient names (initials for external dental lab bags).
 * 6. Working business days remaining & deadline indicator (Mandate 8e item 7).
 * 7. Expiration of 30-day treatment plan does not block lab order creation.
 * 8. DentalLabShadeSelector component DOM rendering & 1-click controls.
 * 9. DentalLabPrintBlank statutory printing quality, barcodes, and dates.
 * 10. Zero Emojis compliance across all lab files (Mandate 8d item 7).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	VITA_CLASSICAL_GROUPS,
	VITA_3D_MASTER_GROUPS,
	VITA_BLEACH_SHADES_CLASSIFIED,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
	getStratificationPreset,
	formatPatientName152Fz,
	calculateWorkingDaysRemaining,
	addWorkingDays,
	generateBarcodeSvg,
	generateQrCodeSvg,
} from "../labMath";

import { DentalLabShadeSelector } from "../DentalLabShadeSelector";
import { DentalLabPrintBlank } from "../DentalLabPrintBlank";
import { checkDentalLabFinancialGate } from "../dentalLabFinancialGateEngine";

// ─── MOCK DOM SETUP ──────────────────────────────────────────────────────────

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
	multiple?: boolean;
	selectedIndex?: number;
	value?: string;
	options?: MockDomNode[];
	appendChild: (child: MockDomNode) => MockDomNode;
	insertBefore: (child: MockDomNode, before: MockDomNode | null) => MockDomNode;
	removeChild: (child: MockDomNode) => MockDomNode;
	addEventListener: (type: string, fn: EventListener) => void;
	removeEventListener: (type: string, fn: EventListener) => void;
	setAttribute: (name: string, value: string) => void;
	getAttribute: (name: string) => string | null;
	removeAttribute: (name: string) => void;
	dispatchEvent: (ev: { type: string }) => boolean;
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
			textContent: "",
			multiple: false,
			selectedIndex: 0,
			value: "",
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
		documentElement: createMockElement("html"),
		body: createMockElement("body"),
		activeElement: null,
	};
	doc.documentElement.ownerDocument = doc;
	doc.body.ownerDocument = doc;

	const printMock = () => {};

	const win = {
		document: doc,
		location: {
			origin: "http://localhost:5173",
			href: "http://localhost:5173/#/lab-orders",
			search: "",
			hash: "#/lab-orders",
		},
		addEventListener: () => {},
		removeEventListener: () => {},
		navigator: {
			clipboard: {
				writeText: async () => Promise.resolve(),
			},
		},
		print: printMock,
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
	g.print = printMock;
	g.HTMLIFrameElement = win.HTMLIFrameElement;
	g.HTMLElement = win.HTMLElement;
	g.Element = win.Element;
	g.Node = win.Node;
	g.IS_REACT_ACT_ENVIRONMENT = true;

	return { doc, win };
}

function findNodeByTestId(node: MockDomNode | null, testId: string): MockDomNode | null {
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

// ─── TEST SUITE ──────────────────────────────────────────────────────────────

describe("Dental Lab 3D Shade & Order Inquisitor — Mandates 8d, 8e, 8k, 8n", () => {
	it("1. VITA Classical palette has all 16 shades grouped into 4 distinct tones (A, B, C, D)", () => {
		assert.equal(VITA_CLASSICAL_SHADES.length, 16, "VITA Classical должна содержать ровно 16 оттенков");
		assert.equal(VITA_CLASSICAL_GROUPS.length, 4, "Должно быть 4 тональных группы VITA Classical");

		const [grpA, grpB, grpC, grpD] = VITA_CLASSICAL_GROUPS;
		assert.ok(grpA && grpB && grpC && grpD, "Все 4 группы должны быть определены");

		// Group A: Красновато-коричневый
		assert.equal(grpA.id, "A");
		assert.ok(grpA.toneRu.includes("Красновато-коричневый"), "Группа A должна быть красновато-коричневой");
		assert.deepEqual(grpA.shades, ["A1", "A2", "A3", "A3.5", "A4"]);

		// Group B: Красновато-желтый
		assert.equal(grpB.id, "B");
		assert.ok(grpB.toneRu.includes("Красновато-желтый"), "Группа B должна быть красновато-желтой");
		assert.deepEqual(grpB.shades, ["B1", "B2", "B3", "B4"]);

		// Group C: Серый
		assert.equal(grpC.id, "C");
		assert.ok(grpC.toneRu.includes("Серый"), "Группа C должна быть серой");
		assert.deepEqual(grpC.shades, ["C1", "C2", "C3", "C4"]);

		// Group D: Красновато-серый
		assert.equal(grpD.id, "D");
		assert.ok(grpD.toneRu.includes("Красновато-серый"), "Группа D должна быть красновато-серой");
		assert.deepEqual(grpD.shades, ["D2", "D3", "D4"]);

		// All shades must have valid swatches
		for (const shade of VITA_CLASSICAL_SHADES) {
			const swatch = SHADE_SWATCH_MAP[shade];
			assert.ok(swatch, `Оттенок ${shade} обязан иметь запись в SHADE_SWATCH_MAP`);
			assert.ok(swatch.bg.startsWith("#"), `Фон оттенка ${shade} должен быть HEX цветом`);
			assert.ok(swatch.border.startsWith("#"), `Граница оттенка ${shade} должна быть HEX цветом`);
		}
	});

	it("2. VITA 3D-Master has 26 shades across levels 1-5, and Bleach shades include 0M1-0M3", () => {
		assert.equal(VITA_3D_MASTER_SHADES.length, 26, "VITA 3D-Master должна содержать 26 оттенков");
		assert.equal(VITA_3D_MASTER_GROUPS.length, 5, "VITA 3D-Master должна иметь 5 уровней светлоты");

		// Check level 1 (lightest) and level 5 (darkest)
		const grp0 = VITA_3D_MASTER_GROUPS[0];
		const grp4 = VITA_3D_MASTER_GROUPS[4];
		assert.ok(grp0 && grp4, "Группы 1 и 5 должны быть определены");
		assert.deepEqual(grp0.shades, ["1M1", "1M2"]);
		assert.deepEqual(grp4.shades, ["5M1", "5M2", "5M3"]);

		// Bleach shades
		const bleachIds = VITA_BLEACH_SHADES_CLASSIFIED.map((b) => b.id);
		assert.ok(bleachIds.includes("0M1"), "Bleach должен включать ультрасветлый 0M1");
		assert.ok(bleachIds.includes("0M2"), "Bleach должен включать 0M2");
		assert.ok(bleachIds.includes("0M3"), "Bleach должен включать 0M3");
		assert.ok(bleachIds.includes("BL1"), "Bleach должен включать Ivoclar BL1");
		assert.ok(bleachIds.includes("BL2"), "Bleach должен включать Ivoclar BL2");

		// Swatches for 0M1..0M3
		for (const b of ["0M1", "0M2", "0M3", "BL1", "BL2", "BL3", "BL4"]) {
			assert.ok(SHADE_SWATCH_MAP[b], `Bleach оттенок ${b} обязан иметь цветовой образец`);
		}
	});

	it("3. 3-Zone gradient stratification (Cervical, Body, Incisal) and presets operate correctly", () => {
		// Natural gradient for standard A2
		const naturalA2 = getStratificationPreset("A2", "natural");
		assert.equal(naturalA2.cervical, "A3", "Пришеечная зона для A2 должна быть темнее/насыщеннее (A3)");
		assert.equal(naturalA2.body, "A2", "Тело зуба должно соответствовать базовому цвету A2");
		assert.equal(naturalA2.incisal, "A1", "Режущий край должен быть более светлым/прозрачным (A1)");

		// Monochrome mode
		const monoA3 = getStratificationPreset("A3", "monochrome");
		assert.equal(monoA3.cervical, "A3");
		assert.equal(monoA3.body, "A3");
		assert.equal(monoA3.incisal, "A3");

		// Youth translucent mode
		const youthA2 = getStratificationPreset("A2", "youth_translucent");
		assert.equal(youthA2.cervical, "A2");
		assert.equal(youthA2.body, "A2");
		assert.equal(youthA2.incisal, "A1");
	});

	it("4. Natural Die stump shades (ND1–ND9) are defined for all types of tooth preparations", () => {
		assert.equal(STUMP_NATURAL_DIE_SHADES.length, 9, "Должно быть ровно 9 оттенков культи ND1–ND9");
		const ids = STUMP_NATURAL_DIE_SHADES.map((s) => s.id);
		for (let i = 1; i <= 9; i++) {
			const ndKey = `ND${i}` as (typeof ids)[number];
			assert.ok(ids.includes(ndKey), `Оттенок ${ndKey} должен присутствовать`);
			assert.ok(SHADE_SWATCH_MAP[ndKey], `${ndKey} должен иметь цвет в SHADE_SWATCH_MAP`);
		}

		// ND1 is bleached stump, ND9 is metallic core
		const s0 = STUMP_NATURAL_DIE_SHADES[0];
		const s8 = STUMP_NATURAL_DIE_SHADES[8];
		assert.ok(s0 && s8, "ND1 и ND9 должны быть определены");
		assert.ok(s0.desc.includes("винир"), "ND1 оптимизирован для виниров");
		assert.ok(s8.name.includes("Металлическая"), "ND9 обозначает литую вкладку/титан");
	});

	it("5. 152-FZ patient name formatting generates valid full and courier-masked names", () => {
		const res1 = formatPatientName152Fz("Иванов Иван Иванович");
		assert.equal(res1.fullName, "Иванов Иван Иванович");
		assert.equal(res1.courierMaskedName, "Иванов И. И.");

		const res2 = formatPatientName152Fz("Смирнова Екатерина Васильевна");
		assert.equal(res2.fullName, "Смирнова Екатерина Васильевна");
		assert.equal(res2.courierMaskedName, "Смирнова Е. В.");

		const resSingle = formatPatientName152Fz("Сидоров");
		assert.equal(resSingle.courierMaskedName, "Сидоров");

		const resEmpty = formatPatientName152Fz("");
		assert.equal(resEmpty.courierMaskedName, "Пациент");
	});

	it("6. Working days remaining calculation accurately evaluates normal, urgent, and overdue deadlines", () => {
		const baseDate = new Date("2026-09-21T10:00:00Z"); // Monday

		// +5 working days (Monday + 5 working days = next Monday, Sept 28)
		const target5Days = addWorkingDays(baseDate, 5);
		const rem5 = calculateWorkingDaysRemaining(target5Days, baseDate);
		assert.ok(rem5);
		assert.equal(rem5.workingDays, 5);
		assert.equal(rem5.isOverdue, false);
		assert.equal(rem5.isUrgent, false);
		assert.ok(rem5.labelRu.includes("В графике: 5 раб. дн."));

		// Today (0 working days)
		const remToday = calculateWorkingDaysRemaining(baseDate, baseDate);
		assert.ok(remToday);
		assert.equal(remToday.workingDays, 0);
		assert.equal(remToday.isUrgent, true);
		assert.ok(remToday.labelRu.includes("сегодня"));

		// Urgent: +1 working day (Tuesday)
		const target1Day = addWorkingDays(baseDate, 1);
		const rem1 = calculateWorkingDaysRemaining(target1Day, baseDate);
		assert.ok(rem1);
		assert.equal(rem1.workingDays, 1);
		assert.equal(rem1.isUrgent, true);
		assert.ok(rem1.labelRu.includes("Срочно: 1 раб. дн."));

		// Overdue: 2 days in the past (Friday Sept 18)
		const pastDate = new Date("2026-09-17T10:00:00Z");
		const remOverdue = calculateWorkingDaysRemaining(pastDate, baseDate);
		assert.ok(remOverdue);
		assert.equal(remOverdue.isOverdue, true);
		assert.ok(remOverdue.workingDays < 0);
		assert.ok(remOverdue.labelRu.includes("Дедлайн просрочен"));
	});

	it("7. Mandate 8e item 7 invariant: Treatment plan expiration (>30 days) never blocks lab order", () => {
		const gateRes = checkDentalLabFinancialGate({
			stageTotalKopecks: 2400000,
			paidKopecks: 2400000,
			minAdvancePercent: 50,
			treatmentPlanAgeDays: 45, // >30 days
			isPlanExpired: true,
		});

		assert.equal(gateRes.isGatePassed, true, "Оплаченный этап обязан пропускать наряд ЗТЛ даже если плану >30 дней");
		assert.ok(gateRes.isPlanExpiredNotice, "Должно присутствовать информационное уведомление о возрасте плана");
		assert.ok(
			gateRes.isPlanExpiredNotice.includes("НЕ БЛОКИРУЕТ"),
			"Уведомление обязано подтверждать неблокируемость создания наряда"
		);
	});

	it("8. DentalLabShadeSelector component renders all VITA systems and 3-zone stratification in DOM", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		let root: Root | null = null;
		await act(async () => {
			// biome-ignore lint/suspicious/noExplicitAny: mock container
			root = createRoot(container as any);
			root.render(
				<DentalLabShadeSelector
					shadeSystem="classical"
					setShadeSystem={() => {}}
					shadeClassical="A2"
					setShadeClassical={() => {}}
					shade3dMaster="2M2"
					setShade3dMaster={() => {}}
					shadeBleach="0M1"
					setShadeBleach={() => {}}
					shadeCervical="A3"
					setShadeCervical={() => {}}
					shadeBody="A2"
					setShadeBody={() => {}}
					shadeIncisal="A1"
					setShadeIncisal={() => {}}
					shadeStump="ND2"
					setShadeStump={() => {}}
					translucency="HT"
					setTranslucency={() => {}}
					mamelons={true}
					setMamelons={() => {}}
					calcifications={false}
					setCalcifications={() => {}}
				/>
			);
		});

		// System buttons
		assert.ok(findNodeByTestId(container, "shade-system-classical-btn"));
		assert.ok(findNodeByTestId(container, "shade-system-3dmaster-btn"));
		assert.ok(findNodeByTestId(container, "shade-system-bleach-btn"));

		// 4 Tonal Groups for Classical
		assert.ok(findNodeByTestId(container, "vita-classical-group-A"));
		assert.ok(findNodeByTestId(container, "vita-classical-group-B"));
		assert.ok(findNodeByTestId(container, "vita-classical-group-C"));
		assert.ok(findNodeByTestId(container, "vita-classical-group-D"));

		// 3-Zone Stratification Container
		assert.ok(findNodeByTestId(container, "3zone-stratification-container"));

		// Stump Shade Container and Chips
		assert.ok(findNodeByTestId(container, "stump-shade-container"));
		assert.ok(findNodeByTestId(container, "stump-shade-ND1"));
		assert.ok(findNodeByTestId(container, "stump-shade-ND2"));
		assert.ok(findNodeByTestId(container, "stump-shade-ND9"));

		// Translucency & optical effects
		assert.ok(findNodeByTestId(container, "translucency-HT"));
		assert.ok(findNodeByTestId(container, "mamelons-checkbox"));
		assert.ok(findNodeByTestId(container, "calcifications-checkbox"));

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});

	it("9. DentalLabPrintBlank renders statutory Form ZTL-1 fields, vector barcodes, and deadline", async () => {
		const { doc } = setupMockDom();
		const container = doc.createElement("div");
		doc.body.appendChild(container);

		let root: Root | null = null;
		await act(async () => {
			// biome-ignore lint/suspicious/noExplicitAny: mock container
			root = createRoot(container as any);
			root.render(
				<DentalLabPrintBlank
					gostOrderNumber="ЗТЛ-2609-TEST01"
					secureToken="SECURE-TOKEN-123"
					formPatientName="Иванов Иван Иванович"
					formDoctorName="Д-р Петров С. М."
					clinicName="ООО «ДЕНТЕ» · Стоматологическая клиника"
					selectedTeeth={[11, 21]}
					constructionType="single_crown"
					material="zirconia_multilayer"
					shadeSystem="classical"
					shadeClassical="A2"
					shade3dMaster="2M2"
					shadeBleach="0M1"
					shadeCervical="A3"
					shadeBody="A2"
					shadeIncisal="A1"
					shadeStump="ND2"
					translucency="HT"
					mamelons={true}
					calcifications={false}
					dueDate="2026-10-05"
					clinicalNotes="Прецизионная посадка 30 мкм"
					totalLabPriceRub={24000}
					portalUrl="http://localhost:5173/#/portal/lab-order/SECURE-TOKEN-123"
					handlePrint={() => {}}
					isDraft={false}
					isSigned={true}
				/>
			);
		});

		// Blank sheet
		const blank = findNodeByTestId(container, "form-ztl-1-blank");
		assert.ok(blank, "Бланк формы ЗТЛ-1 должен присутствовать");

		// 5-stage tracker on blank
		const tracker = findNodeByTestId(container, "lab-blank-5stage-tracker");
		assert.ok(tracker, "Трекер этапов ЗТЛ должен присутствовать на бланке");

		// Deadline badge
		const deadlineBadge = findNodeByTestId(container, "print-blank-deadline-badge");
		assert.ok(deadlineBadge, "Индикатор дедлайна с рабочими днями должен присутствовать");

		// Vector Barcode SVG output
		const barcodeSvg = generateBarcodeSvg("ЗТЛ-2609-TEST01");
		assert.ok(barcodeSvg.includes("<svg"), "Штрихкод обязан быть векторным SVG");
		assert.ok(barcodeSvg.includes("<rect"), "Штрихкод обязан содержать штрихи rect");

		// QR Code SVG output
		const qrSvg = generateQrCodeSvg("http://localhost:5173/#/portal");
		assert.ok(qrSvg.includes("<svg"), "QR-код обязан быть векторным SVG");

		if (root) {
			await act(async () => {
				(root as Root).unmount();
			});
		}
	});

	it("10. Zero Emojis Compliance across all lab files (Mandate 8d Sin #7)", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const targetFiles = [
			"DentalLabOrderModal.tsx",
			"DentalLabOrdersHubModal.tsx",
			"DentalLabShadeSelector.tsx",
			"DentalLabPrintBlank.tsx",
			"labMath.ts",
			"dentalLabWorkflowEngine.ts",
			"dentalLabFinancialGateEngine.ts",
			"DentalLabFinancialGate.tsx",
			"DentalLabRestorationTab.tsx",
		];

		// Check Unicode emojis and symbols
		const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
		const extPictRegex = /\p{Extended_Pictographic}/u;

		for (const file of targetFiles) {
			const fullPath = path.join(labDir, file);
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, "utf-8");
				assert.equal(
					emojiRegex.test(content),
					false,
					`Файл ${file} содержит запрещенные символы/эмодзи (Мандат 8d п. 7)`
				);
				assert.equal(
					extPictRegex.test(content),
					false,
					`Файл ${file} содержит Extended_Pictographic эмодзи (Мандат 8d п. 7)`
				);
			}
		}
	});
});
