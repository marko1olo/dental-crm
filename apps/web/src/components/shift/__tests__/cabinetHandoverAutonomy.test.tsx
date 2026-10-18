import "../../../../testCssStub.mjs";
import React from "react";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { ShiftViewChairStatusCard } from "../../../shiftViewModules/ShiftViewChairStatusCard";
import * as ShiftComponents from "../index";
import { ShiftActionsToolbar } from "../mobileCockpit/ShiftActionsToolbar";

describe("ShiftChairAutonomy & Anti-Handover Purge — Mandates 8e & 8n (Zero Domestic Chore & Zero Carsharing Handover Simulator)", () => {
	it("1. ShiftViewChairStatusCard renders ONLY clean DoctorShiftHeroCard with ZERO cabinet handover bars", () => {
		const html = renderToString(
			<ShiftViewChairStatusCard
				doctorFullName="Д-р Смирнов К.В."
				cabinetName="Кабинет №1"
				inChairAppointment={null}
			/>,
		);

		// Proves the chair status card container and hero card are present
		assert.ok(
			html.includes('data-testid="shift-chair-status-card"'),
			"Must render shift-chair-status-card container",
		);

		// Proves that simulated carsharing handover bar is completely purged from the main screen
		assert.strictEqual(
			html.includes('data-testid="cabinet-handover-bar"'),
			false,
			"Must NOT render cabinet-handover-bar",
		);
		assert.strictEqual(
			html.includes("Передача кабинета"),
			false,
			"Must NOT contain cabinet handover title",
		);
		assert.strictEqual(
			html.includes("Сдать кабинет"),
			false,
			"Must NOT contain cabinet handover button",
		);
		assert.strictEqual(
			html.includes('data-testid="btn-cabinet-handover-instant"'),
			false,
			"Must NOT contain instant handover button",
		);
		assert.strictEqual(
			html.includes('data-testid="btn-open-cabinet-handover-modal"'),
			false,
			"Must NOT contain handover modal trigger button",
		);

		// Proves ZERO domestic chore checkboxes exist
		assert.strictEqual(
			html.includes("плевательниц"),
			false,
			"Must NOT contain spittoon cleaning checkbox",
		);
		assert.strictEqual(
			html.includes("слюноотсос"),
			false,
			"Must NOT contain saliva ejector flushing checkbox",
		);
		assert.strictEqual(
			html.includes("дистиллят"),
			false,
			"Must NOT contain distilled water refill checkbox",
		);
		assert.strictEqual(
			html.includes("желтый пакет"),
			false,
			"Must NOT contain yellow trash bag checkbox",
		);
		assert.strictEqual(
			html.includes("подлокотников"),
			false,
			"Must NOT contain armrest disinfection checkbox",
		);
	});

	it("2. CabinetHandoverModal is completely purged from components/shift public exports", () => {
		// Verify CabinetHandoverModal is not exported by components/shift
		assert.strictEqual(
			"CabinetHandoverModal" in ShiftComponents,
			false,
			"CabinetHandoverModal must NOT be exported by components/shift",
		);
	});

	it("3. Mobile Shift Cockpit renders Cash Ops, Consumables, and Close Shift with ZERO handover sheet", () => {
		const html = renderToString(
			<ShiftActionsToolbar
				isShiftOpen={true}
				onToggleShift={() => {}}
				isCashInSheetOpen={false}
				setIsCashInSheetOpen={() => {}}
				isCashOutSheetOpen={false}
				setIsCashOutSheetOpen={() => {}}
				isConsumablesSheetOpen={false}
				setIsConsumablesSheetOpen={() => {}}
				cashInAmount={0}
				setCashInAmount={() => {}}
				cashInReason=""
				setCashInReason={() => {}}
				isSubmittingCashIn={false}
				cashOutMode="full"
				setCashOutMode={() => {}}
				isSubmittingCashOut={false}
				handleConfirmCashIn={() => {}}
				handleConfirmCashOutAndZReport={() => {}}
				consumables={[]}
			/>,
		);

		// Proves presence of Cash Operations, Consumables, and Close Shift buttons
		assert.ok(
			html.includes("Касса (внесение/выплата)"),
			"Must render Cash Operations button",
		);
		assert.ok(
			html.includes("Расходники"),
			"Must render Consumables button",
		);
		assert.ok(
			html.includes("Закрыть смену"),
			"Must render Close Shift primary button",
		);

		// Proves ZERO handover sheet or carsharing shift transfer texts
		assert.strictEqual(
			html.includes("sheet-shift-handover"),
			false,
			"Must NOT render sheet-shift-handover",
		);
		assert.strictEqual(
			html.includes("Передать смену следующему"),
			false,
			"Must NOT contain handover next doctor prompt",
		);
		assert.strictEqual(
			html.includes("Сдать смену и кассу"),
			false,
			"Must NOT contain 'Сдать смену и кассу'",
		);
	});
});
