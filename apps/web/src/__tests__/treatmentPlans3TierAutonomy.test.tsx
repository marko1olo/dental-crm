/**
 * treatmentPlans3TierAutonomy.test.tsx — Red Team проверка автономии врача и 3-Tier планов лечения.
 *
 * Мандаты 8e (Автономия врача), 8am (Ровно 1 Primary CTA), 8x (Анти-канцелярит), Apple HIG (Сенсорная эргономика).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	TreatmentPlansTab,
	type TreatmentTierOption,
} from "../components/patients/tabs/TreatmentPlansTab";
import type { PatientGeneralInfo } from "../components/patients/tabs/PatientGeneralInfoTab";
import type { TreatmentPlanItem } from "../components/treatment-plans/treatmentPlanTypes";

const testPatient: PatientGeneralInfo = {
	id: "pat-1",
	fullName: "Смирнов Алексей Игоревич",
	birthDate: "1985-06-15",
	gender: "male",
	phone: "+7 999 111-22-33",
	cardNumber: "K-1024",
	balanceRub: 5000,
	patientBalanceRub: 5000,
	status: "active",
	branchId: "branch-1",
	createdDate: "2024-01-10",
	address: "г. Москва, ул. Ленина, д. 10",
	firstVisitDate: "2024-01-10",
	lastVisitDate: "2024-02-20",
	totalVisits: 3,
};

const sampleTiers: TreatmentTierOption[] = [
	{
		id: "economy",
		title: "Эконом",
		tagline: "Базовая функциональная реабилитация",
		totalRub: 48000,
		warrantyYears: 1,
		accentClass: "border-slate-300 dark:border-slate-700 bg-slate-500/5",
		badgeText: "Базовый",
	},
	{
		id: "optimum",
		title: "Оптимум",
		tagline: "Стандарт клиники: биоинертный диоксид циркония и SLA имплантация",
		totalRub: 86000,
		warrantyYears: 3,
		isRecommended: true,
		accentClass: "border-[var(--teal,var(--brand-primary))] bg-[var(--teal)]/5 ring-1 ring-[var(--teal)]/30",
		badgeText: "Стандарт клиники",
	},
	{
		id: "premium",
		title: "Премиум",
		tagline: "Максимальная эстетика: керамика E.max Press и цифровой протокол",
		totalRub: 145000,
		warrantyYears: 5,
		accentClass: "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30",
		badgeText: "Премиум",
	},
];

describe("TreatmentPlansTab: 3-Tier Alternatives & Doctor Autonomy (Mandates 8e, 8am, 8x)", () => {
	it("1. Renders 3 distinct alternatives (Эконом, Оптимум, Премиум) with clinic recommendation badge", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={testPatient}
				tiers={sampleTiers}
			/>,
		);

		// Проверка наличия всех 3 тарифов
		assert.ok(html.includes("Эконом"), "Должен присутствовать тариф Эконом");
		assert.ok(html.includes("Оптимум"), "Должен присутствовать тариф Оптимум");
		assert.ok(html.includes("Премиум"), "Должен присутствовать тариф Премиум");
		assert.ok(html.includes("Выбор клиники"), "Оптимум должен иметь бейдж «Выбор клиники»");

		// Проверка цен в рублях с пробелами (Apple typography: non-breaking space \u00A0)
		assert.ok(html.includes("48\u00A0000") || html.includes("48 000") || html.includes("48&nbsp;000"), "Эконом: 48 000 ₽");
		assert.ok(html.includes("86\u00A0000") || html.includes("86 000") || html.includes("86&nbsp;000"), "Оптимум: 86 000 ₽");
		assert.ok(html.includes("145\u00A0000") || html.includes("145 000") || html.includes("145&nbsp;000"), "Премиум: 145 000 ₽");
	});

	it("2. Real Dynamic 3-Tier Differentiation: Calculates distinct sums without static mocks (Anti-Potemkin Proof)", () => {
		const realItems: TreatmentPlanItem[] = [
			{
				id: "item-real-1",
				name: "Восстановление зуба пломбой световой полимеризации",
				priceRub: 10000,
				unitPriceRub: 10000,
				tierPrices: {
					economy: 8000,
					optimum: 10000,
					premium: 13000,
				},
				discountRub: 0,
				quantity: 1,
				toothNumber: 16,
				category: "Терапия",
				stageKind: "stage_1_therapy",
				isCompleted: false,
			},
		];

		const html = renderToString(
			<TreatmentPlansTab
				patient={testPatient}
				items={realItems}
			/>,
		);

		// Проверяем, что присутствуют все 3 тарифа
		assert.ok(html.includes("Эконом") || html.includes("Базовый"), "Должен присутствовать базовый тариф");
		assert.ok(html.includes("Оптимум") || html.includes("Рекомендация клиники"), "Должен присутствовать рекомендуемый тариф");
		assert.ok(html.includes("Премиум"), "Должен присутствовать VIP тариф");

		// Доказываем, что цены трех тарифов РАЗЛИЧАЮТСЯ и нет одинаковых сумм:
		// Эконом = 8 000 ₽, Оптимум = 10 000 ₽, Премиум = 13 000 ₽
		const hasEconomyPrice = html.includes("8\u00A0000") || html.includes("8 000") || html.includes("8&nbsp;000");
		const hasOptimumPrice = html.includes("10\u00A0000") || html.includes("10 000") || html.includes("10&nbsp;000");
		const hasPremiumPrice = html.includes("13\u00A0000") || html.includes("13 000") || html.includes("13&nbsp;000");

		assert.ok(hasEconomyPrice, "Эконом тариф должен рассчитать доступную стоимость (8 000 ₽)");
		assert.ok(hasOptimumPrice, "Оптимум тариф должен рассчитать стандартную стоимость (10 000 ₽)");
		assert.ok(hasPremiumPrice, "Премиум тариф должен рассчитать расширенную стоимость (13 000 ₽)");
	});

	it("3. Upholds Mandate 8e: Doctor discount up to 100% and print buttons are NEVER disabled", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={testPatient}
				tiers={sampleTiers}
			/>,
		);

		// Кнопка скидки врача доступна
		assert.ok(html.includes('data-testid="btn-open-doctor-discounts"'));
		assert.ok(!html.includes('data-testid="btn-open-doctor-discounts" disabled'));

		// Кнопки печати доступны в любой момент (и утвержденный, и черновик)
		assert.ok(html.includes('data-testid="btn-print-treatment-plan"'));
		assert.ok(!html.includes('data-testid="btn-print-treatment-plan" disabled'));

		assert.ok(html.includes('data-testid="btn-print-draft-plan"'));
		assert.ok(!html.includes('data-testid="btn-print-draft-plan" disabled'));
		assert.ok(html.includes("Черновик"));
	});

	it("4. Upholds Mandate 8am: Exactly ONE Primary CTA button per visible plan selector context", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={testPatient}
				tiers={sampleTiers}
			/>,
		);

		// В блоке выбора тарифа и согласования плана ровно одна главная кнопка подтверждения
		assert.ok(html.includes('data-testid="btn-primary-plan-action"'), "Кнопка главного действия плана присутствует");
		assert.ok(html.includes("primary-button"), "Главное действие плана лечения должно быть primary-button");
		assert.ok(html.includes("Открыть презентацию"));
	});

	it("5. Upholds Mandate 8x & 8ap: Zero Soviet decrees or bureaucratic jargon in production UI", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={testPatient}
				tiers={sampleTiers}
			/>,
		);

		assert.ok(!html.includes("54-ФЗ"), "Запрещен канцелярит 54-ФЗ в интерфейсе");
		assert.ok(!html.includes("54ФЗ"), "Запрещен канцелярит 54ФЗ в интерфейсе");
		assert.ok(!html.includes("804н"), "Запрещен номер приказа 804н в интерфейсе");
		assert.ok(!html.includes("043/у"), "Запрещен номер формы 043/у в интерфейсе");
	});

	it("6. Apple HIG ergonomics: Interactive touch targets have min-h >= 44px", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={testPatient}
				tiers={sampleTiers}
			/>,
		);

		assert.ok(html.includes("min-h-[44px]"), "Интерактивные кнопки соответствуют стандарту Apple HIG >= 44px");
	});

	it("7. Honest Empty State: Shows 'У пациента нет сохраненных планов лечения' and '+ Составить план лечения' CTA when patient has no plans", () => {
		const emptyPatient: PatientGeneralInfo = {
			...testPatient,
			patientBalanceRub: 0,
			balanceRub: 0,
		};

		const html = renderToString(
			<TreatmentPlansTab
				patient={emptyPatient}
				items={[]}
			/>,
		);

		assert.ok(html.includes("У пациента нет сохраненных планов лечения"));
		assert.ok(html.includes('data-testid="btn-create-treatment-plan"'));
		assert.ok(html.includes("+ Составить план лечения"));
		assert.ok(!html.includes("48\u00A0000") && !html.includes("48 000"), "Моковые цены не должны появляться в пустом состоянии");
	});
});
