import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ZtlOcclusionDrawer } from "../selectors/ZtlOcclusionDrawer.js";
import { ZtlSoloEconomicsCard } from "../selectors/ZtlSoloEconomicsCard.js";
import { ZtlFixationSelector, CEMENT_BRAND_PRESETS } from "../selectors/ZtlFixationSelector.js";
import { ORTHOPEDIC_CANONICAL_PROTOCOLS } from "../protocols/canonicalProtocolsData.js";
import {
	partitionBridgeTeethFdi,
	calculateBridgeRestorationCostKopecks,
} from "@dental/shared";

describe("Domain 25 & 99 Red Team Fixer Surgeon: Web Orthopedics & Occlusion CAD/CAM", () => {
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

		// Проверка чипсов артикулятора (без коммерческих брендов)
		assert.ok(html.includes('data-testid="articulator-chip-bio_art"'));
		assert.ok(html.includes('data-testid="articulator-chip-kavo_protar"'));
		assert.ok(html.includes('data-testid="articulator-chip-average_anatomical"'));
		assert.ok(html.includes("Полурегулируемый (Arcon)"));
		assert.ok(html.includes("Полностью регулируемый (Non-Arcon)"));

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

	it("3. ДЕФЕКТ 2: Нейтральные клинические стандарты цементов в ZtlFixationSelector (Мандаты 8x, 8ap)", () => {
		const expectedIds = ["light_cure_resin", "self_adhesive_dual_cure", "rmgic_cement", "mdp_adhesive_resin"];
		const actualIds = CEMENT_BRAND_PRESETS.map((c) => c.id);
		assert.deepEqual(actualIds, expectedIds, "Пресеты цементов должны быть строго нейтральными");

		const html = renderToString(
			<ZtlFixationSelector
				fixationType="cement"
				onSelectFixationType={() => {}}
				hasAntagonists={true}
				onToggleAntagonists={() => {}}
				cementBrand="self_adhesive_dual_cure"
			/>,
		);
		assert.ok(html.includes("Самоадгезивный композитный цемент двойного отверждения"));
		assert.ok(html.includes("Стеклоиономерный модифицированный цемент (СИЦ)"));
		assert.ok(html.includes("Светоотверждаемый композитный цемент"));
		assert.ok(html.includes("Адгезивный композитный цемент с праймером MDP"));
	});

	it("4. ДЕФЕКТ 3: Наличие clinicalServices с типом OrthopedicServiceItem в канонических протоколах", () => {
		for (const protocol of ORTHOPEDIC_CANONICAL_PROTOCOLS) {
			assert.ok(protocol.clinicalServices && protocol.clinicalServices.length > 0, `Протокол ${protocol.id} должен содержать clinicalServices`);
			for (const s of protocol.clinicalServices) {
				assert.ok(s.code, `Код услуги должен присутствовать: ${s.code}`);
				assert.ok(s.nameRu, `Название услуги должно присутствовать: ${s.nameRu}`);
				assert.equal(s.stageKind, "stage_3_orthopedics");
			}
		}
	});

	it("5. ДЕФЕКТ 4: Отображение экономики наряда в ZtlSoloEconomicsCard через kopecks и formatKopecksToRub", () => {
		const html = renderToString(
			<ZtlSoloEconomicsCard
				grossPriceKopecks={2400000n}
				ztlCostKopecks={750000n}
				materialsCostKopecks={120000n}
				netMarginKopecks={1530000n}
				marginPercent={64}
				dueDate="2026-12-01"
			/>,
		);

		assert.ok(html.includes('data-testid="solo-economics-section"'));
		assert.ok(html.includes("24"), "Выручка должна содержать 24");
		assert.ok(html.includes("7"), "ЗТЛ должно присутствовать");
		assert.ok(html.includes("1"), "Расходники должны присутствовать");
		assert.ok(html.includes("15"), "Чистая маржа должна присутствовать");
		assert.ok(html.includes("64"), "Процент маржи 64 должен присутствовать");
		assert.ok(html.includes("%"), "Символ процента должен присутствовать");
		assert.ok(html.includes("2026-12-01"));
	});
});
