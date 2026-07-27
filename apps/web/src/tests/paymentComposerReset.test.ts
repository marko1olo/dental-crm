import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	DEFAULT_PAYER_RELATIONSHIP,
	emptyPaymentComposerFields,
	type PaymentComposerFields,
	type PaymentComposerSetters,
	resetPaymentComposer,
} from "../components/finance/paymentComposerReset";

/**
 * ФОРМА ПРИЁМА ОПЛАТЫ НЕ ДОЛЖНА ПЕРЕНОСИТЬ ДЕНЬГИ И ЧУЖОЙ ЧЕК НА ДРУГОГО ПАЦИЕНТА.
 *
 * Сброс при смене пациента очищал шесть полей из четырнадцати: только
 * плательщика для вычета. Сумма и весь фискальный блок оставались от
 * предыдущего человека, и следующий платёж записывался с ними.
 *
 * Проверяем три вещи:
 *  1. свежая форма — сумма пустая, чужих реквизитов нет;
 *  2. сброс действительно гасит унаследованные значения (исполняется на
 *     подставном хранилище, значения читаются после вызова);
 *  3. оба места, где форма обязана стать свежей, перечисляют все поля —
 *     сброс при смене пациента вызовом общего перечня, сброс после платежа
 *     пока своим списком. Второе читается из исходника: разойтись повторно
 *     они не смогут молча.
 */

const here = dirname(fileURLToPath(import.meta.url));
const webSrc = join(here, "..");
const read = (relativePath: string) => readFileSync(join(webSrc, relativePath), "utf8");

/** Подставное хранилище: держит значения и отдаёт сеттеры того же вида. */
function makeStore(initial: PaymentComposerFields & { paymentFeedback: string }) {
	const state = { ...initial };
	const setters: PaymentComposerSetters = {
		setPaymentAmount: (value) => {
			state.paymentAmount = value;
		},
		setPaymentFeedback: (value) => {
			state.paymentFeedback = value;
		},
		setPaymentFiscalCashierName: (value) => {
			state.paymentFiscalCashierName = value;
		},
		setPaymentFiscalFd: (value) => {
			state.paymentFiscalFd = value;
		},
		setPaymentFiscalFn: (value) => {
			state.paymentFiscalFn = value;
		},
		setPaymentFiscalFpd: (value) => {
			state.paymentFiscalFpd = value;
		},
		setPaymentFiscalReceiptIssuedAt: (value) => {
			state.paymentFiscalReceiptIssuedAt = value;
		},
		setPaymentFiscalReceiptNumber: (value) => {
			state.paymentFiscalReceiptNumber = value;
		},
		setPaymentFiscalReceiptUrl: (value) => {
			state.paymentFiscalReceiptUrl = value;
		},
		setPaymentPayerBirthDate: (value) => {
			state.paymentPayerBirthDate = value;
		},
		setPaymentPayerFullName: (value) => {
			state.paymentPayerFullName = value;
		},
		setPaymentPayerIdentityDocument: (value) => {
			state.paymentPayerIdentityDocument = value;
		},
		setPaymentPayerInn: (value) => {
			state.paymentPayerInn = value;
		},
		setPaymentPayerRelationship: (value) => {
			state.paymentPayerRelationship = value;
		},
		setPaymentTaxDeductionCode: (value) => {
			state.paymentTaxDeductionCode = value;
		},
	};
	return { state, setters };
}

/** Форма, заполненная под пациента А: сумма, чек, плательщик для вычета. */
const composerFilledForPatientA: PaymentComposerFields & { paymentFeedback: string } = {
	paymentAmount: "12000,50",
	paymentFiscalCashierName: "Соколова Марина Львовна",
	paymentFiscalFd: "104517",
	paymentFiscalFn: "9960440301234567",
	paymentFiscalFpd: "2871004155",
	paymentFiscalReceiptIssuedAt: "2026-07-27T14:35",
	paymentFiscalReceiptNumber: "00042",
	paymentFiscalReceiptUrl: "https://check.ofd.ru/rec/9960440301234567/104517/2871004155",
	paymentPayerBirthDate: "1984-03-11",
	paymentPayerFullName: "Абросимова Елена Петровна",
	paymentPayerIdentityDocument: "паспорт 4512 778901",
	paymentPayerInn: "771234567890",
	paymentPayerRelationship: "мать",
	paymentTaxDeductionCode: "1",
	paymentFeedback: "Оплата 5 000 ₽ записана для Абросимовой Елены Петровны.",
};

/**
 * Модель зависимости эффекта `[documentPatient?.id]`: сброс отрабатывает ровно
 * тогда, когда идентификатор пациента изменился. Снятие выбора — переход в
 * `undefined` — такое же изменение.
 */
function applyPatientSwitches(
	store: ReturnType<typeof makeStore>,
	patientIds: readonly (string | undefined)[],
): number {
	let previous: string | undefined | symbol = Symbol("не смонтировано");
	let resets = 0;
	for (const patientId of patientIds) {
		if (patientId === previous) continue;
		previous = patientId;
		resetPaymentComposer(store.setters);
		resets += 1;
	}
	return resets;
}

describe("свежая форма приёма оплаты", () => {
	it("пациент не выбран — сумма пустая, а не ноль", () => {
		const fields = emptyPaymentComposerFields();
		assert.equal(fields.paymentAmount, "");
		assert.notEqual(fields.paymentAmount, "0");
	});

	it("в свежей форме нет ни одного унаследованного реквизита", () => {
		const fields = emptyPaymentComposerFields();
		for (const [field, value] of Object.entries(fields)) {
			if (field === "paymentPayerRelationship") {
				assert.equal(value, DEFAULT_PAYER_RELATIONSHIP);
				continue;
			}
			assert.equal(value, "", `поле ${field} подставлено значением ${String(value)}`);
		}
	});

	it("свежая форма — новый объект: правка одной не протекает в следующую", () => {
		const first = emptyPaymentComposerFields();
		first.paymentAmount = "9000";
		assert.equal(emptyPaymentComposerFields().paymentAmount, "");
	});
});

describe("смена пациента гасит форму предыдущего", () => {
	it("сумма пациента А не остаётся в форме пациента Б", () => {
		const store = makeStore(composerFilledForPatientA);
		resetPaymentComposer(store.setters);
		assert.equal(store.state.paymentAmount, "");
	});

	it("фискальные признаки чужого чека не остаются", () => {
		const store = makeStore(composerFilledForPatientA);
		resetPaymentComposer(store.setters);
		assert.equal(store.state.paymentFiscalReceiptNumber, "");
		assert.equal(store.state.paymentFiscalReceiptIssuedAt, "");
		assert.equal(store.state.paymentFiscalFn, "");
		assert.equal(store.state.paymentFiscalFd, "");
		assert.equal(store.state.paymentFiscalFpd, "");
		assert.equal(store.state.paymentFiscalReceiptUrl, "");
		assert.equal(store.state.paymentFiscalCashierName, "");
	});

	it("плательщик для вычета и код услуги не остаются", () => {
		const store = makeStore(composerFilledForPatientA);
		resetPaymentComposer(store.setters);
		assert.equal(store.state.paymentPayerFullName, "");
		assert.equal(store.state.paymentPayerInn, "");
		assert.equal(store.state.paymentPayerBirthDate, "");
		assert.equal(store.state.paymentPayerIdentityDocument, "");
		assert.equal(store.state.paymentPayerRelationship, DEFAULT_PAYER_RELATIONSHIP);
		assert.equal(store.state.paymentTaxDeductionCode, "");
	});

	it("строка «оплата записана для ...» не висит над формой следующего", () => {
		const store = makeStore(composerFilledForPatientA);
		resetPaymentComposer(store.setters);
		assert.equal(store.state.paymentFeedback, "");
	});

	it("снятие выбора пациента очищает набранную сумму", () => {
		const store = makeStore(composerFilledForPatientA);
		const resets = applyPatientSwitches(store, ["pat-a", "pat-a", undefined]);
		assert.equal(resets, 2);
		assert.equal(store.state.paymentAmount, "");
		assert.equal(store.state.paymentFiscalFn, "");
	});

	it("перезагрузка сводки при том же пациенте сбросов не добавляет", () => {
		const store = makeStore(composerFilledForPatientA);
		const resets = applyPatientSwitches(store, ["pat-a", "pat-a", "pat-a", "pat-a"]);
		assert.equal(resets, 1);
	});
});

describe("оба сброса перечисляют все поля формы", () => {
	const composerFieldNames = Object.keys(
		emptyPaymentComposerFields(),
	) as (keyof PaymentComposerFields)[];

	const setterName = (field: string) => `set${field[0]!.toUpperCase()}${field.slice(1)}`;

	it("перечень полей не пуст и покрывает сумму", () => {
		assert.ok(composerFieldNames.length >= 14);
		assert.ok(composerFieldNames.includes("paymentAmount"));
	});

	it("сброс при смене пациента вызывает общий перечень и висит на пациенте", () => {
		const source = read("hooks/domains/usePatientLogic.ts");
		const effect =
			/useEffect\(\(\) => \{\s*resetPaymentComposer\(useDocumentStore\.getState\(\)\);\s*\}, \[documentPatient\?\.id\]\);/.exec(
				source,
			);
		assert.ok(
			effect,
			"сброс при смене пациента больше не вызывает resetPaymentComposer по documentPatient?.id",
		);
	});

	it("сброс после записанного платежа гасит каждое поле формы", () => {
		const source = read("useAppLogic.tsx");
		const start = source.indexOf("paymentMutationIdRef.current = null;");
		assert.ok(start > 0, "не найдено начало сброса после платежа в useAppLogic.tsx");
		const end = source.indexOf("await loadDashboard();", start);
		assert.ok(end > start, "не найден конец сброса после платежа в useAppLogic.tsx");
		const block = source.slice(start, end);
		for (const field of composerFieldNames) {
			assert.ok(
				block.includes(`${setterName(field)}(`),
				`сброс после платежа не гасит ${field}: форма уйдёт в следующий платёж заполненной`,
			);
		}
	});
});
