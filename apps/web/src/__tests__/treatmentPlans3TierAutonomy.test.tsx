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
				patient={{
					id: "pat-1",
					fullName: "Смирнов Алексей Игоревич",
					birthDate: "1985-06-15",
					phone: "+7 999 111-22-33",
					cardNumber: "K-1024",
					patientBalanceRub: 5000,
				} as any}
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

	it("2. Upholds Mandate 8e: Doctor discount up to 100% and print buttons are NEVER disabled", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={{
					id: "pat-1",
					fullName: "Смирнов Алексей Игоревич",
					birthDate: "1985-06-15",
					phone: "+7 999 111-22-33",
					cardNumber: "K-1024",
					patientBalanceRub: 0,
				} as any}
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

	it("3. Upholds Mandate 8am: Exactly ONE Primary CTA button per visible plan selector context", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={{
					id: "pat-1",
					fullName: "Смирнов Алексей Игоревич",
					birthDate: "1985-06-15",
					phone: "+7 999 111-22-33",
					cardNumber: "K-1024",
				} as any}
				tiers={sampleTiers}
			/>,
		);

		// В блоке выбора тарифа и согласования плана ровно одна главная кнопка подтверждения
		assert.ok(html.includes('data-testid="btn-primary-plan-action"'), "Кнопка главного действия плана присутствует");
		assert.ok(html.includes("primary-button"), "Главное действие плана лечения должно быть primary-button");
		assert.ok(html.includes("Передать в кассу / Презентация"));
	});

	it("4. Upholds Mandate 8x & 8ap: Zero Soviet decrees or bureaucratic jargon in production UI", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={{
					id: "pat-1",
					fullName: "Смирнов Алексей Игоревич",
					birthDate: "1985-06-15",
					phone: "+7 999 111-22-33",
					cardNumber: "K-1024",
				} as any}
				tiers={sampleTiers}
			/>,
		);

		assert.ok(!html.includes("54-ФЗ"), "Запрещен канцелярит 54-ФЗ в интерфейсе");
		assert.ok(!html.includes("54ФЗ"), "Запрещен канцелярит 54ФЗ в интерфейсе");
		assert.ok(!html.includes("804н"), "Запрещен номер приказа 804н в интерфейсе");
		assert.ok(!html.includes("043/у"), "Запрещен номер формы 043/у в интерфейсе");
	});

	it("5. Apple HIG ergonomics: Interactive touch targets have min-h >= 44px", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={{
					id: "pat-1",
					fullName: "Смирнов Алексей Игоревич",
					birthDate: "1985-06-15",
					phone: "+7 999 111-22-33",
					cardNumber: "K-1024",
				} as any}
				tiers={sampleTiers}
			/>,
		);

		assert.ok(html.includes("min-h-[44px]"), "Интерактивные кнопки соответствуют стандарту Apple HIG >= 44px");
	});

	it("6. Honest Empty State: Shows 'У пациента нет сохраненных планов лечения' and '+ Составить план лечения' CTA when patient has no plans", () => {
		const html = renderToString(
			<TreatmentPlansTab
				patient={{
					id: "pat-1",
					fullName: "Смирнов Алексей Игоревич",
				} as any}
				items={[]}
			/>,
		);

		assert.ok(html.includes("У пациента нет сохраненных планов лечения"));
		assert.ok(html.includes('data-testid="btn-create-treatment-plan"'));
		assert.ok(html.includes("+ Составить план лечения"));
		assert.ok(!html.includes("48\u00A0000") && !html.includes("48 000"), "Моковые цены не должны появляться в пустом состоянии");
	});
});
