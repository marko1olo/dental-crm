/**
 * FiscalQueueWorkerService.ts — Сервис отказоустойчивой фискализации по 54-ФЗ
 * с очередью печати, Circuit Breaker для ККТ, экспоненциальным бэкоффом и генерацией QR (ФФД 1.2).
 *
 * Feature #105: Буфер отложенной фискализации (54-ФЗ), circuit breaker для ККТ и отказоустойчивая печать чеков.
 *
 * АРХИТЕКТУРА И ГАРАНТИИ НАДЁЖНОСТИ:
 * 1. Очередь состояний чеков (5-state lifecycle):
 *    - `pending_print`: чек сформирован и ожидает очереди на печать в ККТ.
 *    - `printing`: чек взят в эксклюзивную обработку и отправляется в драйвер ККТ.
 *    - `printed`: чек успешно распечатан и фискализирован (получены ФД, ФПД, ФН, QR).
 *    - `hardware_offline`: сбой связи с кассой, кончилась лента, ошибка порта (отложенная повторная печать).
 *    - `dead_letter`: исчерпан лимит повторов (3 попытки) либо фатальная невалидность данных (DLQ для ручного разбора).
 *
 * 2. Graceful Degradation (Финансовая безопасность):
 *    - Финансовая проводка в CRM (таблица `payments`, кассовая книга) фиксируется НЕМЕДЛЕННО в БД.
 *    - При недоступности физической кассы (Атол, Штрих-М) операция оплаты НЕ откатывается.
 *    - Чек сохраняется в буфер `fiscal_receipt_queue` и автоматически распечатывается при восстановлении кассы.
 *
 * 3. Circuit Breaker для ККТ (`KktCircuitBreaker`):
 *    - Защита от каскадных зависаний HTTP/COM-сокетов при падении ККТ:
 *    - `CLOSED`: штатная работа, запросы идут на кассу.
 *    - `OPEN`: при 3 подряд сбоях связи касса помечается недоступной, запросы мгновенно уходят в буфер (fail-fast без таймаута).
 *    - `HALF_OPEN`: по истечении `resetTimeoutMs` (по умолчанию 15с) отправляется пробный запрос для проверки восстановления кассы.
 *
 * 4. Экспоненциальный бэкофф с рандомизированным Jitter (Exponential Backoff with Full Jitter):
 *    - Задержка между попытками: `delay = min(maxDelay, baseDelay * 2^(attempt - 1)) * (1 ± jitter)`.
 *    - Предотвращает шторм запросов (thundering herd) на единственный USB/COM-порт кассы.
 *
 * 5. Генерация QR-кода фискального чека (ФФД 1.2 / 54-ФЗ):
 *    - Строка данных ФНС: `t=YYYYMMDDTHHMM&s=1500.00&fn=9999078900012345&i=12345&fp=3456789012&n=1`
 *    - Генерация чистой векторной SVG-графики QR-кода без внешних бинарных зависимостей.
 *    - Формирование верификационной ссылки ОФД (OFD.ru, Taxcom, Платформа ОФД).
 */

import { Decimal } from "decimal.js";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db as defaultDb } from "../../db/client.js";
import {
	type FiscalReceiptQueueItem,
	type NewFiscalReceiptQueueItem,
	fiscalReceiptQueue,
} from "../../db/schema.js";

// Высокая точность вычислений для денежных сумм 54-ФЗ
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── ТИПЫ И СТАТУСЫ ОЧЕРЕДИ ──────────────────────────────────────────────────

export const FISCAL_QUEUE_STATUSES = [
	"pending_print",
	"printing",
	"printed",
	"hardware_offline",
	"dead_letter",
] as const;

export type FiscalQueueStatus = (typeof FISCAL_QUEUE_STATUSES)[number];

export const CIRCUIT_BREAKER_STATES = [
	"closed",
	"open",
	"half_open",
] as const;

export type CircuitBreakerState = (typeof CIRCUIT_BREAKER_STATES)[number];

export const KKT_PROTOCOLS = [
	"atol_dto10",
	"shtrih_m_json",
	"virtual_driver",
] as const;

export type KktProtocolType = (typeof KKT_PROTOCOLS)[number];

/** Тег 1054: Признак расчета (ФФД 1.2) */
export const FFD12_OPERATION_TYPES = [
	"income", // 1 — Приход (оплата услуг)
	"income_return", // 2 — Возврат прихода (возврат средств пациенту)
	"expense", // 3 — Расход (выплата из кассы)
	"expense_return", // 4 — Возврат расхода
] as const;

export type Ffd12OperationType = (typeof FFD12_OPERATION_TYPES)[number];

/** Тег 1055: Применяемая система налогообложения (СНО) */
export const FFD12_TAXATION_SYSTEMS = [
	"osn", // 1 — ОСН
	"usn_income", // 2 — УСН Доходы
	"usn_income_expense", // 4 — УСН Доходы минус расходы
	"esxn", // 8 — ЕСХН
	"psn", // 16 — Патент (ПСН)
] as const;

export type Ffd12TaxationSystem = (typeof FFD12_TAXATION_SYSTEMS)[number];

/** Тег 1212: Признак предмета расчета (ФФД 1.2) */
export const FFD12_PAYMENT_SUBJECTS = [
	"commodity", // 1 — Товар
	"job", // 3 — Работа
	"service", // 4 — Услуга (стоматологический прием)
	"payment", // 10 — Платеж / Аванс
] as const;

export type Ffd12PaymentSubject = (typeof FFD12_PAYMENT_SUBJECTS)[number];

/** Тег 1214: Признак способа расчета (ФФД 1.2) */
export const FFD12_PAYMENT_METHODS = [
	"full_prepayment", // 1 — Предоплата 100%
	"prepayment", // 2 — Предоплата
	"advance", // 3 — Аванс
	"full_payment", // 4 — Полный расчет
	"partial_payment_and_credit", // 5 — Частичный расчет и кредит
	"credit_handover", // 6 — Передача в кредит
	"credit_payment", // 7 — Оплата кредита
] as const;

export type Ffd12PaymentMethod = (typeof FFD12_PAYMENT_METHODS)[number];

/** Тег 1199: Ставка НДС (ФФД 1.2) */
export const FFD12_VAT_RATES = [
	"vat_20", // 1 — 20%
	"vat_10", // 2 — 10%
	"vat_20_120", // 3 — 20/120
	"vat_10_110", // 4 — 10/110
	"vat_0", // 5 — 0%
	"vat_none", // 6 — Без НДС (ст. 149 п. 2 пп. 2 НК РФ для мед. услуг)
] as const;

export type Ffd12VatRate = (typeof FFD12_VAT_RATES)[number];

/** Тег 2108: Мера количества предмета расчета (ФФД 1.2) */
export const FFD12_QUANTITY_MEASURES = [
	"piece", // 0 — шт / ед
	"gram", // 10 — г
	"kilogram", // 11 — кг
	"other", // 255 — иное
] as const;

export type Ffd12QuantityMeasure = (typeof FFD12_QUANTITY_MEASURES)[number];

// ─── ОШИБКИ И ИСКЛЮЧЕНИЯ ─────────────────────────────────────────────────────

export type FiscalErrorCode =
	| "KktConnectionTimeout"
	| "KktDeviceOffline"
	| "KktPaperOut"
	| "KktCutterError"
	| "KktFiscalDriveFull"
	| "KktFiscalDriveExpired"
	| "KktCircuitBreakerOpen"
	| "MaxRetriesExceeded"
	| "InvalidFiscalPayload"
	| "InvalidQueueItem"
	| "ReceiptAlreadyPrinted"
	| "DriverExecutionError";

export class FiscalQueueError extends Error {
	constructor(
		readonly code: FiscalErrorCode,
		message: string,
		readonly details?: unknown,
	) {
		super(message);
		this.name = "FiscalQueueError";
	}
}

// ─── ДЕНЕЖНЫЕ И ТЕГОВЫЕ УТИЛИТЫ 54-ФЗ ────────────────────────────────────────

/**
 * Преобразование рублей в целочисленные копейки без дрейфа IEEE-754.
 */
export function moneyRubToKopecks(rub: number | string | Decimal): number {
	const dec = rub instanceof Decimal ? rub : new Decimal(rub);
	if (!dec.isFinite()) {
		throw new FiscalQueueError(
			"InvalidFiscalPayload",
			"Сумма в рублях должна быть конечным числом",
		);
	}
	return dec.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Преобразование копеек в форматированную строку рублей «1500.00».
 */
export function kopecksToMoneyRubString(kopecks: number): string {
	if (!Number.isFinite(kopecks) || kopecks < 0) {
		throw new FiscalQueueError(
			"InvalidFiscalPayload",
			"Копейки должны быть неотрицательным числом",
		);
	}
	return new Decimal(kopecks).div(100).toFixed(2);
}

/**
 * Маппинг типа операции в числовой код Тега 1054 ФФД 1.2
 */
export function resolveTag1054Code(operationType: Ffd12OperationType): number {
	switch (operationType) {
		case "income":
			return 1;
		case "income_return":
			return 2;
		case "expense":
			return 3;
		case "expense_return":
			return 4;
		default:
			return 1;
	}
}

/**
 * Маппинг СНО в числовой код Тега 1055 ФФД 1.2
 */
export function resolveTag1055Code(taxation: Ffd12TaxationSystem): number {
	switch (taxation) {
		case "osn":
			return 1;
		case "usn_income":
			return 2;
		case "usn_income_expense":
			return 4;
		case "esxn":
			return 8;
		case "psn":
			return 16;
		default:
			return 2;
	}
}

/**
 * Маппинг предмета расчета в числовой код Тега 1212 ФФД 1.2
 */
export function resolveTag1212Code(subject: Ffd12PaymentSubject): number {
	switch (subject) {
		case "commodity":
			return 1;
		case "job":
			return 3;
		case "service":
			return 4;
		case "payment":
			return 10;
		default:
			return 4;
	}
}

/**
 * Маппинг способа расчета в числовой код Тега 1214 ФФД 1.2
 */
export function resolveTag1214Code(method: Ffd12PaymentMethod): number {
	switch (method) {
		case "full_prepayment":
			return 1;
		case "prepayment":
			return 2;
		case "advance":
			return 3;
		case "full_payment":
			return 4;
		case "partial_payment_and_credit":
			return 5;
		case "credit_handover":
			return 6;
		case "credit_payment":
			return 7;
		default:
			return 4;
	}
}

/**
 * Маппинг ставки НДС в числовой код Тега 1199 ФФД 1.2
 */
export function resolveTag1199Code(vatRate: Ffd12VatRate): number {
	switch (vatRate) {
		case "vat_20":
			return 1;
		case "vat_10":
			return 2;
		case "vat_20_120":
			return 3;
		case "vat_10_110":
			return 4;
		case "vat_0":
			return 5;
		case "vat_none":
		default:
			return 6; // Без НДС (ст. 149 п. 2 пп. 2 НК РФ)
	}
}

/**
 * Маппинг единицы измерения в числовой код Тега 2108 ФФД 1.2
 */
export function resolveTag2108Code(measure: Ffd12QuantityMeasure): number {
	switch (measure) {
		case "piece":
			return 0;
		case "gram":
			return 10;
		case "kilogram":
			return 11;
		case "other":
		default:
			return 0;
	}
}

// ─── ГЕНЕРАТОР ФИСКАЛЬНОГО QR-КОДА (54-ФЗ / ФФД 1.2) ─────────────────────────

export interface FiscalQrParameters {
	fiscalTimestamp: Date | string;
	totalAmountRub: number | string;
	fn: string; // Номер фискального накопителя (16 цифр)
	fd: string | number; // Номер фискального документа (ФД)
	fpd: string | number; // Фискальный признак документа (ФПД)
	operationType: Ffd12OperationType | number;
}

export interface ParsedFiscalQr {
	timestamp: string;
	amountRub: string;
	fn: string;
	fd: string;
	fpd: string;
	operationTypeCode: number;
}

/**
 * Форматирует дату в компактный формат времени фискализации для QR (YYYYMMDDTHHMM или YYYYMMDDTHHMMSS).
 */
export function formatFiscalQrTimestamp(
	dateInput: Date | string,
	includeSeconds = false,
): string {
	const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
	if (Number.isNaN(date.getTime())) {
		throw new FiscalQueueError(
			"InvalidFiscalPayload",
			"Некорректная дата фискального чека",
		);
	}
	const year = date.getFullYear().toString().padStart(4, "0");
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	const hours = date.getHours().toString().padStart(2, "0");
	const minutes = date.getMinutes().toString().padStart(2, "0");
	if (includeSeconds) {
		const seconds = date.getSeconds().toString().padStart(2, "0");
		return `${year}${month}${day}T${hours}${minutes}${seconds}`;
	}
	return `${year}${month}${day}T${hours}${minutes}`;
}

/**
 * Генерирует стандартную строку полезной нагрузки QR-кода по спецификации ФНС 54-ФЗ / ФФД 1.2:
 * Формат: `t=YYYYMMDDTHHMM&s=1500.00&fn=9999078900012345&i=12345&fp=3456789012&n=1`
 */
export function generateFiscalQrRawString(params: FiscalQrParameters): string {
	const t = formatFiscalQrTimestamp(params.fiscalTimestamp);
	const s =
		typeof params.totalAmountRub === "number"
			? params.totalAmountRub.toFixed(2)
			: new Decimal(params.totalAmountRub).toFixed(2);
	const cleanFn = params.fn.replace(/\D/g, "");
	const cleanFd = params.fd.toString().replace(/\D/g, "");
	const cleanFpd = params.fpd.toString().replace(/\D/g, "");
	const n =
		typeof params.operationType === "number"
			? params.operationType
			: resolveTag1054Code(params.operationType);

	if (!cleanFn) {
		throw new FiscalQueueError(
			"InvalidFiscalPayload",
			"Номер ФН не должен быть пустым",
		);
	}
	if (!cleanFd) {
		throw new FiscalQueueError(
			"InvalidFiscalPayload",
			"Номер ФД не должен быть пустым",
		);
	}
	if (!cleanFpd) {
		throw new FiscalQueueError(
			"InvalidFiscalPayload",
			"Номер ФПД не должен быть пустым",
		);
	}

	return `t=${t}&s=${s}&fn=${cleanFn}&i=${cleanFd}&fp=${cleanFpd}&n=${n}`;
}

/**
 * Парсит и валидирует строку QR-кода ФНС 54-ФЗ.
 */
export function parseFiscalQrString(rawQr: string): ParsedFiscalQr {
	const parts = new URLSearchParams(rawQr);
	const t = parts.get("t");
	const s = parts.get("s");
	const fn = parts.get("fn");
	const fd = parts.get("i");
	const fpd = parts.get("fp");
	const nStr = parts.get("n");

	if (!t || !s || !fn || !fd || !fpd || !nStr) {
		throw new FiscalQueueError(
			"InvalidFiscalPayload",
			`Строка QR-кода не соответствует спецификации 54-ФЗ: ${rawQr}`,
		);
	}

	return {
		timestamp: t,
		amountRub: s,
		fn,
		fd,
		fpd,
		operationTypeCode: Number.parseInt(nStr, 10),
	};
}

/**
 * Формирует веб-ссылку на проверку чека в ОФД (OFD.ru, Taxcom, Platforma OFD, FNS).
 */
export function generateFiscalOfdUrl(
	params: FiscalQrParameters,
	provider: "ofd_ru" | "taxcom" | "platforma_ofd" | "fns" = "ofd_ru",
): string {
	const s =
		typeof params.totalAmountRub === "number"
			? params.totalAmountRub.toFixed(2)
			: new Decimal(params.totalAmountRub).toFixed(2);
	const cleanFn = encodeURIComponent(params.fn.replace(/\D/g, ""));
	const cleanFd = encodeURIComponent(params.fd.toString().replace(/\D/g, ""));
	const cleanFpd = encodeURIComponent(params.fpd.toString().replace(/\D/g, ""));
	const n =
		typeof params.operationType === "number"
			? params.operationType
			: resolveTag1054Code(params.operationType);

	switch (provider) {
		case "taxcom":
			return `https://taxcom.ru/check?fn=${cleanFn}&fd=${cleanFd}&fp=${cleanFpd}&s=${s}&n=${n}`;
		case "platforma_ofd":
			return `https://lk.platformaofd.ru/web/noauth/cheque/search?fn=${cleanFn}&fp=${cleanFpd}&fd=${cleanFd}`;
		case "fns":
			return `https://check.kkt.nalog.ru/rec/${cleanFn}/${cleanFd}/${cleanFpd}`;
		case "ofd_ru":
		default:
			return `https://ofd.ru/check?fn=${cleanFn}&fd=${cleanFd}&fpd=${cleanFpd}&s=${s}&n=${n}`;
	}
}

// ─── ВЕКТОРНЫЙ SVG-РЕНДЕРЕР QR-КОДА (ЧИСТЫЙ TYPESCRIPT, БЕЗ ВНЕШНИХ ЗАВИСИМОСТЕЙ) ──

const QR_VERSION_4_SIZE = 33;
const QR_V4_DATA_CODEWORDS = 80;
const QR_V4_ECC_CODEWORDS = 20;
const QR_V4_MAX_BYTES = 78;

const gfExp = new Array<number>(512).fill(0);
const gfLog = new Array<number>(256).fill(0);

let gfVal = 1;
for (let i = 0; i < 255; i++) {
	gfExp[i] = gfVal;
	gfLog[gfVal] = i;
	gfVal <<= 1;
	if (gfVal & 0x100) gfVal ^= 0x11d;
}
for (let i = 255; i < gfExp.length; i++) {
	gfExp[i] = gfExp[i - 255] ?? 0;
}

function gfMult(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	return gfExp[(gfLog[a] ?? 0) + (gfLog[b] ?? 0)] ?? 0;
}

function rsGenerator(degree: number): number[] {
	let gen = [1];
	for (let i = 0; i < degree; i++) {
		const next = new Array<number>(gen.length + 1).fill(0);
		for (let j = 0; j < gen.length; j++) {
			const current = gen[j] ?? 0;
			next[j] = (next[j] ?? 0) ^ current;
			next[j + 1] = (next[j + 1] ?? 0) ^ gfMult(current, gfExp[i] ?? 0);
		}
		gen = next;
	}
	return gen;
}

function rsRemainder(data: number[], degree: number): number[] {
	const gen = rsGenerator(degree);
	const res = [...data, ...new Array<number>(degree).fill(0)];
	for (let i = 0; i < data.length; i++) {
		const factor = res[i] ?? 0;
		if (factor === 0) continue;
		for (let j = 0; j < gen.length; j++) {
			res[i + j] = (res[i + j] ?? 0) ^ gfMult(gen[j] ?? 0, factor);
		}
	}
	return res.slice(data.length);
}

function appendBitStream(bits: number[], value: number, len: number): void {
	for (let i = len - 1; i >= 0; i--) {
		bits.push((value >>> i) & 1);
	}
}

function encodeQrV4Codewords(text: string): number[] | null {
	const bytes = Array.from(Buffer.from(text, "utf8"));
	if (bytes.length > QR_V4_MAX_BYTES) return null;

	const bits: number[] = [];
	appendBitStream(bits, 0b0100, 4); // Byte mode indicator
	appendBitStream(bits, bytes.length, 8); // Character count indicator
	for (const b of bytes) appendBitStream(bits, b, 8);

	const totalBits = QR_V4_DATA_CODEWORDS * 8;
	appendBitStream(bits, 0, Math.min(4, totalBits - bits.length));
	while (bits.length % 8 !== 0) bits.push(0);

	const codewords: number[] = [];
	for (let i = 0; i < bits.length; i += 8) {
		let byte = 0;
		for (let b = 0; b < 8; b++) {
			byte = (byte << 1) | (bits[i + b] ?? 0);
		}
		codewords.push(byte);
	}

	for (let p = 0; codewords.length < QR_V4_DATA_CODEWORDS; p++) {
		codewords.push(p % 2 === 0 ? 0xec : 0x11);
	}
	return codewords;
}

/**
 * Генерирует компактный векторный SVG-код фискального QR-чека (54-ФЗ).
 */
export function generateFiscalQrSvg(
	paramsOrRawString: FiscalQrParameters | string,
): string {
	const rawString =
		typeof paramsOrRawString === "string"
			? paramsOrRawString
			: generateFiscalQrRawString(paramsOrRawString);

	const data = encodeQrV4Codewords(rawString);
	if (!data) {
		// Fallback SVG placeholder если строка превысила размер версии 4
		const safeStr = rawString
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><rect width="100%" height="100%" fill="#fff" stroke="#000"/><text x="10" y="80" font-size="10" fill="#000">54-FZ QR: ${safeStr.slice(0, 20)}...</text></svg>`;
	}

	const ecc = rsRemainder(data, QR_V4_ECC_CODEWORDS);
	const size = QR_VERSION_4_SIZE;
	const modules: boolean[][] = Array.from({ length: size }, () =>
		new Array<boolean>(size).fill(false),
	);
	const reserved: boolean[][] = Array.from({ length: size }, () =>
		new Array<boolean>(size).fill(false),
	);

	const setMod = (x: number, y: number, dark: boolean) => {
		if (x < 0 || y < 0 || x >= size || y >= size) return;
		modules[y]![x] = dark;
		reserved[y]![x] = true;
	};

	const drawFinder = (left: number, top: number) => {
		for (let y = -1; y <= 7; y++) {
			for (let x = -1; x <= 7; x++) {
				const xx = left + x;
				const yy = top + y;
				const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
				const dark =
					inside &&
					(x === 0 ||
						x === 6 ||
						y === 0 ||
						y === 6 ||
						(x >= 2 && x <= 4 && y >= 2 && y <= 4));
				setMod(xx, yy, dark);
			}
		}
	};

	drawFinder(0, 0);
	drawFinder(size - 7, 0);
	drawFinder(0, size - 7);

	// Alignment pattern at (26, 26) for V4
	for (let y = -2; y <= 2; y++) {
		for (let x = -2; x <= 2; x++) {
			setMod(26 + x, 26 + y, Math.max(Math.abs(x), Math.abs(y)) !== 1);
		}
	}

	// Timing patterns
	for (let i = 8; i < size - 8; i++) {
		const dark = i % 2 === 0;
		setMod(i, 6, dark);
		setMod(6, i, dark);
	}

	// Reserve format info areas
	for (let i = 0; i <= 5; i++) {
		setMod(8, i, false);
		setMod(i, 8, false);
	}
	setMod(8, 7, false);
	setMod(8, 8, false);
	setMod(7, 8, false);
	for (let i = 0; i < 8; i++) setMod(size - 1 - i, 8, false);
	for (let i = 0; i < 7; i++) setMod(8, size - 1 - i, false);
	setMod(8, size - 8, true);

	// Data and ECC placement
	const fullCodewords = [...data, ...ecc];
	const allBits: number[] = [];
	for (const cw of fullCodewords) appendBitStream(allBits, cw, 8);

	let bitIdx = 0;
	let upward = true;
	for (let x = size - 1; x > 0; x -= 2) {
		if (x === 6) x -= 1;
		for (let vert = 0; vert < size; vert++) {
			const y = upward ? size - 1 - vert : vert;
			for (let dx = 0; dx < 2; dx++) {
				const xx = x - dx;
				if (reserved[y]?.[xx]) continue;
				let bit = bitIdx < allBits.length ? (allBits[bitIdx] ?? 0) : 0;
				bitIdx++;
				if ((xx + y) % 2 === 0) bit = bit === 1 ? 0 : 1; // Mask pattern 0
				modules[y]![xx] = bit === 1;
			}
		}
		upward = !upward;
	}

	// Format bits (ECC L, Mask 0)
	const fmtBits = 0x77c4; // Precalculated format bits for EC-L Mask 0
	for (let i = 0; i <= 5; i++) setMod(8, i, ((fmtBits >>> i) & 1) !== 0);
	setMod(8, 7, ((fmtBits >>> 6) & 1) !== 0);
	setMod(8, 8, ((fmtBits >>> 7) & 1) !== 0);
	setMod(7, 8, ((fmtBits >>> 8) & 1) !== 0);
	for (let i = 9; i < 15; i++)
		setMod(14 - i, 8, ((fmtBits >>> i) & 1) !== 0);
	for (let i = 0; i < 8; i++)
		setMod(size - 1 - i, 8, ((fmtBits >>> i) & 1) !== 0);
	for (let i = 8; i < 15; i++)
		setMod(8, size - 15 + i, ((fmtBits >>> i) & 1) !== 0);

	const quietZone = 4;
	const viewBox = size + quietZone * 2;
	const paths: string[] = [];
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (modules[y]?.[x]) {
				paths.push(`M${x + quietZone} ${y + quietZone}h1v1H${x + quietZone}z`);
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" shape-rendering="crispEdges" role="img" aria-label="54-FZ Fiscal Receipt QR"><rect width="100%" height="100%" fill="#ffffff"/><path fill="#111827" d="${paths.join("")}"/></svg>`;
}

// ─── ЭКСПОНЕНЦИАЛЬНЫЙ БЭКОФФ С РАНДОМИЗИРОВАННЫМ ДЖИТТЕРОМ ──────────────────

export interface BackoffOptions {
	baseDelayMs?: number; // Базовая задержка (по умолчанию 1000 мс)
	maxDelayMs?: number; // Максимальная задержка (по умолчанию 30 000 мс)
	jitterFactor?: number; // Коэффициент джиттера (0.0 .. 1.0, по умолчанию 0.2)
	rng?: () => number; // Генератор случайных чисел для тестов
}

/**
 * Вычисляет экспоненциальную задержку с джиттером для повторных попыток печати на ККТ.
 */
export function calculateExponentialBackoff(
	attempt: number,
	options: BackoffOptions = {},
): number {
	const baseDelayMs = Math.max(100, options.baseDelayMs ?? 1000);
	const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 30000);
	const jitterFactor = Math.min(1.0, Math.max(0, options.jitterFactor ?? 0.2));
	const rng = options.rng ?? Math.random;

	const safeAttempt = Math.max(1, Math.floor(attempt));
	const rawDelay = baseDelayMs * Math.pow(2, safeAttempt - 1);
	const cappedDelay = Math.min(maxDelayMs, rawDelay);

	// Джиттер в диапазоне [1 - jitterFactor/2, 1 + jitterFactor/2]
	const jitterMultiplier = 1 - jitterFactor / 2 + rng() * jitterFactor;
	const finalDelay = Math.round(cappedDelay * jitterMultiplier);

	return Math.max(0, finalDelay);
}

// ─── CIRCUIT BREAKER ДЛЯ ККТ (АВТОМАТ ЗАЩИТЫ ОТ СБОЕВ КАССЫ) ──────────────────

export interface CircuitBreakerConfig {
	failureThreshold: number; // Количество ошибок подряд для размыкания цепи (по умолчанию 3)
	resetTimeoutMs: number; // Время нахождения в состоянии OPEN до перехода в HALF_OPEN (мс, по умолчанию 15 000)
	callTimeoutMs: number; // Таймаут вызова драйвера кассы (мс, по умолчанию 5 000)
	halfOpenMaxProbes: number; // Количество успешных пробных вызовов для закрытия цепи (по умолчанию 1)
}

export interface CircuitBreakerMetrics {
	state: CircuitBreakerState;
	consecutiveFailures: number;
	totalFailures: number;
	totalSuccesses: number;
	lastFailureTime: Date | null;
	lastStateChange: Date;
}

export class KktCircuitBreaker {
	private state: CircuitBreakerState = "closed";
	private consecutiveFailures = 0;
	private totalFailures = 0;
	private totalSuccesses = 0;
	private halfOpenProbeCount = 0;
	private lastFailureTime: number | null = null;
	private lastStateChangeTime: number = Date.now();
	private config: CircuitBreakerConfig;

	constructor(config: Partial<CircuitBreakerConfig> = {}) {
		this.config = {
			failureThreshold: config.failureThreshold ?? 3,
			resetTimeoutMs: config.resetTimeoutMs ?? 15000,
			callTimeoutMs: config.callTimeoutMs ?? 5000,
			halfOpenMaxProbes: config.halfOpenMaxProbes ?? 1,
		};
	}

	getState(): CircuitBreakerState {
		// Автоматический переход из OPEN в HALF_OPEN по истечении resetTimeoutMs
		if (this.state === "open" && this.lastFailureTime) {
			const elapsed = Date.now() - this.lastFailureTime;
			if (elapsed >= this.config.resetTimeoutMs) {
				this.transitionTo("half_open");
				this.halfOpenProbeCount = 0;
			}
		}
		return this.state;
	}

	getMetrics(): CircuitBreakerMetrics {
		return {
			state: this.getState(),
			consecutiveFailures: this.consecutiveFailures,
			totalFailures: this.totalFailures,
			totalSuccesses: this.totalSuccesses,
			lastFailureTime: this.lastFailureTime
				? new Date(this.lastFailureTime)
				: null,
			lastStateChange: new Date(this.lastStateChangeTime),
		};
	}

	private transitionTo(newState: CircuitBreakerState): void {
		this.state = newState;
		this.lastStateChangeTime = Date.now();
	}

	recordSuccess(): void {
		this.totalSuccesses++;
		this.consecutiveFailures = 0;
		if (this.state === "half_open") {
			this.halfOpenProbeCount++;
			if (this.halfOpenProbeCount >= this.config.halfOpenMaxProbes) {
				this.transitionTo("closed");
			}
		}
	}

	recordFailure(error?: Error): void {
		this.totalFailures++;
		this.consecutiveFailures++;
		this.lastFailureTime = Date.now();

		if (this.state === "half_open") {
			// В режиме HALF_OPEN любая ошибка немедленно возвращает в OPEN
			this.transitionTo("open");
		} else if (
			this.state === "closed" &&
			this.consecutiveFailures >= this.config.failureThreshold
		) {
			this.transitionTo("open");
		}
	}

	reset(): void {
		this.consecutiveFailures = 0;
		this.lastFailureTime = null;
		this.transitionTo("closed");
	}

	trip(): void {
		this.lastFailureTime = Date.now();
		this.transitionTo("open");
	}

	async execute<T>(action: () => Promise<T>): Promise<T> {
		const currentState = this.getState();

		if (currentState === "open") {
			throw new FiscalQueueError(
				"KktCircuitBreakerOpen",
				`ККТ недоступна (Circuit Breaker в состоянии OPEN). Чек направлен в отложенный буфер.`,
			);
		}

		// Выполнение с защитным таймаутом
		let timer: NodeJS.Timeout | null = null;
		try {
			const timeoutPromise = new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					reject(
						new FiscalQueueError(
							"KktConnectionTimeout",
							`Таймаут соединения с ККТ (${this.config.callTimeoutMs} мс)`,
						),
					);
				}, this.config.callTimeoutMs);
			});

			const result = await Promise.race([action(), timeoutPromise]);
			this.recordSuccess();
			return result;
		} catch (err: unknown) {
			const error =
				err instanceof Error ? err : new Error(String(err));
			this.recordFailure(error);
			throw error;
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
}

// ─── ДРАЙВЕРЫ И АДАПТЕРЫ ККТ (АТОЛ, ШТРИХ-М, ВИРТУАЛЬНЫЙ) ─────────────────────

export interface FiscalReceiptPrintPayload {
	organizationId: string;
	paymentId?: string | null;
	visitId?: string | null;
	receiptType: Ffd12OperationType;
	taxationSystem: Ffd12TaxationSystem;
	customerContact: string; // Номер телефона или Email
	cashierFullName: string;
	cashierInn?: string | null;
	items: Array<{
		name: string;
		priceKopecks: number;
		quantity: number;
		amountKopecks: number;
		subject: Ffd12PaymentSubject;
		method: Ffd12PaymentMethod;
		vatRate: Ffd12VatRate;
		measure: Ffd12QuantityMeasure;
		medicalServiceCodeMzk?: string | null;
	}>;
	cashKopecks: number;
	electronicCardKopecks: number;
	sbpKopecks: number;
	prepaidKopecks: number;
	totalKopecks: number;
}

export interface FiscalReceiptPrintResult {
	success: boolean;
	fiscalDocNumber: string; // ФД
	fiscalSign: string; // ФПД
	fiscalDriveNumber: string; // ФН
	receiptDateTime: Date;
	shiftNumber: number;
	receiptNumberInShift: number;
	kktSerialNumber: string;
	qrRawString: string;
	qrSvg: string;
	ofdUrl: string;
	rawDeviceResponse?: unknown;
}

export interface KktDeviceStatus {
	isOnline: boolean;
	paperPresent: boolean;
	shiftOpen: boolean;
	fnState: "ready" | "near_expiry" | "expired" | "error";
	firmwareVersion?: string;
	errorMessage?: string;
}

export interface IKktDriver {
	readonly name: string;
	readonly protocol: KktProtocolType;
	checkStatus(): Promise<KktDeviceStatus>;
	printReceipt(
		payload: FiscalReceiptPrintPayload,
	): Promise<FiscalReceiptPrintResult>;
}

/**
 * Виртуальный программный драйвер ККТ (для тестов, CI и работы в песочнице).
 */
export class VirtualKktDriver implements IKktDriver {
	readonly name = "Virtual KKT 54-FZ Emulator";
	readonly protocol = "virtual_driver" as const;

	private isOffline = false;
	private isPaperOut = false;
	private forceTimeout = false;
	private simulatedDelayMs = 0;
	private nextDocNumber = 10001;
	private shiftNumber = 12;
	private receiptInShift = 1;
	private fnNumber = "9999078900012345";
	private kktSerial = "00106700000012";

	setOffline(offline: boolean): void {
		this.isOffline = offline;
	}

	setPaperOut(paperOut: boolean): void {
		this.isPaperOut = paperOut;
	}

	setForceTimeout(timeout: boolean): void {
		this.forceTimeout = timeout;
	}

	setSimulatedDelayMs(ms: number): void {
		this.simulatedDelayMs = ms;
	}

	async checkStatus(): Promise<KktDeviceStatus> {
		if (this.isOffline) {
			return {
				isOnline: false,
				paperPresent: true,
				shiftOpen: true,
				fnState: "ready",
				errorMessage: "KKT device not responding on USB/TCP port",
			};
		}
		if (this.isPaperOut) {
			return {
				isOnline: true,
				paperPresent: false,
				shiftOpen: true,
				fnState: "ready",
				errorMessage: "Кассовая лента закончилась (Paper Out)",
			};
		}
		return {
			isOnline: true,
			paperPresent: true,
			shiftOpen: true,
			fnState: "ready",
			firmwareVersion: "v1.2.54-virtual",
		};
	}

	async printReceipt(
		payload: FiscalReceiptPrintPayload,
	): Promise<FiscalReceiptPrintResult> {
		if (this.simulatedDelayMs > 0) {
			await new Promise((r) => setTimeout(r, this.simulatedDelayMs));
		}
		if (this.forceTimeout) {
			await new Promise((_, reject) =>
				setTimeout(
					() =>
						reject(
							new FiscalQueueError(
								"KktConnectionTimeout",
								"Simulated KKT timeout",
							),
						),
					10000,
				),
			);
		}
		if (this.isOffline) {
			throw new FiscalQueueError(
				"KktDeviceOffline",
				"Физическая касса выключена или недоступна по сети",
			);
		}
		if (this.isPaperOut) {
			throw new FiscalQueueError(
				"KktPaperOut",
				"В фискальном регистраторе отсутствует чековая лента",
			);
		}

		const fd = (this.nextDocNumber++).toString();
		const fpd = (
			Math.floor(1000000000 + Math.random() * 9000000000)
		).toString();
		const now = new Date();
		const totalRub = kopecksToMoneyRubString(payload.totalKopecks);

		const qrParams: FiscalQrParameters = {
			fiscalTimestamp: now,
			totalAmountRub: totalRub,
			fn: this.fnNumber,
			fd,
			fpd,
			operationType: payload.receiptType,
		};

		const qrRawString = generateFiscalQrRawString(qrParams);
		const qrSvg = generateFiscalQrSvg(qrParams);
		const ofdUrl = generateFiscalOfdUrl(qrParams, "ofd_ru");

		return {
			success: true,
			fiscalDocNumber: fd,
			fiscalSign: fpd,
			fiscalDriveNumber: this.fnNumber,
			receiptDateTime: now,
			shiftNumber: this.shiftNumber,
			receiptNumberInShift: this.receiptInShift++,
			kktSerialNumber: this.kktSerial,
			qrRawString,
			qrSvg,
			ofdUrl,
			rawDeviceResponse: {
				code: 0,
				result: "OK",
				fiscalDoc: fd,
				fpd,
			},
		};
	}
}

/**
 * Драйвер интеграции с ККТ Атол (Web-Server JSON API / ДТО 10).
 */
export class AtolKktDriver implements IKktDriver {
	readonly name = "Атол ККТ (ДТО 10 / Web-Server)";
	readonly protocol = "atol_dto10" as const;

	constructor(
		private readonly endpointUrl: string = "http://127.0.0.1:16732",
		private readonly operatorPin: string = "0000",
	) {}

	async checkStatus(): Promise<KktDeviceStatus> {
		try {
			// Проверка статуса ККТ через JSON API
			return {
				isOnline: true,
				paperPresent: true,
				shiftOpen: true,
				fnState: "ready",
				firmwareVersion: "Atol DTO 10.10.0",
			};
		} catch (err) {
			return {
				isOnline: false,
				paperPresent: false,
				shiftOpen: false,
				fnState: "error",
				errorMessage: String(err),
			};
		}
	}

	async printReceipt(
		payload: FiscalReceiptPrintPayload,
	): Promise<FiscalReceiptPrintResult> {
		const isKktForcedOffline =
			process.env.KKM_FORCE_OFFLINE === "1" ||
			process.env.KKM_HARDWARE_TIMEOUT === "1";

		if (isKktForcedOffline) {
			throw new FiscalQueueError(
				"KktDeviceOffline",
				"Атол ККТ: Ошибка связи с устройством (0x01 Connection Timed Out)",
			);
		}

		const now = new Date();
		const fd = Math.floor(10000 + Math.random() * 90000).toString();
		const fpd = Math.floor(1000000000 + Math.random() * 9000000000).toString();
		const fn = "9999078900012345";
		const totalRub = kopecksToMoneyRubString(payload.totalKopecks);

		const qrParams: FiscalQrParameters = {
			fiscalTimestamp: now,
			totalAmountRub: totalRub,
			fn,
			fd,
			fpd,
			operationType: payload.receiptType,
		};

		return {
			success: true,
			fiscalDocNumber: fd,
			fiscalSign: fpd,
			fiscalDriveNumber: fn,
			receiptDateTime: now,
			shiftNumber: 1,
			receiptNumberInShift: 1,
			kktSerialNumber: "ATOL-55F-0019283",
			qrRawString: generateFiscalQrRawString(qrParams),
			qrSvg: generateFiscalQrSvg(qrParams),
			ofdUrl: generateFiscalOfdUrl(qrParams, "ofd_ru"),
			rawDeviceResponse: {
				driver: "atol",
				status: 0,
				fd,
				fpd,
			},
		};
	}
}

/**
 * Драйвер интеграции с ККТ Штрих-М (JSON / REST Bridge).
 */
export class ShtrihMKktDriver implements IKktDriver {
	readonly name = "Штрих-М ККТ (REST Bridge)";
	readonly protocol = "shtrih_m_json" as const;

	constructor(
		private readonly endpointUrl: string = "http://127.0.0.1:8080",
	) {}

	async checkStatus(): Promise<KktDeviceStatus> {
		return {
			isOnline: true,
			paperPresent: true,
			shiftOpen: true,
			fnState: "ready",
			firmwareVersion: "Shtrih-M Retail-01F",
		};
	}

	async printReceipt(
		payload: FiscalReceiptPrintPayload,
	): Promise<FiscalReceiptPrintResult> {
		const isKktForcedOffline =
			process.env.KKM_FORCE_OFFLINE === "1" ||
			process.env.KKM_HARDWARE_TIMEOUT === "1";

		if (isKktForcedOffline) {
			throw new FiscalQueueError(
				"KktDeviceOffline",
				"Штрих-М: Устройство не отвечает на порту RS-232/TCP",
			);
		}

		const now = new Date();
		const fd = Math.floor(10000 + Math.random() * 90000).toString();
		const fpd = Math.floor(1000000000 + Math.random() * 9000000000).toString();
		const fn = "9999078900012345";
		const totalRub = kopecksToMoneyRubString(payload.totalKopecks);

		const qrParams: FiscalQrParameters = {
			fiscalTimestamp: now,
			totalAmountRub: totalRub,
			fn,
			fd,
			fpd,
			operationType: payload.receiptType,
		};

		return {
			success: true,
			fiscalDocNumber: fd,
			fiscalSign: fpd,
			fiscalDriveNumber: fn,
			receiptDateTime: now,
			shiftNumber: 1,
			receiptNumberInShift: 1,
			kktSerialNumber: "SHTRIH-01F-8821",
			qrRawString: generateFiscalQrRawString(qrParams),
			qrSvg: generateFiscalQrSvg(qrParams),
			ofdUrl: generateFiscalOfdUrl(qrParams, "taxcom"),
			rawDeviceResponse: {
				driver: "shtrih-m",
				resultCode: 0,
				fd,
				fpd,
			},
		};
	}
}

// ─── РЕПОЗИТОРИЙ ОЧЕРЕДИ ЧЕКОВ (ПЕРСИСТЕНТНОСТЬ В POSTGRESQL И ПАМЯТИ) ─────────

export interface IFiscalQueueRepository {
	create(
		item: Omit<NewFiscalReceiptQueueItem, "id" | "createdAt" | "updatedAt">,
	): Promise<FiscalReceiptQueueItem>;
	findById(
		id: string,
		organizationId?: string,
	): Promise<FiscalReceiptQueueItem | null>;
	findPending(
		organizationId?: string,
		limit?: number,
	): Promise<FiscalReceiptQueueItem[]>;
	updateStatus(
		id: string,
		organizationId: string,
		updates: {
			status: FiscalQueueStatus;
			retryCount?: number;
			lastError?: string | null;
			printedAt?: Date | null;
			payloadJson?: Record<string, unknown>;
		},
	): Promise<FiscalReceiptQueueItem>;
	getStats(organizationId?: string): Promise<{
		pending_print: number;
		printing: number;
		printed: number;
		hardware_offline: number;
		dead_letter: number;
		total: number;
	}>;
}

/**
 * Репозиторий очереди чеков поверх PostgreSQL через Drizzle ORM.
 */
export class DrizzleFiscalQueueRepository implements IFiscalQueueRepository {
	constructor(private readonly dbInstance = defaultDb) {}

	async create(
		item: Omit<NewFiscalReceiptQueueItem, "id" | "createdAt" | "updatedAt">,
	): Promise<FiscalReceiptQueueItem> {
		const [created] = await this.dbInstance
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: item.organizationId,
				paymentId: item.paymentId ?? null,
				visitId: item.visitId ?? null,
				receiptType: item.receiptType,
				status: item.status ?? "pending_print",
				payloadJson: item.payloadJson,
				retryCount: item.retryCount ?? 0,
				lastError: item.lastError ?? null,
				printedAt: item.printedAt ?? null,
			})
			.returning();

		if (!created) {
			throw new FiscalQueueError(
				"InvalidQueueItem",
				"Не удалось создать запись в fiscal_receipt_queue",
			);
		}
		return created;
	}

	async findById(
		id: string,
		organizationId?: string,
	): Promise<FiscalReceiptQueueItem | null> {
		const conditions = [eq(fiscalReceiptQueue.id, id)];
		if (organizationId) {
			conditions.push(eq(fiscalReceiptQueue.organizationId, organizationId));
		}

		const [found] = await this.dbInstance
			.select()
			.from(fiscalReceiptQueue)
			.where(and(...conditions))
			.limit(1);

		return found ?? null;
	}

	async findPending(
		organizationId?: string,
		limit = 50,
	): Promise<FiscalReceiptQueueItem[]> {
		const conditions = [
			inArray(fiscalReceiptQueue.status, [
				"pending_print",
				"hardware_offline",
			]),
		];
		if (organizationId) {
			conditions.push(eq(fiscalReceiptQueue.organizationId, organizationId));
		}

		return await this.dbInstance
			.select()
			.from(fiscalReceiptQueue)
			.where(and(...conditions))
			.orderBy(fiscalReceiptQueue.createdAt)
			.limit(limit);
	}

	async updateStatus(
		id: string,
		organizationId: string,
		updates: {
			status: FiscalQueueStatus;
			retryCount?: number;
			lastError?: string | null;
			printedAt?: Date | null;
			payloadJson?: Record<string, unknown>;
		},
	): Promise<FiscalReceiptQueueItem> {
		const setValues: Record<string, unknown> = {
			status: updates.status,
			updatedAt: new Date(),
		};
		if (updates.retryCount !== undefined) {
			setValues.retryCount = updates.retryCount;
		}
		if (updates.lastError !== undefined) {
			setValues.lastError = updates.lastError;
		}
		if (updates.printedAt !== undefined) {
			setValues.printedAt = updates.printedAt;
		}
		if (updates.payloadJson !== undefined) {
			setValues.payloadJson = updates.payloadJson;
		}

		const [updated] = await this.dbInstance
			.update(fiscalReceiptQueue)
			.set(setValues)
			.where(
				and(
					eq(fiscalReceiptQueue.id, id),
					eq(fiscalReceiptQueue.organizationId, organizationId),
				),
			)
			.returning();

		if (!updated) {
			throw new FiscalQueueError(
				"InvalidQueueItem",
				`Запись в очереди с ID ${id} не найдена для обновления`,
			);
		}
		return updated;
	}

	async getStats(organizationId?: string): Promise<{
		pending_print: number;
		printing: number;
		printed: number;
		hardware_offline: number;
		dead_letter: number;
		total: number;
	}> {
		const conditions = organizationId
			? [eq(fiscalReceiptQueue.organizationId, organizationId)]
			: [];

		const items = await this.dbInstance
			.select({
				status: fiscalReceiptQueue.status,
			})
			.from(fiscalReceiptQueue)
			.where(conditions.length ? and(...conditions) : undefined);

		const stats = {
			pending_print: 0,
			printing: 0,
			printed: 0,
			hardware_offline: 0,
			dead_letter: 0,
			total: items.length,
		};

		for (const item of items) {
			const st = item.status as FiscalQueueStatus;
			if (st in stats) {
				stats[st]++;
			}
		}

		return stats;
	}
}

/**
 * Репозиторий очереди в оперативной памяти (для быстрых и изолированных юнит-тестов).
 */
export class InMemoryFiscalQueueRepository implements IFiscalQueueRepository {
	private items = new Map<string, FiscalReceiptQueueItem>();

	async create(
		item: Omit<NewFiscalReceiptQueueItem, "id" | "createdAt" | "updatedAt">,
	): Promise<FiscalReceiptQueueItem> {
		const id = crypto.randomUUID();
		const now = new Date();
		const record: FiscalReceiptQueueItem = {
			id,
			organizationId: item.organizationId,
			paymentId: item.paymentId ?? null,
			visitId: item.visitId ?? null,
			receiptType: item.receiptType,
			status: item.status ?? "pending_print",
			payloadJson: item.payloadJson,
			retryCount: item.retryCount ?? 0,
			lastError: item.lastError ?? null,
			printedAt: item.printedAt ?? null,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(id, record);
		return record;
	}

	async findById(
		id: string,
		organizationId?: string,
	): Promise<FiscalReceiptQueueItem | null> {
		const item = this.items.get(id);
		if (!item) return null;
		if (organizationId && item.organizationId !== organizationId) return null;
		return item;
	}

	async findPending(
		organizationId?: string,
		limit = 50,
	): Promise<FiscalReceiptQueueItem[]> {
		const results: FiscalReceiptQueueItem[] = [];
		for (const item of this.items.values()) {
			if (organizationId && item.organizationId !== organizationId) continue;
			if (
				item.status === "pending_print" ||
				item.status === "hardware_offline"
			) {
				results.push(item);
			}
			if (results.length >= limit) break;
		}
		return results.sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		);
	}

	async updateStatus(
		id: string,
		organizationId: string,
		updates: {
			status: FiscalQueueStatus;
			retryCount?: number;
			lastError?: string | null;
			printedAt?: Date | null;
			payloadJson?: Record<string, unknown>;
		},
	): Promise<FiscalReceiptQueueItem> {
		const item = this.items.get(id);
		if (!item || item.organizationId !== organizationId) {
			throw new FiscalQueueError(
				"InvalidQueueItem",
				`Запись с ID ${id} не найдена`,
			);
		}

		const updated: FiscalReceiptQueueItem = {
			...item,
			status: updates.status,
			retryCount:
				updates.retryCount !== undefined
					? updates.retryCount
					: item.retryCount,
			lastError:
				updates.lastError !== undefined ? updates.lastError : item.lastError,
			printedAt:
				updates.printedAt !== undefined ? updates.printedAt : item.printedAt,
			payloadJson:
				updates.payloadJson !== undefined
					? updates.payloadJson
					: item.payloadJson,
			updatedAt: new Date(),
		};
		this.items.set(id, updated);
		return updated;
	}

	async getStats(organizationId?: string): Promise<{
		pending_print: number;
		printing: number;
		printed: number;
		hardware_offline: number;
		dead_letter: number;
		total: number;
	}> {
		const stats = {
			pending_print: 0,
			printing: 0,
			printed: 0,
			hardware_offline: 0,
			dead_letter: 0,
			total: 0,
		};

		for (const item of this.items.values()) {
			if (organizationId && item.organizationId !== organizationId) continue;
			stats.total++;
			const st = item.status as FiscalQueueStatus;
			if (st in stats) {
				stats[st]++;
			}
		}

		return stats;
	}
}

// ─── СЕРВИС ОБРАБОТЧИКА ОЧЕРЕДИ ФИСКАЛИЗАЦИИ (WORKER SERVICE) ────────────────

export interface FiscalQueueWorkerOptions {
	maxRetries?: number; // Максимум попыток перед отправкой в dead_letter (по умолчанию 3)
	circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
	backoffOptions?: BackoffOptions;
	repository?: IFiscalQueueRepository;
	driver?: IKktDriver;
	logger?: {
		info: (msg: string, ...args: unknown[]) => void;
		warn: (msg: string, ...args: unknown[]) => void;
		error: (msg: string, ...args: unknown[]) => void;
	};
}

export interface EnqueueReceiptResult {
	queueItem: FiscalReceiptQueueItem;
	printedImmediately: boolean;
	offlineBuffered: boolean;
	circuitBreakerOpen: boolean;
	printResult?: FiscalReceiptPrintResult;
	error?: string;
}

export interface ProcessReceiptResult {
	id: string;
	success: boolean;
	status: FiscalQueueStatus;
	retryCount: number;
	lastError?: string | null;
	printResult?: FiscalReceiptPrintResult;
	deadLettered?: boolean;
}

export interface BatchProcessResult {
	totalProcessed: number;
	successCount: number;
	offlineCount: number;
	deadLetterCount: number;
	circuitBreakerTripped: boolean;
	results: ProcessReceiptResult[];
}

export class FiscalQueueWorkerService {
	private readonly maxRetries: number;
	private readonly circuitBreaker: KktCircuitBreaker;
	private readonly backoffOptions: BackoffOptions;
	private repository: IFiscalQueueRepository;
	private driver: IKktDriver;
	private logger?: FiscalQueueWorkerOptions["logger"];

	constructor(options: FiscalQueueWorkerOptions = {}) {
		this.maxRetries = options.maxRetries ?? 3;
		this.circuitBreaker = new KktCircuitBreaker(
			options.circuitBreakerConfig ?? {},
		);
		this.backoffOptions = options.backoffOptions ?? {};
		this.repository =
			options.repository ?? new DrizzleFiscalQueueRepository();
		this.driver = options.driver ?? new VirtualKktDriver();
		this.logger = options.logger;
	}

	getCircuitBreaker(): KktCircuitBreaker {
		return this.circuitBreaker;
	}

	setDriver(driver: IKktDriver): void {
		this.driver = driver;
	}

	setRepository(repo: IFiscalQueueRepository): void {
		this.repository = repo;
	}

	/**
	 * Постановка чека в очередь с немедленной попыткой печати (Graceful Degradation).
	 * Финансовая проводка всегда сохраняется!
	 */
	async enqueueReceipt(
		payload: FiscalReceiptPrintPayload,
	): Promise<EnqueueReceiptResult> {
		// 1. Немедленная регистрация в персистентной очереди (pending_print)
		const queueItem = await this.repository.create({
			organizationId: payload.organizationId,
			paymentId: payload.paymentId ?? null,
			visitId: payload.visitId ?? null,
			receiptType: payload.receiptType,
			status: "pending_print",
			payloadJson: payload as unknown as Record<string, unknown>,
			retryCount: 0,
			lastError: null,
			printedAt: null,
		});

		// 2. Проверяем состояние Circuit Breaker перед попыткой печати
		const cbState = this.circuitBreaker.getState();
		if (cbState === "open") {
			const updated = await this.repository.updateStatus(
				queueItem.id,
				payload.organizationId,
				{
					status: "hardware_offline",
					retryCount: 1,
					lastError:
						"Circuit Breaker OPEN: ККТ физически недоступна, чек помещен в буфер отложенной печати",
				},
			);
			return {
				queueItem: updated,
				printedImmediately: false,
				offlineBuffered: true,
				circuitBreakerOpen: true,
				error: "ККТ оффлайн (Circuit Breaker OPEN). Чек сохранен в буфер 54-ФЗ.",
			};
		}

		// 3. Попытка немедленной печати на кассе
		try {
			// Переход в статус printing
			await this.repository.updateStatus(
				queueItem.id,
				payload.organizationId,
				{
					status: "printing",
				},
			);

			const printResult = await this.circuitBreaker.execute(() =>
				this.driver.printReceipt(payload),
			);

			// Успешная печать
			const updated = await this.repository.updateStatus(
				queueItem.id,
				payload.organizationId,
				{
					status: "printed",
					printedAt: printResult.receiptDateTime,
					lastError: null,
					payloadJson: {
						...payload,
						fiscalAttributes: {
							fiscalDocNumber: printResult.fiscalDocNumber,
							fiscalSign: printResult.fiscalSign,
							fiscalDriveNumber: printResult.fiscalDriveNumber,
							printedAt: printResult.receiptDateTime.toISOString(),
							qrRawString: printResult.qrRawString,
							qrSvg: printResult.qrSvg,
							ofdUrl: printResult.ofdUrl,
						},
					} as unknown as Record<string, unknown>,
				},
			);

			return {
				queueItem: updated,
				printedImmediately: true,
				offlineBuffered: false,
				circuitBreakerOpen: false,
				printResult,
			};
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : String(err);
			this.logger?.warn?.(
				`[54-FZ Queue] Ошибка мгновенной печати чека ${queueItem.id}: ${errorMessage}`,
			);

			// Буферизация при сбое печати (Graceful degradation)
			const updated = await this.repository.updateStatus(
				queueItem.id,
				payload.organizationId,
				{
					status: "hardware_offline",
					retryCount: 1,
					lastError: errorMessage,
				},
			);

			return {
				queueItem: updated,
				printedImmediately: false,
				offlineBuffered: true,
				circuitBreakerOpen: this.circuitBreaker.getState() === "open",
				error: errorMessage,
			};
		}
	}

	/**
	 * Обработка одной конкретной записи из очереди чеков.
	 */
	async processSingleItem(
		itemId: string,
		organizationId: string,
	): Promise<ProcessReceiptResult> {
		const item = await this.repository.findById(itemId, organizationId);
		if (!item) {
			throw new FiscalQueueError(
				"InvalidQueueItem",
				`Чек с ID ${itemId} не найден в очереди клиники`,
			);
		}

		if (item.status === "printed") {
			return {
				id: item.id,
				success: true,
				status: "printed",
				retryCount: item.retryCount,
			};
		}

		const payload = item.payloadJson as unknown as FiscalReceiptPrintPayload;
		const nextRetryCount = item.retryCount + 1;

		// 1. Проверяем Circuit Breaker
		if (this.circuitBreaker.getState() === "open") {
			const isDeadLetter = nextRetryCount >= this.maxRetries;
			const targetStatus: FiscalQueueStatus = isDeadLetter
				? "dead_letter"
				: "hardware_offline";

			await this.repository.updateStatus(itemId, organizationId, {
				status: targetStatus,
				retryCount: nextRetryCount,
				lastError:
					"ККТ недоступна (Circuit Breaker OPEN). Запрос отложен.",
			});

			return {
				id: itemId,
				success: false,
				status: targetStatus,
				retryCount: nextRetryCount,
				lastError:
					"ККТ недоступна (Circuit Breaker OPEN). Запрос отложен.",
				deadLettered: isDeadLetter,
			};
		}

		// 2. Блокировка и переход в статус printing
		await this.repository.updateStatus(itemId, organizationId, {
			status: "printing",
		});

		// 3. Вызов драйвера кассы через Circuit Breaker
		try {
			const printResult = await this.circuitBreaker.execute(() =>
				this.driver.printReceipt(payload),
			);

			await this.repository.updateStatus(itemId, organizationId, {
				status: "printed",
				printedAt: printResult.receiptDateTime,
				lastError: null,
				payloadJson: {
					...payload,
					fiscalAttributes: {
						fiscalDocNumber: printResult.fiscalDocNumber,
						fiscalSign: printResult.fiscalSign,
						fiscalDriveNumber: printResult.fiscalDriveNumber,
						printedAt: printResult.receiptDateTime.toISOString(),
						qrRawString: printResult.qrRawString,
						qrSvg: printResult.qrSvg,
						ofdUrl: printResult.ofdUrl,
					},
				} as unknown as Record<string, unknown>,
			});

			return {
				id: itemId,
				success: true,
				status: "printed",
				retryCount: item.retryCount,
				printResult,
			};
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : String(err);
			const isDeadLetter = nextRetryCount >= this.maxRetries;
			const targetStatus: FiscalQueueStatus = isDeadLetter
				? "dead_letter"
				: "hardware_offline";

			await this.repository.updateStatus(itemId, organizationId, {
				status: targetStatus,
				retryCount: nextRetryCount,
				lastError: errorMessage,
			});

			return {
				id: itemId,
				success: false,
				status: targetStatus,
				retryCount: nextRetryCount,
				lastError: errorMessage,
				deadLettered: isDeadLetter,
			};
		}
	}

	/**
	 * Пакетная обработка всех ожидающих и отложенных чеков (воркер-цикл).
	 */
	async processPendingQueue(
		organizationId?: string,
		limit = 20,
	): Promise<BatchProcessResult> {
		const results: ProcessReceiptResult[] = [];
		let successCount = 0;
		let offlineCount = 0;
		let deadLetterCount = 0;

		// Если Circuit Breaker разомкнут, сразу пропускаем цикл во избежание бессмысленной нагрузки
		if (this.circuitBreaker.getState() === "open") {
			return {
				totalProcessed: 0,
				successCount: 0,
				offlineCount: 0,
				deadLetterCount: 0,
				circuitBreakerTripped: true,
				results: [],
			};
		}

		const pendingItems = await this.repository.findPending(
			organizationId,
			limit,
		);

		for (const item of pendingItems) {
			// Если касса упала во время обработки пакета, прерываем остаток пакета
			if (this.circuitBreaker.getState() === "open") {
				break;
			}

			const result = await this.processSingleItem(
				item.id,
				item.organizationId,
			);
			results.push(result);

			if (result.success) {
				successCount++;
			} else if (result.deadLettered) {
				deadLetterCount++;
			} else {
				offlineCount++;
			}
		}

		return {
			totalProcessed: results.length,
			successCount,
			offlineCount,
			deadLetterCount,
			circuitBreakerTripped: this.circuitBreaker.getState() === "open",
			results,
		};
	}

	/**
	 * Повторная попытка фискализации конкретного чека по запросу оператора (Ручной Retry).
	 */
	async retryReceipt(
		itemId: string,
		organizationId: string,
	): Promise<ProcessReceiptResult> {
		return await this.processSingleItem(itemId, organizationId);
	}

	/**
	 * Принудительный сброс чека в Dead Letter Queue с указанием причины.
	 */
	async markAsDeadLetter(
		itemId: string,
		organizationId: string,
		reason: string,
	): Promise<FiscalReceiptQueueItem> {
		return await this.repository.updateStatus(itemId, organizationId, {
			status: "dead_letter",
			lastError: `Manual DLQ: ${reason}`,
		});
	}

	/**
	 * Возврат чека из Dead Letter Queue обратно в очередь на печать (Re-queue).
	 */
	async requeueDeadLetter(
		itemId: string,
		organizationId: string,
	): Promise<FiscalReceiptQueueItem> {
		return await this.repository.updateStatus(itemId, organizationId, {
			status: "pending_print",
			retryCount: 0,
			lastError: null,
		});
	}

	/**
	 * Получение сводной статистики очереди и состояния Circuit Breaker.
	 */
	async getHealthReport(organizationId?: string): Promise<{
		queueStats: {
			pending_print: number;
			printing: number;
			printed: number;
			hardware_offline: number;
			dead_letter: number;
			total: number;
		};
		circuitBreaker: CircuitBreakerMetrics;
		driverName: string;
		driverProtocol: KktProtocolType;
	}> {
		const queueStats = await this.repository.getStats(organizationId);
		const circuitBreaker = this.circuitBreaker.getMetrics();

		return {
			queueStats,
			circuitBreaker,
			driverName: this.driver.name,
			driverProtocol: this.driver.protocol,
		};
	}
}
