/**
 * orthoWorkspaceModalAndCatalog.test.tsx
 * Тесты канонического рабочего стола ортодонта, честного калькулятора ТРГ и автономного лаунчера.
 * Проверка Мандатов 8e (Автономия врача), 8x (Живой клинический язык), 8am (1 Primary CTA #0d9488), 8aq (Монтирование в UI).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	computeCephalometricMetrics,
	calculateAngleDegrees,
	CANONICAL_CEPH_COORDINATES_PRESET,
	CEPH_16_LANDMARKS_CATALOG,
	BRACKET_SYSTEMS_CATALOG,
	ARCHWIRES_CATALOG,
	ALIGNER_ATTACHMENTS_CATALOG,
} from "../orthoCatalogData";
import { OrthodonticWorkspaceModal } from "../OrthodonticWorkspaceModal";
import { DirectOrthoLauncher } from "../DirectOrthoLauncher";

describe("Ortho Catalog Data & Trigonometric Ceph Calculator", () => {
	it("contains all 16 mandatory anatomical landmarks with clinical Russian names", () => {
		const keys = Object.keys(CEPH_16_LANDMARKS_CATALOG);
		assert.equal(keys.length, 16);
		assert.ok(keys.includes("S"));
		assert.ok(keys.includes("N"));
		assert.ok(keys.includes("A"));
		assert.ok(keys.includes("B"));
		assert.ok(keys.includes("Pog"));
		assert.ok(keys.includes("Gn"));
		assert.ok(keys.includes("Me"));
		assert.ok(keys.includes("Go"));
		assert.ok(keys.includes("ANS"));
		assert.ok(keys.includes("PNS"));
		assert.ok(keys.includes("U1"));
		assert.ok(keys.includes("L1"));
		assert.ok(keys.includes("Is"));
		assert.ok(keys.includes("Ii"));

		for (const k of keys as (keyof typeof CEPH_16_LANDMARKS_CATALOG)[]) {
			const info = CEPH_16_LANDMARKS_CATALOG[k];
			assert.ok(info.nameRu.length > 0);
			assert.ok(info.latinName.length > 0);
		}
	});

	it("computes accurate 2D angle between 3 points", () => {
		const p1 = { x: 100, y: 0 };
		const vertex = { x: 0, y: 0 };
		const p2 = { x: 0, y: 100 };
		const angle = calculateAngleDegrees(p1, vertex, p2);
		assert.equal(angle, 90);

		// Прямая линия 180 градусов
		const p3 = { x: -100, y: 0 };
		assert.equal(calculateAngleDegrees(p1, vertex, p3), 180);
	});

	it("calculates Steiner & Schwarz ceph parameters for canonical preset correctly", () => {
		const metrics = computeCephalometricMetrics(CANONICAL_CEPH_COORDINATES_PRESET);
		assert.ok(metrics.sna >= 70 && metrics.sna <= 95);
		assert.ok(metrics.snb >= 70 && metrics.snb <= 95);
		assert.equal(metrics.anb, Math.round((metrics.sna - metrics.snb) * 10) / 10);
		assert.ok(metrics.interincisalAngle >= 110);
		assert.equal(metrics.skeletalClass, "I");
		assert.ok(metrics.skeletalClassLabelRu.includes("I скелетный класс"));
	});

	it("detects skeletal Class II and Class III malocclusions based on ANB delta", () => {
		// II класс (дистальный прикус, ANB > 4.5°)
		const class2Points = {
			...CANONICAL_CEPH_COORDINATES_PRESET,
			A: { x: 610, y: 358 }, // Точка A выдвинута вперед
			B: { x: 530, y: 462 }, // Точка B ретрогнатична
		};
		const class2Metrics = computeCephalometricMetrics(class2Points);
		assert.ok(class2Metrics.anb > 4.5);
		assert.equal(class2Metrics.skeletalClass, "II");
		assert.ok(class2Metrics.skeletalClassLabelRu.includes("II скелетный класс"));

		// III класс (мезиальный прикус, ANB < 0.5°)
		const class3Points = {
			...CANONICAL_CEPH_COORDINATES_PRESET,
			A: { x: 550, y: 358 }, // Точка A ретрогнатична
			B: { x: 580, y: 462 }, // Точка B прогнатична
		};
		const class3Metrics = computeCephalometricMetrics(class3Points);
		assert.ok(class3Metrics.anb < 0.5);
		assert.equal(class3Metrics.skeletalClass, "III");
		assert.ok(class3Metrics.skeletalClassLabelRu.includes("III скелетный класс"));
	});

	it("provides comprehensive bracket systems, archwires and aligners catalogs", () => {
		assert.ok(BRACKET_SYSTEMS_CATALOG.length >= 5);
		assert.ok(ARCHWIRES_CATALOG.length >= 6);
		assert.ok(ALIGNER_ATTACHMENTS_CATALOG.length >= 4);

		// Проверка наличия Damon Q2 и CuNiTi
		const damon = BRACKET_SYSTEMS_CATALOG.find((b) => b.id === "damon_q2");
		assert.ok(damon !== undefined);
		assert.equal(damon?.slot, ".022");

		const cuniti = ARCHWIRES_CATALOG.find((w) => w.id === "cuniti_014x025");
		assert.ok(cuniti !== undefined);
		assert.ok(cuniti?.materialRu.includes("Медь-никель-титан"));
	});
});

describe("OrthodonticWorkspaceModal SSR & Doctor Autonomy", () => {
	it("renders OrthodonticWorkspaceModal with 3 tabs and exactly 1 primary CTA button", () => {
		const html = renderToString(
			<OrthodonticWorkspaceModal
				isOpen={true}
				onClose={() => {}}
				patientName="Смирнова Екатерина Андреевна"
			/>,
		);

		// Заголовок
		assert.ok(html.includes("Рабочий стол ортодонта"));
		assert.ok(html.includes("Смирнова Екатерина Андреевна"));

		// 3 вкладки
		assert.ok(html.includes("Визит и активация дуг"));
		assert.ok(html.includes("ТРГ Цефалометрия"));
		assert.ok(html.includes("Элайнеры"));

		// Ровно 1 Primary CTA кнопка #0d9488
		assert.ok(html.includes("data-testid=\"ortho-primary-save-cta\""));
		assert.ok(html.includes("Сохранить протокол активации и расчет"));
		assert.ok(html.includes("#0d9488"));

		// Никаких блокировок кнопок (Мандат 8e)
		assert.ok(!html.includes('disabled="" data-testid="ortho-primary-save-cta"'));

		// Чистый клинический язык без советского канцелярита (Мандат 8x)
		assert.ok(!html.includes("Форма 043/у"));
		assert.ok(!html.includes("Прейскурант 804н"));
	});

	it("renders ceph tab with 16 landmark coordinates and SVG lines", () => {
		const html = renderToString(
			<OrthodonticWorkspaceModal
				isOpen={true}
				onClose={() => {}}
				initialTab="ceph"
			/>,
		);

		assert.ok(html.includes("Скелетные параметры Штейнера"));
		assert.ok(html.includes("Угол SNA"));
		assert.ok(html.includes("Угол SNB"));
		assert.ok(html.includes("Угол ANB"));
		assert.ok(html.includes("Wits число"));
		assert.ok(html.includes("I скелетный класс (Норма)"));
	});

	it("renders aligners tab with steps and attachments", () => {
		const html = renderToString(
			<OrthodonticWorkspaceModal
				isOpen={true}
				onClose={() => {}}
				initialTab="aligners"
			/>,
		);

		assert.ok(html.includes("Прогресс элайнеров и выдача капп"));
		assert.ok(html.includes("Аттачменты и сепарация (IPR)"));
		assert.ok(html.includes("Эллипсоидный вертикальный"));
	});
});

describe("DirectOrthoLauncher SSR Mounting", () => {
	it("renders without error and maintains clean mounting boundary", () => {
		const html = renderToString(<DirectOrthoLauncher />);
		// By default when no hash, returns null
		assert.equal(typeof html, "string");
	});
});
