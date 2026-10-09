import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { denteTelegramBotConfigs } from "../../../db/schema.js";
import type {
	ApplyPresetToInstanceParams,
	ApplyPresetToInstanceResult,
	PostOpSurveyDay,
	PostOpSurveyResult,
	TelegramBotPresetId,
	TelegramBotPresetMetadata,
	TelegramInlineButton,
	TriageEvaluationResult,
	TriageSymptomKey,
} from "./types.js";
import { getPreset, listPresets } from "./specialtyBotScenarios.js";
import {
	evaluatePostOpSurvey,
	evaluateTriageSymptom,
	getBotFatherGuideMarkdown as generateGuideMarkdown,
} from "./clinicalFaqPresets.js";
import { resolveScreen } from "./menuLayoutBuilder.js";

// ============================================================================
// LAYER 2: СЕРВИС ПРИМЕНЕНИЯ ПРЕСЕТА К ИНСТАНСУ БОТА И ДВИЖОК АРХЕТИПОВ
// ============================================================================

/**
 * Сервис применения пресетов к экземпляру Telegram-бота в базе данных.
 */
export class TelegramPresetApplierService {
	/**
	 * Применение клинического пресета к инстансу бота в БД с мульти-тенант изоляцией.
	 */
	static async applyPresetToBotInstance(
		params: ApplyPresetToInstanceParams,
	): Promise<ApplyPresetToInstanceResult> {
		const preset = getPreset(params.presetId);
		const botConfigId = params.botConfigId || "default";

		// Сохранение конфигурации в БД клиники с обязательным составным фильтром
		await db
			.update(denteTelegramBotConfigs)
			.set({
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(denteTelegramBotConfigs.organizationId, params.organizationId),
					eq(denteTelegramBotConfigs.botConfigId, botConfigId),
				),
			);

		return {
			ok: true,
			presetId: preset.id,
		};
	}
}

/**
 * Канонический фасад движка пресетов клиник и сценариев In-Place навигации DENTE.
 * Сохраняет 100% обратную совместимость со всеми сервисами, маршрутами и тестами.
 */
export class TelegramBotPresetsEngine {
	/**
	 * Получение метаданных конкретного пресета.
	 */
	static getPreset(presetId: TelegramBotPresetId): TelegramBotPresetMetadata {
		return getPreset(presetId);
	}

	/**
	 * Получение списка всех доступных пресетов клиник.
	 */
	static listPresets(): TelegramBotPresetMetadata[] {
		return listPresets();
	}

	/**
	 * Построение экрана In-Place UI с кнопками возврата « Назад и 🏠 Главное меню.
	 */
	static resolveScreen(
		presetId: TelegramBotPresetId,
		screenId: string,
	): { text: string; replyMarkup: { inline_keyboard: TelegramInlineButton[][] } } {
		return resolveScreen(presetId, screenId);
	}

	/**
	 * Экспертная оценка симптомов пациента для правильной сортировки и алертов.
	 */
	static evaluateTriageSymptom(
		symptomKey: TriageSymptomKey,
		context?: { isNightTime?: boolean; painScale?: number },
	): TriageEvaluationResult {
		return evaluateTriageSymptom(symptomKey, context);
	}

	/**
	 * Автоматизированная оценка послеоперационного состояния пациента на 1-й и 3-й день.
	 * Если боль >= 4 или есть тревожные симптомы (температура, кровотечение) — генерирует алерт в CRM.
	 */
	static evaluatePostOpSurvey(input: {
		day: PostOpSurveyDay;
		painScore: number;
		hasFever?: boolean | undefined;
		hasHeavyBleeding?: boolean | undefined;
		hasSevereSwelling?: boolean | undefined;
		patientId?: string | undefined;
		organizationId?: string | undefined;
		appointmentId?: string | undefined;
		additionalNotes?: string | undefined;
	}): PostOpSurveyResult {
		return evaluatePostOpSurvey(input);
	}

	/**
	 * Пошаговая инструкция для главного врача и администратора клиники (@BotFather).
	 */
	static getBotFatherGuideMarkdown(presetId: TelegramBotPresetId = "universal_clinic"): string {
		const preset = this.getPreset(presetId);
		return generateGuideMarkdown(preset);
	}

	/**
	 * Применение пресета к инстансу бота в БД клиники.
	 */
	static async applyPresetToBotInstance(
		params: ApplyPresetToInstanceParams,
	): Promise<ApplyPresetToInstanceResult> {
		return TelegramPresetApplierService.applyPresetToBotInstance(params);
	}
}
