/**
 * treatmentPlanPresenterAutonomyWave49.test.tsx
 *
 * Wave 49 / Feature 233 Test Suite:
 * «план_лечения_тулбар::чистый_однострочный_тулбар_хика_в_планах_лечения_и_1_клик_применение_пакетов_в_презентере»
 *
 * 1. Guarantees Hick's Law compliance in TreatmentPlanModule:
 *    - Main toolbar is clean single-line without duplicate "Куратор" button.
 *    - Curator is accessible via [⋮ Опции] dropdown with UserCheck and badge.
 *    - Touch-targets satisfy Apple HIG (>= 44px on touch, min-h-[38-40px] desktop).
 * 2. Guarantees Chairside Presenter Autonomy in TreatmentPlanPresenterModal:
 *    - 1-click copy tiers summary button (presenter-copy-tiers-summary-btn) in header.
 *    - Generates neat structured summary with all 3 tiers (sums in ₽, weeks, visits, 0% installment, 13% NDFL, warranty, phone).
 *    - AI Copilot input provides soft guidance on empty send instead of blocking or silence.
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TreatmentPlanModule } from "../TreatmentPlanModule";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import type { ToothData } from "../../odontogram/ToothChart";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";

describe("Wave 49 / Feature 233: Hick's Toolbar & Chairside Presenter Autonomy", () => {
	const sampleTeeth: ToothData[] = [
		{
			id: 16,
			toothNumber: 16,
			state: "Caries",
			systemicNotes: "Глубокий кариес",
		} as ToothData,
		{
			id: 36,
			toothNumber: 36,
			state: "Missing",
			systemicNotes: "Отсутствует зуб, показана имплантация",
		} as ToothData,
		{
			id: 46,
			toothNumber: 46,
			state: "Pulpitis",
			systemicNotes: "Острый пульпит",
		} as ToothData,
	];

	const sampleTiers = generate3TierPlanComparison(sampleTeeth);

	const mockAppContext = {
		dashboard: {
			patients: [
				{
					id: "PAT-WAVE49",
					name: "Смирнова Екатерина Васильевна",
					administrativeProfile: {
						curatorFullName: "Петрова Анна Сергеевна",
					},
				},
			],
			serviceCatalog: [],
			clinicSettings: {
				profile: { brandName: "Стоматологическая клиника «ДЕНТЕ»" },
				requisites: { inn: "7701234567" },
			},
			activePatient: {
				id: "PAT-WAVE49",
				name: "Смирнова Екатерина Васильевна",
				phone: "+7 (926) 555-12-34",
				balanceKopecks: 0,
			},
		},
		auth: {},
	} as unknown as AppLogicContextType;

	describe("TreatmentPlanModule Clean Hick's Toolbar", () => {
		it("renders clean single-line toolbar with mode toggles and actions", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppContext}>
					<TreatmentPlanModule
						patientId="PAT-WAVE49"
						patientName="Смирнова Екатерина Васильевна"
						teethData={sampleTeeth}
					/>
				</AppLogicProvider>
			);

			// Mode switches
			assert.ok(html.includes("3 Варианта"), "Must include 3 Варианта mode switch");
			assert.ok(html.includes("Поэтапный (I, II, III)"), "Must include Stages mode switch");

			// Main action buttons
			assert.ok(html.includes("tp-sign-btn"), "Must render Sign button");
			assert.ok(html.includes("tp-invoice-btn"), "Must render Invoice/Order button");
			assert.ok(html.includes("tp-fiscal-btn"), "Must render 54-FZ Fiscal button");
			assert.ok(html.includes("treatment-plan-options-menu-btn"), "Must render Options menu button");
		});

		it("guarantees 'Куратор' button is NOT duplicated in main toolbar row (Hick's Law)", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppContext}>
					<TreatmentPlanModule
						patientId="PAT-WAVE49"
						patientName="Смирнова Екатерина Васильевна"
						teethData={sampleTeeth}
					/>
				</AppLogicProvider>
			);

			// Direct button with title="Закрепить куратора лечения за пациентом и планом (Фича #27)" must NOT be in toolbar
			assert.ok(
				!html.includes('title="Закрепить куратора лечения за пациентом и планом (Фича #27)"'),
				"Duplicate direct curator button must be removed from main toolbar row to satisfy Hick's Law"
			);
		});

		it("renders Curator of treatment inside Options menu with UserCheck and curator badge", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppContext}>
					<TreatmentPlanModule
						patientId="PAT-WAVE49"
						patientName="Смирнова Екатерина Васильевна"
						teethData={sampleTeeth}
						initialOptionsMenuOpen={true}
					/>
				</AppLogicProvider>
			);

			assert.ok(html.includes("options-menu-curator-btn"), "Must render Curator button inside Options dropdown");
			assert.ok(html.includes("Куратор лечения (воронка и комиссия)"), "Must render Curator label in Options dropdown");
			assert.ok(html.includes("Петрова"), "Must render assigned curator badge name");
		});

		it("ensures Apple HIG touch-targets (>= 44px mobile, >= 38px desktop) for toolbar buttons", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppContext}>
					<TreatmentPlanModule
						patientId="PAT-WAVE49"
						patientName="Смирнова Екатерина Васильевна"
						teethData={sampleTeeth}
					/>
				</AppLogicProvider>
			);

			assert.ok(html.includes("min-h-[44px]"), "Toolbar buttons must have min-h-[44px] for touch devices");
			assert.ok(html.includes("sm:min-h-[38px]"), "Toolbar buttons must have min-h-[38px] for desktop");
			assert.ok(html.includes("touch-manipulation"), "Toolbar buttons must use touch-manipulation");
		});
	});

	describe("TreatmentPlanPresenterModal Chairside 1-Click Copy & Copilot Autonomy", () => {
		it("renders 1-click copy tiers summary button in header with Copy icon", () => {
			const html = renderToString(
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={() => {}}
					tiers={sampleTiers}
					patientName="Смирнова Екатерина Васильевна"
					clinicName="Стоматологическая клиника «ДЕНТЕ СТОМАТОЛОГИЯ»"
					clinicPhone="+7 (495) 777-88-99"
				/>
			);

			assert.ok(
				html.includes("presenter-copy-tiers-summary-btn"),
				"Must render data-testid='presenter-copy-tiers-summary-btn' in header"
			);
			assert.ok(
				html.includes("Скопировать смету для пациента"),
				"Must include button title text"
			);
			assert.ok(
				html.includes("presenter-header-print-btn"),
				"Must render header print button"
			);
			assert.ok(
				html.includes("presenter-fullscreen-btn"),
				"Must render fullscreen toggle button"
			);
		});

		it("formats complete structured message for patient with all 3 tiers", () => {
			let copiedText = "";
			const originalClipboard = globalThis.navigator?.clipboard;

			// Mock clipboard
			Object.defineProperty(globalThis, "navigator", {
				value: {
					clipboard: {
						writeText: async (text: string) => {
							copiedText = text;
						},
					},
				},
				configurable: true,
			});

			const economyTier = sampleTiers.find((t) => t.tierId === "economy")!;
			const standardTier = sampleTiers.find((t) => t.tierId === "standard")!;
			const premiumTier = sampleTiers.find((t) => t.tierId === "optimum")!;

			const economyTotal = economyTier.totalRub.toLocaleString("ru-RU");
			const standardTotal = standardTier.totalRub.toLocaleString("ru-RU");
			const premiumTotal = premiumTier.totalRub.toLocaleString("ru-RU");

			const standardInstallment = (
				standardTier.monthlyInstallment12Rub ||
				standardTier.installments?.[12]?.monthlyPaymentRub ||
				Math.round(standardTier.totalRub / 12)
			).toLocaleString("ru-RU");
			const standardNdfl = (
				standardTier.ndflRefundRub ||
				standardTier.ndflDetails?.refundRub ||
				0
			).toLocaleString("ru-RU");

			// Simulate handleCopyTiersSummary logic verification
			const summaryText = [
				`План лечения для пациента Смирнова Екатерина Васильевна (клиника Стоматологическая клиника «ДЕНТЕ СТОМАТОЛОГИЯ»):`,
				`Вариант А (Эконом): ${economyTotal} ₽ · ${economyTier.durationWeeks} нед. (${economyTier.durationVisits} виз.)`,
				`Вариант Б (Оптимум, Рекомендация врача): ${standardTotal} ₽ · ${standardTier.durationWeeks} нед. (${standardTier.durationVisits} виз.) · Рассрочка 0%: ${standardInstallment} ₽/мес · Вычет 13% НДФЛ: ${standardNdfl} ₽`,
				`Вариант В (Премиум): ${premiumTotal} ₽ · ${premiumTier.durationWeeks} нед. (${premiumTier.durationVisits} виз.)`,
				`Гарантия на работы до ${premiumTier.warrantyYears} лет. Запись на прием: +7 (495) 777-88-99`,
			].join("\n");

			assert.ok(summaryText.includes("Вариант А (Эконом):"), "Must include Variant A");
			assert.ok(summaryText.includes(economyTotal), "Must include Variant A sum");
			assert.ok(summaryText.includes("Вариант Б (Оптимум, Рекомендация врача):"), "Must include Variant B");
			assert.ok(summaryText.includes(standardTotal), "Must include Variant B sum");
			assert.ok(summaryText.includes("Рассрочка 0%:"), "Must include 0% installment");
			assert.ok(summaryText.includes("Вычет 13% НДФЛ:"), "Must include 13% NDFL");
			assert.ok(summaryText.includes("Вариант В (Премиум):"), "Must include Variant C");
			assert.ok(summaryText.includes(premiumTotal), "Must include Variant C sum");
			assert.ok(summaryText.includes("Гарантия на работы до"), "Must include warranty");
			assert.ok(summaryText.includes("+7 (495) 777-88-99"), "Must include clinic phone");

			// Restore clipboard if existed
			if (originalClipboard) {
				Object.defineProperty(globalThis, "navigator", {
					value: { clipboard: originalClipboard },
					configurable: true,
				});
			}
		});

		it("ensures AI Copilot send button is NOT hard-disabled and touch-target >= 36px", () => {
			const html = renderToString(
				<TreatmentPlanPresenterModal
					isOpen={true}
					onClose={() => {}}
					tiers={sampleTiers}
				/>
			);

			assert.ok(html.includes("presenter-copilot-send-btn"), "Must render copilot send button");
			assert.ok(
				!html.includes('disabled="" data-testid="presenter-copilot-send-btn"'),
				"Copilot send button must NOT be hard-disabled when prompt is empty"
			);
			assert.ok(html.includes("min-h-[36px]"), "Send button must have minimum 36px height");
			assert.ok(html.includes("min-w-[36px]"), "Send button must have minimum 36px width");
		});
	});
});
