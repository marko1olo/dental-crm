import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CANONICAL_4_KANBAN_COLUMNS } from "../DentalLabOrdersKanbanBoard";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "../dentalLabFinancialGateEngine";
import { rublesToKopecks } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const labDir = path.resolve(path.dirname(__filename), "..");

describe("dentalLabScopeFinancialAutonomy — Mandate 8e Autonomy & Module Bounds", () => {
	it("Истечение 30 дней плана лечения НЕ блокирует наряд ЗТЛ", () => {
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
		assert.ok(result.isPlanExpiredNotice?.includes("не блокирует"));

		const urgent = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(50000),
			paidKopecks: 0,
			availableDepositKopecks: 0,
			labOrderPriceKopecks: rublesToKopecks(5000),
			minAdvancePercent: 50,
			isUrgentTemporary: true,
		});
		assert.equal(urgent.isGatePassed, true);
		assert.equal(urgent.isUrgentBypassed, true);
	});

	it("Канбан 4 этапа и оверрайд врача", () => {
		const stageIds = CANONICAL_4_KANBAN_COLUMNS.map((col) => col.id);
		assert.deepEqual(stageIds, ["sent_to_lab", "in_progress", "fitting_scheduled", "installed_completed"]);

		const override = createDoctorClinicalOverride("Иванов И.И.", "Срочная примерка перед командировкой");
		assert.equal(override.authorized, true);
		assert.equal(override.doctorName, "Иванов И.И.");
	});

	it("Изоляция модуля ЗТЛ в components/lab/", () => {
		const files = fs.readdirSync(labDir);
		assert.ok(files.includes("DentalLabOrdersView.tsx"));
		assert.ok(files.includes("DentalLabOrderModal.tsx"));
		assert.ok(files.includes("DentalLabPriceMatrixModal.tsx"));
	});
});
