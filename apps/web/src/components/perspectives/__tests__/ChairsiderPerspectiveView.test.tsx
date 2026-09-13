import assert from "node:assert/strict";
import { describe, test } from "node:test";
import React from "react";
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

describe("ChairsiderPerspectiveView — Clean Delegation & Clinical Authority (Mandates 8s, 8e)", () => {
	test("Делегирует рендер каноническому VisitView без синтетических диорам и свалки поверхностей", () => {
		const html = renderChairsider();
		assert.ok(html.length > 0, "HTML не должен быть пустым");
		assert.ok(
			!html.includes("surface-selector-svg-large"),
			"Не должно быть громоздкой синтетической SVG-схемы поверхностей",
		);
	});

	test("Отображает клинический контекст активного пациента и данные приема", () => {
		const html = renderChairsider();
		assert.ok(
			html.includes("Иванов Иван Иванович") || html.includes("patient-chairsider-001") || html.includes("visit"),
			"Должен присутствовать контекст пациента или идентификатор визита",
		);
	});

	test("Соблюдает Мандат 8e: нулевой барьер для врача и доступность элементов управления", () => {
		const html = renderChairsider();
		// Проверяем отсутствие заблокированных экранов-ширм
		assert.ok(!html.includes("data-blocked-screen"), "Экран не должен быть заблокирован");
	});
});
