/**
 * apps/web/src/components/lab/__tests__/labSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Runtime SSOT Inquisition Suite for Dental Laboratory & Studio.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	CANONICAL_LAB_STAGES,
	CANONICAL_LAB_MATERIALS,
	VITA_SHADES_SSOT,
	STUMP_SHADES,
	UPPER_JAW_TEETH,
	LOWER_JAW_TEETH,
	SEED_LAB_ORDERS,
	addWorkingDaysRu,
	formatKopecksToRubles,
	calcNetRevenueKopecks,
	getStageMeta,
	getMaterialMeta,
	isOrderOverdue,
} from "../dentalLabCatalogData";
import { DentalLabStudioModal } from "../DentalLabStudioModal";
import { DentalLabCreateOrderSection } from "../DentalLabCreateOrderSection";
import { DentalLabOrdersView } from "../DentalLabOrdersView";
import { resolveClinicRoute } from "../../../router/routeResolver";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("DENTE Dental Laboratory SSOT & Studio Runtime Suite", () => {
	it("1.1. Contains all canonical orthopedic materials with integer kopecks pricing", () => {
		assert.ok(CANONICAL_LAB_MATERIALS.length >= 6);
		const ids = CANONICAL_LAB_MATERIALS.map((m) => m.id);
		assert.ok(ids.includes("zirconia_multilayer"));
		assert.ok(ids.includes("emax_press"));
		assert.ok(ids.includes("metal_ceramic_cocr"));
		assert.ok(ids.includes("pmma_temp"));
		assert.ok(ids.includes("clasp_prosthesis"));
		assert.ok(ids.includes("zirconia_abutment"));

		for (const m of CANONICAL_LAB_MATERIALS) {
			assert.ok(m.baseLabCostKopecks > 0);
			assert.ok(m.defaultPatientPriceKopecks > m.baseLabCostKopecks);
			assert.ok(m.defaultDurationDays > 0);
			assert.ok(m.titleRu && m.titleRu.length > 5);
		}
	});

	it("1.2. Contains comprehensive Vita Classical & Bleach shades with valid hex colors", () => {
		assert.ok(VITA_SHADES_SSOT.length >= 16);
		const codes = VITA_SHADES_SSOT.map((v) => v.code);
		for (const expected of ["A1", "A2", "A3", "A3.5", "B1", "C1", "D2", "BL1", "BL2"]) {
			assert.ok(codes.includes(expected));
		}
		for (const v of VITA_SHADES_SSOT) {
			assert.match(v.approxHex, /^#[0-9A-Fa-f]{6}$/);
		}
		assert.ok(STUMP_SHADES.length >= 9);
	});

	it("1.3. Contains 5 sequential canonical stages", () => {
		assert.equal(CANONICAL_LAB_STAGES.length, 5);
		assert.deepEqual(CANONICAL_LAB_STAGES.map((s) => s.id), [
			"scan_sent",
			"in_production",
			"fitting_ready",
			"in_clinic",
			"seated",
		]);
		CANONICAL_LAB_STAGES.forEach((s, idx) => {
			assert.equal(s.stepNumber, idx + 1);
			assert.ok(s.labelRu && s.labelRu.length > 3);
		});
	});

	it("1.4. Validates Russian working days calculation (excluding weekends)", () => {
		const friday = new Date(2026, 9, 30);
		assert.equal(addWorkingDaysRu(friday, 1).getDay(), 1);
		assert.equal(addWorkingDaysRu(friday, 5).getDay(), 5);
	});

	it("1.5. Validates integer kopecks accounting and formatting helpers", () => {
		const formatted = formatKopecksToRubles(750000);
		assert.ok(formatted.includes("7") && formatted.includes("500") && formatted.includes("₽"));
		assert.equal(calcNetRevenueKopecks(2400000, 750000), 1650000);
		assert.equal(getStageMeta("in_clinic").labelRu, "Готово в клинике");
		assert.equal(getMaterialMeta("zirconia_multilayer").shortTitle, "Цирконий (ZrO2)");

		const seedOrder = SEED_LAB_ORDERS[0];
		assert.ok(seedOrder);
		assert.equal(isOrderOverdue({ ...seedOrder, stage: "in_production", dueDate: "2020-01-01" }), true);
		assert.equal(isOrderOverdue({ ...seedOrder, stage: "in_clinic", dueDate: "2020-01-01" }), false);
	});

	it("2.1. Renders DentalLabStudioModal & registry view cleanly without synthetic doctor fallback or cartoon emojis", () => {
		const modalHtml = renderToString(
			<DentalLabStudioModal isOpen={true} onClose={() => {}} patientName="Иванов И.И." />,
		);
		const registryHtml = renderToString(
			<DentalLabStudioModal isOpen={true} onClose={() => {}} initialTab="registry" patientName="Иванов И.И." />,
		);
		const viewHtml = renderToString(<DentalLabOrdersView initialOrders={[]} />);
		const formHtml = renderToString(
			<DentalLabCreateOrderSection
				activeMainTab="new_order"
				patientInput="Иванов И.И."
				setPatientInput={() => {}}
				availablePatients={[]}
				selectedTeeth={[16]}
				setSelectedTeeth={() => {}}
				toggleTooth={() => {}}
				selectedMaterialId="zirconia_multilayer"
				setSelectedMaterialId={() => {}}
				selectedShade="A2"
				setSelectedShade={() => {}}
				selectedLab="Лаборатория Альфа"
				setSelectedLab={() => {}}
				allLaboratories={["Лаборатория Альфа"]}
				customLabs={[]}
				setCustomLabs={() => {}}
				effectiveDueDate="2026-12-05"
				setCustomDueDate={() => {}}
				isUrgent={false}
				setIsUrgent={() => {}}
				notes=""
				setNotes={() => {}}
				teethCount={1}
				totalLabCostKopecks={750000}
				totalPatientPriceKopecks={2400000}
				netClinicRevenueKopecks={1650000}
				handleCreateOrder={() => {}}
				handlePrintA5Blank={() => {}}
				handleCourierBlank={() => {}}
			/>,
		);

		assert.ok(modalHtml.includes("Зуботехническая лаборатория и заказ-наряды"));
		assert.ok(modalHtml.includes("w-9 h-1 rounded-full"));
		assert.ok(modalHtml.includes("rounded-t-[24px]") || modalHtml.includes("dental-lab-modal-container"));
		assert.equal(modalHtml.includes("Врач-ортопед"), false, "P2-2.1: must not inject fake doctor fallback");

		assert.ok(registryHtml.includes('data-testid="filter-tab-all"'));
		assert.ok(registryHtml.includes('data-testid="lab-orders-search-input"'));
		assert.ok(formHtml.includes('data-testid="submit-lab-order-button"'));
		assert.ok(formHtml.includes("✓ Создать заказ-наряд"));
		assert.ok(formHtml.includes("Экспресс-наряд у кресла"));
		assert.ok(formHtml.includes('data-testid="tooth-chip-16"'));
		assert.ok(formHtml.includes('data-testid="shade-chip-A2"'));
		assert.ok(formHtml.includes('data-testid="lab-material-select"'));

		assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(modalHtml), false);
		assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(formHtml), false);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		for (const html of [modalHtml, registryHtml, viewHtml, formHtml]) {
			assert.equal(emojiRegex.test(html.replace(/[✓✕•→]/g, "")), false);
		}
	});

	it("2.4. Validates FDI 2-jaw anatomy without scrolling", () => {
		assert.equal(UPPER_JAW_TEETH.length, 14);
		assert.equal(LOWER_JAW_TEETH.length, 14);
		assert.ok(UPPER_JAW_TEETH.includes(16));
		assert.ok(UPPER_JAW_TEETH.includes(21));
		assert.ok(LOWER_JAW_TEETH.includes(46));
		assert.ok(LOWER_JAW_TEETH.includes(31));
	});

	it("3.1. resolveClinicRoute detects deep-link signatures correctly", () => {
		assert.equal(resolveClinicRoute("", "#lab").view, "lab");
		assert.equal(resolveClinicRoute("", "#dental-lab").view, "lab");
		assert.equal(resolveClinicRoute("?standalone=dental_lab", "").view, "lab");
		assert.equal(resolveClinicRoute("?lab=1", "").view, "lab");
		assert.notEqual(resolveClinicRoute("", "").view, "lab");
	});
});
