import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ZtlOcclusionDrawer } from "../selectors/ZtlOcclusionDrawer.js";
import {
	partitionBridgeTeethFdi,
	calculateBridgeRestorationCostKopecks,
} from "@dental/shared";

describe("Domain 25 Red Team Fixer Surgeon: Web Orthopedics & Occlusion CAD/CAM", () => {
	it("1. Рендеринг расширенного ZtlOcclusionDrawer со схемой ведения и суставными углами", () => {
		const html = renderToString(
			<ZtlOcclusionDrawer
				activeArticulator="kavo_protar"
				onSelectArticulator={() => {}}
				activeFacebow={true}
				onToggleFacebow={() => {}}
				guidanceType="canine_guidance"
				sagittalCondylarAngleDeg={35}
				bennettAngleDeg={15}
			/>,
		);

		// Проверка секции окклюзии
		assert.ok(html.includes('data-testid="occlusion-section"'));

		// Проверка чипсов артикулятора
		assert.ok(html.includes('data-testid="articulator-chip-bio_art"'));
		assert.ok(html.includes('data-testid="articulator-chip-kavo_protar"'));
		assert.ok(html.includes('data-testid="articulator-chip-average_anatomical"'));

		// Проверка лицевой дуги
		assert.ok(html.includes('data-testid="facebow-checkbox"'));

		// Проверка 4 схем окклюзионного ведения (Мандат 8aq)
		assert.ok(html.includes('data-testid="guidance-chip-canine_guidance"'));
		assert.ok(html.includes('data-testid="guidance-chip-group_function"'));
		assert.ok(html.includes('data-testid="guidance-chip-mutually_protected"'));
		assert.ok(html.includes('data-testid="guidance-chip-balanced_articulation"'));

		// Проверка углов артикулятора
		assert.ok(html.includes('data-testid="sagittal-angle-input"'));
		assert.ok(html.includes('data-testid="bennett-angle-input"'));
		assert.ok(html.includes('value="35"'), "Угол сагиттального пути должен быть равен 35");
		assert.ok(html.includes('value="15"'), "Угол Беннетта должен быть равен 15");
	});

	it("2. Дифференциация опор и понтиков в каноническом расчете мостовидного протеза ЗТЛ", () => {
		const teeth = [14, 15, 16];
		const { abutmentTeethFdi, ponticTeethFdi } = partitionBridgeTeethFdi(teeth);

		// Проверяем разбиение зубов
		assert.deepEqual(abutmentTeethFdi, [14, 16], "14 и 16 зубы должны стать опорами моста");
		assert.deepEqual(ponticTeethFdi, [15], "15 зуб должен стать промежуточной частью (понтиком)");

		// Проверяем дифференцированную стоимость (опора 24 000 руб = 2 400 000 коп, понтик 70% = 16 800 руб = 1 680 000 коп)
		// 2 * 2 400 000 + 1 * 1 680 000 = 6 480 000 коп
		const bridgeCost = calculateBridgeRestorationCostKopecks({
			abutmentPriceKopecks: 2400000,
			ponticPriceKopecks: 1680000,
			abutmentsCount: abutmentTeethFdi.length,
			ponticsCount: ponticTeethFdi.length,
		});

		assert.equal(bridgeCost.patientPriceKopecks, 6480000, "Стоимость моста должна быть 64 800 руб (6 480 000 коп)");
		assert.equal(bridgeCost.abutmentsTotalPatientKopecks, 4800000);
		assert.equal(bridgeCost.ponticsTotalPatientKopecks, 1680000);
	});
});
