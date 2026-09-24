/**
 * СТОРОЖ: КОНТЕКСТ АВТОРИЗАЦИИ НЕ ИМЕЕТ ПРАВА ВЫДУМЫВАТЬ ЗНАЧЕНИЕ.
 *
 * Запуск:
 *   cd apps/web && node --import tsx --import ./testCssStub.mjs --test "src/contexts/*.test.tsx"
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "./AppLogicContext";
import {
	AuthProvider,
	useAuthContext,
	useOptionalAuthContext,
	type AuthContextType,
} from "./AuthContext";

const mockAuthValue: AuthContextType = {
	activeWorkspaceProfile: { mode: "solo", label: "Кабинет врача" },
	rememberAdminSecret: () => undefined,
	forgetAdminSecret: () => undefined,
	currentAdminSecretUnlockDomain: () => "clinical",
	resolvedAdminSecretUnlockDomain: () => "clinical",
	adminSecretDraftForDomain: () => "",
	clearAdminSecretDraft: () => undefined,
	settingsAccessHeaders: () => ({ "x-dente-auth": "test" }),
	scheduleMutationHeaders: () => ({ "x-dente-auth": "test" }),
	denteClinicalMutationHeaders: () => ({ "x-dente-auth": "test" }),
	denteClinicalReadHeaders: () => ({ "x-dente-auth": "test" }),
	unlockTelegramAdminSession: () => undefined,
	lockTelegramAdminSession: () => undefined,
	revokeObjectUrlIfNeeded: () => undefined,
	revokeObjectUrlMap: () => undefined,
};

describe("AuthContext — изоляция контекста авторизации", () => {
	function AuthProbe() {
		useAuthContext();
		return createElement("i", null, "авторизован");
	}

	function OptionalAuthProbe() {
		const auth = useOptionalAuthContext();
		return createElement("i", null, auth ? "есть_контекст" : "нет_контекста");
	}

	test("1. Без провайдера — выбрасывает понятное исключение, а не пустой объект", () => {
		let thrown: unknown = null;
		try {
			renderToStaticMarkup(createElement(AuthProbe));
		} catch (error) {
			thrown = error;
		}

		assert.ok(
			thrown instanceof Error,
			"useAuthContext вне провайдера не бросил исключение",
		);
		assert.match(
			(thrown as Error).message,
			/useAuthContext/,
			"в тексте ошибки отсутствует имя хука",
		);
		assert.match(
			(thrown as Error).message,
			/AuthProvider/,
			"в тексте ошибки отсутствует имя провайдера",
		);
		assert.match(
			(thrown as Error).message,
			/[А-я]/,
			"текст ошибки должен быть на русском языке",
		);
	});

	test("2. Внутри AuthProvider — отдаёт переданное значение", () => {
		let captured: any = null;
		function ValueCaptureProbe() {
			captured = useAuthContext();
			return createElement("i", null, "захвачено");
		}

		renderToStaticMarkup(
			createElement(
				AuthProvider,
				{ value: mockAuthValue, children: createElement(ValueCaptureProbe) },
			),
		);

		assert.equal(captured, mockAuthValue);
		assert.equal((captured as any)?.activeWorkspaceProfile?.mode, "solo");
	});

	test("3. Внутри AppLogicProvider — бесшовно извлекает auth", () => {
		let captured: any = null;
		function AppLogicFallbackProbe() {
			captured = useAuthContext();
			return createElement("i", null, "извлечено_из_app_logic");
		}

		const mockAppLogicValue = {
			auth: mockAuthValue,
		} as unknown as AppLogicContextType;

		renderToStaticMarkup(
			createElement(
				AppLogicProvider,
				{ value: mockAppLogicValue, children: createElement(AppLogicFallbackProbe) },
			),
		);

		assert.equal(captured, mockAuthValue);
		assert.equal((captured as any)?.currentAdminSecretUnlockDomain(), "clinical");
	});

	test("4. useOptionalAuthContext возвращает null вне провайдера и значение внутри", () => {
		const markupWithout = renderToStaticMarkup(createElement(OptionalAuthProbe));
		assert.ok(markupWithout.includes("нет_контекста"));

		const markupWith = renderToStaticMarkup(
			createElement(
				AuthProvider,
				{ value: mockAuthValue, children: createElement(OptionalAuthProbe) },
			),
		);
		assert.ok(markupWith.includes("есть_контекст"));
	});

	test("5. AuthProvider сохраняет стабильную ссылку через useMemo при ререндере с тем же значением", () => {
		let firstCapture: AuthContextType | null = null;
		let secondCapture: AuthContextType | null = null;

		function Probe1() {
			firstCapture = useAuthContext();
			return createElement("span", null, "1");
		}
		function Probe2() {
			secondCapture = useAuthContext();
			return createElement("span", null, "2");
		}

		renderToStaticMarkup(
			createElement(AuthProvider, { value: mockAuthValue, children: createElement(Probe1) }),
		);
		renderToStaticMarkup(
			createElement(AuthProvider, { value: mockAuthValue, children: createElement(Probe2) }),
		);

		assert.equal(firstCapture, mockAuthValue);
		assert.equal(secondCapture, mockAuthValue);
		assert.strictEqual(firstCapture, secondCapture, "Значения контекста должны быть идентичны");
	});
});

