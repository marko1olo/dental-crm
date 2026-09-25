/**
 * apps/web/src/tests/cashboxView.test.tsx
 *
 * Integration and Autonomy Tests for CashboxView (54-FZ & Patient Debt).
 * Tested via SSR renderToString (Zero memory leak, Anti-Kustarnyi-DOM law).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { CashboxView } from "../components/cashbox/CashboxView.js";
import {
	rubToKopecks,
	kopecksToRub,
	multiplyKopecks,
	sumKopecks,
} from "@dental/shared";

describe("CashboxView (54-FZ & Patient Debt Autonomy)", () => {
	it("renders cashbox workspace with shift management, 54-FZ badge and amount input", () => {
		const html = renderToString(
			<CashboxView
				initialShiftOpen={true}
				cashierName="Д-р Смирнов А.В."
				clinicName="Клиника ДЕНТЕ"
			/>,
		);

		assert.ok(html.includes("54-ФЗ: без барьеров"), "Must display 54-FZ barrier-free badge");
		assert.ok(html.includes("Скидки врача:"), "Must display doctor discount toolbar");
		assert.ok(html.includes("100% Гарантия"), "Must display 100% warranty button");
		assert.ok(html.includes("100% Персонал"), "Must display 100% staff colleague button");
		assert.ok(html.includes("Физическое лицо (без ИНН)"), "Must display physical person button");
		assert.ok(html.includes("Юрлицо (ИНН 10 цифр)"), "Must display legal entity button");
		assert.ok(html.includes("Сумма к расчету (брутто):"), "Must render gross amount input label");
		assert.ok(html.includes((1000).toLocaleString("ru-RU")), "Must render quick amount preset button");
		assert.ok(html.includes((5000).toLocaleString("ru-RU")), "Must render quick amount preset button");
	});

	it("renders 1-click checkout tender buttons when initialAmountRub > 0", () => {
		const html = renderToString(
			<CashboxView
				initialShiftOpen={true}
				initialAmountRub={12500}
				cashierName="Кассир Клиники"
				clinicName="Стоматология"
			/>,
		);

		assert.ok(html.includes((12500).toLocaleString("ru-RU")), "Must display calculated net sum");
		assert.ok(html.includes("Всё картой"), "Must render 1-click card tender");
		assert.ok(html.includes("Всё наличными"), "Must render 1-click cash tender");
		assert.ok(html.includes("Всё по СБП"), "Must render 1-click SBP tender");
		assert.ok(html.includes("Сплит / Терминал..."), "Must render split tender modal button");
	});

	it("renders 0 ₽ fiscalization action button when initialAmountRub is 0", () => {
		const html = renderToString(
			<CashboxView
				initialShiftOpen={true}
				initialAmountRub={0}
			/>,
		);

		assert.ok(html.includes("0"), "Must display 0 total");
		assert.ok(
			html.includes("Оформить чек 0 ₽ (54-ФЗ)"),
			"Must render button to execute 0 ₽ receipt to backend",
		);
	});

	it("kopeck precision: guarantees exact integer arithmetic without float drift", () => {
		const price1Kop = rubToKopecks(1500.5);
		const price2Kop = rubToKopecks(1990.99);
		const totalKop = sumKopecks([price1Kop, price2Kop]);
		const totalRub = kopecksToRub(totalKop);

		assert.equal(totalKop, 349149);
		assert.equal(totalRub, 3491.49);

		const multipliedKop = multiplyKopecks(rubToKopecks(1500.1), 3);
		assert.equal(multipliedKop, 450030);
		assert.equal(kopecksToRub(multipliedKop), 4500.3);
	});
});
