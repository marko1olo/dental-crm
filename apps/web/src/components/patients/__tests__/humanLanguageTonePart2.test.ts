import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LabOrderCardItem } from "../LabOrderCardItem";
import { SickLeaveElnModal } from "../../documents/sickLeave/SickLeaveElnModal";
import {
	SURGICAL_STATUTORY_ITEMS,
} from "../../documents/surgicalPackagePrintEngine";
import { EmkObjectiveStatusSection } from "../../visit/emk/EmkObjectiveStatusSection";
import { EmkQuickActionButtons } from "../../visit/emk/emkToolbarModules/EmkQuickActionButtons";

describe("Red Team Inquisition: Human Clinical Language (Labs, Sick Leave, Clinical Diary)", () => {
	it("LabOrderCardItem renders human clinical language without raw 'ЗТЛ-1' / 'заказ-наряд' jargon", () => {
		const html = renderToStaticMarkup(
			React.createElement(LabOrderCardItem, {
				order: {
					id: "ord-tone-1",
					orderNumber: "L-2026-01",
					patientId: "pat-1",
					patientName: "Сидоров Иван",
					doctorName: "Лечащий врач",
					toothFdi: "16",
					workTypeName: "Циркониевая коронка",
					laboratoryName: "Лаборатория",
					status: "sent",
					priceKopecks: 1850000,
					createdAt: "2026-10-01T10:00:00.000Z",
				},
				onOpenPrintOrder: () => {},
			}),
		);
		assert.equal(html.includes("Печать ЗТЛ-1"), false);
		assert.ok(html.includes("Печать заказа"));
		assert.equal(html.includes("043/у"), false);
	});

	it("SURGICAL_STATUTORY_ITEMS uses clean clinical titles without statutory decree numbers 834н / 1094н", () => {
		for (const item of SURGICAL_STATUTORY_ITEMS) {
			assert.equal(item.statutoryRef.includes("834н"), false);
			assert.equal(item.statutoryRef.includes("1094н"), false);
			assert.equal(item.title.includes("043/у"), false);
		}
	});

	it("SickLeaveElnModal renders without Order 1089n or raw 043/у codes", () => {
		const html = renderToStaticMarkup(
			React.createElement(SickLeaveElnModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Тестовый Пациент",
			}),
		);
		assert.equal(html.includes("Приказ Минздрава РФ № 1089н"), false);
		assert.equal(html.includes("В дневник 043/у"), false);
		assert.equal(html.includes("Копировать в карту 043/у"), false);
		assert.ok(html.includes("Листок нетрудоспособности и справка"));
	});

	it("EmkObjectiveStatusSection & EmkQuickActionButtons use plain Russian without Status Localis / Form 043/u", () => {
		const fieldHtml = renderToStaticMarkup(
			React.createElement(EmkObjectiveStatusSection, {
				visitNoteForm: { objectiveStatus: "Слизистая бледно-розовая" } as Record<string, string>,
				updateVisitNoteField: () => {},
			}),
		);
		assert.equal(fieldHtml.includes("Status Localis"), false);
		assert.equal(fieldHtml.includes("(morbi) и жизни (vitae)"), false);
		assert.ok(fieldHtml.includes("Осмотр и объективный статус"));

		const toolbarHtml = renderToStaticMarkup(
			React.createElement(EmkQuickActionButtons, {
				onApplyPhysiologicalNorm: () => {},
				handleSchedule: () => {},
				canUndo: false,
				canRedo: false,
				handleUndo: () => {},
				handleRedo: () => {},
			}),
		);
		assert.equal(toolbarHtml.includes("043/у"), false);
		assert.equal(toolbarHtml.includes("834н"), false);
	});
});
