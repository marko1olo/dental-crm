/**
 * Договоры ДМС: чтение списка и текст отказов. Решения, которые ошибались.
 *
 * ЧТО БЫЛО СЛОМАНО.
 *
 * 1. ОТКАЗ ЧТЕНИЯ ПОКАЗЫВАЛСЯ КАК «ДОГОВОРОВ НЕТ». Загрузка была написана так:
 *
 *      if (res.ok) { ...setContracts(...) } else { showToast("Ошибка загрузки договоров ДМС") }
 *      catch { showToast("Системная ошибка") }
 *
 *    Список при отказе оставался пустым, `isLoading` становился `false`, и панель
 *    рисовала честную пустоту: «Договоров ДМС нет. Добавьте договор страховой
 *    компании, чтобы применять его в планировщике смет.» Всплывающее сообщение
 *    исчезает через несколько секунд — после этого экран НАВСЕГДА утверждал, что
 *    у клиники нет ни одного договора.
 *
 *    Цена такой пустоты здесь — деньги. Покрытие по договору применяется в
 *    сравнительном конструкторе смет; администратор, увидев «договоров нет»,
 *    заводит их заново и получает дубли, либо считает смету пациенту без
 *    страховой доли. Маршрут при этом настоящий и рабочий
 *    (`apps/api/src/routes/insurance.ts`), то есть достаточно 401 при
 *    незакрытой смене или одного сбоя базы.
 *
 * 2. АДМИНИСТРАТОРУ ПЕЧАТАЛСЯ АНГЛИЙСКИЙ ТЕКСТ СЕРВЕРА. При отказе сохранения
 *    стояло `showToast(err?.error ?? "Ошибка сохранения")`, а этот сервер кладёт
 *    в поле `error` машинный код: «ContractNotFound», «companyName is required»,
 *    «Failed to create contract», «Failed to update contract» (те же строки в
 *    routes/insurance.ts). Человек в кабинете читал их дословно.
 *
 * 3. «Системная ошибка» — три раза, на три разных случая. Ни что случилось, ни
 *    что делать.
 *
 * ЧТО СТАЛО. Загрузка, честная пустота и отказ — три состояния и три текста,
 * причина отказа берётся из общего `lib/panelStateText.ts` (там кода ответа нет
 * ни в одной ветке, а следующий шаг есть всегда). Поле `error` сервера наружу не
 * идёт ни при каких условиях.
 *
 * Правила вынесены сюда из разметки, потому что ошибались именно они, а здесь их
 * проверяет обычный node:test — без React, fetch и браузера.
 */

import type { PanelSubject } from "../../lib/panelStateText";

/** Договор ДМС в том виде, в каком его показывает панель. */
export interface InsuranceContract {
	id: string;
	companyName: string;
	policyNumberMask: string | null;
	coverageTherapyPct: number;
	coverageSurgeryPct: number;
	coverageOrthoPct: number;
	coverageHygienePct: number;
	annualLimitRub: number | null;
	isActive: boolean;
	createdAt: string;
}

/** Как называется содержимое панели для трёх состояний. */
export const INSURANCE_CONTRACTS_PANEL_SUBJECT: PanelSubject = {
	notLoadedTitle: "Договоры ДМС не загружены",
	accusative: "договоры ДМС",
	emptyTitle: "Договоров ДМС нет",
	emptyHint:
		"Нажмите «Добавить договор» и укажите страховую компанию и процент покрытия по категориям — после этого договор можно применять в планировщике смет.",
	failureConsequence:
		"Не считайте, что договоров нет: список не прочитан. Не заводите их заново — появятся дубли, и в сметах будет применяться не тот процент покрытия.",
};

/** Состояние чтения списка. Ровно одно из трёх, без промежуточных комбинаций. */
export type InsuranceContractsLoadState =
	| { readonly phase: "loading" }
	| { readonly phase: "ready" }
	/** `status` — код ответа; null означает, что до сервера не дошли вовсе. */
	| { readonly phase: "failed"; readonly status: number | null };

/** Итог чтения без React и fetch: разбирается и проверяется отдельно от них. */
export type InsuranceContractsLoadOutcome =
	| { readonly ok: true; readonly contracts: InsuranceContract[] }
	| { readonly ok: false; readonly status: number | null };

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function textOrNull(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

/**
 * Процент покрытия из ответа сервера, приведённый к 0…100.
 *
 * В базе это числовая колонка, но приходить может строкой (драйверы отдают
 * `numeric` строкой) — а `contract.coverageTherapyPct` идёт прямо в
 * `width: ${val}%` и в сравнение `val > 0`. Строка «40» дала бы верную полоску и
 * неверное сравнение, а мусор — полоску шириной `NaN%`.
 */
export function coveragePercent(value: unknown): number {
	const parsed =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number.parseFloat(value)
				: Number.NaN;
	if (!Number.isFinite(parsed)) return 0;
	return Math.min(100, Math.max(0, parsed));
}

/**
 * Годовой лимит: число либо `null`.
 *
 * `null` — это «лимита нет», и панель его не печатает. Ноль лимитом НЕ считается
 * молча: в разметке стоит `contract.annualLimitRub != null`, поэтому ноль
 * напечатался бы как «Годовой лимит: 0 ₽» — то есть «страховая не платит
 * ничего», что не то же самое, что «лимит не задан».
 */
export function annualLimitOrNull(value: unknown): number | null {
	const parsed =
		typeof value === "number"
			? value
			: typeof value === "string" && value.trim().length > 0
				? Number.parseFloat(value)
				: Number.NaN;
	if (!Number.isFinite(parsed) || parsed < 0) return null;
	return parsed;
}

/**
 * Один договор из ответа сервера или `null`, если строку показать нельзя.
 *
 * Договор без `id` роняет не сразу, а на первом действии: `key={undefined}` в
 * React, а «Редактировать» и «Удалить» уходят на `/api/insurance/contracts/undefined`.
 */
export function normalizeInsuranceContract(
	value: unknown,
): InsuranceContract | null {
	const record = asRecord(value);
	if (!record) return null;
	const id = textOrNull(record.id);
	if (!id) return null;
	return {
		id,
		// Договор без названия компании остаётся в списке: его надо дать исправить
		// или удалить, а не спрятать от администратора.
		companyName: textOrNull(record.companyName) ?? "Страховая компания не указана",
		policyNumberMask: textOrNull(record.policyNumberMask),
		coverageTherapyPct: coveragePercent(record.coverageTherapyPct),
		coverageSurgeryPct: coveragePercent(record.coverageSurgeryPct),
		coverageOrthoPct: coveragePercent(record.coverageOrthoPct),
		coverageHygienePct: coveragePercent(record.coverageHygienePct),
		annualLimitRub: annualLimitOrNull(record.annualLimitRub),
		isActive: record.isActive !== false,
		createdAt: textOrNull(record.createdAt) ?? "",
	};
}

/**
 * Разбор ответа `GET /api/insurance/contracts` из УЖЕ прочитанного тела.
 *
 * Сервер отдаёт МАССИВ, а не объект (routes/insurance.ts: `return contracts`).
 * Поэтому «не массив» — это не пустой список, а ответ не того вида: раньше
 * `Array.isArray(data) ? data : []` превращал такой ответ ровно в «договоров
 * нет».
 */
export function parseInsuranceContractsPayload(
	status: number,
	rawBody: string,
): InsuranceContractsLoadOutcome {
	if (status < 200 || status >= 300) {
		return { ok: false, status };
	}
	const trimmed = rawBody.trim();
	if (trimmed.length === 0) {
		// Пустое тело на успешном статусе — испорченный ответ, а не пустой список.
		return { ok: false, status };
	}
	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch {
		return { ok: false, status };
	}
	if (!Array.isArray(payload)) {
		return { ok: false, status };
	}
	return {
		ok: true,
		contracts: payload.flatMap((row) => {
			const contract = normalizeInsuranceContract(row);
			return contract ? [contract] : [];
		}),
	};
}
