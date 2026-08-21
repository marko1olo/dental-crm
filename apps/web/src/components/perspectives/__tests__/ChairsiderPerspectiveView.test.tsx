import assert from "node:assert/strict";
import { describe, test } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { usePatientStore } from "../../../store/patientStore";
import { ChairsiderPerspectiveView } from "../ChairsiderPerspectiveView";

const mockAppContext = {
	dashboard: {
		patients: [
			{
				id: "patient-chairsider-001",
				fullName: "Иванов Иван Иванович",
				birthDate: "1985-05-12",
				gender: "M",
				allergies: "Амоксициллин, Лидокаин",
				administrativeProfile: {
					snils: "123-456-789 00",
					gender: "M",
					omsPolis: "1234567890123456",
				},
			},
		],
		currentDoctor: {
			id: "doc-001",
			fullName: "Д-р Смирнов А. В.",
		},
		activeVisit: {
			id: "visit-001",
		},
	},
	auth: {
		denteClinicalMutationHeaders: (extra: Record<string, string> = {}) => ({
			"x-test-auth": "true",
			...extra,
		}),
	},
	activeDoctor: {
		id: "doc-001",
		fullName: "Д-р Смирнов А. В.",
	},
} as unknown as AppLogicContextType;

function renderChairsider(): string {
	usePatientStore.getState().setSelectedPatientId("patient-chairsider-001");
	return renderToStaticMarkup(
		<AppLogicProvider value={mockAppContext}>
			<ChairsiderPerspectiveView />
		</AppLogicProvider>,
	);
}

describe("ChairsiderPerspectiveView — Sidebar Purity & Quick Actions", () => {
	test("Правый сайдбар НЕ содержит гигантскую SVG-диаграмму поверхностей (SurfaceSelector), загромождающую экран", () => {
		const html = renderChairsider();
		assert.ok(
			!html.includes("surface-selector-svg-large"),
			"Не должно быть громоздкой SVG-схемы поверхностей в сайдбаре",
		);
		// Проверяем, что поверхности переключаются компактными тач-пиллами
		assert.ok(html.includes("data-testid=\"chairsider-surface-btn-V\""), "Присутствует тач-кнопка поверхности V");
		assert.ok(html.includes("data-testid=\"chairsider-surface-btn-L\""), "Присутствует тач-кнопка поверхности L");
		assert.ok(html.includes("data-testid=\"chairsider-surface-btn-M\""), "Присутствует тач-кнопка поверхности M");
		assert.ok(html.includes("data-testid=\"chairsider-surface-btn-D\""), "Присутствует тач-кнопка поверхности D");
		assert.ok(html.includes("data-testid=\"chairsider-surface-btn-O\""), "Присутствует тач-кнопка поверхности O");
	});

	test("Сайдбар содержит все 5 обязательных 1-tap действий у кресла", () => {
		const html = renderChairsider();

		// 1. SOAP экспорт в дневник 043/у
		assert.ok(
			html.includes("data-testid=\"chairsider-copy-soap-btn\""),
			"Кнопка 'Скопировать в дневник 043/у' должна присутствовать",
		);
		assert.ok(
			html.includes("Скопировать в дневник"),
			"Текст кнопки копирования SOAP должен присутствовать",
		);
		assert.ok(html.includes("SOAP"), "Бейдж SOAP должен присутствовать");

		// 2. Журнал корневых каналов (Эндо 043/у)
		assert.ok(
			html.includes("data-testid=\"chairsider-endo-canal-log-btn\""),
			"Кнопка 'Журнал корневых каналов' должна присутствовать",
		);
		assert.ok(
			html.includes("Журнал корневых каналов"),
			"Текст кнопки журнала корневых каналов должен присутствовать",
		);
		assert.ok(html.includes("Эндо 043/у"), "Бейдж Эндо 043/у должен присутствовать");

		// 3. Наряд в лабораторию (ЗТЛ CAD/CAM)
		assert.ok(
			html.includes("data-testid=\"chairsider-lab-order-btn\""),
			"Кнопка 'Наряд в лабораторию' должна присутствовать",
		);
		assert.ok(
			html.includes("Наряд в лабораторию"),
			"Текст кнопки наряда в ЗТЛ должен присутствовать",
		);
		assert.ok(html.includes("CAD/CAM"), "Бейдж CAD/CAM должен присутствовать");

		// 4. 3D КТ и Рентген лаунчер
		assert.ok(
			html.includes("data-testid=\"chairsider-launch-ct-btn\""),
			"Кнопка запуска 3D DICOM / КТ должна присутствовать",
		);
		assert.ok(
			html.includes("3D КТ и Рентген-снимок"),
			"Заголовок 3D КТ и Рентген должен присутствовать",
		);
		assert.ok(
			html.includes("3D DICOM"),
			"Бейдж 3D DICOM должен присутствовать",
		);

		// 5. Hands-free Голосовая диктовка
		assert.ok(
			html.includes("Голосовая диктовка"),
			"Модуль голосовой диктовки должен присутствовать",
		);
		assert.ok(
			html.includes("Hands-free"),
			"Пометка Hands-free должна присутствовать",
		);
	});

	test("Все интерактивные элементы управления имеют тач-таргеты >= 44x44px", () => {
		const html = renderChairsider();

		// Тач-кнопки поверхностей имеют min-h-[44px] min-w-[44px]
		assert.ok(
			html.includes("min-h-[44px] min-w-[44px]"),
			"Кнопки поверхностей имеют минимальный размер >= 44x44px",
		);

		// Главные кнопки сайдбара имеют высоту >= 44px (74px, 56px)
		assert.ok(html.includes("min-h-[74px]"), "Кнопки Эндо и ЗТЛ имеют min-h-[74px] >= 44px");
		assert.ok(html.includes("min-h-[56px]"), "Кнопка КТ и верхняя панель имеют min-h-[56px] >= 44px");

		// Кнопка возврата к стандартному столу
		assert.ok(
			html.includes("min-h-[56px] min-w-[56px]"),
			"Кнопка назад имеет min-h-[56px] min-w-[56px] >= 44x44px",
		);

		// Кнопка микрофона
		assert.ok(
			html.includes("w-16 h-16"),
			"Кнопка микрофона имеет размер 64x64px >= 44x44px",
		);
	});

	test("Отображает стерильный контекст пациента и медицинские предупреждения", () => {
		const html = renderChairsider();
		assert.ok(html.includes("Стерильный планшет у кресла"), "Отображается бейдж стерильного планшета");
		assert.ok(html.includes("Иванов Иван Иванович"), "Отображается ФИО активного пациента");
		assert.ok(html.includes("Амоксициллин, Лидокаин"), "Отображаются аллергии пациента");
	});

	test("Содержит 3 режима отображения формулы (Анатомическая дуга, Плитки 56px, Пародонтограмма)", () => {
		const html = renderChairsider();
		assert.ok(html.includes("Анатомическая"), "Включает режим Анатомическая дуга");
		assert.ok(html.includes("Плитки"), "Включает режим Плитки");
		assert.ok(html.includes("Пародонто"), "Включает режим Пародонтограмма");
	});
});
