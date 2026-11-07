/**
 * treatmentPlanStudioWarrantyPhotoDepth.test.tsx — Red Team тест режимов глубины (Экспресс/Эксперт),
 * гарантийного паспорта и клинического фотопротокола До/После в канонической студии планов лечения.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanStudioModal } from "../TreatmentPlanStudioModal";
import { StudioWarrantyPassportTab } from "../studioTabs/StudioWarrantyPassportTab";
import { StudioPhotoProtocolTab } from "../studioTabs/StudioPhotoProtocolTab";
import { buildCanonical3TierPlans } from "../treatmentPlanCatalogData";

describe("TreatmentPlanStudioModal — Depth Modes, Warranty Passport & Photo Protocol", () => {
	const tiers = buildCanonical3TierPlans();
	const economyTier = tiers.find((t) => t.tierId === "economy")!;
	const optimumTier = tiers.find((t) => t.tierId === "optimum")!;
	const premiumTier = tiers.find((t) => t.tierId === "premium")!;

	it("1. Переключатель глубины Экспресс vs Эксперт в шапке студии", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				initialDepthMode="express"
			/>
		);

		assert.ok(html.includes("data-testid=\"depth-mode-express-btn\""), "Кнопка Экспресс режима");
		assert.ok(html.includes("data-testid=\"depth-mode-expert-btn\""), "Кнопка Эксперт режима");
		assert.ok(html.includes("tp-depth-switch"), "Контейнер Apple Segmented Switcher");
	});

	it("2. В режиме Экспресс вкладки гарантии и фото скрыты для 1-экранной чистоты", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				initialDepthMode="express"
			/>
		);

		assert.ok(!html.includes("data-testid=\"tab-warranty-passport\""), "Гарантийный паспорт скрыт в Экспрессе");
		assert.ok(!html.includes("data-testid=\"tab-photo-protocol\""), "Фотопротокол скрыт в Экспрессе");
	});

	it("3. В режиме Эксперт доступны вкладки «Гарантийный паспорт» и «Фотопротокол До/После»", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				initialDepthMode="expert"
			/>
		);

		assert.ok(html.includes("data-testid=\"tab-warranty-passport\""), "Таб гарантийного паспорта доступен");
		assert.ok(html.includes("data-testid=\"tab-photo-protocol\""), "Таб фотопротокола доступен");
		assert.ok(html.includes("Гарантийный паспорт"));
		assert.ok(html.includes("Фотопротокол До/После"));
	});

	it("4. StudioWarrantyPassportTab: проверка дифференцированных гарантий для тарифов", () => {
		// Эконом
		const htmlEco = renderToString(
			<StudioWarrantyPassportTab
				activeTier={economyTier}
				patientName="Иванова А.С."
				doctorFullName="Д-р Орлов А.В."
			/>
		);
		assert.ok(htmlEco.includes("1 год"), "Эконом: 1 год клинической гарантии");
		assert.ok(htmlEco.includes("5 лет"), "Эконом: 5 лет службы");
		assert.ok(htmlEco.includes("data-testid=\"studio-warranty-passport-tab\""));

		// Оптимум
		const htmlOpt = renderToString(
			<StudioWarrantyPassportTab
				activeTier={optimumTier}
				patientName="Иванова А.С."
				doctorFullName="Д-р Орлов А.В."
			/>
		);
		assert.ok(htmlOpt.includes("3 года"), "Оптимум: 3 года клинической гарантии");
		assert.ok(htmlOpt.includes("10 лет"), "Оптимум: 10 лет службы");
		assert.ok(htmlOpt.includes("Ivoclar Vivadent e.max CAD"), "Сертификат e.max");

		// Премиум
		const htmlPrem = renderToString(
			<StudioWarrantyPassportTab
				activeTier={premiumTier}
				patientName="Иванова А.С."
				doctorFullName="Д-р Орлов А.В."
			/>
		);
		assert.ok(htmlPrem.includes("10 лет"), "Премиум: 10 лет клинической гарантии");
		assert.ok(htmlPrem.includes("25 лет"), "Премиум: 25 лет службы");
		assert.ok(htmlPrem.includes("Straumann Roxolid SLActive"), "Сертификат Straumann");
		assert.ok(htmlPrem.includes("Пожизненная"), "Пожизненная гарантия завода");
	});

	it("5. StudioWarrantyPassportTab: наличие кнопки печати паспорта без disabled", () => {
		const html = renderToString(
			<StudioWarrantyPassportTab
				activeTier={optimumTier}
				patientName="Иванова А.С."
				doctorFullName="Д-р Орлов А.В."
			/>
		);

		assert.ok(html.includes("data-testid=\"print-warranty-passport-btn\""));
		assert.ok(!html.includes("disabled=\"\""), "Кнопка печати гарантийного паспорта НИКОГДА не disabled");
	});

	it("6. StudioPhotoProtocolTab: наличие сплит-демонстрации До/После и перечня контрольных снимков", () => {
		const html = renderToString(
			<StudioPhotoProtocolTab activeTier={optimumTier} />
		);

		assert.ok(html.includes("data-testid=\"studio-photo-protocol-tab\""));
		assert.ok(html.includes("BeforeAfterSplitSlider") || html.includes("before-after-split-slider") || html.includes("До лечения"));
		assert.ok(html.includes("Интраоральный фотопротокол"));
		assert.ok(html.includes("Портретный фотопротокол"));
		assert.ok(html.includes("Окклюзионный фотопротокол"));
	});

	it("7. Студия планов лечения: все кнопки действий никогда не disabled (Мандат 8e)", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				initialDepthMode="expert"
			/>
		);

		assert.ok(!html.includes("disabled=\"\""), "В студии планов лечения кнопки НИКОГДА не блокируются");
	});
});
