/**
 * clinicalServiceBundlesModal.test.tsx — Тестирование рендеринга и доступности модального окна
 * клинических пакетов услуг «Все включено» у кресла (Приказ Минздрава РФ № 804н).
 *
 * Использует чистый renderToString (React SSR) в соответствии с правилом Anti-Kustarnyi-DOM
 * (0 MB memory leak overhead, абсолютная безопасность V8).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ClinicalServiceBundlesModal } from "../ClinicalServiceBundlesModal";
import { CLINICAL_BUNDLES } from "../treatmentPlanBundlesEngine";

describe("ClinicalServiceBundlesModal — Компонент модального окна пакетов 804н", () => {
	test("не рендерит разметку, если isOpen === false", () => {
		const html = renderToString(
			<ClinicalServiceBundlesModal
				isOpen={false}
				onClose={() => {}}
			/>,
		);
		assert.equal(html, "");
	});

	test("рендерит заголовок, бейдж 804н и все 10 пакетов при isOpen === true", () => {
		const html = renderToString(
			<ClinicalServiceBundlesModal
				isOpen={true}
				onClose={() => {}}
				initialToothNumber={16}
				patientId="pat-test-1"
				patientName="Иванов Иван Иванович"
				targetMode="both"
			/>,
		);

		// Проверка заголовка и стандартов
		assert.ok(html.includes("Клинические пакеты услуг у кресла"), "Заголовок должен присутствовать");
		assert.ok(html.includes("Прейскурант услуг"), "Бейдж прейскуранта должен присутствовать");
		assert.ok(html.includes("data-testid=\"clinical-service-bundles-modal\""), "Контейнер модалки должен иметь data-testid");

		// Проверка наличия всех 10 пакетов в DOM
		for (const bundle of CLINICAL_BUNDLES) {
			assert.ok(
				html.includes(bundle.title),
				`Название пакета ${bundle.id} («${bundle.title}») должно быть в разметке`,
			);
			assert.ok(
				html.includes(`data-testid="bundle-modal-card-${bundle.id}"`),
				`Карточка пакета ${bundle.id} должна присутствовать в разметке`,
			);
		}
	});

	test("содержит кнопки действий 1 клика («В план» и «В счет»)", () => {
		const html = renderToString(
			<ClinicalServiceBundlesModal
				isOpen={true}
				onClose={() => {}}
				initialToothNumber={24}
				targetMode="both"
			/>,
		);

		assert.ok(html.includes("В план"), "Кнопка «В план» должна присутствовать");
		assert.ok(html.includes("В счет"), "Кнопка «В счет» должна присутствовать");
		assert.ok(html.includes("Состав"), "Кнопка настройки состава пакета должна присутствовать");
	});

	test("в режиме targetMode='plan' рендерит только кнопку «В план»", () => {
		const html = renderToString(
			<ClinicalServiceBundlesModal
				isOpen={true}
				onClose={() => {}}
				targetMode="plan"
			/>,
		);

		assert.ok(html.includes("В план"), "Кнопка «В план» должна быть в разметке");
		assert.ok(!html.includes("apply-invoice"), "Кнопка «В счет» не должна рендериться в режиме plan");
	});

	test("в режиме targetMode='invoice' рендерит только кнопку «В счет»", () => {
		const html = renderToString(
			<ClinicalServiceBundlesModal
				isOpen={true}
				onClose={() => {}}
				targetMode="invoice"
			/>,
		);

		assert.ok(!html.includes("apply-plan"), "Кнопка «В план» не должна рендериться в режиме invoice");
		assert.ok(html.includes("В счет"), "Кнопка «В счет» должна быть в разметке");
	});

	test("рендерит корректный номер зуба FDI в селекторе и карточках", () => {
		const html = renderToString(
			<ClinicalServiceBundlesModal
				isOpen={true}
				onClose={() => {}}
				initialToothNumber={46}
			/>,
		);

		assert.ok(html.includes("Зуб #<!-- -->46"), "Номер зуба #46 должен отображаться в бейдже зубозависимых пакетов");
	});
});
