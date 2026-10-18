import "../../../../testCssStub.mjs";
import React from "react";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { CabinetHandoverModal } from "../CabinetHandoverModal";
import { ShiftViewChairStatusCard } from "../../../shiftViewModules/ShiftViewChairStatusCard";

describe("CabinetHandoverAutonomy — Mandates 8e & 8n (Zero Domestic Chore Simulator)", () => {
	it("1. CabinetHandoverModal contains ZERO domestic chore checkboxes (no spittoon, yellow bag, saliva ejector)", () => {
		const html = renderToString(
			<CabinetHandoverModal
				isOpen={true}
				onClose={() => {}}
				cabinetName="Кабинет №1"
				doctorFullName="Д-р Иванов И.И."
				nextDoctorName="Д-р Петрова А.С."
			/>,
		);

		// Proves that simulated domestic chores are purged
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

		// Proves automated compliance and 1-click handover CTA
		assert.ok(
			html.includes("Автоматическое санитарное актирование"),
			"Must explain automated SanPiN compliance",
		);
		assert.ok(
			html.includes("Д-р Петрова А.С."),
			"Must render next doctor name",
		);
		assert.ok(
			html.includes('data-testid="btn-confirm-cabinet-handover"'),
			"Must provide 1-click confirm CTA button",
		);
	});

	it("2. CabinetHandoverModal returns null when closed", () => {
		const html = renderToString(
			<CabinetHandoverModal
				isOpen={false}
				onClose={() => {}}
			/>,
		);

		assert.strictEqual(html, "", "Modal must return empty string when closed");
	});

	it("3. ShiftViewChairStatusCard renders sleek 1-click handover bar without household checkboxes", () => {
		const html = renderToString(
			<ShiftViewChairStatusCard
				doctorFullName="Д-р Смирнов К.В."
				nextDoctorName="Д-р Кузнецова М.А."
				cabinetName="Кабинет №2"
				inChairAppointment={null}
			/>,
		);

		// Verifies presence of 1-click handover bar
		assert.ok(
			html.includes('data-testid="cabinet-handover-bar"'),
			"Must render cabinet-handover-bar",
		);
		assert.ok(
			html.includes('data-testid="btn-cabinet-handover-instant"'),
			"Must provide 1-click instant handover button",
		);
		assert.ok(
			html.includes("Сдать кабинет в 1 клик"),
			"Must have 1-click handover label",
		);

		// Verifies 0 household checkboxes in ShiftViewChairStatusCard
		assert.strictEqual(
			html.includes("плевательниц"),
			false,
			"Must not have spittoon cleaning",
		);
		assert.strictEqual(
			html.includes("подлокотников"),
			false,
			"Must not have armrest wipe",
		);
		assert.strictEqual(
			html.includes("дистиллят"),
			false,
			"Must not have distilled water",
		);
		assert.strictEqual(
			html.includes("желтый пакет"),
			false,
			"Must not have yellow bag",
		);
	});
});
