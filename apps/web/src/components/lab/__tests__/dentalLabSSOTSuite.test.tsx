/**
 * apps/web/src/components/lab/__tests__/dentalLabSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Runtime Behavioral Suite for Dental Laboratory & Orthopedic Orders.
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
	CLINIC_LABORATORIES,
	UPPER_JAW_TEETH,
	LOWER_JAW_TEETH,
	SEED_LAB_ORDERS,
	addWorkingDaysRu,
	formatKopecksToRubles,
	calcNetRevenueKopecks,
	calculateZtlPayrollNetRevenue,
	getStageMeta,
	getMaterialMeta,
	isOrderOverdue,
} from "../dentalLabCatalogData";
import { DentalLabStudioModal } from "../DentalLabStudioModal";
import { DentalLabCreateOrderSection } from "../DentalLabCreateOrderSection";
import { DentalLabRegistryOrderCard } from "../ordersView/DentalLabRegistryOrderCard";
import { WorkspaceStudioOverlayHost } from "../../appLayout/WorkspaceStudioOverlayHost";
import { resolveClinicRoute } from "../../../router/routeResolver";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("DENTE Dental Laboratory & Orthopedic Orders Canonical SSOT Suite", () => {
	it("1.1. Contains all popular orthopedic materials with integer kopecks accounting", () => {
		assert.ok(CANONICAL_LAB_MATERIALS.length >= 6);
		const ids = CANONICAL_LAB_MATERIALS.map((m) => m.id);
		assert.ok(ids.includes("zirconia_multilayer"));
		assert.ok(ids.includes("emax_press"));
		assert.ok(ids.includes("metal_ceramic_cocr"));
		assert.ok(ids.includes("clasp_prosthesis"));
		assert.ok(ids.includes("zirconia_abutment"));
		assert.ok(ids.includes("pmma_temp"));

		for (const mat of CANONICAL_LAB_MATERIALS) {
			assert.ok(Number.isInteger(mat.baseLabCostKopecks));
			assert.ok(Number.isInteger(mat.defaultPatientPriceKopecks));
			assert.ok(mat.baseLabCostKopecks > 0);
			assert.ok(mat.defaultPatientPriceKopecks > mat.baseLabCostKopecks);
			assert.ok(mat.defaultDurationDays > 0);
			assert.ok(mat.titleRu && mat.titleRu.length > 5);
		}
	});

	it("1.2. Contains comprehensive VITA Classic & Bleach shades with hex color accuracy", () => {
		assert.ok(VITA_SHADES_SSOT.length >= 16);
		const codes = VITA_SHADES_SSOT.map((s) => s.code);
		assert.ok(codes.includes("A1") && codes.includes("A2") && codes.includes("A3") && codes.includes("A3.5") && codes.includes("A4"));
		assert.ok(codes.includes("B1") && codes.includes("B2") && codes.includes("B3") && codes.includes("B4"));
		assert.ok(codes.includes("C1") && codes.includes("C2") && codes.includes("C3") && codes.includes("C4"));
		assert.ok(codes.includes("D2") && codes.includes("D3") && codes.includes("D4"));
		assert.ok(codes.includes("BL1") && codes.includes("BL2") && codes.includes("BL3") && codes.includes("BL4"));

		for (const shade of VITA_SHADES_SSOT) {
			assert.match(shade.approxHex, /^#[0-9A-Fa-f]{6}$/);
			assert.ok(shade.label && shade.label.length > 2);
		}
		assert.ok(STUMP_SHADES.length >= 9);
		assert.ok(CLINIC_LABORATORIES.length >= 1);
	});

	it("1.3. Contains exactly 5 sequential canonical stages", () => {
		assert.equal(CANONICAL_LAB_STAGES.length, 5);
		assert.deepEqual(CANONICAL_LAB_STAGES.map((s) => s.id), [
			"scan_sent",
			"in_production",
			"fitting_ready",
			"in_clinic",
			"seated",
		]);
		CANONICAL_LAB_STAGES.forEach((stage, idx) => {
			assert.equal(stage.stepNumber, idx + 1);
			assert.ok(stage.labelRu && stage.labelRu.length > 3);
			assert.ok(stage.borderToken && stage.bgToken);
		});
	});

	it("1.4. Validates Russian working days calculation excluding weekends", () => {
		const friday = new Date(2026, 9, 30);
		assert.equal(addWorkingDaysRu(friday, 1).getDay(), 1);
		assert.equal(addWorkingDaysRu(friday, 5).getDay(), 5);
	});

	it("1.5. Validates revenue and payroll helpers in integer kopecks", () => {
		assert.equal(calcNetRevenueKopecks(2400000, 750000), 1650000);
		assert.equal(calculateZtlPayrollNetRevenue(2400000, 750000, 25).doctorWageKopecks, 412500);
		assert.equal(calculateZtlPayrollNetRevenue(2400000, 750000, 25, true).labCostKopecks, 0);
		const formatted = formatKopecksToRubles(750000);
		assert.ok(formatted.includes("7") && formatted.includes("500") && formatted.includes("₽"));
		assert.equal(getStageMeta("in_clinic").labelRu, "Готово в клинике");
		assert.equal(getMaterialMeta("zirconia_multilayer").shortTitle, "Цирконий (ZrO2)");
		assert.equal(isOrderOverdue({ ...SEED_LAB_ORDERS[0]!, stage: "in_production", dueDate: "2020-01-01" }), true);
	});

	it("2.1. Renders DentalLabStudioModal & DentalLabCreateOrderSection with Single Primary CTA, Drag Handle, and 0 disabled buttons", () => {
		const modalHtml = renderToString(
			<DentalLabStudioModal isOpen={true} onClose={() => {}} patientName="Тест Пациент" />,
		);
		const formHtml = renderToString(
			<DentalLabCreateOrderSection
				activeMainTab="new_order"
				patientInput="Тест Пациент"
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
		assert.ok(formHtml.includes('data-testid="submit-lab-order-button"'));
		assert.ok(formHtml.includes("✓ Создать заказ-наряд"));
		assert.ok(formHtml.includes("var(--primary)") || formHtml.includes("var(--teal"));
		assert.ok(formHtml.includes("Экспресс-наряд у кресла"));
		assert.ok(formHtml.includes('data-testid="tooth-chip-16"'));
		assert.ok(formHtml.includes('data-testid="shade-chip-A2"'));
		assert.ok(formHtml.includes('data-testid="lab-material-select"'));
		assert.ok(formHtml.includes('data-testid="lab-partner-select"'));
		assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(modalHtml), false);
		assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(formHtml), false);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(modalHtml.replace(/[✓✕•→]/g, "")), false);
		assert.equal(emojiRegex.test(formHtml.replace(/[✓✕•→]/g, "")), false);
	});

	it("2.2. Renders DentalLabRegistryOrderCard with chairside quick actions", () => {
		const order = SEED_LAB_ORDERS[0];
		assert.ok(order);
		const cardHtml = renderToString(
			<DentalLabRegistryOrderCard
				ord={order}
				onMarkInClinic={() => {}}
				onCallPatient={() => {}}
				onPrintOrder={() => {}}
				onAdvanceStage={() => {}}
			/>,
		);
		assert.ok(cardHtml.includes(`mark-ready-btn-${order.id}`));
		assert.ok(cardHtml.includes(`call-patient-btn-${order.id}`));
		assert.ok(cardHtml.includes(`print-order-btn-${order.id}`));
		assert.ok(cardHtml.includes(`advance-stage-btn-${order.id}`));
	});

	it("3.1. resolveClinicRoute detects lab deep-link signatures & WorkspaceStudioOverlayHost mounts", () => {
		assert.equal(resolveClinicRoute("", "#lab").view, "lab");
		assert.equal(resolveClinicRoute("", "#dental-lab").view, "lab");
		assert.equal(resolveClinicRoute("", "#lab-orders").view, "lab");
		assert.equal(resolveClinicRoute("?lab=1", "").view, "lab");
		assert.equal(resolveClinicRoute("?standalone=dental_lab", "").view, "lab");
		assert.notEqual(resolveClinicRoute("", "").view, "lab");
		assert.equal(typeof WorkspaceStudioOverlayHost, "function");
		assert.equal(UPPER_JAW_TEETH.length, 14);
		assert.equal(LOWER_JAW_TEETH.length, 14);
	});
});
