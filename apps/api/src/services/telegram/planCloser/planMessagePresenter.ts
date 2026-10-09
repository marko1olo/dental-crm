import {
	kopecksToRub,
	rubToKopecks,
	splitKopecks,
} from "@dental/shared";
import {
	BANK_PROVIDERS,
	DEFAULT_TEETH_PRESET,
} from "./constants.js";
import {
	buildCuratorCallBookedKeyboard,
	buildInstallmentCalcKeyboard,
	buildInstallmentSubmittedKeyboard,
	buildObjectionCostKeyboard,
	buildObjectionDelayKeyboard,
	buildObjectionFamilyKeyboard,
	buildObjectionFearKeyboard,
	buildObjectionsRootKeyboard,
	buildRootScreenKeyboard,
	buildStagesScreenKeyboard,
} from "./planKeyboardBuilder.js";
import type {
	BankInstallmentOption,
	BankProviderKey,
	CloserScreenResult,
	InstallmentMonths,
	PendingTreatmentPlanSummary,
	TelegramInlineButton,
	TreatmentPlanStageInfo,
} from "./types.js";

/**
 * Форматирует рубли со стандартными пробелами (ASCII 0x20) вместо неразрывных NBSP (0xA0 / 0x202F),
 * гарантируя точное сопоставление в Telegram и тестах.
 */
export function formatRub(amount: number): string {
	return Math.round(amount).toLocaleString("ru-RU").replace(/[\u00A0\u202F]/g, " ");
}

/**
 * Очищает название плана для отправки в Telegram в строгом соответствии с 152-ФЗ / 323-ФЗ ст. 13.
 * Устраняет прямое сочетание «зуб/зубов №» (клиническая локализация), заменяя на нейтральное «позиции».
 */
export function sanitizePlanTitleForMessenger(title?: string | null): string {
	if (!title) return "Комплексная программа реабилитации";
	return title.replace(/(?<![а-яёА-ЯЁ])зуб[а-яёА-ЯЁ]*\s*/gi, "позиции ");
}

/**
 * Рассчитывает точный помесячный график и параметры банковской рассрочки 0%.
 * Полное отсутствие переплат: маркетинговый процент банка субсидирует клиника.
 * Расчет с точностью до копейки без потери округления.
 */
export function calculateInstallmentOption(
	totalAmountRub: number,
	months: InstallmentMonths,
	downPaymentRub = 0,
	bankProvider: BankProviderKey = "tinkoff",
): BankInstallmentOption {
	const safeTotalRub = Math.max(0, Math.round(totalAmountRub));
	const safeDownRub = Math.max(0, Math.min(safeTotalRub, Math.round(downPaymentRub)));
	const financedRub = Math.max(0, safeTotalRub - safeDownRub);

	const financedKopecks = rubToKopecks(financedRub);
	const partsKop = splitKopecks(financedKopecks, months);
	const partsRub = partsKop.map((k) => kopecksToRub(k));

	// Ежемесячный платеж (по первому взносу)
	const monthlyPaymentRub = partsRub[0] ?? 0;
	const monthlyPaymentRu = `${formatRub(monthlyPaymentRub)} ₽/мес`;

	// 13% социальный налоговый вычет по лечению (ст. 219 НК РФ)
	const ndflRefundRub = Math.round(safeTotalRub * 0.13);

	return {
		months,
		monthlyPaymentRub,
		monthlyPaymentRu,
		partsRub,
		totalAmountRub: safeTotalRub,
		downPaymentRub: safeDownRub,
		financedAmountRub: financedRub,
		overpaymentRub: 0,
		interestRatePercent: 0,
		bankProvider,
		bankNameRu: BANK_PROVIDERS[bankProvider].nameRu,
		ndflRefundRub,
	};
}

/**
 * Рассчитывает сетку вариантов рассрочки для всех стандартных сроков (3, 6, 12, 24 мес).
 */
export function calculateAllInstallmentOptions(
	totalAmountRub: number,
	downPaymentRub = 0,
	bankProvider: BankProviderKey = "tinkoff",
): Record<InstallmentMonths, BankInstallmentOption> {
	return {
		3: calculateInstallmentOption(totalAmountRub, 3, downPaymentRub, bankProvider),
		6: calculateInstallmentOption(totalAmountRub, 6, downPaymentRub, bankProvider),
		12: calculateInstallmentOption(totalAmountRub, 12, downPaymentRub, bankProvider),
		24: calculateInstallmentOption(totalAmountRub, 24, downPaymentRub, bankProvider),
	};
}

/**
 * Декомпозирует общую стоимость плана на сбалансированные клинические этапы,
 * понятные пациенту без зубоврачебного жаргона.
 */
export function buildDefaultStages(totalAmountRub: number): TreatmentPlanStageInfo[] {
	const total = Math.max(0, Math.round(totalAmountRub));
	if (total <= 0) {
		return [
			{
				stageIndex: 1,
				name: "Диагностика и гигиена",
				description: "Профессиональная гигиена и подготовка полости рта",
				priceRub: 0,
				estimatedVisits: 1,
				timelineDays: 1,
			},
		];
	}

	// Классический эталон клиники:
	// 1. Снятие воспаления и гигиена (~6-10%)
	// 2. Терапия и подготовка (~15-20%)
	// 3. Имплантация и ортопедия (~70-75%)
	const stage1Rub = Math.min(12000, Math.max(5000, Math.round(total * 0.08)));
	const stage2Rub = Math.min(45000, Math.max(15000, Math.round(total * 0.2)));
	const stage3Rub = Math.max(0, total - stage1Rub - stage2Rub);

	return [
		{
			stageIndex: 1,
			name: "Снятие воспаления и гигиена",
			description: "Комплексная гигиена AirFlow + ультразвук, устранение биопленки и санация десен",
			priceRub: stage1Rub,
			estimatedVisits: 1,
			timelineDays: 3,
		},
		{
			stageIndex: 2,
			name: "Терапия и подготовка",
			description: "Лечение и укрепление зубов под микроскопом, изоляция коффердамом, подготовка опор",
			priceRub: stage2Rub,
			estimatedVisits: 2,
			timelineDays: 14,
		},
		{
			stageIndex: 3,
			name: "Имплантация и коронки",
			description: "Установка имплантатов премиум-класса с пожизненной гарантией и циркониевые коронки",
			priceRub: stage3Rub,
			estimatedVisits: 3,
			timelineDays: 60,
		},
	];
}

/**
 * Извлекает номера зубов из списка позиций плана или строки названия.
 */
export function parseTeethNumbers(
	teethStringOrItems?: Array<{ toothNumber?: number | null }> | string | null,
): number[] {
	if (!teethStringOrItems) return [...DEFAULT_TEETH_PRESET];

	if (Array.isArray(teethStringOrItems)) {
		const set = new Set<number>();
		for (const item of teethStringOrItems) {
			if (typeof item.toothNumber === "number" && item.toothNumber > 0) {
				set.add(item.toothNumber);
			}
		}
		const result = Array.from(set).sort((a, b) => a - b);
		return result.length > 0 ? result : [...DEFAULT_TEETH_PRESET];
	}

	if (typeof teethStringOrItems === "string") {
		const matches = teethStringOrItems.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
		if (matches && matches.length > 0) {
			const unique = Array.from(new Set(matches.map((n) => Number.parseInt(n, 10)))).sort((a, b) => a - b);
			return unique;
		}
	}

	return [...DEFAULT_TEETH_PRESET];
}

/**
 * Экран 1: Приветственный бережный follow-up через 48 часов после сметы.
 */
export function getPlanCloserRootScreen(plan: PendingTreatmentPlanSummary): CloserScreenResult {
	const teethList = plan.teeth.length > 0 ? plan.teeth.join(", ") : "16, 26, 46";
	const doctorDisplayName = plan.doctorName || "Смирнова Анна Павловна";
	const totalFormatted = formatRub(plan.totalPriceRub);

	const text = [
		`Здравствуйте, <b>${plan.patientName}</b>!`,
		"",
		`Доктор <b>${doctorDisplayName}</b> подготовила подробный план лечения для позиций <b>${teethList}</b>.`,
		"",
		"Мы понимаем, что комплексное восстановление зубов — это ответственное финансовое и медицинское решение. Чтобы лечение не откладывалось и проходило комфортно, мы:",
		"• разбили все процедуры на 3 независимых этапа с поэтапной оплатой;",
		"• подготовили расчет беспроцентной рассрочки 0% от банков-партнеров (Т-Банк / Сбербанк);",
		"• предоставили персонального куратора заботы, который ответит на любые вопросы.",
		"",
		`Общая стоимость сметы: <b>${totalFormatted} ₽</b>`,
		"",
		"Выберите действие, чтобы ознакомиться с деталями:",
	].join("\n");

	const replyMarkup = buildRootScreenKeyboard(plan.planId, plan.installments[12].monthlyPaymentFormatted);

	return { text, replyMarkup };
}

/**
 * Экран 2: Разбор клинических этапов плана с прозрачными суммами.
 */
export function getPlanStagesScreen(plan: PendingTreatmentPlanSummary): CloserScreenResult {
	const teethList = plan.teeth.length > 0 ? plan.teeth.join(", ") : "16, 26, 46";
	const totalFormatted = formatRub(plan.totalPriceRub);

	const stagesLines = plan.stages.map((st) => {
		const priceFormatted = formatRub(st.priceRub);
		return [
			`<b>Этап ${st.stageIndex}: ${st.name}</b> (${priceFormatted} ₽)`,
			`<i>${st.description}</i>`,
		].join("\n");
	});

	const text = [
		"📋 <b>Поэтапный план лечения под ключ</b>",
		`Пациент: <b>${plan.patientName}</b>`,
		`Врач: <b>${plan.doctorName}</b>`,
		`Позиции: <b>${teethList}</b>`,
		"",
		...stagesLines,
		"",
		`ИТОГО: <b>${totalFormatted} ₽</b>`,
		"",
		"💡 <b>Поэтапная оплата:</b>",
		"Вам не нужно оплачивать весь план сразу! Вы можете начать только с первого этапа, а остальные подключать по мере готовности и удобного вам графика.",
	].join("\n");

	const replyMarkup = buildStagesScreenKeyboard(plan.planId, plan.installments[12].monthlyPaymentFormatted);

	return { text, replyMarkup };
}

/**
 * Экран 3: Интерактивный калькулятор банковской рассрочки 0% (Т-Банк / Сбер).
 */
export function getInstallmentCalcScreen(
	plan: PendingTreatmentPlanSummary,
	selectedMonths: InstallmentMonths = 12,
	downPaymentRub = 0,
	bankProvider: BankProviderKey = "tinkoff",
): CloserScreenResult {
	const option = calculateInstallmentOption(plan.totalPriceRub, selectedMonths, downPaymentRub, bankProvider);
	const totalFormatted = formatRub(plan.totalPriceRub);
	const monthlyFormatted = formatRub(option.monthlyPaymentRub);
	const ndflFormatted = formatRub(option.ndflRefundRub);
	const planTitle = sanitizePlanTitleForMessenger(plan.title || plan.name);

	const allOptions = calculateAllInstallmentOptions(plan.totalPriceRub, downPaymentRub, bankProvider);

	const text = [
		`🏦 <b>Беспроцентная рассрочка 0% (${option.bankNameRu})</b>`,
		"",
		`План лечения: <b>${planTitle}</b>`,
		`Общая стоимость: <b>${totalFormatted} ₽</b>`,
		"",
		`💳 <b>Выбран срок: ${selectedMonths} месяцев (0-0-${selectedMonths})</b>`,
		`• Ежемесячный платеж: <b>${monthlyFormatted} ₽/мес без переплат на ${selectedMonths} месяцев</b>`,
		"• Переплата банку: <b>0 ₽ (0%)</b> — проценты за вас оплачивает клиника!",
		"• Первый взнос: <b>0 ₽</b> (первый платеж только через 30 дней)",
		`• Налоговый вычет 13%: государство вернет вам <b>до ${ndflFormatted} ₽</b> на карту (ст. 219 НК РФ)`,
		"",
		"⚡ <b>Как оформить:</b>",
		"Одобрение за 2 минуты онлайн через СМС по паспорту или через Госуслуги / Сбер ID без поездок в банк.",
	].join("\n");

	// Кнопки переключения срока с визуальным выделением выбранного
	const termButtons: TelegramInlineButton[] = ([6, 12, 24] as const).map((m) => {
		const isCurrent = m === selectedMonths;
		const amount = formatRub(allOptions[m].monthlyPaymentRub);
		return {
			text: isCurrent ? `• ${m} мес (${amount} ₽/м) •` : `${m} мес (${amount} ₽/м)`,
			callback_data: `closer:calc:${plan.planId}:${m}`,
		};
	});

	const replyMarkup = buildInstallmentCalcKeyboard(plan.planId, selectedMonths, termButtons);

	return { text, replyMarkup };
}

/**
 * Экран 4: Подтверждение подачи заявки на банковскую рассрочку в 1 клик.
 */
export function getInstallmentSubmittedScreen(
	plan: PendingTreatmentPlanSummary,
	months: number,
	_leadId: string,
): CloserScreenResult {
	const totalFormatted = formatRub(plan.totalPriceRub);
	const monthlyAmount = formatRub(Math.round(plan.totalPriceRub / months));

	const text = [
		"✅ <b>Заявка на рассрочку успешно принята!</b>",
		"",
		`Сумма лечения: <b>${totalFormatted} ₽</b>`,
		`Выбранный срок: <b>${months} месяцев (0-0-${months})</b>`,
		`Платеж: <b>${monthlyAmount} ₽/мес</b>`,
		"",
		"Куратор заботы клиники DENTE уже формирует персональную заявку в банк-партнер (Т-Банк / Сбербанк).",
		"",
		"В течение 10–15 минут мы пришлем вам в Telegram защищенную ссылку на экспресс-подтверждение через СМС.",
		"Одобрение составляет 98%, справки о доходах не требуются.",
	].join("\n");

	const replyMarkup = buildInstallmentSubmittedKeyboard(plan.planId);

	return { text, replyMarkup };
}

/**
 * Экран 5: Меню отработки частых клинических и финансовых возражений.
 */
export function getObjectionsRootScreen(plan: PendingTreatmentPlanSummary): CloserScreenResult {
	const text = [
		"💬 <b>Вопросы и сомнения перед началом лечения</b>",
		"",
		"Лечение зубов — важное и волнующее событие. Совершенно естественно иметь вопросы и сомнения.",
		"Выберите то, что вас беспокоит, и мы подробно расскажем, как решается этот вопрос в DENTE:",
	].join("\n");

	const replyMarkup = buildObjectionsRootKeyboard(plan.planId);

	return { text, replyMarkup };
}

/**
 * Экран 6: Отработка возражения «Страшно / боюсь боли».
 */
export function getObjectionFearScreen(plan: PendingTreatmentPlanSummary): CloserScreenResult {
	const text = [
		"😰 <b>Мы понимаем ваш страх — это абсолютно нормально!</b>",
		"",
		"7 из 10 пациентов признаются, что испытывают сильную тревогу перед визитом к стоматологу. Поэтому в клинике DENTE внедрен <b>Золотой стандарт безболезненного приёма</b>:",
		"",
		"1. <b>Компьютерная анестезия STA & крем-заморозка:</b>",
		"Даже момент укола не ощущается — десна предварительно обрабатывается приятным гелем, а подача анестетика контролируется микропроцессором без давления на ткани.",
		"",
		"2. <b>Лечение во сне / мягкая седация:</b>",
		"Для тревожных пациентов доступна ингаляционная седация (закись азота) или медикаментозный сон: вы отдыхаете, пока врач работает.",
		"",
		"3. <b>Атравматичные протоколы и микроскоп Karl Kaps:</b>",
		"20-кратное увеличение позволяет врачу действовать с микронной точностью, сохраняя максимум здоровых тканей и исключая перегрев.",
		"",
		"📹 <i>Видео адаптационного визита главного врача клиники: dente.clinic/video/safe-care</i>",
	].join("\n");

	const replyMarkup = buildObjectionFearKeyboard(plan.planId);

	return { text, replyMarkup };
}

/**
 * Экран 7: Отработка возражения «Дорого / не рассчитывал на такую сумму».
 */
export function getObjectionCostScreen(plan: PendingTreatmentPlanSummary): CloserScreenResult {
	const stage1 = formatRub(plan.stages[0]?.priceRub ?? 12000);
	const ndflAmount = formatRub(Math.round(plan.totalPriceRub * 0.13));

	const text = [
		"💰 <b>Смета выглядит весомо, если смотреть на всю сумму сразу</b>",
		"",
		"Но вам совершенно не нужно нести эти расходы единовременно! Вот 4 инструмента, которыми пользуются наши пациенты:",
		"",
		`1. <b>Поэтапная оплата:</b> начните только с Этапа 1 (всего ${stage1} ₽) для устранения воспаления и купирования рисков.`,
		"",
		`2. <b>Беспроцентная рассрочка 0%:</b> от ${plan.installments[24].monthlyPaymentFormatted} без первого взноса и переплат (проценты банку оплачивает клиника).`,
		"",
		`3. <b>Налоговый вычет 13%:</b> государство вернет вам до <b>${ndflAmount} ₽</b> на счет. Мы бесплатно подготовим весь пакет справок КНД 1151156.`,
		"",
		"4. <b>Цена откладывания:</b> потеря объема кости за 6 месяцев промедления удорожает последующую костную пластику на 45 000 – 80 000 ₽. Своевременное лечение экономит до 50% бюджета.",
	].join("\n");

	const replyMarkup = buildObjectionCostKeyboard(
		plan.planId,
		stage1,
		plan.installments[12].monthlyPaymentFormatted,
	);

	return { text, replyMarkup };
}

/**
 * Экран 8: Отработка возражения «Хочу посоветоваться с семьей».
 */
export function getObjectionFamilyScreen(plan: PendingTreatmentPlanSummary): CloserScreenResult {
	const text = [
		"👨‍👩‍👧 <b>Это абсолютно верное и взвешенное решение!</b>",
		"",
		"Здоровье зубов влияет на качество жизни всей семьи. Чтобы вам было удобно и легко обсудить план дома с близкими:",
		"",
		"1. <b>Интерактивная презентация плана:</b>",
		"Мы можем отправить вам наглядную PDF-презентацию с описанием каждого этапа, снимками 3D-КТ и фотографиями похожих клинических случаев до/после.",
		"",
		"2. <b>Гарантия фиксированной цены:</b>",
		"Цены в плане заморожены на 30 дней. Никаких скрытых наценок или неожиданных доплат в процессе.",
		"",
		"3. <b>Семейный баланс DENTE:</b>",
		"Если в клинике лечатся родственники, действует единый семейный счет с накопительной скидкой до 10%.",
		"",
		"Хотите, куратор заботы клиники пришлет презентацию плана прямо в Telegram для семейного совета?",
	].join("\n");

	const replyMarkup = buildObjectionFamilyKeyboard(plan.planId);

	return { text, replyMarkup };
}

/**
 * Экран 9: Отработка возражения «Хочу отложить / пока не горит».
 */
export function getObjectionDelayScreen(plan: PendingTreatmentPlanSummary): CloserScreenResult {
	const text = [
		"⏳ <b>Коварство зубов: они не болят до критической стадии</b>",
		"",
		"Полость рта устроена так, что глубокие воспалительные процессы в костной ткани и под пломбами протекают бессимптомно месяцами.",
		"",
		"Когда появляется острая боль — это сигнал о том, что процесс уже дошел до нерва или надкостницы. В этот момент:",
		"• зуб требует более сложной многоэтапной терапии каналов, что сокращает срок его службы;",
		"• стоимость лечения возрастает в 2.5–3 раза из-за необходимости сложной чистки каналов или удаления с имплантацией;",
		"• требуется костная пластика из-за атрофии кости.",
		"",
		"<b>Своевременная санация сохраняет собственный живой зуб на 15–20 лет дольше!</b>",
	].join("\n");

	const replyMarkup = buildObjectionDelayKeyboard(plan.planId);

	return { text, replyMarkup };
}

/**
 * Экран 10: Подтверждение заказа звонка куратора заботы.
 */
export function getCuratorCallBookedScreen(plan: PendingTreatmentPlanSummary): CloserScreenResult {
	const planTitle = sanitizePlanTitleForMessenger(plan.title || plan.name);
	const text = [
		"📞 <b>Звонок куратора заботы забронирован!</b>",
		"",
		`Пациент: <b>${plan.patientName}</b>`,
		`План лечения: <b>${planTitle}</b>`,
		"",
		"Куратор заботы клиники DENTE свяжется с вами в течение 10–15 минут по телефону или в Telegram.",
		"Мы поможем подобрать удобный график визитов, согласуем формат оплаты и ответим на все клинические вопросы.",
	].join("\n");

	const replyMarkup = buildCuratorCallBookedKeyboard(plan.planId);

	return { text, replyMarkup };
}
