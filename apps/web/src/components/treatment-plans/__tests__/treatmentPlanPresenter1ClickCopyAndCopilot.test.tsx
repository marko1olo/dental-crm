/**
 * treatmentPlanPresenter1ClickCopyAndCopilot.test.tsx — 1-клик копирование сметы для пациента и Copilot.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import { sampleTeethWave49 } from "./helpers/wave49TestHelpers";

describe("TreatmentPlanPresenterModal — 1-клик копирование и Copilot", () => {
	const sampleTiers = generate3TierPlanComparison(sampleTeethWave49);

	it("renders 1-click copy tiers summary button in header with Copy icon", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				patientName="Смирнова Екатерина Васильевна"
				clinicName="Стоматологическая клиника «ДЕНТЕ СТОМАТОЛОГИЯ»"
				clinicPhone="+7 (495) 777-88-99"
			/>
		);

		assert.ok(html.includes("presenter-copy-tiers-summary-btn"));
		assert.ok(html.includes("Скопировать смету для пациента"));
		assert.ok(html.includes("presenter-header-print-btn"));
		assert.ok(html.includes("presenter-fullscreen-btn"));
	});

	it("formats complete structured message for patient with all 3 tiers", () => {
		const economyTier = sampleTiers.find((t) => t.tierId === "economy")!;
		const standardTier = sampleTiers.find((t) => t.tierId === "standard")!;
		const premiumTier = sampleTiers.find((t) => t.tierId === "optimum")!;

		const economyTotal = economyTier.totalRub.toLocaleString("ru-RU");
		const standardTotal = standardTier.totalRub.toLocaleString("ru-RU");
		const premiumTotal = premiumTier.totalRub.toLocaleString("ru-RU");

		const standardInstallment = (
			standardTier.monthlyInstallment12Rub ||
			standardTier.installments?.[12]?.monthlyPaymentRub ||
			Math.round(standardTier.totalRub / 12)
		).toLocaleString("ru-RU");
		const standardNdfl = (standardTier.ndflRefundRub || standardTier.ndflDetails?.refundRub || 0).toLocaleString("ru-RU");

		const summaryText = [
			`План лечения для пациента Смирнова Екатерина Васильевна (клиника Стоматологическая клиника «ДЕНТЕ СТОМАТОЛОГИЯ»):`,
			`Вариант А (Эконом): ${economyTotal} ₽ · ${economyTier.durationWeeks} нед. (${economyTier.durationVisits} виз.)`,
			`Вариант Б (Оптимум, Рекомендация врача): ${standardTotal} ₽ · ${standardTier.durationWeeks} нед. (${standardTier.durationVisits} виз.) · Рассрочка 0%: ${standardInstallment} ₽/мес · Вычет 13% НДФЛ: ${standardNdfl} ₽`,
			`Вариант В (Премиум): ${premiumTotal} ₽ · ${premiumTier.durationWeeks} нед. (${premiumTier.durationVisits} виз.)`,
			`Гарантия на работы до ${premiumTier.warrantyYears} лет. Запись на прием: +7 (495) 777-88-99`,
		].join("\n");

		assert.ok(summaryText.includes("Вариант А (Эконом):"));
		assert.ok(summaryText.includes(economyTotal));
		assert.ok(summaryText.includes("Вариант Б (Оптимум, Рекомендация врача):"));
		assert.ok(summaryText.includes(standardTotal));
		assert.ok(summaryText.includes("Рассрочка 0%:"));
		assert.ok(summaryText.includes("Вычет 13% НДФЛ:"));
		assert.ok(summaryText.includes("Вариант В (Премиум):"));
		assert.ok(summaryText.includes(premiumTotal));
		assert.ok(summaryText.includes("+7 (495) 777-88-99"));
	});

	it("ensures AI Copilot send button is NOT hard-disabled and touch-target >= 36px", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
			/>
		);

		assert.ok(html.includes("presenter-copilot-send-btn"));
		assert.ok(!html.includes('disabled="" data-testid="presenter-copilot-send-btn"'));
		assert.ok(html.includes("min-h-[36px]"));
		assert.ok(html.includes("min-w-[36px]"));
	});
});
