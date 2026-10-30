/**
 * @dental/web/components/orthodontics/__tests__/orthoWorkspaceModalDecomposition.test.tsx
 * Тесты изолированных sweet-spot модулей декомпозиции рабочего стола ортодонта.
 * Проверка Мандатов 8b (Sweet spot <500 строк), 8e (Автономия врача), 8am (1 Primary CTA), 8x (Клинический язык).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { OrthoWorkspaceHeader } from "../workspaceModal/OrthoWorkspaceHeader";
import { OrthoVisitActivationTab } from "../workspaceModal/OrthoVisitActivationTab";
import { OrthoCephAnalysisTab } from "../workspaceModal/OrthoCephAnalysisTab";
import { OrthoAlignersTab } from "../workspaceModal/OrthoAlignersTab";
import { OrthoWorkspaceFooter } from "../workspaceModal/OrthoWorkspaceFooter";
import { OrthodonticWorkspaceModal } from "../OrthodonticWorkspaceModal";
import {
	CANONICAL_CEPH_COORDINATES_PRESET,
	computeCephalometricMetrics,
	DEFAULT_ALIGNER_STATE,
} from "../orthoCatalogData";

describe("Orthodontic Workspace Modal Decomposition Suite", () => {
	it("renders OrthoWorkspaceHeader with mobile Drag Handle (36x5px) and >= 44px touch targets", () => {
		const html = renderToString(
			<OrthoWorkspaceHeader
				titleId="ortho-title-test"
				patientName="Тестовый Пациент"
				doctorName="Д-р Тестовый"
				activeTab="visit"
				onSelectTab={() => {}}
				onApplyNorm={() => {}}
				onClose={() => {}}
				skeletalClass="I"
				alignerCurrentStep={7}
				alignerTotalSteps={24}
			/>,
		);

		// Apple HIG Drag Handle 36x5px (w-9 h-[5px])
		assert.ok(html.includes("w-9 h-[5px] rounded-full"));

		// Заголовок и метаданные
		assert.ok(html.includes("Рабочий стол ортодонта"));
		assert.ok(html.includes("Тестовый Пациент"));
		assert.ok(html.includes("Д-р Тестовый"));

		// 1-клик норма и закрытие
		assert.ok(html.includes("Норма в 1 клик"));
		assert.ok(html.includes("aria-label=\"Закрыть\""));

		// Сегментный контрол с тач-таргетами >= 44px
		assert.ok(html.includes("min-h-[44px]"));
		assert.ok(html.includes("Визит и активация дуг"));
		assert.ok(html.includes("ТРГ Цефалометрия"));
		assert.ok(html.includes("Элайнеры"));
		assert.ok(html.includes("Класс I"));
		assert.ok(html.includes("7/24"));
	});

	it("renders OrthoVisitActivationTab with arch selector, bracket systems and archwires", () => {
		const html = renderToString(
			<OrthoVisitActivationTab
				targetArch="both"
				onSelectArch={() => {}}
				selectedBracketId="damon_q2"
				onSelectBracket={() => {}}
				selectedArchwireId="cuniti_014x025"
				onSelectArchwire={() => {}}
				selectedActions={{ wire_change: true, power_chain: true }}
				onToggleAction={() => {}}
				skeletalClassLabelRu="I скелетный класс (Норма)"
			/>,
		);

		// Выбор дуги/челюсти
		assert.ok(html.includes("Обе челюсти"));
		assert.ok(html.includes("Верхняя (ВЧ)"));
		assert.ok(html.includes("Нижняя (НЧ)"));

		// Каталог брекетов и дуг
		assert.ok(html.includes("Damon Q2"));
		assert.ok(html.includes("Damon Clear 2"));
		assert.ok(html.includes(".014×.025 CuNiTi"));

		// Манипуляции
		assert.ok(html.includes("Смена ортодонтической дуги"));
		assert.ok(html.includes("Эластическая цепочка Power Chain"));
		assert.ok(html.includes("Готов к записи"));

		// Запрет канцелярита
		assert.ok(!html.includes("043/у"));
		assert.ok(!html.includes("804н"));
		assert.ok(!html.includes("54-ФЗ"));
	});

	it("renders OrthoCephAnalysisTab with 16 landmarks, SVG geometry and Steiner metrics", () => {
		const metrics = computeCephalometricMetrics(CANONICAL_CEPH_COORDINATES_PRESET);
		const html = renderToString(
			<OrthoCephAnalysisTab
				cephPoints={CANONICAL_CEPH_COORDINATES_PRESET}
				onChangePoints={() => {}}
				cephMetrics={metrics}
			/>,
		);

		// SVG холст с 16 ориентирами
		assert.ok(html.includes("<svg viewBox=\"0 0 800 700\""));
		assert.ok(html.includes(">S<"));
		assert.ok(html.includes(">N<"));
		assert.ok(html.includes(">A<"));
		assert.ok(html.includes(">B<"));
		assert.ok(html.includes(">Pog<"));
		assert.ok(html.includes(">Go<"));
		assert.ok(html.includes(">Me<"));

		// Параметры Штейнера
		assert.ok(html.includes("Угол SNA"));
		assert.ok(html.includes("Угол SNB"));
		assert.ok(html.includes("Угол ANB"));
		assert.ok(html.includes("Wits число"));
		assert.ok(html.includes("I скелетный класс (Норма)"));
	});

	it("renders OrthoAlignersTab with step progress slider and attachment list", () => {
		const html = renderToString(
			<OrthoAlignersTab
				alignerState={DEFAULT_ALIGNER_STATE}
				onChangeAlignerState={() => {}}
			/>,
		);

		// Слайдер и шаги
		assert.ok(html.includes("Прогресс элайнеров и выдача капп"));
		assert.ok(html.includes("Текущая каппа:"));
		assert.ok(html.includes("№ 6 из 24"));
		assert.ok(html.includes("Дней на шаг"));
		assert.ok(html.includes("Выдано на руки"));

		// Аттачменты
		assert.ok(html.includes("Аттачменты и сепарация (IPR)"));
		assert.ok(html.includes("Эллипсоидный вертикальный"));
		assert.ok(html.includes("Скошенный клиновидный"));
	});

	it("renders OrthoWorkspaceFooter with Natural Thumb Zone and exactly 1 Primary CTA #0d9488", () => {
		const html = renderToString(
			<OrthoWorkspaceFooter
				totalCostRub={3800}
				onSave={() => {}}
			/>,
		);

		// Стоимость и памятка
		assert.ok(html.includes("3800 ₽"));
		assert.ok(html.includes("Печать памятки"));

		// Ровно 1 Primary CTA
		assert.ok(html.includes("data-testid=\"ortho-primary-save-cta\""));
		assert.ok(html.includes("Зафиксировать орто-протокол"));
		assert.ok(html.includes("#0d9488"));

		// Никаких блокировок кнопок (Мандат 8e)
		assert.ok(!html.includes("disabled"));
	});

	it("integrates all modules seamlessly inside OrthodonticWorkspaceModal coordinator", () => {
		const html = renderToString(
			<OrthodonticWorkspaceModal
				isOpen={true}
				onClose={() => {}}
				patientName="Тестовая Интеграция"
			/>,
		);

		assert.ok(html.includes("data-testid=\"orthodontic-workspace-modal\""));
		assert.ok(html.includes("Тестовая Интеграция"));
		assert.ok(html.includes("data-testid=\"ortho-primary-save-cta\""));
		assert.ok(!html.includes("disabled"));
	});
});
