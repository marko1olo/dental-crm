import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ZtlOcclusionDrawer } from "../selectors/ZtlOcclusionDrawer.js";
import { createDentalLabOrderRecord } from "../../lab/orderEngine/labOrderRecordFactory.js";

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

	it("2. Дифференциация опор и понтиков в createDentalLabOrderRecord", () => {
		const order = createDentalLabOrderRecord({
			constructionType: "bridge_zirconia",
			teethFdi: [14, 15, 16],
			occlusionProfile: {
				articulatorType: "kavo_protar",
				facebow: true,
				guidanceType: "canine_guidance",
				sagittalCondylarAngleDeg: 33,
				bennettAngleDeg: 15,
			},
		});

		// Проверяем разбиение зубов
		assert.deepEqual(order.abutmentTeethFdi, [14, 16], "14 и 16 зубы должны стать опорами моста");
		assert.deepEqual(order.ponticTeethFdi, [15], "15 зуб должен стать промежуточной частью (понтиком)");

		// Проверяем сохранение окклюзионного профиля
		assert.ok(order.occlusionProfile, "Профиль окклюзии должен быть сохранен в наряде");
		assert.equal(order.occlusionProfile.articulatorType, "kavo_protar");
		assert.equal(order.occlusionProfile.guidanceType, "canine_guidance");
		assert.equal(order.occlusionProfile.facebow, true);
		assert.equal(order.occlusionProfile.sagittalCondylarAngleDeg, 33);
		assert.equal(order.occlusionProfile.bennettAngleDeg, 15);

		// Проверяем дифференцированную стоимость (опора 24 000 руб, понтик 70% = 16 800 руб)
		// 2 * 24 000 + 1 * 16 800 = 64 800 руб = 6 480 000 коп
		assert.equal(order.patientPriceKopecks, 6480000, "Стоимость моста должна быть 64 800 руб");
	});
});
