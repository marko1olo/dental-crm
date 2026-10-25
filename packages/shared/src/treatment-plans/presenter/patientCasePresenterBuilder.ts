/**
 * patientCasePresenterBuilder.ts — Построение слайдов презентации плана лечения DENTE.
 */

import { generateSecureAlphanumericId } from "../../utils/idGenerators.js";
import { isMicroConsumable } from "../consumables.js";
import {
	type PatientCasePresenterInput,
	type PatientCasePresentation,
	type SlideDiagnosis,
	type SlideRisks,
	type SlideRoadmap,
	type RoadmapStage,
	patientCasePresenterInputSchema,
} from "./patientCasePresenterSchemas.js";

export function generatePatientCasePresentation(
	input: PatientCasePresenterInput,
): PatientCasePresentation {
	const parsed = patientCasePresenterInputSchema.parse(input);
	const presentationId = `case_${generateSecureAlphanumericId(12)}`;
	const shareToken = generateSecureAlphanumericId(8);
	const nowIso = new Date().toISOString();
	const totalCostRub = parsed.items.reduce((sum, it) => sum + it.priceRub * it.quantity, 0);

	const hasSurgery = parsed.items.some((it) => it.category === "surgery_implant" || /имплант|синус|удален/i.test(it.name));
	const hasProsthetics = parsed.items.some((it) => it.category === "prosthetics" || /коронк|протез|винир|циркон/i.test(it.name));
	const hasTherapy = parsed.items.some((it) => it.category === "therapy" || /пломб|кариес|канал|пульпит/i.test(it.name));

	const bulletPointsRu: string[] = [];
	const primaryFocusAreas: string[] = [];
	if (hasSurgery && hasProsthetics) {
		bulletPointsRu.push("Отсутствие зубов приводит к перегрузке соседних и их преждевременному разрушению");
		bulletPointsRu.push("В зоне дефекта костная ткань постепенно истончается без жевательной стимуляции");
		primaryFocusAreas.push("Восстановление фундамента (имплантация)", "Эстетическое протезирование");
	} else if (hasProsthetics) {
		bulletPointsRu.push("Разрушение коронковой части зубов более 50%, обычная пломба не выдержит нагрузки");
		primaryFocusAreas.push("Защита зубов керамическими коронками");
	} else if (hasTherapy) {
		bulletPointsRu.push("Кариозные поражения требуют герметичной санации до перехода воспаления на нерв");
		primaryFocusAreas.push("Терапевтическое сохранение зубов");
	} else {
		bulletPointsRu.push("Требуется базовая санация и гигиенический комплекс");
		primaryFocusAreas.push("Профилактика и здоровье десен");
	}

	const slideDiagnosis: SlideDiagnosis = {
		slideType: "diagnosis", title: "Что с зубами сейчас", headlineRu: parsed.planTitle,
		summaryRu: parsed.patientMainConcern ? `Обращение: «${parsed.patientMainConcern}». По результатам осмотра выявлена необходимость восстановления.` : "По результатам осмотра составлен план для полного восстановления жевательной функции.",
		bulletPointsRu, primaryFocusAreas,
	};

	const escalatedCostEstimateRub = Math.round(totalCostRub * 1.45);
	const timelineProgression = [
		{ timeframeRu: "Через 3 месяца", clinicalConsequenceRu: "Соседние зубы наклоняются в сторону пустоты.", financialRiskRu: "Потребуется выравнивание перед протезированием (+15–20% к бюджету)." },
		{ timeframeRu: "Через 6 месяцев", clinicalConsequenceRu: "Костная ткань истончается на 1.5–2 мм без нагрузки.", financialRiskRu: "Имплантация потребует дополнительной костной пластики." },
		{ timeframeRu: "Через 12 месяцев", clinicalConsequenceRu: "Выдвижение зубов противоположной челюсти (эффект Попова-Годона), перегрузка ВНЧС.", financialRiskRu: `Общая стоимость восстановительного лечения вырастет до ~${escalatedCostEstimateRub.toLocaleString("ru-RU")} ₽.` },
	];

	const slideRisks: SlideRisks = {
		slideType: "risks", title: "Что будет, если отложить", headlineRu: "Почему зубы важно восстанавливать вовремя",
		costOfInactionHeadlineRu: `Откладывание лечения увеличивает стоимость до ${escalatedCostEstimateRub.toLocaleString("ru-RU")} ₽`,
		timelineProgression, escalatedCostEstimateRub,
	};

	const stages: RoadmapStage[] = [];
	let stageCounter = 1;
	const therapyItems = parsed.items.filter((i) => i.category === "therapy" || i.category === "hygiene");
	const surgeryItems = parsed.items.filter((i) => i.category === "surgery_implant");
	const prostheticsItems = parsed.items.filter((i) => i.category === "prosthetics");
	const otherItems = parsed.items.filter((i) => !therapyItems.includes(i) && !surgeryItems.includes(i) && !prostheticsItems.includes(i));

	if (therapyItems.length > 0 || otherItems.length > 0) {
		const combined = [...therapyItems, ...otherItems];
		const stageSum = combined.reduce((s, x) => s + x.priceRub * x.quantity, 0);
		const visible = combined.filter((x) => !isMicroConsumable(x));
		stages.push({
			stageNumber: stageCounter++, stageTitleRu: "Подготовка и здоровье (Санация)", durationRu: "1–2 недели (1–2 визита)",
			goalRu: "Устраняем воспаление, делаем гигиену и лечим кариес.", costRub: stageSum,
			itemsSummaryRu: (visible.length ? visible : combined).map((x) => `${x.name} (${x.quantity} шт.)`),
		});
	}

	if (surgeryItems.length > 0) {
		const stageSum = surgeryItems.reduce((s, x) => s + x.priceRub * x.quantity, 0);
		const visible = surgeryItems.filter((x) => !isMicroConsumable(x));
		stages.push({
			stageNumber: stageCounter++, stageTitleRu: "Установка основы (Имплантация)", durationRu: "1 день операция + приживление 3–4 мес.",
			goalRu: "Бережно устанавливаем титановые опоры под надежной анестезией.", costRub: stageSum,
			itemsSummaryRu: (visible.length ? visible : surgeryItems).map((x) => `${x.name} (${x.quantity} шт.)`),
		});
	}

	if (prostheticsItems.length > 0) {
		const stageSum = prostheticsItems.reduce((s, x) => s + x.priceRub * x.quantity, 0);
		const visible = prostheticsItems.filter((x) => !isMicroConsumable(x));
		stages.push({
			stageNumber: stageCounter++, stageTitleRu: "Постоянная эстетика (Коронки)", durationRu: "1–2 недели (2 визита)",
			goalRu: "Фиксируем анатомические керамические коронки естественного цвета.", costRub: stageSum,
			itemsSummaryRu: (visible.length ? visible : prostheticsItems).map((x) => `${x.name} (${x.quantity} шт.)`),
		});
	}

	if (stages.length === 0) {
		stages.push({
			stageNumber: 1, stageTitleRu: "Клиническое лечение", durationRu: "По согласованию с доктором",
			goalRu: "Выполнение запланированных процедур.", costRub: totalCostRub,
			itemsSummaryRu: parsed.items.map((x) => x.name),
		});
	}

	const monthlyPaymentEstimateRub = parsed.installmentAvailable ? Math.round(totalCostRub / parsed.maxInstallmentMonths) : undefined;
	const slideRoadmap: SlideRoadmap = {
		slideType: "roadmap", title: "Пошаговый план и комфортная оплата", headlineRu: `Итоговый план: ${totalCostRub.toLocaleString("ru-RU")} ₽ без скрытых доплат`,
		totalPlanCostRub: totalCostRub, stages, monthlyPaymentEstimateRub,
		installmentOfferRu: parsed.installmentAvailable ? `Доступна оплата по этапам или рассрочка от ${monthlyPaymentEstimateRub?.toLocaleString("ru-RU")} ₽/мес на ${parsed.maxInstallmentMonths} мес.` : "Оплата производится поэтапно за выполненные процедуры.",
	};

	const nameParts = parsed.patientFullName.trim().split(/\s+/);
	const displayName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : parsed.patientFullName;

	return {
		presentationId, shareToken, patientDisplayName: displayName, doctorFullName: parsed.doctorFullName,
		clinicName: parsed.clinicName, clinicPhone: parsed.clinicPhone,
		slides: { diagnosis: slideDiagnosis, risks: slideRisks, roadmap: slideRoadmap }, createdAt: nowIso,
	};
}
