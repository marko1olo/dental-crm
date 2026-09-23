import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ChairsidePreFlightChecklist,
	type ChairsidePreFlightResult,
} from "../ChairsidePreFlightChecklist";

describe("ChairsidePreFlightChecklist (SanPiN 3.3686-21 & Touch-First Glove Ergonomics)", () => {
	it("renders 30-sec pre-flight modal with 6 preparation items, SanPiN norms, and chair number", () => {
		const html = renderToString(
			<ChairsidePreFlightChecklist
				isOpen={true}
				onClose={() => {}}
				chairNumber={2}
				cabinetName="Кабинет №2"
				doctorName="Др. Ковалев А. В."
				assistantName="Асс. Соколова Н. П."
			/>
		);

		// Modal presence & Chair title
		assert.ok(html.includes("Подготовка кресла №2 к приёму"), "Must display chair header");
		assert.ok(html.includes("30-сек Pre-Flight"), "Must contain 30-sec preflight badge");
		assert.ok(html.includes("Др. Ковалев А. В."), "Must display doctor name");
		assert.ok(html.includes("Асс. Соколова Н. П."), "Must display assistant name");

		// 6 mandatory preparation items per SanPiN 3.3686-21
		assert.ok(
			html.includes("Промывка и дезинфекция аспирационной системы"),
			"Must include aspirator flush item"
		);
		assert.ok(
			html.includes("Замена и смазка турбинного / микромоторного наконечника"),
			"Must include handpiece replacement item"
		);
		assert.ok(
			html.includes("Стерильный инструментальный лоток СанПиН 3.3686-21"),
			"Must include sterile instrument tray item"
		);
		assert.ok(
			html.includes("Дезинфекция контактных поверхностей и плевательницы"),
			"Must include surface disinfection item"
		);
		assert.ok(
			html.includes("Установка одноразовой барьерной защиты"),
			"Must include barrier protection item"
		);
		assert.ok(
			html.includes("Сброс и деконтаминация гидролиний установки"),
			"Must include waterline flush item"
		);

		// SanPiN statutory references
		assert.ok(html.includes("СанПиН 3.3686-21"), "Must display SanPiN regulatory standards");

		// Touch-First Controls & Action Buttons
		assert.ok(html.includes("preflight-disinfection-timer-btn"), "Must contain disinfection timer trigger");
		assert.ok(html.includes("preflight-save-btn"), "Must contain shift journal save button");
		assert.ok(html.includes("Зафиксировать готовность кресла №2 к приёму"), "Must render save button text with chair number");

		// Zero DataMatrix scanner bloat (Mandate 8v, 8k)
		assert.ok(!html.includes("preflight-kraft-input"), "Must NOT contain Kraft package barcode input (Mandate 8v, 8k)");
		assert.ok(!html.includes("preflight-kraft-box"), "Must NOT contain Kraft scanner container (Mandate 8v, 8k)");
		assert.ok(!html.includes("KP-YYYY-MMDD-AUTX-XXX"), "Must NOT contain Kraft scanner placeholder");
		assert.ok(!html.includes("DataMatrix"), "Must NOT force 2D DataMatrix scanning");
	});

	it("verifies 1-click standard tray preparation and zero DataMatrix scanning bloat (Mandate 8v, 8k)", () => {
		const html = renderToString(
			<ChairsidePreFlightChecklist
				isOpen={true}
				onClose={() => {}}
				chairNumber={1}
			/>
		);

		assert.ok(html.includes("Стерильный инструментальный лоток СанПиН 3.3686-21"));
		assert.ok(html.includes("preflight-complete-all-btn"), "Must contain 1-click complete all items button");
		assert.ok(!html.includes("preflight-kraft-input"), "Zero DataMatrix barcode inputs allowed");
	});

	it("returns null when isOpen is false", () => {
		const html = renderToString(
			<ChairsidePreFlightChecklist
				isOpen={false}
				onClose={() => {}}
			/>
		);

		assert.equal(html, "", "Should render empty when isOpen is false");
	});
});
