/**
 * treatmentPlanStudioSSOT.test.tsx — Исчерпывающий Red Team тест канонической студии планов лечения (SSOT).
 * Проверяет: 3 канонических тарифа, 4 клинических этапа, BIGINT копейки, скидки врача до 100%,
 * 0 disabled кнопок (Мандат 8e), фильтрацию микро-расходников, Apple HIG эргономику (390x844).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	CANONICAL_TIER_DEFINITIONS,
	CANONICAL_CLINICAL_STAGES,
	buildCanonical3TierPlans,
	applyDoctorDiscountToTiers,
	generateTreatmentPlanFromDiagnosis,
	isTreatmentPlanExpired,
	sanitizePatientPresentationStages,
} from "../treatmentPlanCatalogData";
import { TreatmentPlanStudioModal } from "../TreatmentPlanStudioModal";
import type { TreatmentPlanStage } from "../treatmentPlanTypes";

describe("TreatmentPlanStudioModal & SSOT Architecture Invariants", () => {
	it("1. Три канонических тарифа: Эконом, ★ Оптимум, Премиум с гарантиями и ценами", () => {
		assert.equal(CANONICAL_TIER_DEFINITIONS.length, 3, "Должно быть ровно 3 канонических тарифа");

		const [economy, optimum, premium] = CANONICAL_TIER_DEFINITIONS;
		assert.ok(economy && optimum && premium);
		assert.equal(economy.id, "economy");
		assert.equal(economy.title, "Эконом");
		assert.equal(economy.warrantyYears, 1);
		assert.equal(economy.isRecommended, false);

		assert.equal(optimum.id, "optimum");
		assert.equal(optimum.title, "★ Оптимум");
		assert.equal(optimum.warrantyYears, 3);
		assert.equal(optimum.isRecommended, true, "Оптимальный тариф обязан быть рекомендуемым стандартом");

		assert.equal(premium.id, "premium");
		assert.equal(premium.title, "Премиум");
		assert.equal(premium.warrantyYears, 10);
		assert.equal(premium.isRecommended, false);
	});

	it("2. Четыре канонических этапа комплексного плана: Санация, Терапия, Хирургия, Ортопедия", () => {
		assert.equal(CANONICAL_CLINICAL_STAGES.length, 4, "Комплексный план обязан содержать 4 базовых этапа");

		const [hygiene, therapy, surgery, orthopedics] = CANONICAL_CLINICAL_STAGES;
		assert.ok(hygiene && therapy && surgery && orthopedics);
		assert.equal(hygiene.stageNumber, 1);
		assert.match(hygiene.title, /Санация и гигиена/);

		assert.equal(therapy.stageNumber, 2);
		assert.match(therapy.title, /Терапия и эндодонтия/);

		assert.equal(surgery.stageNumber, 3);
		assert.match(surgery.title, /Хирургия и имплантация/);

		assert.equal(orthopedics.stageNumber, 4);
		assert.match(orthopedics.title, /Ортопедия и протезирование/);
	});

	it("3. Точные целочисленные копейки (amountKopecks: BIGINT) без ошибок округления float", () => {
		const tiers = buildCanonical3TierPlans();
		assert.equal(tiers.length, 3);

		for (const tier of tiers) {
			assert.equal(tier.totalKopecks, tier.totalRub * 100, "totalKopecks обязан быть равен totalRub * 100");

			const sumOfStagesRub = tier.stages.reduce((acc, s) => acc + s.totalRub, 0);
			assert.equal(tier.totalRub, sumOfStagesRub, "Сумма тарифа обязана совпадать с суммой его этапов");

			for (const stage of tier.stages) {
				assert.equal(stage.totalKopecks, stage.totalRub * 100);
				const sumOfItemsRub = stage.items.reduce((acc, it) => acc + it.priceRub, 0);
				assert.equal(stage.totalRub, sumOfItemsRub, "Сумма этапа обязана совпадать с суммой процедур");
			}
		}
	});

	it("4. Автономия врача (Мандат 8e): скидки 0%, 10%, 20%, 50% без паролей и блокировок", () => {
		const baseTiers = buildCanonical3TierPlans();

		// 0%
		const t0 = applyDoctorDiscountToTiers(baseTiers, 0);
		assert.ok(t0[0] && baseTiers[0]);
		assert.equal(t0[0].totalRub, baseTiers[0].totalRub);

		// 20%
		const t20 = applyDoctorDiscountToTiers(baseTiers, 20);
		for (let i = 0; i < baseTiers.length; i++) {
			const b = baseTiers[i];
			const t = t20[i];
			assert.ok(b && t);
			const sumStages = t.stages.reduce((acc, s) => acc + s.totalRub, 0);
			assert.equal(t.totalRub, sumStages);
			assert.equal(t.totalKopecks, sumStages * 100);
			assert.ok(Math.abs(t.totalRub - Math.round(b.totalRub * 0.8)) <= b.stages.length);
		}

		// 50%
		const t50 = applyDoctorDiscountToTiers(baseTiers, 50);
		for (let i = 0; i < baseTiers.length; i++) {
			const b = baseTiers[i];
			const t = t50[i];
			assert.ok(b && t);
			const sumStages = t.stages.reduce((acc, s) => acc + s.totalRub, 0);
			assert.equal(t.totalRub, sumStages);
			assert.equal(t.totalKopecks, sumStages * 100);
			assert.ok(Math.abs(t.totalRub - Math.round(b.totalRub * 0.5)) <= b.stages.length);
		}
	});

	it("5. Свобода гарантийной скидки 100%: итоговая сумма плана и всех этапов равна 0 ₽ и 0 коп.", () => {
		const baseTiers = buildCanonical3TierPlans();
		const discount100 = applyDoctorDiscountToTiers(baseTiers, 100);

		for (const tier of discount100) {
			assert.equal(tier.totalRub, 0, "При 100% скидке сумма плана равна 0");
			assert.equal(tier.totalKopecks, 0, "При 100% скидке копейки равны 0");

			for (const stage of tier.stages) {
				assert.equal(stage.totalRub, 0);
				assert.equal(stage.totalKopecks, 0);
				for (const item of stage.items) {
					assert.equal(item.priceRub, 0);
				}
			}
		}
	});

	it("6. Фильтрация микро-расходников для пациента: скрытие валиков, перчаток и салфеток", () => {
		const dirtyStages: TreatmentPlanStage[] = [
			{
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Терапевтический приём",
				subtitle: "",
				clinicalGoal: "",
				totalRub: 6000,
				totalKopecks: 600000,
				estimatedVisits: 1,
				estimatedWeeks: 1,
				status: "draft",
				items: [
					{
						id: "proc-1",
						toothNumber: 16,
						code804n: "A16.07.002",
						name: "Пломбирование зуба 16 светоотверждаемым композитом",
						priceRub: 5500,
						unitPriceRub: 5500,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
					{
						id: "consumable-1",
						code804n: "",
						name: "Ватные валики стоматологические стерильные (упаковка)",
						priceRub: 150,
						unitPriceRub: 150,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
					{
						id: "consumable-2",
						code804n: "",
						name: "Перчатки нитриловые смотровые неопудренные",
						priceRub: 200,
						unitPriceRub: 200,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
					{
						id: "consumable-3",
						code804n: "",
						name: "Салфетка нагрудная стоматологическая одноразовая",
						priceRub: 50,
						unitPriceRub: 50,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
				],
			},
		];

		const sanitized = sanitizePatientPresentationStages(dirtyStages);
		assert.ok(sanitized[0] && sanitized[0].items[0]);
		assert.equal(sanitized[0].items.length, 1, "Все микро-расходники обязаны быть отфильтрованы");
		assert.equal(sanitized[0].items[0].id, "proc-1");
		assert.match(sanitized[0].items[0].name, /Пломбирование зуба 16/);
	});

	it("7. 1-клик генератор плана по диагнозу K02 (Кариес дентина)", () => {
		const cariesPlan = generateTreatmentPlanFromDiagnosis("K02.1", 16);
		assert.equal(cariesPlan.length, 1);
		assert.ok(cariesPlan[0] && cariesPlan[0].items[0]);
		assert.equal(cariesPlan[0].stageKind, "stage_1_therapy");
		assert.match(cariesPlan[0].items[0].name, /Восстановление зуба 16/);
		assert.equal(cariesPlan[0].items[0].toothNumber, 16);
	});

	it("8. 1-клик генератор плана по диагнозу K04 (Пульпит / Эндодонтия)", () => {
		const endoPlan = generateTreatmentPlanFromDiagnosis("K04.0", 26);
		assert.equal(endoPlan.length, 1);
		assert.ok(endoPlan[0] && endoPlan[0].items[0]);
		assert.equal(endoPlan[0].items.length, 2);
		assert.match(endoPlan[0].items[0].name, /Обработка корневых каналов зуба 26/);
		assert.equal(endoPlan[0].items[0].toothNumber, 26);
	});

	it("9. 1-клик генератор плана по диагнозу K08 (Имплантация и ортопедия)", () => {
		const implPlan = generateTreatmentPlanFromDiagnosis("K08.1", 36);
		assert.equal(implPlan.length, 2);
		assert.ok(implPlan[0] && implPlan[1] && implPlan[0].items[0] && implPlan[1].items[0]);
		assert.equal(implPlan[0].stageKind, "stage_2_surgery");
		assert.equal(implPlan[1].stageKind, "stage_3_orthopedics");
		assert.match(implPlan[0].items[0].name, /Установка имплантата/);
		assert.match(implPlan[1].items[0].name, /Коронка из диоксида циркония/);
	});

	it("10. Проверка срока действия плана (30 дней): истечение НЕ блокирует врача (Мандат 8e)", () => {
		const freshDate = new Date().toISOString();
		const freshCheck = isTreatmentPlanExpired(freshDate);
		assert.equal(freshCheck.isExpired, false);

		const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
		const oldCheck = isTreatmentPlanExpired(oldDate);
		assert.equal(oldCheck.isExpired, true);
		assert.ok(oldCheck.warningNotice?.includes("Врач сохраняет право согласовать продолжение лечения"));
	});

	it("11. Рендеринг TreatmentPlanStudioModal: заголовок, пациент и лечащий врач", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Соколова Ольга Дмитриевна"
				doctorFullName="Д-р Воронов М.С."
			/>
		);

		assert.ok(html.includes("data-testid=\"treatment-plan-studio-modal\""));
		assert.ok(html.includes("Соколова Ольга Дмитриевна"));
		assert.ok(html.includes("Д-р Воронов М.С."));
	});

	it("12. Ровно 1 Primary CTA кнопка #0d9488 на видимый экран (Мандат 8am)", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
			/>
		);

		assert.ok(html.includes("data-testid=\"approve-treatment-plan-btn\""));
		assert.ok(html.includes("tp-primary-cta-btn"));
		assert.ok(html.includes("Утвердить выбранный план"));
	});

	it("13. Ноль заблокированных кнопок (Мандат 8e: disabled кнопки запрещены)", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
			/>
		);

		assert.ok(!html.includes("disabled=\"\""), "В студии планов лечения кнопки НИКОГДА не блокируются");
	});

	it("14. Apple HIG Мобильный Segmented Control и тактильный Drag Handle (390x844)", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
			/>
		);

		assert.ok(html.includes("tp-segmented-control"), "Должен присутствовать мобильный Segmented Control");
		assert.ok(html.includes("tp-studio-drag-handle"), "Должен присутствовать тактильный Drag Handle");
		assert.ok(html.includes("rounded-t-[24px]"), "Верхние углы шторки обязаны быть скруглены на 24px");
	});

	it("15. Сенсорный минимум >= 44x44px и Natural Thumb Zone (Мандат 8al / Apple HIG)", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
			/>
		);

		assert.ok(html.includes("min-h-[44px]"), "Интерактивные элементы обязаны иметь высоту не менее 44px");
		assert.ok(html.includes("min-h-[52px]"), "Primary CTA обязан иметь комфортную высоту 52px");
		assert.ok(html.includes("safe-area-inset-bottom"), "Подвал обязан учитывать безопасную зону iPhone Home Bar");
	});

	it("16. Наличие 3 встроенных табов студии (Мандат 8aq: ликвидация оторванных модалок)", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
			/>
		);

		assert.ok(html.includes("data-testid=\"tab-tiers-stages\""), "Таб тарифов и этапов");
		assert.ok(html.includes("data-testid=\"tab-clinical-bundles\""), "Таб клинических пакетов");
		assert.ok(html.includes("data-testid=\"tab-curator-assignment\""), "Таб куратора плана");
		assert.ok(html.includes("Тарифы и этапы"));
		assert.ok(html.includes("Клинические пакеты"));
		assert.ok(html.includes("Куратор плана"));
	});

	it("17. Рендеринг таба клинических пакетов StudioClinicalBundlesTab: категории и кнопки включения", async () => {
		const { StudioClinicalBundlesTab } = await import("../studioTabs/StudioClinicalBundlesTab");
		const html = renderToString(
			<StudioClinicalBundlesTab onAddBundleToStages={() => {}} />
		);

		assert.ok(html.includes("data-testid=\"studio-clinical-bundles-tab\""));
		assert.ok(html.includes("Все пакеты"));
		assert.ok(html.includes("Терапия"));
		assert.ok(html.includes("Хирургия"));
		assert.ok(html.includes("+ Включить в план"));
	});

	it("18. Рендеринг таба куратора StudioCuratorAssignmentTab: выбор куратора и этапы воронки", async () => {
		const { StudioCuratorAssignmentTab } = await import("../studioTabs/StudioCuratorAssignmentTab");
		const html = renderToString(
			<StudioCuratorAssignmentTab doctorFullName="Д-р Орлов А.В." />
		);

		assert.ok(html.includes("data-testid=\"studio-curator-assignment-tab\""));
		assert.ok(html.includes("Ответственный куратор плана"));
		assert.ok(html.includes("Веду сам (Д-р Орлов А.В.)"));
		assert.ok(html.includes("Текущий этап воронки"));
	});

	it("19. DirectTreatmentPlanLauncher: ликвидация захардкоженных ФИО и реактивная гидратация", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");
		const relPath = "src/components/treatment-plans/DirectTreatmentPlanLauncher.tsx";
		const fullPath = fs.existsSync(relPath) ? relPath : path.resolve(process.cwd(), "apps/web", relPath);
		const code = fs.readFileSync(fullPath, "utf-8");

		assert.ok(!code.includes('"Смирнова Екатерина Васильевна"'), "Захардкоженное имя Смирновой должно быть вырезано");
		assert.ok(!code.includes('"Д-р Орлов А.В. (Главный врач)"'), "Захардкоженное имя врача должно быть вырезано");
		assert.ok(code.includes("usePatientStore"), "Должен использовать usePatientStore");
		assert.ok(code.includes("useAppStore"), "Должен использовать useAppStore");
	});

	it("20. Честный пустой стейт студии: отображение карточки «План лечения ещё не сформирован» и 3 кнопок старта", () => {
		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Тестовый Пациент"
				doctorFullName="Д-р Тестов"
				initialStages={[]}
			/>
		);

		assert.ok(html.includes("data-testid=\"treatment-plan-empty-state\""), "Должна быть карточка пустого стейта");
		assert.ok(html.includes("План лечения ещё не сформирован"));
		assert.ok(html.includes("data-testid=\"btn-generate-from-formula\""), "Кнопка «Сформировать из зубной формулы»");
		assert.ok(html.includes("data-testid=\"btn-canonical-protocol\""), "Кнопка «Полный клинический протокол»");
		assert.ok(html.includes("data-testid=\"btn-add-procedure-empty\""), "Кнопка «Добавить процедуру»");
	});

	it("21. Гидратация этапов через initialStages: рендеринг переданных этапов и сумм", () => {
		const customStages: TreatmentPlanStage[] = [
			{
				id: "stage-custom-test",
				stageNumber: 1,
				stageKind: "stage_1_therapy",
				title: "Индивидуальный терапевтический этап",
				subtitle: "Лечение кариеса",
				clinicalGoal: "Восстановление анатомической формы",
				totalRub: 8000,
				totalKopecks: 800000,
				estimatedVisits: 1,
				estimatedWeeks: 1,
				status: "draft",
				items: [
					{
						id: "item-custom-test-1",
						name: "Реставрация зуба 21 композитом Gradia Direct",
						toothNumber: 21,
						priceRub: 8000,
						unitPriceRub: 8000,
						discountRub: 0,
						quantity: 1,
						stageKind: "stage_1_therapy",
						isCompleted: false,
					},
				],
			},
		];

		const html = renderToString(
			<TreatmentPlanStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Тестовый Пациент"
				doctorFullName="Д-р Тестов"
				initialStages={customStages}
			/>
		);

		assert.ok(!html.includes("data-testid=\"treatment-plan-empty-state\""), "Пустой стейт не должен отображаться при наличии этапов");
		assert.ok(html.includes("Индивидуальный терапевтический этап"));
		assert.ok(html.includes("Реставрация зуба 21 композитом Gradia Direct"));
	});

	it("22. Вкладка рассрочки 0% StudioInstallmentTab: выбор срока 3, 6, 12, 24 мес. и 0% переплат клинике", async () => {
		const { StudioInstallmentTab } = await import("../studioTabs/StudioInstallmentTab");
		const tiers = buildCanonical3TierPlans();
		assert.ok(tiers[1]);
		const html = renderToString(
			<StudioInstallmentTab
				activeTier={tiers[1]}
				patientName="Пациент Тест"
			/>
		);

		assert.ok(html.includes("data-testid=\"studio-installment-tab\""), "Должен монтироваться контейнер рассрочки");
		assert.ok(html.includes("0% переплат клинике"));
		assert.ok(html.includes("data-testid=\"installment-term-3-btn\""));
		assert.ok(html.includes("data-testid=\"installment-term-6-btn\""));
		assert.ok(html.includes("data-testid=\"installment-term-12-btn\""));
		assert.ok(html.includes("data-testid=\"installment-term-24-btn\""));
		assert.ok(html.includes("0% взнос"));
	});

	it("23. Налоговый вычет 13% НДФЛ в StudioInstallmentTab: расчет возврата и чистой стоимости лечения", async () => {
		const { StudioInstallmentTab } = await import("../studioTabs/StudioInstallmentTab");
		const tiers = buildCanonical3TierPlans();
		assert.ok(tiers[1]);
		const html = renderToString(
			<StudioInstallmentTab
				activeTier={tiers[1]}
				patientName="Пациент Тест"
			/>
		);

		assert.ok(html.includes("Налоговый вычет 13% НДФЛ"));
		assert.ok(html.includes("Возврат пациенту:"));
		assert.ok(html.includes("Фактическая стоимость лечения с учетом вычета:"));
		assert.ok(html.includes("КНД 1151156"));
	});

	it("24. Обратная совместимость: экспорт канонического алиаса TreatmentPlanPresenterModal", async () => {
		const mod = await import("../index");
		assert.ok(mod.TreatmentPlanPresenterModal, "TreatmentPlanPresenterModal must be exported from index");
		assert.equal(mod.TreatmentPlanPresenterModal, mod.TreatmentPlanStudioModal, "Presenter must be alias of StudioModal");
	});
});
