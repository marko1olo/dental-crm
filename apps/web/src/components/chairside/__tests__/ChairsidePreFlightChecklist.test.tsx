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
			html.includes("Вскрытие крафт-пакета и валидация индикатора стерильности"),
			"Must include Kraft package item"
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
		assert.ok(html.includes("Форма № 257/у"), "Must reference Form 257/u for autoclave/kraft");

		// Touch-First Controls & Action Buttons
		assert.ok(html.includes("preflight-disinfection-timer-btn"), "Must contain disinfection timer trigger");
		assert.ok(html.includes("preflight-kraft-input"), "Must contain Kraft package barcode input");
		assert.ok(html.includes("preflight-save-btn"), "Must contain shift journal save button");
		assert.ok(html.includes("Зафиксировать готовность кресла №2 к приёму"), "Must render save button text with chair number");
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
