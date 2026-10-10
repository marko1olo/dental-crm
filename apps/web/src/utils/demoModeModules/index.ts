/**
 * index.ts
 *
 * Layer 5: Demo Mode Coordinator, SSOT Runtime Predicates and Complete Exports
 *
 * Единый источник правды (SSOT) для строгого разграничения боевого (Production)
 * и демонстрационного (Demo / Showcase / Test-Drive) режимов.
 *
 * КЛИНИЧЕСКИЙ ИНВАРИАНТ (МАНДАТ 8c & МАНДАТ 8f & МАНДАТ 8y):
 * 1. Боевой режим (Production, isDemoMode === false):
 *    - Полная изоляция от синтетических данных.
 *    - Запрет автоматической подгрузки тестовых пациентов, фейковых расписаний,
 *      образцовых КТ (Захаров) и вымышленных услуг/сумм в договорах и чеках.
 *    - Честный EmptyState и Fail-Closed при ошибках сети или пустых таблицах.
 * 2. Демонстрационный режим (Showcase / Demo, isDemoMode === true):
 *    - Системная подгрузка эталонных клинических данных для тест-драйва и обучения.
 *    - Плотная сетка расписания с непрерывными блоками (1-3ч), эталонная картотека,
 *      полноценная 3D КЛКТ модель и сбалансированная финансовая аналитика.
 */

import {
	DEMO_SHOWCASE_ORG_ID,
	DEMO_STUDY_INSTANCE_UID,
} from "../demo/demoConstants.js";

let _runtimeDemoOverride: boolean | null = null;

/**
 * Ручное переключение демо-режима в рантайме (для переключателей в интерфейсе).
 */
export function setRuntimeDemoMode(enabled: boolean | null): void {
	_runtimeDemoOverride = enabled;
	if (typeof window !== "undefined") {
		try {
			if (enabled === true) {
				localStorage.setItem("dente_demo_showcase", "true");
			} else if (enabled === false) {
				localStorage.removeItem("dente_demo_showcase");
			}
		} catch {
			// restricted storage
		}
	}
}

export function enableDemoShowcaseMode(): void {
	setRuntimeDemoMode(true);
}

export function disableDemoShowcaseMode(): void {
	setRuntimeDemoMode(false);
}

/**
 * Главный канонический предикат: активен ли демо-режим.
 */
export function isDemoShowcaseMode(explicitOverride?: boolean): boolean {
	if (typeof explicitOverride === "boolean") return explicitOverride;
	if (typeof _runtimeDemoOverride === "boolean") return _runtimeDemoOverride;

	if (typeof window !== "undefined") {
		try {
			const search = window.location?.search || "";
			const hash = window.location?.hash || "";

			// Явное отключение демо через параметр URL
			if (search.includes("demo=false") || hash.includes("demo=false") || search.includes("showcase=false")) {
				_runtimeDemoOverride = false;
				localStorage.removeItem("dente_demo_showcase");
				return false;
			}

			// Автоматический демо-режим для страниц предварительного просмотра (*_preview.html)
			if (window.location?.pathname?.includes("preview")) {
				return true;
			}

			// Включение демо через search (?demo=true, ?demo=1, ?showcase=true, ?cbct=demo, ?cbct=1)
			if (
				search.includes("demo=true") ||
				search.includes("demo=1") ||
				search.includes("showcase=true") ||
				search.includes("showcase=1") ||
				search.includes("cbct=demo") ||
				search.includes("cbct=1") ||
				search.includes("cbct=true") ||
				search.includes("cbct")
			) {
				localStorage.setItem("dente_demo_showcase", "true");
				return true;
			}

			// Включение демо через hash (#demo, #/demo, #/schedule?demo=true, #cbct=demo)
			if (
				hash === "#demo" ||
				hash.startsWith("#demo") ||
				hash.startsWith("#/demo") ||
				hash.includes("demo=true") ||
				hash.includes("demo=1") ||
				hash.includes("showcase=true") ||
				hash.includes("cbct")
			) {
				localStorage.setItem("dente_demo_showcase", "true");
				return true;
			}

			// Проверка сохранённого состояния в localStorage
			if (localStorage.getItem("dente_demo_showcase") === "true") {
				return true;
			}
		} catch {
			// SSR or restricted storage
		}
	}

	if (typeof process !== "undefined" && process.env) {
		if (
			process.env.IS_DEMO_SHOWCASE === "true" ||
			process.env.VITE_DEMO_SHOWCASE === "true" ||
			process.env.VITE_DEMO_MODE === "true"
		) {
			return true;
		}
	}

	if (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: Record<string, string> }).env) {
		const env = (import.meta as unknown as { env: Record<string, string> }).env;
		if (
			env.IS_DEMO_SHOWCASE === "true" ||
			env.VITE_DEMO_SHOWCASE === "true" ||
			env.VITE_DEMO_MODE === "true" ||
			env.MODE === "demo"
		) {
			return true;
		}
	}

	return false;
}

/**
 * Канонический алиас для SSOT demoModeEngine.
 */
export const isDemoMode = isDemoShowcaseMode;

/**
 * Проверка, является ли организация/клиника демонстрационным тенантом.
 */
export function isDemoTenant(organizationId?: string | null): boolean {
	if (!organizationId || typeof organizationId !== "string") return false;
	const lower = organizationId.toLowerCase();
	return (
		lower === DEMO_SHOWCASE_ORG_ID ||
		lower.startsWith("01a00000-0000-0000-0000-") ||
		lower.startsWith("demo_") ||
		lower.startsWith("demo-") ||
		lower.startsWith("sample_") ||
		lower.startsWith("test_org")
	);
}

/**
 * Проверка, является ли идентификатор пациента демонстрационным / тестовым образцом.
 */
export function isDemoPatientId(patientId?: string | null): boolean {
	if (!patientId || typeof patientId !== "string") return false;
	const lower = patientId.toLowerCase();
	return (
		lower.startsWith("sample_") ||
		lower.startsWith("demo_") ||
		lower.startsWith("demo-") ||
		lower.startsWith("01a00000-0000-0000-0000-") ||
		lower.startsWith("pat-88") ||
		lower.includes("test_patient") ||
		lower === "active_patient"
	);
}

/**
 * Проверка, является ли UID исследования демонстрационным (например, KaVo OP300 Захаров).
 */
export function isDemoStudyInstanceUid(studyUid?: string | null): boolean {
	if (!studyUid || typeof studyUid !== "string") return false;
	const lower = studyUid.toLowerCase();
	return (
		lower === DEMO_STUDY_INSTANCE_UID.toLowerCase() ||
		lower.includes(".demo.") ||
		lower.startsWith("demo_") ||
		lower.startsWith("demo-") ||
		lower.startsWith("sample_") ||
		lower.includes("zakharov") ||
		lower.includes("kavo-demo")
	);
}

/**
 * Карантин демо-данных: возвращает демо-данные ТОЛЬКО если система находится в демо-режиме
 * или условие condition === true. В противном случае строго возвращает боевые данные.
 */
export function quarantineDemoData<T>(prodData: T, demoFallback: () => T, condition?: boolean): T {
	const shouldApplyDemo = typeof condition === "boolean" ? condition : isDemoShowcaseMode();
	if (shouldApplyDemo) {
		return demoFallback();
	}
	return prodData;
}

/**
 * Утверждение чистоты боевого режима (Production Purity Invariant).
 * Проверяет, что демо-идентификаторы не протекли в боевой контекст.
 */
export function assertProductionPurity(context: string, payload: unknown): void {
	if (isDemoShowcaseMode()) {
		return; // В демо-режиме наличие демо-данных легитимно
	}

	if (!payload) return;

	const str = typeof payload === "string" ? payload : JSON.stringify(payload);
	if (str.includes(DEMO_SHOWCASE_ORG_ID)) {
		throw new Error(
			`[PRODUCTION PURITY VIOLATION in ${context}]: Demo organization ID leaked into production context.`,
		);
	}
}

// Complete re-exports of modular builders, constants and clinical suites
export * from "./types.js";
export * from "./demoScheduleAndStaffBuilder.js";
export * from "./demoClinicalCasesBuilder.js";
export * from "./demoFinanceAndWarehouseBuilder.js";
export * from "../demo/demoConstants.js";
export * from "../demo/demoClinicalCases.js";
export * from "../demo/demoInteractiveSimulation.js";
