import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DentalLabOrderDrawer } from "../DentalLabOrderDrawer";
import { DentalLabFinancialGate } from "../DentalLabFinancialGate";
import { checkDentalLabFinancialGate } from "../dentalLabFinancialGateEngine";
import { VisitProtocolView } from "../../patients/VisitProtocolView";
import { parseFdiTeethString, calculateZtlWageFinancials } from "../dentalLabOrderEngine";

describe("RED TEAM INQUISITOR — Dental Lab & ZTL Orders Consolidation & Mandate 8e/8n/8x Audit", () => {
	it("1. Mandate 8e: DentalLabFinancialGate никогда не блокирует наряд (soft warning only, canSendInOneClick = true)", () => {
		const gateResult = checkDentalLabFinancialGate({
			labOrderPriceKopecks: 2400000,
			paidKopecks: 0,
			minAdvancePercent: 50,
		});

		assert.equal(gateResult.canSendInOneClick, true, "Врач обязан иметь возможность отправить наряд в 1 клик");
		assert.equal(gateResult.isSoftWarning, true, "Финансовое предупреждение строго soft (не блокирует прием)");

		const bannerHtml = renderToString(
			<DentalLabFinancialGate gateResult={gateResult} variant="banner" />,
		);
		assert.ok(
			bannerHtml.includes("data-testid=\"lab-gate-banner-blocked\"") ||
			bannerHtml.includes("data-testid=\"lab-gate-banner-cleared\""),
			"Баннер финансового контроля рендерится как информационный индикатор",
		);
		// Verify no disabled buttons are generated for the gate
		assert.equal(bannerHtml.includes("disabled"), false, "Баннер никогда не должен блокировать элементы");
	});

	it("2. Mandate 8e & 8n: DentalLabOrderDrawer служит единым каноническим SSOT и содержит все ключевые секции", () => {
		const html = renderToString(
			<DentalLabOrderDrawer
				isOpen={true}
				onClose={() => {}}
				currentPatientId="pat-test-101"
				currentPatientName="Иванов Сергей Павлович"
				currentDoctorName="Д-р Орлов А.В. (Ортопед)"
				currentToothNumber="16"
			/>,
		);

		assert.ok(html.includes("dental-lab-order-drawer"), "Шторка рендерится с каноническим data-testid");
		assert.ok(html.includes("Шкала расцветки VITA"), "Содержит шкалу VITA");
		assert.ok(html.includes("Зубы FDI"), "Содержит выбор зубов FDI");
		assert.ok(html.includes("3D-скан челюсти (STL / PLY / OBJ)"), "Содержит загрузку 3D-сканов");
		assert.ok(html.includes("Финансовый расчет наряда ЗТЛ"), "Содержит финансовый блок");
		assert.ok(html.includes("Оформить наряд-заказ"), "Содержит основную кнопку отправки");
	});

	it("3. VisitProtocolView бесшовно связан с нарядом ЗТЛ у кресла врача", () => {
		const html = renderToString(
			<VisitProtocolView
				isOpen={true}
				patientId="pat-protocol-42"
				patientName="Смирнова Елена"
				doctorName="Д-р Воронова"
				initialTooth={26}
			/>,
		);

		assert.ok(
			html.includes("btn-visit-lab-order"),
			"VisitProtocolView содержит кнопку быстрого перехода в наряд ЗТЛ у кресла врача",
		);
		assert.ok(
			html.includes("Наряд ЗТЛ"),
			"Кнопка наряда имеет понятный врачебный лейбл без канцелярита",
		);
	});

	it("4. Mandate 8n: Расчет ЗП врача с вычетом себестоимости ЗТЛ из вала без копеечных перекосов", () => {
		const fin = calculateZtlWageFinancials({
			unitsCount: 2,
			patientPriceRub: 25000,
			ztlCostRub: 7000,
			doctorSharePercent: 20,
		});

		// 2 * (25000 - 7000) = 36000 base
		assert.equal(fin.doctorWageBaseRub, 36000, "База для начисления комиссии врача");
		// 36000 * 20% = 7200
		assert.equal(fin.doctorWageRub, 7200, "ЗП врача за вычетом ЗТЛ");
		assert.equal(fin.isBalanced, true, "Баланс копеек соблюден");
	});

	it("5. Защита от дублей и парсинг зубов FDI", () => {
		const teethSingle = parseFdiTeethString("16");
		assert.deepEqual(teethSingle, [16]);

		const teethMultiple = parseFdiTeethString("11, 21, 22");
		assert.deepEqual(teethMultiple, [11, 21, 22]);

		const teethQuadrant = parseFdiTeethString("1.6");
		assert.deepEqual(teethQuadrant, [16]);
	});
});
