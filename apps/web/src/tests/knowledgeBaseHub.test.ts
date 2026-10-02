/**
 * apps/web/src/tests/knowledgeBaseHub.test.ts
 *
 * DENTE CRM — Knowledge Base & Learning Hub Red Team Unit Test
 *
 * Mandates:
 * - Mandate 8t: Targeted Unit Test executed via `node --import tsx --test`
 * - Mandate 8b: File line limit (<= 800 lines) across all guides and hub components
 * - Mandate 8x/8y: Zero Bird-Language & Soviet decree codes in visible headers
 * - Mandate 8e/8n: Doctor autonomy, solo practitioner workflows, 1-click ergonomics
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
	CLINICAL_GUIDES,
	GUIDE_CATEGORIES,
	AnalyticsReportsGuide,
	CashierGuide,
	DentalLabGuide,
	Imaging3DGuide,
	InventoryWarehouseGuide,
	LanMeshGuide,
	LeadsTelephonyGuide,
	MedicalRecordGuide,
	OdontogramGuide,
	SanPiNAutoclaveGuide,
	ScheduleGuide,
	TreatmentPlansGuide,
	getGuideById,
	getGuidesByCategory,
	searchClinicalGuides,
} from "../components/help";
import { KnowledgeBaseHubModal } from "../components/knowledge";
import { workspaceTopbarLabels } from "../workspaceUiLabels";

describe("Knowledge Base & Learning Hub — Metadata & Registry Audit", () => {
	it("registers exactly 12 core clinical guides with complete metadata", () => {
		assert.equal(CLINICAL_GUIDES.length, 12, "Should have exactly 12 guides registered");

		const expectedIds = [
			"schedule",
			"odontogram",
			"medical_record",
			"cashier",
			"imaging",
			"treatment_plans",
			"dental_lab",
			"inventory",
			"sanpin",
			"leads",
			"lan_mesh",
			"analytics",
		];

		for (const expectedId of expectedIds) {
			const guide = getGuideById(expectedId as any);
			assert.ok(guide, `Guide '${expectedId}' must be present in registry`);
			assert.ok(guide.title.length > 5, `Guide '${expectedId}' must have descriptive title`);
			assert.ok(guide.shortTitle.length > 2, `Guide '${expectedId}' must have short title`);
			assert.ok(guide.badge.length > 2, `Guide '${expectedId}' must have badge`);
			assert.ok(guide.description.length > 10, `Guide '${expectedId}' must have description`);
			assert.ok(Array.isArray(guide.keywords) && guide.keywords.length >= 3, `Guide '${expectedId}' must have keywords`);
		}
	});

	it("covers all 5 distinct operational categories without orphan categories", () => {
		assert.equal(GUIDE_CATEGORIES.length, 5, "Should define 5 categories");

		const categoryIds = GUIDE_CATEGORIES.map((c) => c.id);
		assert.deepEqual(categoryIds, [
			"clinical",
			"finance",
			"diagnostics",
			"lab_warehouse",
			"infrastructure",
		]);

		for (const catId of categoryIds) {
			const guidesInCat = getGuidesByCategory(catId);
			assert.ok(guidesInCat.length >= 1, `Category '${catId}' must contain at least 1 guide`);
		}
	});

	it("executes search across titles, short titles, badges, and keywords accurately", () => {
		// Empty query returns all guides
		assert.equal(searchClinicalGuides("").length, 12);

		// Russian clinical queries
		const odontogramResults = searchClinicalGuides("одонтограмма");
		assert.ok(odontogramResults.some((g) => g.id === "odontogram"));

		const ctResults = searchClinicalGuides("томография");
		assert.ok(ctResults.some((g) => g.id === "imaging"));

		const splitResults = searchClinicalGuides("сплит");
		assert.ok(splitResults.some((g) => g.id === "cashier"));

		const labResults = searchClinicalGuides("VITA");
		assert.ok(labResults.some((g) => g.id === "dental_lab"));

		const overdraftResults = searchClinicalGuides("овердрафт");
		assert.ok(overdraftResults.some((g) => g.id === "inventory"));

		const meshResults = searchClinicalGuides("mesh");
		assert.ok(meshResults.some((g) => g.id === "lan_mesh"));

		// Clinical synonyms & inflection tests mandated by Red Team Inquisitor:
		// 1. «счёт» and «счет» (handling 'ё' vs 'е' and billing concepts)
		const invoiceResults = searchClinicalGuides("счёт");
		assert.ok(invoiceResults.some((g) => g.id === "cashier"), "Search for 'счёт' must find Cashier");

		const invoiceResultsE = searchClinicalGuides("счет");
		assert.ok(invoiceResultsE.some((g) => g.id === "cashier"), "Search for 'счет' must find Cashier");

		// 2. «оплата»
		const paymentResults = searchClinicalGuides("оплата");
		assert.ok(paymentResults.some((g) => g.id === "cashier"), "Search for 'оплата' must find Cashier");

		// 3. «чек»
		const receiptResults = searchClinicalGuides("чек");
		assert.ok(receiptResults.some((g) => g.id === "cashier"), "Search for 'чек' must find Cashier");

		// 4. «зубы» (plural inflection matching root)
		const teethResults = searchClinicalGuides("зубы");
		assert.ok(teethResults.some((g) => g.id === "odontogram"), "Search for 'зубы' must find Odontogram");

		// 5. «детский» (pediatric dentition query)
		const pediatricResults = searchClinicalGuides("детский");
		assert.ok(pediatricResults.some((g) => g.id === "odontogram"), "Search for 'детский' must find Odontogram");

		// 6. «снимок» (singular form matching plural 'снимки')
		const xRayResults = searchClinicalGuides("снимок");
		assert.ok(xRayResults.some((g) => g.id === "imaging"), "Search for 'снимок' must find Imaging");
	});
});

describe("Knowledge Base & Learning Hub — Component SSR Rendering & Human Russian Invariants", () => {
	const guideComponents: Array<{
		name: string;
		Component: React.ComponentType;
		expectedKeywords: string[];
	}> = [
		{
			name: "ScheduleGuide",
			Component: ScheduleGuide,
			expectedKeywords: ["Расписание", "смен", "приём", "горячие клавиши", "вопросы"],
		},
		{
			name: "OdontogramGuide",
			Component: OdontogramGuide,
			expectedKeywords: ["Зубная формула", "FDI", "норма", "Shift+N", "патологи"],
		},
		{
			name: "MedicalRecordGuide",
			Component: MedicalRecordGuide,
			expectedKeywords: ["Медицинская карта", "дневник", "жалобы", "печать", "согласи"],
		},
		{
			name: "CashierGuide",
			Component: CashierGuide,
			expectedKeywords: ["Касса", "оплата", "чек", "сплит", "QR", "СБП"],
		},
		{
			name: "Imaging3DGuide",
			Component: Imaging3DGuide,
			expectedKeywords: ["Снимки", "томография", "MPR", "линейка", "визиограф"],
		},
		{
			name: "TreatmentPlansGuide",
			Component: TreatmentPlansGuide,
			expectedKeywords: ["Планы лечения", "сметы", "этапы", "скидк", "сравнение"],
		},
		{
			name: "DentalLabGuide",
			Component: DentalLabGuide,
			expectedKeywords: ["Зуботехническая лаборатория", "наряд", "VITA", "примерк"],
		},
		{
			name: "InventoryWarehouseGuide",
			Component: InventoryWarehouseGuide,
			expectedKeywords: ["Склад", "материал", "автосписание", "овердрафт", "FEFO"],
		},
		{
			name: "SanPiNAutoclaveGuide",
			Component: SanPiNAutoclaveGuide,
			expectedKeywords: ["Стерилизация", "автоклав", "крафт-пакет", "азопирам"],
		},
		{
			name: "LeadsTelephonyGuide",
			Component: LeadsTelephonyGuide,
			expectedKeywords: ["Лиды", "звонки", "телефония", "воронка", "канбан"],
		},
		{
			name: "LanMeshGuide",
			Component: LanMeshGuide,
			expectedKeywords: ["LAN", "Mesh", "планшет", "PIN", "офлайн"],
		},
		{
			name: "AnalyticsReportsGuide",
			Component: AnalyticsReportsGuide,
			expectedKeywords: ["Аналитика", "отчёты", "выручка", "зарплат", "средний чек"],
		},
	];

	for (const { name, Component, expectedKeywords } of guideComponents) {
		it(`${name} renders without throwing and contains plain human Russian clinical content`, () => {
			const html = renderToString(React.createElement(Component));
			assert.ok(html.length > 500, `${name} HTML output should be rich and detailed (>500 chars)`);

			for (const kw of expectedKeywords) {
				assert.ok(
					html.toLowerCase().includes(kw.toLowerCase()),
					`${name} should contain clinical keyword '${kw}'`,
				);
			}

			// Invariant: Mandate 8x/8y — Zero Soviet decree bird-language in visible primary titles
			assert.doesNotMatch(
				html,
				/<h[12][^>]*>.*Форма 043\/у.*<\/h[12]>/i,
				`${name} must not use bureaucratic 'Форма 043/у' in h1/h2 headings`,
			);
			assert.doesNotMatch(
				html,
				/<h[12][^>]*>.*54-ФЗ.*<\/h[12]>/i,
				`${name} must not use bureaucratic '54-ФЗ' in h1/h2 headings`,
			);
			assert.doesNotMatch(
				html,
				/<h[12][^>]*>.*Приказ 804н.*<\/h[12]>/i,
				`${name} must not use bureaucratic 'Приказ 804н' in h1/h2 headings`,
			);
		});
	}

	it("KnowledgeBaseHubModal renders clean closed state and open state", () => {
		// Closed state renders null
		const closedHtml = renderToString(
			React.createElement(KnowledgeBaseHubModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(closedHtml, "");

		// Open state renders complete 2-pane hub with search and guides
		const openHtml = renderToString(
			React.createElement(KnowledgeBaseHubModal, {
				isOpen: true,
				onClose: () => {},
				initialTab: "schedule",
			}),
		);
		assert.ok(openHtml.includes("Обучение и База знаний DENTE"));
		assert.ok(openHtml.includes("Интерактивный тренажёр"));
		assert.ok(openHtml.includes("Клавиши"));
		assert.ok(openHtml.includes("Расписание и приём пациентов"));
	});

	it("supports onLaunchTour callback across all guide components without errors", () => {
		let launchedTrack: string | undefined;
		const mockLaunch = (trackId?: string) => {
			launchedTrack = trackId;
		};

		const htmlSchedule = renderToString(
			React.createElement(ScheduleGuide, { onLaunchTour: mockLaunch }),
		);
		assert.ok(htmlSchedule.includes("Интерактивный тренажёр"));

		const htmlCashier = renderToString(
			React.createElement(CashierGuide, { onLaunchTour: mockLaunch }),
		);
		assert.ok(htmlCashier.includes("Интерактивный тренажёр"));

		const htmlImaging = renderToString(
			React.createElement(Imaging3DGuide, { onLaunchTour: mockLaunch }),
		);
		assert.ok(htmlImaging.includes("Интерактивный тренажёр"));
	});
});

describe("Knowledge Base & Learning Hub — Topbar Integration & UI Labels", () => {
	it("workspaceTopbarLabels provides learning button configuration", () => {
		assert.ok(workspaceTopbarLabels.learning, "workspaceTopbarLabels must define learning");
		assert.equal(workspaceTopbarLabels.learning.label, "Обучение");
		assert.ok(workspaceTopbarLabels.learning.title.includes("База знаний"));
	});
});

describe("Knowledge Base & Learning Hub — Mandate 8b File Line Limits (<= 800 lines)", () => {
	const helpFiles = [
		"AnalyticsReportsGuide.tsx",
		"CashierGuide.tsx",
		"DentalLabGuide.tsx",
		"Imaging3DGuide.tsx",
		"index.ts",
		"InventoryWarehouseGuide.tsx",
		"LanMeshGuide.tsx",
		"LeadsTelephonyGuide.tsx",
		"MedicalRecordGuide.tsx",
		"OdontogramGuide.tsx",
		"SanPiNAutoclaveGuide.tsx",
		"ScheduleGuide.tsx",
		"TreatmentPlansGuide.tsx",
	];

	const baseDir = path.resolve(__dirname, "../components/help");

	for (const fileName of helpFiles) {
		it(`${fileName} strictly complies with Mandate 8b (<= 800 lines)`, () => {
			const fullPath = path.join(baseDir, fileName);
			const content = fs.readFileSync(fullPath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount <= 800,
				`File ${fileName} has ${lineCount} lines, exceeding 800 lines limit!`,
			);
		});
	}

	it("KnowledgeBaseHubModal.tsx strictly complies with Mandate 8b (<= 800 lines)", () => {
		const fullPath = path.resolve(__dirname, "../components/knowledge/KnowledgeBaseHubModal.tsx");
		const content = fs.readFileSync(fullPath, "utf-8");
		const lineCount = content.split("\n").length;
		assert.ok(
			lineCount <= 800,
			`KnowledgeBaseHubModal.tsx has ${lineCount} lines, exceeding 800 lines limit!`,
		);
	});
});
