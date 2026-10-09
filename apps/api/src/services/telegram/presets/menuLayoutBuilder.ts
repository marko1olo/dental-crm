import type {
	ResolvedScreenResult,
	TelegramBotPresetId,
	TelegramInPlaceScreen,
	TelegramInlineButton,
} from "./types.js";
import { getPreset } from "./specialtyBotScenarios.js";

// ============================================================================
// LAYER 2: КОНСТРУКТОР IN-PLACE КЛАВИАТУР И НАВИГАЦИИ (ZERO CHAT LANDFILL)
// ============================================================================

/**
 * Создание кнопки возврата на предыдущий экран.
 */
export function createBackButton(
	presetId: TelegramBotPresetId,
	parentScreenId = "main",
): TelegramInlineButton {
	return {
		text: "« Назад",
		callback_data: `preset_nav:${presetId}:${parentScreenId}`,
	};
}

/**
 * Создание кнопки возврата в главное меню пресета.
 */
export function createHomeButton(presetId: TelegramBotPresetId): TelegramInlineButton {
	return {
		text: "🏠 Главное меню",
		callback_data: `preset_nav:${presetId}:main`,
	};
}

/**
 * Построение стандартной строки навигации (Назад + Главное меню).
 */
export function buildNavigationRow(
	presetId: TelegramBotPresetId,
	parentScreenId: string | null = "main",
): TelegramInlineButton[] {
	const parentId = parentScreenId || "main";
	return [
		createBackButton(presetId, parentId),
		createHomeButton(presetId),
	];
}

/**
 * Построение экрана In-Place UI с кнопками возврата « Назад и 🏠 Главное меню.
 * Предотвращает замусоривание ленты чата (Zero Chat Landfill Architecture).
 */
export function resolveScreen(
	presetId: TelegramBotPresetId,
	screenId: string,
): ResolvedScreenResult {
	const preset = getPreset(presetId);
	const screen = preset.screens[screenId] ?? preset.screens.main;
	if (!screen) {
		return {
			text: preset.welcomeText,
			replyMarkup: { inline_keyboard: [] },
		};
	}

	// Клонируем строки кнопок
	const keyboard: TelegramInlineButton[][] = screen.buttons.map((row) => [...row]);

	// Если это не главный экран, гарантируем наличие кнопок « Назад и 🏠 Главное меню
	if (screen.id !== "main") {
		const navRow = buildNavigationRow(presetId, screen.parentScreenId);
		keyboard.push(navRow);
	}

	return {
		text: screen.text,
		replyMarkup: { inline_keyboard: keyboard },
	};
}

/**
 * Обертка для создания готового In-Place экрана с типизацией.
 */
export function buildInPlaceScreen(
	screen: TelegramInPlaceScreen,
	presetId: TelegramBotPresetId,
): ResolvedScreenResult {
	return resolveScreen(presetId, screen.id);
}
