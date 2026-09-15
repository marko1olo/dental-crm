import type { UiLanguage } from "@dental/shared";
import { safeLocalStorageSetItem } from "../lib/safeLocalStorage";
import {
	type UiPreferences,
	type UiPreferencesInput,
	uiPreferencesStorageKey,
} from "./preferencesUtils";
import { isRecordKey } from "./typeGuards";


export const uiPreferencesServerPath = "/api/settings/preferences";

export const uiLanguageLabels: Record<UiLanguage, string> = {
	ru: "Русский",
};

export type UiLanguageOption = {
	value: UiLanguage;
	label: string;
	detail: string;
};

export const defaultUiLanguageOption: UiLanguageOption = {
	value: "ru",
	label: uiLanguageLabels.ru,
	detail:
		"Русский интерфейс включен сейчас. Выбор сохраняется автоматически и остается до смены языка.",
};

export const uiLanguageOptions: UiLanguageOption[] = [defaultUiLanguageOption];

export function isUiLanguage(value: unknown): value is UiLanguage {
	return isRecordKey(value, uiLanguageLabels);
}

export function normalizeUiLanguageInput(value: unknown): UiLanguage {
	return isUiLanguage(value) ? value : "ru";
}

export function pickUiPreference<T>(
	source: Record<string, unknown>,
	key: keyof UiPreferencesInput,
	fallback: T,
	isValid: (value: unknown) => value is T,
): T {
	const value = source[key];
	return isValid(value) ? value : fallback;
}

export function persistUiPreferences(
	preferences: UiPreferences,
): UiPreferences | null {
	if (typeof window === "undefined") return null;
	try {
		safeLocalStorageSetItem(
			uiPreferencesStorageKey,
			JSON.stringify(preferences),
		);
		return preferences;
	} catch {
		// Preferences are convenience only. Clinical drafts use separate guarded storage.
		return null;
	}
}

// Перенесено в ./lib/denteRequestHeaders (модуль без импортов) 2026-07-28. Эта функция была
// единственным рантайм-ребром, замыкавшим цикл
// AppHelpers.tsx:305 -> workspaceShell.tsx:32 -> hooks/useWorkspaceProfile.ts:22 -> AppHelpers,
// которого madge не печатал. Реэкспорт оставлен намеренно: 15 вызывающих файлов и два мёртвых
// импорта (App.tsx, useAppLogic.tsx) компилируются без правок, поэтому миграция идёт по файлу за
// раз, а не одним свипом на 17 файлов. Полное обоснование — в шапке нового модуля.
//
// Импорт, а не только реэкспорт: `export { x } from "../y"` НЕ вносит имя в локальную область, а у
// этого файла есть два собственных вызова функции ниже. Typecheck поймал это сразу — TS2552 на
// обоих. Новый модуль не имеет импортов вообще, поэтому это ребро не может замкнуть никакой цикл.

export function uiPreferencesSyncErrorMessage(_error: unknown): string {
	return "Настройки интерфейса сохранены только на этом устройстве. Серверная синхронизация повторится автоматически.";
}

export const settingsTabGroups = [
	{ id: "account", title: "Мой аккаунт" },
	{ id: "main", title: "Основные" },
	{ id: "clinical", title: "Клинические" },
	{ id: "stock", title: "Учёт" },
	{ id: "marketing", title: "Маркетинг" },
	{ id: "system", title: "Системные" },
] as const;

export type SettingsTabGroup = (typeof settingsTabGroups)[number]["id"];

export const initialUiPreferences = {} as any;
