/**
 * emkErgonomicsAndDoctorAutonomy.test.tsx
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import { EmkComplaintsSection } from "../EmkComplaintsSection";
import { EmkObjectiveStatusSection } from "../EmkObjectiveStatusSection";
import { EmkDiaryProtocolSection } from "../EmkDiaryProtocolSection";
import { SomaticSafetyAlertWidget } from "../../../clinical/SomaticSafetyAlertWidget";
import { FinanceToolbar } from "../../../finance/FinanceToolbar";

describe("RED TEAM INQUISITION: Clinical Ergonomics & Doctor Autonomy", () => {
	const baseVisitNoteForm = {
		complaint: "",
		anamnesis: "",
		objectiveStatus: "",
		diagnosis: "",
		treatmentPlan: "",
		recommendations: "",
	};

	it("1. EmkComplaintsSection renders immediate clinical textareas without hardcoded junk chip accordions", () => {
		const html = renderToStaticMarkup(
			React.createElement(EmkComplaintsSection, {
				visitNoteForm: baseVisitNoteForm as never,
				updateVisitNoteField: () => {},
			}),
		);
		assert.equal(html.includes("Шаблоны жалоб"), false);
		assert.equal(html.includes("Шаблоны анамнеза"), false);
		assert.ok(html.includes('data-testid="emk-complaints-section"'));
		assert.ok(html.includes('data-testid="btn-emk-complaints-norm"'));
	});

	it("2. EmkObjectiveStatusSection exposes btn-emk-full-objective-norm and collapsed <details> presets", () => {
		const html = renderToStaticMarkup(
			React.createElement(EmkObjectiveStatusSection, {
				visitNoteForm: baseVisitNoteForm as never,
				updateVisitNoteField: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-emk-full-objective-norm"'));
		assert.ok(html.includes("Физиологическая норма осмотра"));
		assert.ok(html.includes("Шаблоны осмотра и статуса"));
		assert.ok(html.includes("Шаблоны исследований"));
	});

	it("3. EmkDiaryProtocolSection has no <details> spoilers and provides btn-open-protocols-catalog-diary", () => {
		const html = renderToStaticMarkup(
			React.createElement(EmkDiaryProtocolSection, {
				visitNoteForm: baseVisitNoteForm as never,
				updateVisitNoteField: () => {},
				onOpenTemplatesModal: () => {},
			}),
		);
		assert.equal(html.includes("<details"), false);
		assert.equal(html.includes("Экспресс-протоколы у кресла"), false);
		assert.ok(html.includes("btn-open-protocols-catalog-diary"));
	});

	it("4. SomaticSafetyAlertWidget renders calm amber 'Особенности анамнеза:' badge instead of all-caps scream", () => {
		const html = renderToStaticMarkup(
			React.createElement(SomaticSafetyAlertWidget, {
				patient: {
					id: "pat-1",
					fullName: "Иванов И.И.",
					allergies: "Лидокаин",
				} as never,
			}),
		);
		assert.equal(html.includes("СТОП-ФАКТОРЫ ("), false);
		assert.ok(html.includes("Особенности анамнеза:"));
		assert.ok(html.includes("amber"));
	});

	it("5. FinanceToolbar uses human-friendly labels ('Касса онлайн', 'Счета и акты') without 54-ФЗ/804н", () => {
		const html = renderToStaticMarkup(
			React.createElement(FinanceToolbar, {
				documentPatient: null,
				billingSummary: null,
				isCashShiftOpen: false,
				onToggleCashShift: () => {},
				isShiftOpen: true,
				onPayDebtQuick: () => {},
				money: (v) => `${v ?? 0} ₽`,
				onOpenInvoices: () => {},
				isFinanceOptionsOpen: false,
				onToggleFinanceOptions: () => {},
				onCloseFinanceOptions: () => {},
				onOpenPnl: () => {},
				onGoToDocuments: () => {},
				onOpenCashbox: () => {},
			}),
		);
		assert.equal(html.includes("ККТ 54-ФЗ"), false);
		assert.equal(html.includes("Счета и акты (804н)"), false);
		assert.ok(html.includes("Касса онлайн"));
		assert.ok(html.includes("Счета и акты"));
	});
});
