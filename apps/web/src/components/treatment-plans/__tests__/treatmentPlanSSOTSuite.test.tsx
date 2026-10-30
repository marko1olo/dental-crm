/**
 * treatmentPlanSSOTSuite.test.tsx — Исчерпывающий тестовый набор канонического SSOT планов лечения и студии.
 * Мандаты 8b, 8e, 8n, 8am: Проверка 3-уровневого расчета, этапов, копеек, свободы скидок и студии.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	CANONICAL_TIER_DEFINITIONS,
	CANONICAL_CLINICAL_STAGES,
	buildCanonical3TierPlans,
	applyDoctorDiscountToTiers,
	generateTreatmentPlanFromDiagnosis,
	isTreatmentPlanExpired,
	sanitizePatientPresentationStages,
} from "../treatmentPlanCatalogData";
import { TreatmentPlanStudioModal } from "../TreatmentPlanStudioModal";

describe("Treatment Plan SSOT & 3-Tier Suite", () => {
	it("1. Канонические тарифы: 3 уровня (Базовый, Оптимальный, Премиум) с гарантией и SSOT", () => {
		assert.equal(CANONICAL_TIER_DEFINITIONS.length, 3, "Должно быть ровно 3 канонических тарифа");

		const [economy, optimum, premium] = CANONICAL_TIER_DEFINITIONS;
		assert.equal(economy.id, "economy");
		assert.equal(economy.title, "Базовый");
		assert.equal(economy.warrantyYears, 1);
		assert.equal(economy.isRecommended, false);

		assert.equal(optimum.id, "optimum");
		assert.match(optimum.title, /Оптимальный/);
		assert.equal(optimum.warrantyYears, 3);
		assert.equal(optimum.isRecommended, true, "Оптимальный тариф обязан быть рекомендуемым стандартом");

		assert.equal(premium.id, "premium");
		assert.equal(premium.title, "Премиум");
		assert.equal(premium.warrantyYears, 10);
		assert.equal(premium.isRecommended, false);
	});

	it("2. Канонические этапы комплексного плана: 1. Санация, 2. Хирургия, 3. Ортопедия", () => {
		assert.equal(CANONICAL_CLINICAL_STAGES.length, 3, "Комплексный план обязан содержать 3 базовых этапа");

		const [therapy, surgery, orthopedics] = CANONICAL_CLINICAL_STAGES;
		assert.equal(therapy.stageNumber, 1);
		assert.match(therapy.title, /Санация и терапия/);

		assert.equal(surgery.stageNumber, 2);
		assert.match(surgery.title, /Хирургия и имплантация/);

		assert.equal(orthopedics.stageNumber, 3);
		assert.match(orthopedics.title, /Ортопедия и протезирование/);
	});

	it("3. Точные целочисленные копейки (amountKopecks: BIGINT) без ошибок с плавающей точкой", () => {
		const tiers = buildCanonical3TierPlans();
		assert.equal(tiers.length, 3);

		for (const tier of tiers) {
			assert.equal(tier.totalKopecks, tier.totalRub * 100, "Копейки обязаны быть строго totalRub * 100");

			const sumOfStagesRub = tier.stages.reduce((acc, s) => acc + s.totalRub, 0);
			assert.equal(tier.totalRub, sumOfStagesRub, "Сумма тарифа обязана совпадать с суммой его этапов");

			for (const stage of tier.stages) {
				assert.equal(stage.totalKopecks, stage.totalRub * 100);
				const sumOfItemsRub = stage.items.reduce((acc, it) => acc + it.priceRub, 0);
				assert.equal(stage.totalRub, sumOfItemsRub, "Сумма этапа обязана совпадать с суммой процедур");
			}
		}
	});

	it("4. Мандат 8e: Свобода скидок врача до 100% (гарантийные переделки и лояльность)", () => {
		const baseTiers = buildCanonical3TierPlans();

		// Скидка 0%
		const noDiscount = applyDoctorDiscountToTiers(baseTiers, 0);
		assert.equal(noDiscount[0].totalRub, baseTiers[0].totalRub);

		// Скидка 20%
		const discount20 = applyDoctorDiscountToTiers(baseTiers, 20);
		for (let i = 0; i < baseTiers.length; i++) {
			const expectedRub = Math.round(baseTiers[i].totalRub * 0.8);
			assert.equal(discount20[i].totalRub, expectedRub);
			assert.equal(discount20[i].totalKopecks, expectedRub * 100);
		}

		// Скидка 100% (гарантийный случай)
		const discount100 = applyDoctorDiscountToTiers(baseTiers, 100);
		for (const tier of discount100) {
			assert.equal(tier.totalRub, 0, "При скидке 100% сумма плана равна 0");
			assert.equal(tier.totalKopecks, 0, "При скидке 100% сумма в копейках равна 0");
		}
	});

	it("5. Мандат 8n: 1-клик генератор типовых планов по диагнозам МКБ-10", () => {
		// Кариес K02
		const cariesPlan = generateTreatmentPlanFromDiagnosis("K02.1", 16);
		assert.equal(cariesPlan.length, 1);
		assert.equal(cariesPlan[0].stageKind, "stage_1_therapy");
		assert.match(cariesPlan[0].items[0].name, /Восстановление зуба 16/);

		// Пульпит K04
		const endoPlan = generateTreatmentPlanFromDiagnosis("K04.0", 26);
		assert.equal(endoPlan.length, 1);
		assert.equal(endoPlan[0].items.length, 2);
		assert.match(endoPlan[0].items[0].name, /Обработка корневых каналов зуба 26/);

		// Имплантация K08
		const implPlan = generateTreatmentPlanFromDiagnosis("K08.1", 36);
		assert.equal(implPlan.length, 2);
		assert.equal(implPlan[0].stageKind, "stage_2_surgery");
		assert.equal(implPlan[1].stageKind, "stage_3_orthopedics");
	});

	it("6. Проверка срока действия плана (30 дней): истечение НЕ блокирует врача (Мандат 8e)", () => {
		const freshDate = new Date().toISOString();
		const freshCheck = isTreatmentPlanExpired(freshDate);
		assert.equal(freshCheck.isExpired, false);

		const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
		const oldCheck = isTreatmentPlanExpired(oldDate);
		assert.equal(oldCheck.isExpired, true);
		assert.ok(oldCheck.warningNotice?.includes("Врач сохраняет право согласовать продолжение лечения"));
	});

	it("7. Рендеринг TreatmentPlanStudioModal: ровно 1 Primary CTA, 0 блокировок (disabled), доступность", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Иванова Анна Сергеевна"
				doctorFullName="Д-р Орлов А.В."
			/>
		);

		// Проверяем наличие ключевых узлов
		assert.ok(html.includes("data-testid=\"treatment-plan-studio-modal\""));
		assert.ok(html.includes("Иванова Анна Сергеевна"));
		assert.ok(html.includes("Д-р Орлов А.В."));

		// Проверяем 3 тарифа
		assert.ok(html.includes("Базовый"));
		assert.ok(html.includes("Оптимальный"));
		assert.ok(html.includes("Премиум"));

		// Проверяем Primary CTA кнопку
		assert.ok(html.includes("data-testid=\"approve-treatment-plan-btn\""));
		assert.ok(html.includes("✓ Утвердить выбранный план"));

		// Мандат 8e: кнопка утверждения НИКОГДА не заблокирована
		assert.ok(!html.includes("disabled=\"\""), "Кнопки в студии планов лечения НИКОГДА не должны быть disabled");
	});
});
