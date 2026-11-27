import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { CANONICAL_PROCEDURE_RECIPES } from "@dental/shared";
import {
	ConsumablesBatchWriteoffModal,
	DEFAULT_CLINICAL_SERVICES,
} from "../ConsumablesBatchWriteoffModal.js";
import { InboundWaybillModal } from "../InboundWaybillModal.js";
import { ClinicalWriteoffQuickStrip } from "../writeoff/ClinicalWriteoffQuickStrip.js";
import { InventoryOperationsMenu } from "../InventoryOperationsMenu.js";

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
	/1\s*клик/i,
	/043\/у/i,
	/804н/i,
	/54-ФЗ/i,
	/257\/у/i,
	/[\u{1F300}-\u{1FAFF}]/u,
];

function assertCleanClinicalOutput(label: string, output: string): void {
	for (const rx of FORBIDDEN_PATTERNS) {
		assert.equal(
			rx.test(output),
			false,
			`${label} contains forbidden jargon/decree/emoji matching ${rx}`,
		);
	}
}

describe("Warehouse Suite: Anti-Jargon & Zero Emojis (Runtime Render Verification)", () => {
	it("rendered inventory components and shared BOM catalogs contain zero emojis or forbidden jargon", () => {
		const writeoffHtml = renderToString(
			React.createElement(ConsumablesBatchWriteoffModal, {
				isOpen: true,
				onClose: () => {},
				organizationId: "org-test-1",
				initialServices: DEFAULT_CLINICAL_SERVICES,
			}),
		);
		assertCleanClinicalOutput("ConsumablesBatchWriteoffModal", writeoffHtml);

		const waybillHtml = renderToString(
			React.createElement(InboundWaybillModal, {
				isOpen: true,
				onClose: () => {},
				organizationId: "org-test-1",
				inventoryItems: [],
			}),
		);
		assertCleanClinicalOutput("InboundWaybillModal", waybillHtml);

		const quickStripHtml = renderToString(
			React.createElement(ClinicalWriteoffQuickStrip, {
				onQuickCarpuleWriteoff: () => {},
				onQuickAnesthesiaPackageWriteoff: () => {},
				onQuickTherapyWriteoff: () => {},
				onQuickSurgeryWriteoff: () => {},
				onQuickHygieneWriteoff: () => {},
			}),
		);
		assertCleanClinicalOutput("ClinicalWriteoffQuickStrip", quickStripHtml);
		assert.ok(
			quickStripHtml.includes("md:h-9"),
			"Quick strip buttons must scale to compact desktop height h-9",
		);

		const opsHtml = renderToString(
			React.createElement(InventoryOperationsMenu, {
				isOpen: false,
				onToggle: () => {},
				onClose: () => {},
				onOpenAcceptanceWaybills: () => {},
				onOpenWarehouseManager: () => {},
				onOpenMdlpScanning: () => {},
				onOpenClinicalWriteoff: () => {},
				onOpenInventoryAudit: () => {},
				onOpenMdlpDisposal: () => {},
				onOpenShiftDeductionModal: () => {},
				onOpenSterilizationCycleModal: () => {},
				onQuickWriteoffStandardKit: () => {},
				onQuickWriteoffSterilizationKit: () => {},
				onQuickWriteoffVisitBundle: () => {},
				onQuickWriteoffShiftBundle: () => {},
			}),
		);
		assertCleanClinicalOutput("InventoryOperationsMenu", opsHtml);

		assertCleanClinicalOutput(
			"CANONICAL_PROCEDURE_RECIPES",
			JSON.stringify(
				CANONICAL_PROCEDURE_RECIPES.map((r) => ({ title: r.titleRu, items: r.items })),
			),
		);
	});
});
