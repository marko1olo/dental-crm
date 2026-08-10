// AppHelpers.tsx - Barrel re-export

export * from "./utils/DocumentHelpers";
export * from "./utils/SpeechHelpers";
export * from "./utils/ImagingHelpers";
export * from "./utils/TelegramHelpers";
export * from "./utils/PreferencesHelpers";
export * from "./utils/PatientHelpers";
export * from "./utils/AuthOnboardingHelpers";
export * from "./utils/AppointmentHelpers";
export * from "./utils/CommonHelpers";

// Original re-exports
export { imagingSourceLabels } from "./imagingUiLabels";
export { pricelistSourceKindLabels } from "./pricelistUiMeta";
export {
	currentLocalDateTimeInputValue,
	toDateTimeLocalValue,
} from "./utils/dateUtils";
export {
	defaultClinicalToothRowsText,
	defaultDicomFirstFrameViewerState,
	defaultImagingViewerState,
	emptyAppointmentScheduleDraft,
	emptyPatientAdministrativeProfileDraft,
	emptyPatientCoreDraft,
	emptyTelegramVisualCardUrlDrafts,
	emptyVisitNoteForm,
} from "./utils/draftDefaults";
export {
	defaultUiPreferences,
	loadUiPreferences,
	saveUiPreferences,
	type UiPreferences,
	type UiPreferencesInput,
	uiPreferencesStorageKey,
} from "./utils/preferencesUtils";
export {
	type SettingsTab,
	settingsTabFromHash,
	settingsTabs,
	viewFromHash,
} from "./utils/routeUtils";

import {
	defaultUiPreferences,
	type UiPreferences,
	type UiPreferencesInput,
	uiPreferencesStorageKey,
} from "./utils/preferencesUtils";

import {
	appointmentLabels,
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	paymentMethodLabels,
	recognitionTargetLabels,
	serviceCategoryLabels,
} from "./workspaceUiLabels";
export { money, moneyUnknownLabel } from "./utils/financeUtils";

/**
 * Русское склонение счётного слова: 1 приём, 2 приёма, 5 приёмов.
 *
 * Нужна везде, где рядом с числом стоит существительное. Без неё на экранах
 * появляется «1 снимка», «0 документа», «21 записей» — читается как ошибка
 * программы, и доверие к остальным цифрам падает.
 *
 * САМА ФУНКЦИЯ ПЕРЕЕХАЛА В `lib/russianPlural.ts`, здесь остался РЕЭКСПОРТ.
 * Причина не в опрятности: этот файл на 6066 строк по цепочке импортов тянет
 * компоненты и таблицы стилей, поэтому любой модуль ЛОГИКИ, попросивший у него
 * согласование числа, перестаёт запускаться в node:test — прогон падает на
 * `ERR_UNKNOWN_FILE_EXTENSION` для `workspaceActions.css`, не дойдя до первого
 * утверждения. Ровно это обнулило вынос модуля отчёта о рассылке.
 * Реэкспорт оставлен намеренно: восемь существующих потребителей не тронуты.
 *
 * Импорт и реэкспорт — двумя строками, а не одной. `export { x } from "..."`
 * пробрасывает имя наружу, но НЕ вводит его в область видимости этого файла, а
 * сам AppHelpers зовёт countLabel у себя на строках 1699-1702. Одна строка
 * реэкспорта ломала четыре собственных вызова — поймано веб-гейтом.
 */
import { countLabel } from "./lib/russianPlural.js";
import { logger } from "./utils/logger";
