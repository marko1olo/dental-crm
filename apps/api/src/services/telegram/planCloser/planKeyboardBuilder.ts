import type {
	InstallmentMonths,
	TelegramInlineButton,
	TelegramInlineKeyboard,
} from "./types.js";

/**
 * Строит inline-клавиатуру корневого приветственного экрана.
 */
export function buildRootScreenKeyboard(
	planId: string,
	installment12Formatted: string,
): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📋 Посмотреть этапы плана",
					callback_data: `closer:stages:${planId}`,
				},
			],
			[
				{
					text: `🧮 Рассчитать рассрочку 0% (${installment12Formatted})`,
					callback_data: `closer:calc:${planId}:12`,
				},
			],
			[
				{
					text: "💬 Вопросы и сомнения (страх боли, цена)",
					callback_data: `closer:objections:${planId}`,
				},
			],
			[
				{
					text: "📞 Заказать звонок куратора лечения",
					callback_data: `closer:call_curator:${planId}`,
				},
			],
		],
	};
}

/**
 * Строит inline-клавиатуру экрана клинических этапов плана.
 */
export function buildStagesScreenKeyboard(
	planId: string,
	installment12Formatted: string,
): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: `🧮 Рассрочка на 12 мес (${installment12Formatted})`,
					callback_data: `closer:calc:${planId}:12`,
				},
			],
			[
				{
					text: "💬 Есть вопросы по этапам",
					callback_data: `closer:objections:${planId}`,
				},
			],
			[
				{
					text: "📞 Забронировать звонок куратора",
					callback_data: `closer:call_curator:${planId}`,
				},
			],
			[
				{
					text: "↩ Назад к плану",
					callback_data: `closer:root:${planId}`,
				},
			],
		],
	};
}

/**
 * Строит inline-клавиатуру интерактивного калькулятора рассрочки.
 */
export function buildInstallmentCalcKeyboard(
	planId: string,
	selectedMonths: InstallmentMonths,
	termButtons: TelegramInlineButton[],
): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			termButtons,
			[
				{
					text: "📝 Подать заявку на рассрочку в 1 клик",
					callback_data: `closer:apply_installment:${planId}:${selectedMonths}`,
				},
			],
			[
				{
					text: "📋 Посмотреть этапы лечения",
					callback_data: `closer:stages:${planId}`,
				},
			],
			[
				{
					text: "📞 Консультация с куратором по рассрочке",
					callback_data: `closer:call_curator:${planId}`,
				},
				{
					text: "↩ Назад",
					callback_data: `closer:root:${planId}`,
				},
			],
		],
	};
}

/**
 * Строит inline-клавиатуру подтверждения заявки на рассрочку.
 */
export function buildInstallmentSubmittedKeyboard(planId: string): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📞 Связаться с куратором прямо сейчас",
					callback_data: `closer:call_curator:${planId}`,
				},
			],
			[
				{
					text: "📋 Вернуться к плану лечения",
					callback_data: `closer:stages:${planId}`,
				},
			],
			[
				{
					text: "🏠 В главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}

/**
 * Строит главное меню возражений.
 */
export function buildObjectionsRootKeyboard(planId: string): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "😰 Страшно / боюсь боли и уколов",
					callback_data: `closer:obj_fear:${planId}`,
				},
			],
			[
				{
					text: "💰 Дорого / не рассчитывал на такую сумму",
					callback_data: `closer:obj_cost:${planId}`,
				},
			],
			[
				{
					text: "👨‍👩‍👧 Хочу посоветоваться с семьей",
					callback_data: `closer:obj_family:${planId}`,
				},
			],
			[
				{
					text: "⏳ Хочу отложить / пока ничего не болит",
					callback_data: `closer:obj_delay:${planId}`,
				},
			],
			[
				{
					text: "↩ Назад к плану",
					callback_data: `closer:root:${planId}`,
				},
			],
		],
	};
}

/**
 * Строит клавиатуру отработки страха боли.
 */
export function buildObjectionFearKeyboard(planId: string): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📞 Забронировать 10-мин беседу с врачом",
					callback_data: `closer:call_curator:${planId}`,
				},
			],
			[
				{
					text: "🧮 Рассчитать рассрочку 0%",
					callback_data: `closer:calc:${planId}:12`,
				},
			],
			[
				{
					text: "↩ К списку вопросов",
					callback_data: `closer:objections:${planId}`,
				},
			],
		],
	};
}

/**
 * Строит клавиатуру отработки возражения по стоимости.
 */
export function buildObjectionCostKeyboard(
	planId: string,
	stage1Formatted: string,
	installment12Formatted: string,
): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: `🧮 Рассрочка 0% (${installment12Formatted})`,
					callback_data: `closer:calc:${planId}:12`,
				},
			],
			[
				{
					text: `📋 Оплатить только Этап 1 (${stage1Formatted} ₽)`,
					callback_data: `closer:stages:${planId}`,
				},
			],
			[
				{
					text: "📞 Обсудить бюджет с куратором",
					callback_data: `closer:call_curator:${planId}`,
				},
			],
			[
				{
					text: "↩ К списку вопросов",
					callback_data: `closer:objections:${planId}`,
				},
			],
		],
	};
}

/**
 * Строит клавиатуру отработки вопроса семьи.
 */
export function buildObjectionFamilyKeyboard(planId: string): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📞 Звонок куратора для семейной консультации",
					callback_data: `closer:call_curator:${planId}`,
				},
			],
			[
				{
					text: "🧮 Рассчитать рассрочку для семейного бюджета",
					callback_data: `closer:calc:${planId}:12`,
				},
			],
			[
				{
					text: "↩ К списку вопросов",
					callback_data: `closer:objections:${planId}`,
				},
			],
		],
	};
}

/**
 * Строит клавиатуру отработки откладывания визита.
 */
export function buildObjectionDelayKeyboard(planId: string): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📋 Посмотреть 1 этап плана (купирование)",
					callback_data: `closer:stages:${planId}`,
				},
			],
			[
				{
					text: "📞 Задать вопрос доктору через куратора",
					callback_data: `closer:call_curator:${planId}`,
				},
			],
			[
				{
					text: "↩ К списку вопросов",
					callback_data: `closer:objections:${planId}`,
				},
			],
		],
	};
}

/**
 * Строит клавиатуру подтверждения заказа звонка куратора.
 */
export function buildCuratorCallBookedKeyboard(planId: string): TelegramInlineKeyboard {
	return {
		inline_keyboard: [
			[
				{
					text: "📋 Вернуться к плану лечения",
					callback_data: `closer:root:${planId}`,
				},
			],
			[
				{
					text: "🏠 В главное меню",
					callback_data: "dente:start",
				},
			],
		],
	};
}
