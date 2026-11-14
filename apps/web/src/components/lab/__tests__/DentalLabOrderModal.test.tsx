import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	DentalLabStudioModal,
	DentalLabOrderModal,
} from "../index";

describe("DentalLabOrderModal & DentalLabStudioModal — Production Render & Sanity Check", () => {
	it("Core construction types and materials are initialized", () => {
		assert.ok(CONSTRUCTION_TYPES.length >= 8);
		assert.ok(LAB_MATERIALS.length >= 6);
	});

	it("рендерит закрытое состояние как пустую строку", () => {
		const html = renderToString(
			<DentalLabStudioModal isOpen={false} onClose={() => {}} />
		);
		assert.equal(html, "");
	});

	it("рендерит открытую студию со всеми тремя вкладками наряда, реестра и бланка", () => {
		const html = renderToString(
			<DentalLabStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Иванов И.И."
				doctorName="Д-р Петров П.П."
				initialTab="new_order"
			/>
		);
		assert.ok(html.includes("Зуботехническая лаборатория") || html.includes("ЗТЛ"));
		assert.ok(html.includes("Заказ-наряд") || html.includes("Новый заказ-наряд"));
		assert.ok(html.includes("Реестр"));
		assert.ok(html.includes("Бланк") || html.includes("Печатный бланк"));
	});

	it("DentalLabOrderModal является каноническим экспортом-алиасом студии", () => {
		const html = renderToString(
			<DentalLabOrderModal
				isOpen={true}
				onClose={() => {}}
				initialTab="print"
			/>
		);
		assert.ok(html.length > 0);
		assert.ok(html.includes("Бланк") || html.includes("Печать"));
	});
});
