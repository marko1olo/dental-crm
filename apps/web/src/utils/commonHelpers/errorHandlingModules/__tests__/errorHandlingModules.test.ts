import { describe, expect, it } from "vitest";
import * as facade from "../../errorHelpers";
import {
	acceptedVisitSaveFailureIsRetryable,
	browserCapabilityFailureMessage,
	browserGeneratedId,
	browserLocalSourceErrorMessage,
	extractErrorMessage,
	formatApiError,
	getClinicalErrorTranslation,
	getUserFriendlyErrorText,
	isAuthError,
	isBooleanPreference,
	isBoundedPreferenceString,
	isConflictError,
	isNetworkError,
	isNullableString,
	isOptionValue,
	isRecordKey,
	isStringUnionValue,
	isValidationError,
	normalizePersistenceHealth,
	normalizeTelegramBotUsernameDraft,
	normalizeTelegramPublicHttpsUrlDraft,
	operatorReadableErrorDetail,
	operatorReadableErrorDetailFromUnknown,
	operatorWorkflowFailureMessage,
	requestFailureMessage,
	responseErrorMessage,
	responseStatusFailureLabel,
	translateFastifyErrorCode,
	translateHttpStatus,
	translatePostgresErrorCode,
	WorkflowResponseError,
} from "../index";

describe("errorHandlingModules decomposition (Wave 25)", () => {
	describe("Layer 1: clinicalErrorTranslations", () => {
		it("translates HTTP status codes to Russian clinical explanations", () => {
			expect(translateHttpStatus(0)).toContain("нет ответа сервера");
			expect(translateHttpStatus(401)).toContain("требуется повторный вход");
			expect(translateHttpStatus(403)).toContain("нет доступа");
			expect(translateHttpStatus(409)).toContain("данные уже изменились");
			expect(translateHttpStatus(422)).toContain("клиническую валидацию");
			expect(translateHttpStatus(500)).toContain("внутренней ошибкой");
			expect(translateHttpStatus(418)).toBe("сервер вернул код 418");
		});

		it("translates PostgreSQL SQLSTATE codes", () => {
			expect(translatePostgresErrorCode("23505")).toContain("уже существует");
			expect(translatePostgresErrorCode("23503")).toContain(
				"связана с другими документами",
			);
			expect(translatePostgresErrorCode("40P01")).toContain("дедлок");
			expect(translatePostgresErrorCode("99999")).toBeNull();
		});

		it("translates Fastify and Zod validation codes", () => {
			expect(translateFastifyErrorCode("FST_ERR_VALIDATION")).toContain(
				"Ошибка проверки",
			);
			expect(translateFastifyErrorCode("invalid_type")).toContain(
				"Неверный тип",
			);
			expect(translateFastifyErrorCode("UNKNOWN")).toBeNull();
		});

		it("resolves universal clinical error translation with fallback", () => {
			expect(getClinicalErrorTranslation(409)).toContain(
				"данные уже изменились",
			);
			expect(getClinicalErrorTranslation("23505")).toContain("дубликат");
			expect(
				getClinicalErrorTranslation("NON_EXISTENT", "Резервный текст"),
			).toBe("Резервный текст");
		});
	});

	describe("Layer 2: errorClassificationPredicates", () => {
		it("classifies network errors accurately", () => {
			expect(isNetworkError(new WorkflowResponseError("Offline", 0))).toBe(
				true,
			);
			expect(isNetworkError(new Error("TypeError: Failed to fetch"))).toBe(
				true,
			);
			expect(isNetworkError({ status: 0 })).toBe(true);
			expect(isNetworkError(new Error("Неверная сумма чека"))).toBe(false);
		});

		it("classifies authentication and authorization errors", () => {
			expect(isAuthError(new WorkflowResponseError("Unauthorized", 401))).toBe(
				true,
			);
			expect(isAuthError({ statusCode: 403 })).toBe(true);
			expect(isAuthError("JWT expired")).toBe(true);
			expect(isAuthError(new Error("Пациент не найден"))).toBe(false);
		});

		it("classifies conflict and duplicate errors", () => {
			expect(isConflictError(new WorkflowResponseError("Conflict", 409))).toBe(
				true,
			);
			expect(isConflictError({ code: "23505" })).toBe(true);
			expect(isConflictError("Запись уже существует")).toBe(true);
			expect(isConflictError({ status: 200 })).toBe(false);
		});

		it("classifies validation errors", () => {
			expect(isValidationError(new WorkflowResponseError("Invalid", 422))).toBe(
				true,
			);
			expect(isValidationError({ code: "FST_ERR_VALIDATION" })).toBe(true);
			expect(isValidationError({ statusCode: 400 })).toBe(true);
			expect(isValidationError(new Error("Server crash"))).toBe(false);
		});

		it("evaluates retryability of visit save failures", () => {
			expect(
				acceptedVisitSaveFailureIsRetryable(new WorkflowResponseError("", 0)),
			).toBe(true);
			expect(
				acceptedVisitSaveFailureIsRetryable(new WorkflowResponseError("", 408)),
			).toBe(true);
			expect(
				acceptedVisitSaveFailureIsRetryable(new WorkflowResponseError("", 429)),
			).toBe(true);
			expect(
				acceptedVisitSaveFailureIsRetryable(new WorkflowResponseError("", 503)),
			).toBe(true);
			expect(
				acceptedVisitSaveFailureIsRetryable(new WorkflowResponseError("", 400)),
			).toBe(false);
			expect(
				acceptedVisitSaveFailureIsRetryable(new WorkflowResponseError("", 409)),
			).toBe(false);
		});

		it("validates primitive and record predicates", () => {
			expect(isRecordKey("a", { a: 1, b: 2 })).toBe(true);
			expect(isRecordKey("c", { a: 1, b: 2 })).toBe(false);
			expect(isOptionValue("x", [{ value: "x" }])).toBe(true);
			expect(isStringUnionValue("m", ["m", "n"])).toBe(true);
			expect(isBooleanPreference(false)).toBe(true);
			expect(isBoundedPreferenceString("ok")).toBe(true);
			expect(isNullableString(null)).toBe(true);
		});
	});

	describe("Layer 3: errorExtractorCore", () => {
		it("filters out technical stack traces and English errors for operators", () => {
			expect(
				operatorReadableErrorDetail("Укажите корректный номер зуба"),
			).toBe("Укажите корректный номер зуба");
			expect(
				operatorReadableErrorDetail("TypeError: Cannot read properties of null"),
			).toBeNull();
			expect(
				operatorReadableErrorDetail("Ошибка в C:\\Users\\Admin\\file.ts"),
			).toBeNull();
			expect(operatorReadableErrorDetail("Pure English message")).toBeNull();
		});

		it("extracts operator workflow failure message with fallback", () => {
			const cleanError = new Error("Не заполнено поле диагноза");
			expect(
				operatorWorkflowFailureMessage("Не удалось сохранить", cleanError),
			).toBe("Не заполнено поле диагноза");

			const techError = new Error("Failed to fetch http://localhost:3000/api/");
			expect(
				operatorWorkflowFailureMessage("Не удалось сохранить", techError),
			).toContain("Не удалось сохранить: сеть или локальный сервер недоступны");
		});

		it("formats Response status and JSON payload errors", async () => {
			const res409 = new Response(
				JSON.stringify({ message: "Визит уже закрыт другим врачом" }),
				{ status: 409 },
			);
			expect(responseStatusFailureLabel(res409)).toBe(
				"данные уже изменились, обновите экран",
			);
			const msg = await responseErrorMessage(res409, "Ошибка сохранения");
			expect(msg).toBe("Ошибка сохранения: Визит уже закрыт другим врачом");
		});

		it("extracts human-readable messages from Zod issues, Postgres codes, and strings", () => {
			expect(
				extractErrorMessage({
					issues: [
						{ code: "custom", message: "Укажите ФИО пациента" },
						{ code: "custom", message: "Неверный телефон" },
					],
				}),
			).toBe("Укажите ФИО пациента; Неверный телефон");

			expect(extractErrorMessage({ code: "23505" })).toContain("дубликат");
			expect(formatApiError("Карта пациента заблокирована")).toBe(
				"Карта пациента заблокирована",
			);
			expect(
				getUserFriendlyErrorText(
					new Error("Смена кассы закрыта"),
					"Ошибка оплаты",
				),
			).toBe("Смена кассы закрыта");
		});

		it("provides browser capability and source failure messages", () => {
			expect(browserLocalSourceErrorMessage("Не удалось открыть папку", null)).toContain(
				"разрешено читать выбранный источник",
			);
			expect(browserCapabilityFailureMessage("Микрофон недоступен", null)).toContain(
				"разрешения браузера",
			);
			expect(requestFailureMessage("Сбой", null)).toContain(
				"сеть или локальный сервер недоступны",
			);
			expect(
				operatorReadableErrorDetailFromUnknown(new Error("Ошибка подписи")),
			).toBe("Ошибка подписи");
		});
	});

	describe("Layer 4 & 5: Facade 100% Parity", () => {
		it("re-exports identical references through canonical errorHelpers.ts facade", () => {
			expect(facade.WorkflowResponseError).toBe(WorkflowResponseError);
			expect(facade.extractErrorMessage).toBe(extractErrorMessage);
			expect(facade.formatApiError).toBe(formatApiError);
			expect(facade.isNetworkError).toBe(isNetworkError);
			expect(facade.isConflictError).toBe(isConflictError);
			expect(facade.getUserFriendlyErrorText).toBe(getUserFriendlyErrorText);
			expect(facade.browserGeneratedId).toBe(browserGeneratedId);
			expect(facade.normalizePersistenceHealth).toBe(normalizePersistenceHealth);
			expect(facade.normalizeTelegramBotUsernameDraft).toBe(
				normalizeTelegramBotUsernameDraft,
			);
			expect(facade.normalizeTelegramPublicHttpsUrlDraft).toBe(
				normalizeTelegramPublicHttpsUrlDraft,
			);
		});
	});
});
