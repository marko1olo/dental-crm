import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	CANONICAL_5_KANBAN_COLUMNS,
	DentalLabOrdersKanbanBoard,
} from "../DentalLabOrdersKanbanBoard";
import {
	CANONICAL_LAB_PRICE_MATRIX,
	DentalLabPriceMatrixModal,
} from "../DentalLabPriceMatrixModal";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "../dentalLabFinancialGateEngine";
import { rublesToKopecks } from "@dental/shared";

describe("dentalLabScopeFinancialAutonomy — Mandate 8e Autonomy & Module Bounds", () => {
	it("Истечение 30 дней плана лечения НЕ блокирует наряд ЗТЛ, а недостаток аванса не блокирует dispatch", () => {
		const result = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(30000),
			paidKopecks: rublesToKopecks(20000),
			availableDepositKopecks: 0,
			labOrderPriceKopecks: rublesToKopecks(10000),
			minAdvancePercent: 50,
			treatmentPlanAgeDays: 45,
		});
		assert.equal(result.isGatePassed, true);
		assert.equal(result.gateStatus, "CLEARED");
		assert.equal(result.missingAdvanceKopecks, 0);
		assert.ok(result.isPlanExpiredNotice?.includes("не блокирует"));

		const unpaid = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(50000),
			paidKopecks: rublesToKopecks(10000),
			availableDepositKopecks: 0,
			labOrderPriceKopecks: rublesToKopecks(5000),
			minAdvancePercent: 50,
		});
		assert.equal(unpaid.isGatePassed, false);
		assert.equal(unpaid.gateStatus, "BLOCKED_REQUIRES_ADVANCE");
		assert.equal(unpaid.missingAdvanceKopecks, rublesToKopecks(15000));
		assert.equal(unpaid.isBlocked, false);
		assert.equal(unpaid.canDispatch, true);

		const coveredByDeposit = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(50000),
			paidKopecks: rublesToKopecks(10000),
			availableDepositKopecks: rublesToKopecks(15000),
			labOrderPriceKopecks: rublesToKopecks(5000),
			minAdvancePercent: 50,
		});
		assert.equal(coveredByDeposit.isGatePassed, true);
		assert.equal(coveredByDeposit.gateStatus, "CLEARED");
		assert.equal(coveredByDeposit.missingAdvanceKopecks, 0);

		const urgent = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(50000),
			paidKopecks: -500,
			availableDepositKopecks: -100,
			labOrderPriceKopecks: rublesToKopecks(5000),
			minAdvancePercent: 50,
			isUrgentTemporary: true,
		});
		assert.equal(urgent.isGatePassed, true);
		assert.equal(urgent.isUrgentBypassed, true);
		assert.equal(urgent.totalPaidAndCoveredKopecks, 0);
	});

	it("Канбан 5 канонических этапов и оверрайд врача", () => {
		const stageIds = CANONICAL_5_KANBAN_COLUMNS.map((col) => col.id);
		assert.deepEqual(stageIds, ["sent_to_lab", "in_progress", "fitting_scheduled", "ready_in_clinic", "installed_completed"]);

		const override = createDoctorClinicalOverride("Иванов И.И.", "Срочная примерка перед командировкой");
		assert.equal(override.authorized, true);
		assert.equal(override.doctorName, "Иванов И.И.");

		const overridden = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(40000),
			paidKopecks: 0,
			availableDepositKopecks: 0,
			minAdvancePercent: 50,
			doctorOverride: override,
		});
		assert.equal(overridden.isGatePassed, true);
		assert.equal(overridden.gateStatus, "DOCTOR_OVERRIDE");
		assert.equal(overridden.chiefDoctorOverrideAuthorized, true);
	});

	it("Компоненты ЗТЛ (Kanban Board и Price Matrix) рендерятся корректно с каноническими данными", () => {
		const boardHtml = renderToString(
			React.createElement(DentalLabOrdersKanbanBoard, { orders: [] }),
		);
		assert.ok(boardHtml.includes('data-testid="canonical-4-stage-kanban-board"'));
		for (const col of CANONICAL_5_KANBAN_COLUMNS) {
			assert.ok(boardHtml.includes(col.title), `Kanban must render column ${col.title}`);
		}

		const closedMatrixHtml = renderToString(
			React.createElement(DentalLabPriceMatrixModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(closedMatrixHtml, "");
		assert.ok(CANONICAL_LAB_PRICE_MATRIX.length > 0);
		assert.ok(
			CANONICAL_LAB_PRICE_MATRIX.every(
				(item) => item.id.length > 0 && item.suggestedPriceRub > 0,
			),
		);
	});
});
