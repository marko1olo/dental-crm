/**
 * clinicalServiceBundlesModal.test.tsx — Тестирование рендеринга и доступности таба
 * клинических пакетов услуг «Все включено» у кресла (Каталог комплексных услуг).
 *
 * Использует чистый renderToString (React SSR) в соответствии с правилом Anti-Kustarnyi-DOM
 * (0 MB memory leak overhead, абсолютная безопасность V8).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { StudioClinicalBundlesTab } from "../studioTabs/StudioClinicalBundlesTab";
import { CLINICAL_BUNDLES } from "../bundlesEngine";

describe("StudioClinicalBundlesTab — Компонент пакетов комплексного лечения в студии", () => {
	test("рендерит контейнер, категории фильтрации и пакеты", () => {
		const html = renderToString(
			<StudioClinicalBundlesTab
				onAddBundleToStages={() => {}}
				selectedToothNumber={16}
			/>,
		);

		// Проверка категорий
		assert.ok(html.includes("Все пакеты"), "Фильтр «Все пакеты» должен присутствовать");
		assert.ok(html.includes("Терапия"), "Фильтр «Терапия» должен присутствовать");
		assert.ok(html.includes("Хирургия"), "Фильтр «Хирургия» должен присутствовать");
		assert.ok(html.includes("Ортопедия"), "Фильтр «Ортопедия» должен присутствовать");
		assert.ok(html.includes('data-testid="studio-clinical-bundles-tab"'), "Контейнер таба должен иметь data-testid");

		// Проверка наличия пакетов из CLINICAL_BUNDLES в разметке
		for (const bundle of CLINICAL_BUNDLES.slice(0, 5)) {
			assert.ok(
				html.includes(bundle.title),
				`Название пакета ${bundle.id} («${bundle.title}») должно быть в разметке`,
			);
		}
	});

	test("содержит поле привязки к зубу FDI", () => {
		const html = renderToString(
			<StudioClinicalBundlesTab
				onAddBundleToStages={() => {}}
				selectedToothNumber={24}
			/>,
		);

		assert.ok(html.includes("bundle-tooth-input"), "Инпут зуба FDI должен присутствовать");
		assert.ok(html.includes("24"), "Выбранный зуб 24 должен быть в разметке");
	});
});
