/**
 * patientCasePresenterEngine.ts — AI Patient Case Presenter («Переводчик с врачебного на человеческий»).
 *
 * Standalone Trojan module for orthopedists, implantologists, and clinic treatment coordinators.
 * Solves the #1 cause of lost clinical revenue: patients leaving "to think about it" after
 * being presented with frightening 450 000 ₽ estimates filled with medical jargon.
 *
 * Generates a 3-slide visual case presentation:
 * Slide 1: «Что с вашими зубами сейчас» (Human Diagnosis & Visual Problem).
 * Slide 2: «Что произойдет, если отложить» (Risks of Inaction & Cost Escalation).
 * Slide 3: «Пошаговый маршрут и комфортные платежи» (Staged Roadmap & Installment Transparency).
 */

import { z } from "zod";
import { generateSecureAlphanumericId } from "../utils/idGenerators.js";

// ─── 1. DICTIONARY: MEDICAL JARGON ➔ HUMAN RUSSIAN ──────────────────────────

export const DENTAL_JARGON_TRANSLATIONS: Record<string, { humanTitle: string; explanation: string }> = {
	"синус-лифтинг": {
		humanTitle: "Бережное наращивание кости гайморовой пазухи",
		explanation: "Создаем надежный фундамент из безопасного костного материала, чтобы имплант стоял неподвижно десятилетиями.",
	},
	"остеоинтеграция": {
		humanTitle: "Сращение импланта с костной тканью",
		explanation: "Естественный процесс, когда титановый корень становится единым целым с челюстью.",
	},
	"абатмент": {
		humanTitle: "Переходник между корнем и коронкой",
		explanation: "Высокоточная титановая или циркониевая опора, на которую надежно фиксируется видимый зуб.",
	},
	"формирователь десны": {
		humanTitle: "Создание красивого контура десны",
		explanation: "Временный колпачок, который формирует ровный естественный край десны вокруг будущего зуба.",
	},
	"костная пластика": {
		humanTitle: "Восстановление толщины кости",
		explanation: "Возвращаем естественный объем костной ткани там, где после удаления зуба произошла атрофия.",
	},
	"пульпит": {
		humanTitle: "Воспаление нерва зуба",
		explanation: "Глубокая инфекция дошла до нерва. Требуется бережная очистка и герметичное пломбирование каналов под микроскопом.",
	},
	"периодонтит": {
		humanTitle: "Воспаление у верхушки корня зуба",
		explanation: "Инфекция вышла за пределы зуба в кость. Без лечения формируется киста и зуб придется удалять.",
	},
	"окклюзия": {
		humanTitle: "Правильное смыкание зубов при жевании",
		explanation: "Баланс челюстей, при котором зубы не скалываются, а сустав челюсти не щелкает и не болит.",
	},
	"резорбция кости": {
		humanTitle: "Убыль и истончение костной ткани",
		explanation: "Без жевательной нагрузки кость растворяется, как мышца без тренировок, уменьшаясь на 2–4 мм в год.",
	},
	"попов-годон": {
		humanTitle: "Выдвижение противоположного зуба в пустоту",
		explanation: "Когда зуб потерян, его сосед сверху опускается вниз, расшатывается и блокирует движение челюсти.",
	},
	"диоксид циркония": {
		humanTitle: "Сверхпрочная белая биокерамика",
		explanation: "Материал космической прочности цвета натурального зуба, не вызывающий аллергии и темных полос у десны.",
	},
};

// ─── 2. INPUT SCHEMAS ────────────────────────────────────────────────────────

export const rawPlanItemSchema = z.object({
	code: z.string().optional(),
	name: z.string().min(2),
	tooth: z.number().int().min(11).max(85).optional(),
	quantity: z.number().int().min(1).default(1),
	priceRub: z.number().positive(),
	category: z.enum(["diagnostics", "therapy", "surgery_implant", "prosthetics", "hygiene", "other"]).default("other"),
});
export type RawPlanItem = z.infer<typeof rawPlanItemSchema>;

export const patientCasePresenterInputSchema = z.object({
	patientFullName: z.string().min(2),
	doctorFullName: z.string().min(2),
	clinicName: z.string().default("Стоматологическая клиника"),
	clinicPhone: z.string().default("+7 (000) 000-00-00"),
	planTitle: z.string().default("Комплексный план лечения"),
	items: z.array(rawPlanItemSchema).min(1),
	patientMainConcern: z.string().optional(),
	installmentAvailable: z.boolean().default(true),
	maxInstallmentMonths: z.number().int().min(3).max(36).default(12),
});
export type PatientCasePresenterInput = z.infer<typeof patientCasePresenterInputSchema>;

// ─── 3. PRESENTATION SLIDES SCHEMAS ──────────────────────────────────────────

export const slideDiagnosisSchema = z.object({
	slideType: z.literal("diagnosis"),
	title: z.string(),
	headlineRu: z.string(),
	summaryRu: z.string(),
	bulletPointsRu: z.array(z.string()),
	primaryFocusAreas: z.array(z.string()),
});
export type SlideDiagnosis = z.infer<typeof slideDiagnosisSchema>;

export const slideRisksSchema = z.object({
	slideType: z.literal("risks"),
	title: z.string(),
	headlineRu: z.string(),
	costOfInactionHeadlineRu: z.string(),
	timelineProgression: z.array(
		z.object({
			timeframeRu: z.string(),
			clinicalConsequenceRu: z.string(),
			financialRiskRu: z.string(),
		}),
	),
	escalatedCostEstimateRub: z.number().positive(),
});
export type SlideRisks = z.infer<typeof slideRisksSchema>;

export const roadmapStageSchema = z.object({
	stageNumber: z.number().int().min(1),
	stageTitleRu: z.string(),
	durationRu: z.string(),
	goalRu: z.string(),
	costRub: z.number().nonnegative(),
	itemsSummaryRu: z.array(z.string()),
});
export type RoadmapStage = z.infer<typeof roadmapStageSchema>;

export const slideRoadmapSchema = z.object({
	slideType: z.literal("roadmap"),
	title: z.string(),
	headlineRu: z.string(),
	totalPlanCostRub: z.number().positive(),
	stages: z.array(roadmapStageSchema),
	installmentOfferRu: z.string().optional(),
	monthlyPaymentEstimateRub: z.number().optional(),
});
export type SlideRoadmap = z.infer<typeof slideRoadmapSchema>;

export const patientCasePresentationSchema = z.object({
	presentationId: z.string(),
	shareToken: z.string(),
	patientDisplayName: z.string(),
	doctorFullName: z.string(),
	clinicName: z.string(),
	clinicPhone: z.string(),
	slides: z.object({
		diagnosis: slideDiagnosisSchema,
		risks: slideRisksSchema,
		roadmap: slideRoadmapSchema,
	}),
	createdAt: z.string().datetime(),
});
export type PatientCasePresentation = z.infer<typeof patientCasePresentationSchema>;

// ─── 4. LOGIC ENGINE FUNCTIONS ────────────────────────────────────────────────

export function humanizeDentalText(text: string): string {
	const lower = text.toLowerCase();
	for (const [jargonKey, item] of Object.entries(DENTAL_JARGON_TRANSLATIONS)) {
		if (lower.includes(jargonKey)) {
			return `${item.humanTitle} (${item.explanation})`;
		}
	}
	return text;
}

/**
 * Генерация комплексной понятной пациенту микро-презентации клинического кейса.
 */
export function generatePatientCasePresentation(
	input: PatientCasePresenterInput,
): PatientCasePresentation {
	const parsed = patientCasePresenterInputSchema.parse(input);
	const presentationId = `case_${generateSecureAlphanumericId(12)}`;
	const shareToken = generateSecureAlphanumericId(8);
	const nowIso = new Date().toISOString();

	const totalCostRub = parsed.items.reduce((sum, it) => sum + it.priceRub * it.quantity, 0);

	// Анализ категорий процедур
	const hasSurgery = parsed.items.some(
		(it) => it.category === "surgery_implant" || /имплант|синус|удален/i.test(it.name),
	);
	const hasProsthetics = parsed.items.some(
		(it) => it.category === "prosthetics" || /коронк|протез|винир|циркон/i.test(it.name),
	);
	const hasTherapy = parsed.items.some(
		(it) => it.category === "therapy" || /пломб|кариес|канал|пульпит/i.test(it.name),
	);

	// ── СЛАЙД 1: ДИАГНОСТИКА
	const bulletPointsRu: string[] = [];
	const primaryFocusAreas: string[] = [];

	if (hasSurgery && hasProsthetics) {
		bulletPointsRu.push("Отсутствие зубов приводит к перегрузке соседних и их преждевременному разрушению");
		bulletPointsRu.push("В зоне дефекта костная ткань постепенно истончается без жевательной стимуляции");
		primaryFocusAreas.push("Восстановление фундамента (имплантация)");
		primaryFocusAreas.push("Эстетическое протезирование");
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
		slideType: "diagnosis",
		title: "Что с зубами сейчас",
		headlineRu: parsed.planTitle,
		summaryRu: parsed.patientMainConcern
			? `Обращение: «${parsed.patientMainConcern}». По результатам осмотра выявлена необходимость комплексного восстановления.`
			: "По результатам осмотра и снимков составлен план для полного восстановления жевательной функции и улыбки.",
		bulletPointsRu,
		primaryFocusAreas,
	};

	// ── СЛАЙД 2: РИСКИ И ПОСЛЕДСТВИЯ БЕЗДЕЙСТВИЯ
	const escalatedCostEstimateRub = Math.round(totalCostRub * 1.45);
	const timelineProgression = [
		{
			timeframeRu: "Через 3 месяца",
			clinicalConsequenceRu: "Соседние зубы начинают наклоняться в сторону свободного пространства.",
			financialRiskRu: "Потребуется предварительное выравнивание перед протезированием (+15–20% к бюджету).",
		},
		{
			timeframeRu: "Через 6 месяцев",
			clinicalConsequenceRu: "Костная ткань челюсти истончается на 1.5–2 мм из-за отсутствия нагрузки.",
			financialRiskRu: "Имплантация потребует дополнительной костной пластики (+35 000 – 60 000 ₽ за зону).",
		},
		{
			timeframeRu: "Через 12 месяцев",
			clinicalConsequenceRu: "Выдвижение зубов противоположной челюсти (эффект Попова-Годона), перегрузка ВНЧС.",
			financialRiskRu: `Общая стоимость восстановительного лечения вырастет до ~${escalatedCostEstimateRub.toLocaleString("ru-RU")} ₽.`,
		},
	];

	const slideRisks: SlideRisks = {
		slideType: "risks",
		title: "Что будет, если отложить",
		headlineRu: "Почему зубы важно восстанавливать вовремя",
		costOfInactionHeadlineRu: `Откладывание лечения на 1 год увеличивает стоимость до ${escalatedCostEstimateRub.toLocaleString("ru-RU")} ₽`,
		timelineProgression,
		escalatedCostEstimateRub,
	};

	// ── СЛАЙД 3: ПОШАГОВЫЙ МАРШРУТ И РАССРОЧКА
	const stages: RoadmapStage[] = [];
	let stageCounter = 1;

	// Группировка процедур по понятным этапам
	const therapyItems = parsed.items.filter((i) => i.category === "therapy" || i.category === "hygiene");
	const surgeryItems = parsed.items.filter((i) => i.category === "surgery_implant");
	const prostheticsItems = parsed.items.filter((i) => i.category === "prosthetics");
	const otherItems = parsed.items.filter(
		(i) => !therapyItems.includes(i) && !surgeryItems.includes(i) && !prostheticsItems.includes(i),
	);

	if (therapyItems.length > 0 || otherItems.length > 0) {
		const combined = [...therapyItems, ...otherItems];
		const stageSum = combined.reduce((s, x) => s + x.priceRub * x.quantity, 0);
		stages.push({
			stageNumber: stageCounter++,
			stageTitleRu: "Подготовка и здоровье (Санация)",
			durationRu: "1–2 недели (1–2 визита)",
			goalRu: "Устраняем воспаление, делаем гигиену и лечим кариес, создавая стерильную среду.",
			costRub: stageSum,
			itemsSummaryRu: combined.map((x) => `${x.name} (${x.quantity} шт.)`),
		});
	}

	if (surgeryItems.length > 0) {
		const stageSum = surgeryItems.reduce((s, x) => s + x.priceRub * x.quantity, 0);
		stages.push({
			stageNumber: stageCounter++,
			stageTitleRu: "Установка надежной основы (Имплантация)",
			durationRu: "1 день операция + приживление 3–4 мес.",
			goalRu: "Бережно устанавливаем титановые корни под надежной анестезией без боли и стресса.",
			costRub: stageSum,
			itemsSummaryRu: surgeryItems.map((x) => `${x.name} (${x.quantity} шт.)`),
		});
	}

	if (prostheticsItems.length > 0) {
		const stageSum = prostheticsItems.reduce((s, x) => s + x.priceRub * x.quantity, 0);
		stages.push({
			stageNumber: stageCounter++,
			stageTitleRu: "Постоянная эстетика и жевание (Коронки)",
			durationRu: "1–2 недели (2 визита: скан и фиксация)",
			goalRu: "Фиксируем анатомические керамические коронки идеального цвета натурального зуба.",
			costRub: stageSum,
			itemsSummaryRu: prostheticsItems.map((x) => `${x.name} (${x.quantity} шт.)`),
		});
	}

	// Если этапы не разбились, формируем один единый этап
	if (stages.length === 0) {
		stages.push({
			stageNumber: 1,
			stageTitleRu: "Клиническое лечение",
			durationRu: "По согласованию с доктором",
			goalRu: "Выполнение запланированных процедур.",
			costRub: totalCostRub,
			itemsSummaryRu: parsed.items.map((x) => x.name),
		});
	}

	const monthlyPaymentEstimateRub = parsed.installmentAvailable
		? Math.round(totalCostRub / parsed.maxInstallmentMonths)
		: undefined;

	const slideRoadmap: SlideRoadmap = {
		slideType: "roadmap",
		title: "Пошаговый план и комфортная оплата",
		headlineRu: `Итоговый план: ${totalCostRub.toLocaleString("ru-RU")} ₽ без скрытых доплат`,
		totalPlanCostRub: totalCostRub,
		stages,
		installmentOfferRu: parsed.installmentAvailable
			? `Доступна беспроцентная оплата по этапам или рассрочка от ${monthlyPaymentEstimateRub?.toLocaleString("ru-RU")} ₽/мес на ${parsed.maxInstallmentMonths} месяцев.`
			: "Оплата производится поэтапно, только за фактически выполненные процедуры.",
		monthlyPaymentEstimateRub,
	};

	// Имя пациента
	const nameParts = parsed.patientFullName.trim().split(/\s+/);
	const displayName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : parsed.patientFullName;

	return {
		presentationId,
		shareToken,
		patientDisplayName: displayName,
		doctorFullName: parsed.doctorFullName,
		clinicName: parsed.clinicName,
		clinicPhone: parsed.clinicPhone,
		slides: {
			diagnosis: slideDiagnosis,
			risks: slideRisks,
			roadmap: slideRoadmap,
		},
		createdAt: nowIso,
	};
}
