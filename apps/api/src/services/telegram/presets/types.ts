import {
	type PostOpSurveyDay,
	type PostOpSurveyInput,
	type PostOpSurveyResult,
	type TelegramBotCommandItem,
	type TelegramBotPresetId,
	type TelegramBotPresetMetadata,
	type TelegramInPlaceScreen,
	type TelegramInlineButton,
	type TriageEvaluationResult,
	type TriageSeverity,
	type TriageSymptomKey,
} from "@dental/shared";

// ============================================================================
// LAYER 0: КОНТРАКТЫ И ИНТЕРФЕЙСЫ ПРЕСЕТОВ TELEGRAM-БОТОВ CLINIC MVP (DENTE)
// ============================================================================

export type {
	PostOpSurveyDay,
	PostOpSurveyInput,
	PostOpSurveyResult,
	TelegramBotCommandItem,
	TelegramBotPresetId,
	TelegramBotPresetMetadata,
	TelegramInPlaceScreen,
	TelegramInlineButton,
	TriageEvaluationResult,
	TriageSeverity,
	TriageSymptomKey,
};

/**
 * Конфигурация отдельного архетипа/пресета Telegram-бота.
 */
export interface BotPresetConfig extends TelegramBotPresetMetadata {
	/** Внутренние теги для фильтрации в каталоге */
	categoryTags?: string[];
	/** Рекомендуемый интервал планового напоминания о гигиене (месяцев) */
	recommendedRecallMonths?: number;
}

/**
 * Определение триггера интерактивного сценария бота.
 */
export interface BotScenarioTrigger {
	type: "command" | "callback_data" | "text_keyword" | "symptom_triage";
	pattern: string | RegExp;
	targetScreenId: string;
	description?: string;
}

/**
 * Интерактивный клинический сценарий бота.
 */
export interface BotScenarioDefinition {
	id: string;
	presetId: TelegramBotPresetId;
	title: string;
	triggers: BotScenarioTrigger[];
	initialScreenId: string;
	screens: Record<string, TelegramInPlaceScreen>;
}

/**
 * Результат разрешения экрана In-Place UI для отправки в Telegram Bot API.
 */
export interface ResolvedScreenResult {
	text: string;
	replyMarkup: {
		inline_keyboard: TelegramInlineButton[][];
	};
}

/**
 * Контекст клинического триажа симптомов пациента.
 */
export interface TriageEvaluationContext {
	isNightTime?: boolean;
	painScale?: number;
}

/**
 * Входные данные для автоматизированной оценки послеоперационного опроса.
 */
export interface PostOpSurveyEvaluationInput {
	day: PostOpSurveyDay;
	painScore: number;
	hasFever?: boolean | undefined;
	hasHeavyBleeding?: boolean | undefined;
	hasSevereSwelling?: boolean | undefined;
	patientId?: string | undefined;
	organizationId?: string | undefined;
	appointmentId?: string | undefined;
	additionalNotes?: string | undefined;
}

/**
 * Параметры применения пресета к инстансу бота клиники.
 */
export interface ApplyPresetToInstanceParams {
	organizationId: string;
	presetId: TelegramBotPresetId;
	botConfigId?: string;
	botToken?: string;
	webhookUrl?: string;
	secretToken?: string;
}

/**
 * Результат применения пресета к инстансу бота клиники.
 */
export interface ApplyPresetToInstanceResult {
	ok: boolean;
	presetId: TelegramBotPresetId;
	error?: string;
}
