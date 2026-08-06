import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	DEFAULT_PAYER_RELATIONSHIP,
	emptyPaymentComposerFields,
	PAYMENT_COMPOSER_PATIENT_UNTRACKED,
	type PaymentComposerFields,
	type PaymentComposerSetters,
	resetPaymentComposer,
	resetPaymentComposerOnPatientChange,
	type TrackedComposerPatientRef,
} from "../components/finance/paymentComposerReset";

/**
 * ФОРМА ПРИЁМА ОПЛАТЫ НЕ ДОЛЖНА ПЕРЕНОСИТЬ ДЕНЬГИ И ЧУЖОЙ ЧЕК НА ДРУГОГО ПАЦИЕНТА.
 *
 * Сброс при смене пациента очищал шесть полей из четырнадцати: только
 * плательщика для вычета. Сумма и весь фискальный блок оставались от
 * предыдущего человека, и следующий платёж записывался с ними.
 *
 * И ОБРАТНАЯ БЕДА: ПЕРВАЯ ПОЧИНКА ГАСИЛА ФОРМУ НА МОНТИРОВАНИИ.
 *
 * Эффект сброса живёт в useAppLogic, а этот контекст создаётся не один раз за
 * сеанс: помимо корня приложения его заводит заново useVisitDiaryLogic, то есть
 * каждое открытие вкладки «Зубная формула и Дневник». `useEffect` на первом
 * прогоне выполняется всегда, поэтому набранная сумма и переписанный с чека
 * фискальный блок исчезали у кассира, который никого не переключал. Решение о
 * сбросе теперь принимает `resetPaymentComposerOnPatientChange`, и проверки ниже
 * исполняют именно её, а не пересказ её логики.
 *
 * Проверяем четыре вещи:
 *  1. свежая форма — сумма пустая, чужих реквизитов нет;
 *  2. сброс действительно гасит унаследованные значения (исполняется на
 *     подставном хранилище, значения читаются после вызова);
 *  3. монтирование при том же пациенте (в том числе второй экземпляр контекста)
 *     сбросов не даёт вовсе, а настоящая смена пациента даёт ровно один;
 *  4. оба места, где форма обязана стать свежей, перечисляют все поля —
 *     сброс при смене пациента вызовом общего перечня, сброс после платежа
 *     пока своим списком. Второе читается из исходника: разойтись повторно
 *     они не смогут молча.
 */

const here = dirname(fileURLToPath(import.meta.url));
const webSrc = join(here, "..");
const read = (relativePath: string) =>
	readFileSync(join(webSrc, relativePath), "utf8");

/** Подставное хранилище: держит значения и отдаёт сеттеры того же вида. */
function makeStore(
	initial: PaymentComposerFields & { paymentFeedback: string },
) {
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
const composerFilledForPatientA: PaymentComposerFields & {
	paymentFeedback: string;
} = {
	paymentAmount: "12000,50",
	paymentFiscalCashierName: "Соколова Марина Львовна",
	paymentFiscalFd: "104517",
	paymentFiscalFn: "9960440301234567",
	paymentFiscalFpd: "2871004155",
	paymentFiscalReceiptIssuedAt: "2026-07-27T14:35",
	paymentFiscalReceiptNumber: "00042",
	paymentFiscalReceiptUrl:
		"https://check.ofd.ru/rec/9960440301234567/104517/2871004155",
	paymentPayerBirthDate: "1984-03-11",
	paymentPayerFullName: "Абросимова Елена Петровна",
	paymentPayerIdentityDocument: "паспорт 4512 778901",
	paymentPayerInn: "771234567890",
	paymentPayerRelationship: "мать",
	paymentTaxDeductionCode: "1",
	paymentFeedback: "Оплата 5 000 ₽ записана для Абросимовой Елены Петровны.",
};

/** Свежая ссылка `useRef` смонтированного экземпляра эффекта. */
function mountComposerEffect(): TrackedComposerPatientRef {
	return { current: PAYMENT_COMPOSER_PATIENT_UNTRACKED };
}

/**
 * Прогоняет один смонтированный экземпляр эффекта по последовательности
 * значений `documentPatient?.id` и возвращает число настоящих сбросов.
 *
 * Решение о сбросе принимает боевая `resetPaymentComposerOnPatientChange` —
 * здесь не пересказ её логики, а её исполнение. Первое значение
 * последовательности — монтирование. Снятие выбора пациента передаётся как
 * `undefined`, как его и отдаёт `documentPatient?.id`.
 */
function applyPatientSwitches(
	store: ReturnType<typeof makeStore>,
	patientIds: readonly (string | undefined)[],
	effect: TrackedComposerPatientRef = mountComposerEffect(),
): number {
	let resets = 0;
	for (const patientId of patientIds) {
		if (resetPaymentComposerOnPatientChange(effect, patientId, store.setters)) {
			resets += 1;
		}
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
			assert.equal(
				value,
				"",
				`поле ${field} подставлено значением ${String(value)}`,
			);
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
		assert.equal(
			store.state.paymentPayerRelationship,
			DEFAULT_PAYER_RELATIONSHIP,
		);
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
		assert.equal(resets, 1);
		assert.equal(store.state.paymentAmount, "");
		assert.equal(store.state.paymentFiscalFn, "");
	});

	it("на смене пациента не остаётся ни одного поля предыдущего", () => {
		const store = makeStore(composerFilledForPatientA);
		const effect = mountComposerEffect();
		assert.equal(
			resetPaymentComposerOnPatientChange(effect, "pat-a", store.setters),
			false,
			"монтирование при выбранном пациенте не имеет права гасить форму",
		);
		assert.equal(store.state.paymentAmount, "12000,50");
		assert.equal(
			resetPaymentComposerOnPatientChange(effect, "pat-b", store.setters),
			true,
			"настоящая смена пациента обязана дать сброс",
		);
		const survivors = Object.entries(store.state).filter(([field, value]) => {
			if (field === "paymentPayerRelationship") {
				return value !== DEFAULT_PAYER_RELATIONSHIP;
			}
			return value !== "";
		});
		assert.deepEqual(
			survivors,
			[],
			`после смены пациента в форме остались чужие данные: ${survivors
				.map(([field, value]) => `${field}=${String(value)}`)
				.join(", ")}`,
		);
	});
});

describe("монтирование не считается сменой пациента", () => {
	it("перезагрузка сводки при том же пациенте сбросов не даёт вовсе", () => {
		const store = makeStore(composerFilledForPatientA);
		const resets = applyPatientSwitches(store, [
			"pat-a",
			"pat-a",
			"pat-a",
			"pat-a",
		]);
		assert.equal(resets, 0);
		assert.equal(store.state.paymentAmount, "12000,50");
		assert.equal(store.state.paymentFiscalFn, "9960440301234567");
	});

	it("сумма без выбранного пациента переживает монтирование", () => {
		const store = makeStore(composerFilledForPatientA);
		const resets = applyPatientSwitches(store, [undefined, undefined]);
		assert.equal(resets, 0);
		assert.equal(store.state.paymentAmount, "12000,50");
	});

	it("вкладка «Зубная формула» заводит второй экземпляр контекста и сумму не стирает", () => {
		/*
		 * useAppLogic вызывается из двух мест — App.tsx и useVisitDiaryLogic, —
		 * поэтому эффект монтируется заново при каждом открытии вкладки дневника,
		 * уже при выбранном пациенте и при заполненной кассиром форме. Хранилище
		 * формы одно на оба экземпляра, свой `useRef` у каждого.
		 */
		const store = makeStore(composerFilledForPatientA);
		const rootEffect = mountComposerEffect();
		applyPatientSwitches(store, [undefined, "pat-a"], rootEffect);
		store.setters.setPaymentAmount("12000,50");
		store.setters.setPaymentFiscalFn("9960440301234567");

		const diaryEffect = mountComposerEffect();
		const wiped = resetPaymentComposerOnPatientChange(
			diaryEffect,
			"pat-a",
			store.setters,
		);

		assert.equal(wiped, false);
		assert.equal(store.state.paymentAmount, "12000,50");
		assert.equal(store.state.paymentFiscalFn, "9960440301234567");
	});

	it("после монтирования второй экземпляр гасит форму на настоящей смене", () => {
		const store = makeStore(composerFilledForPatientA);
		const diaryEffect = mountComposerEffect();
		const resets = applyPatientSwitches(store, ["pat-a", "pat-b"], diaryEffect);
		assert.equal(resets, 1);
		assert.equal(store.state.paymentAmount, "");
		assert.equal(store.state.paymentFiscalFpd, "");
	});
});

describe("оба сброса перечисляют все поля формы", () => {
	const composerFieldNames = Object.keys(
		emptyPaymentComposerFields(),
	) as (keyof PaymentComposerFields)[];

	const setterName = (field: string) =>
		`set${field[0]!.toUpperCase()}${field.slice(1)}`;

	/** Значение поля попадает в выражение как текст: спецсимволы обезвреживаем. */
	const escapeForRegExp = (value: string) =>
		value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	it("перечень полей не пуст и покрывает сумму", () => {
		assert.ok(composerFieldNames.length >= 14);
		assert.ok(composerFieldNames.includes("paymentAmount"));
	});

	/*
	 * Выражения ниже терпят любые переносы и отступы: форматировщик волен
	 * переложить аргументы по строкам, и это не дефект кассы. Ловим только
	 * исчезновение самого вызова.
	 */
	it("сброс при смене пациента идёт через защиту от монтирования", () => {
		const source = read("hooks/domains/usePatientLogic.ts");
		const effect =
			/useEffect\(\s*\(\s*\)\s*=>\s*\{\s*resetPaymentComposerOnPatientChange\(\s*paymentComposerPatientIdRef\s*,\s*documentPatient\?\.id\s*,\s*useDocumentStore\.getState\(\)\s*,?\s*\)\s*;?\s*\}\s*,\s*\[\s*documentPatient\?\.id\s*\]\s*\)\s*;/.exec(
				source,
			);
		assert.ok(
			effect,
			"сброс при смене пациента больше не идёт через resetPaymentComposerOnPatientChange по documentPatient?.id",
		);
	});

	it("память эффекта заведена признаком первого прогона, а не undefined", () => {
		const source = read("hooks/domains/usePatientLogic.ts");
		const seededRef =
			/const\s+paymentComposerPatientIdRef\s*=\s*useRef\s*<[^>]*>\s*\(\s*PAYMENT_COMPOSER_PATIENT_UNTRACKED\s*,?\s*\)/.exec(
				source,
			);
		assert.ok(
			seededRef,
			"ссылка заведена не признаком первого прогона: монтирование при выбранном пациенте снова начнёт стирать сумму",
		);
	});

	it("сброс после записанного платежа гасит каждое поле формы свежим значением", () => {
		const source = read("useAppLogic.tsx");
		const start = source.indexOf("paymentMutationIdRef.current = null;");
		assert.ok(
			start > 0,
			"не найдено начало сброса после платежа в useAppLogic.tsx",
		);
		const end = source.indexOf("await loadDashboard();", start);
		assert.ok(
			end > start,
			"не найден конец сброса после платежа в useAppLogic.tsx",
		);
		const block = source.slice(start, end);
		const freshFields = emptyPaymentComposerFields();
		for (const field of composerFieldNames) {
			/*
			 * Проверяется не имя сеттера, а переданное значение: вызов
			 * `setPaymentAmount(paymentAmount)` тоже содержит имя, но форму не
			 * гасит, а пишет в неё то же самое.
			 */
			const freshValue = freshFields[field];
			const assignsFreshValue = new RegExp(
				`${setterName(field)}\\(\\s*"${escapeForRegExp(freshValue)}"\\s*\\)`,
			);
			assert.match(
				block,
				assignsFreshValue,
				`сброс после платежа не выставляет ${field} в ${JSON.stringify(freshValue)}: форма уйдёт в следующий платёж заполненной`,
			);
		}
	});
});
