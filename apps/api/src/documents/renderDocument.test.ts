import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { describe, test } from "node:test";
import {
	RU_MONEY_NBSP,
	paymentReceiptPayloadSchema,
	paymentRefundCorrectionPayloadSchema,
	paymentSchema,
	type ClinicProfile,
	type GeneratedDocument,
	type Patient,
	type Payment,
} from "@dental/shared";
import { documentHasUnresolvedPlaceholders, documentIssueBlockReason } from "./renderDocument.js";

describe("documentHasUnresolvedPlaceholders", () => {
	test("returns false for HTML without placeholders", () => {
		const html = "<p>This is a normal document without placeholders.</p>";
		assert.strictEqual(documentHasUnresolvedPlaceholders(html), false);
	});

	/**
	 * Раньше тесты оперировали набором "{ ", " { ", " {_", "_} ", " }" —
	 * обрубками, которые не совпадают ни с одним признаком детектора. Он ищет
	 * маркеры [[{ и }]] плюс список русских заготовок (unresolvedPlaceholderPatterns:
	 * «заполнить», «________», «указать врачом», «указать по», «не указана»,
	 * «не указан»). Ни один обрубок туда не входит, поэтому два теста требовали
	 * срабатывания на строках, которые незаполненными местами не являются.
	 */
	test("returns true for various unresolved placeholders", () => {
		const placeholders = [
			"[[{patientFullName}]]",
			"[[{",
			"}]]",
			"заполнить",
			"________",
			"указать врачом",
			"указать по",
			"не указана",
			"не указан",
		];

		for (const text of placeholders) {
			const html = `<p>${text}</p>`;
			assert.strictEqual(
				documentHasUnresolvedPlaceholders(html),
				true,
				`Expected to return true for text containing: ${text}`,
			);
		}
	});

	test("поиск заготовок не зависит от регистра", () => {
		// Текст приводится к нижнему регистру по правилам ru-RU.
		assert.strictEqual(documentHasUnresolvedPlaceholders("<p>НЕ УКАЗАН</p>"), true);
	});

	test("ignores placeholders inside signatures block", () => {
		// Прочерк для подписи — это не незаполненное место: блок подписей
		// вырезается перед поиском русских заготовок.
		const html = `
      <p>Main document text.</p>
      <div class="signatures">
        Подпись врача: ________
      </div>
    `;
		assert.strictEqual(documentHasUnresolvedPlaceholders(html), false);
	});

	test("detects placeholders if present both inside and outside signatures block", () => {
		const html = `
      <p>Диагноз: не указан</p>
      <div class="signatures">
        Подпись врача: ________
      </div>
    `;
		assert.strictEqual(documentHasUnresolvedPlaceholders(html), true);
	});

	test("маркер [[{ находится даже внутри блока подписей", () => {
		// Скобочный маркер проверяется до вырезания блока подписей: шаблонная
		// вставка не должна попасть в документ ни в каком месте.
		const html = `
      <p>Main document text.</p>
      <div class="signatures">
        Подпись врача: [[{doctorFullName}]]
      </div>
    `;
		assert.strictEqual(documentHasUnresolvedPlaceholders(html), true);
	});
});

/**
 * Денежные гейты выдачи документов.
 *
 * Оба гейта сравнивали деньги дробными числами, полученными сложением в
 * плавающей точке. Двадцать оплат по 55,55 руб. давали 1110.9999999999995
 * вместо 1111 — квитанция на 1111 руб. не выдавалась, а возврат этих же
 * 1111 руб. отклонялся как «больше оплаченной суммы». Сумма каждого набора ниже
 * ровно целое число рублей, то есть значение, которое контракт заведомо
 * принимает: дефект был не во вводе, а в арифметике проверки.
 *
 * Неразрывный пробел берётся из RU_MONEY_NBSP того же пакета, что форматирует
 * деньги: невидимый U+00A0 в исходнике теста не отличить от обычного пробела
 * глазами, и на этом уже спотыкались другие тесты.
 */
describe("денежные гейты выдачи: квитанция и возврат", () => {
	const organizationId = randomUUID();
	const patientId = randomUUID();
	const visitId = randomUUID();
	const payerFullName = "Иванов Иван Иванович";
	const identityDocument = "паспорт 45 08 123456, выдан 12.05.2015";

	const clinicProfile = {
		organizationId,
		clinicName: "Стоматология «Дента»",
		legalName: "ООО «Дента»",
		inn: "7701234567",
		address: "Москва, ул. Тверская, д. 1",
		phone: "+7 495 000-00-00",
		medicalLicenseNumber: "Л041-01234-77/00123456",
		medicalLicenseIssuedAt: "2024-01-15",
		medicalLicenseIssuer: "Департамент здравоохранения города Москвы",
		signatoryName: "Петрова Анна Сергеевна",
		signatoryTitle: "главный врач",
	} as ClinicProfile;

	const patient = {
		id: patientId,
		organizationId,
		status: "active",
		fullName: payerFullName,
		birthDate: "1990-01-01",
		phone: "+7 900 000-00-00",
		email: null,
		notes: null,
		administrativeProfile: null,
		balanceRub: 0,
		createdAt: "2026-01-10T08:00:00.000Z",
		updatedAt: "2026-03-14T08:00:00.000Z",
	} as Patient;

	/** «1 111,00 ₽» из целых копеек — ожидаемый вид суммы в тексте отказа. */
	function expectedMoney(wholeRubles: number, kopecks: number): string {
		const grouped = wholeRubles.toLocaleString("ru-RU").replaceAll(" ", RU_MONEY_NBSP);
		return `${grouped},${String(kopecks).padStart(2, "0")}${RU_MONEY_NBSP}₽`;
	}

	/**
	 * Платёж строится через настоящую схему контракта, а не приводится через
	 * `as`: так тест сам доказывает, что 55,55 руб. — допустимая сумма платежа
	 * (paymentSchema.amountRub = positiveMoneyRubSchema), и дефект нельзя списать
	 * на «невалидные данные».
	 */
	function paidPayment(amountRub: number, index: number): Payment {
		return paymentSchema.parse({
			id: randomUUID(),
			organizationId,
			patientId,
			visitId,
			documentId: null,
			amountRub,
			method: "cash",
			status: "paid",
			paidAt: "2026-03-14T09:00:00.000Z",
			createdAt: "2026-03-14T09:00:00.000Z",
			fiscalReceiptNumber: `ФЧ-2026-${String(index + 1).padStart(3, "0")}`,
			fiscalReceiptIssuedAt: "2026-03-14",
			payerFullName,
			payerInn: "123456789012",
			payerBirthDate: "1990-01-01",
			payerIdentityDocument: identityDocument,
			payerRelationship: "self",
			note: null,
		});
	}

	function repeatedPayments(amountRub: number, count: number): Payment[] {
		return Array.from({ length: count }, (_, index) => paidPayment(amountRub, index));
	}

	function floatReduce(payments: Payment[]): number {
		return payments.reduce((total, payment) => total + payment.amountRub, 0);
	}

	function receiptDocument(payments: Payment[], declaredTotalPaidRub: number): GeneratedDocument {
		const paymentReceipt = paymentReceiptPayloadSchema.parse({
			receiptNumber: "КВ-2026-014",
			receiptDate: "2026-03-14",
			selectedPaymentIds: payments.map((payment) => payment.id),
			totalPaidRub: declaredTotalPaidRub,
			payerFullName,
			taxSupportRequested: false,
			paymentPurpose: "Оплата лечения по плану от 10.03.2026",
			fiscalReceiptNumbers: payments.map((payment) => payment.fiscalReceiptNumber),
			issuedByFullName: "Сидорова Мария Павловна",
			paymentAndFiscalDataVerified: true,
			payerIdentityVerified: true,
			receiptDoesNotReplaceFiscalReceipt: true,
		});
		return {
			id: randomUUID(),
			organizationId,
			patientId,
			visitId: null,
			kind: "payment_receipt",
			title: "Квитанция об оплате лечения",
			status: "draft",
			issuedAt: null,
			totalAmountRub: declaredTotalPaidRub,
			payload: { paymentReceipt },
			createdAt: "2026-03-14T10:00:00.000Z",
			updatedAt: "2026-03-14T10:00:00.000Z",
		} as GeneratedDocument;
	}

	function refundDocument(payments: Payment[], refundAmountRub: number): GeneratedDocument {
		// Номер фискального чека берётся у первой оплаты набора: пустой набор
		// заявление на возврат описать не может, и тест обязан сказать это прямо.
		const firstPayment = payments[0];
		assert.ok(firstPayment, "набор оплат для возврата не может быть пустым");
		const paymentRefundCorrection = paymentRefundCorrectionPayloadSchema.parse({
			action: "full_refund",
			selectedPaymentIds: payments.map((payment) => payment.id),
			amountRub: refundAmountRub,
			reason: "Пациент отказался от второго этапа лечения до его начала.",
			refundMethod: "cash",
			recipientFullName: payerFullName,
			recipientIdentityDocument: identityDocument,
			originalFiscalReceiptNumber: firstPayment.fiscalReceiptNumber,
			accountantDecision: "Возврат согласован главным врачом и бухгалтером клиники.",
		});
		return {
			id: randomUUID(),
			organizationId,
			patientId,
			visitId,
			kind: "payment_refund_correction_request",
			title: "Заявление на возврат оплаты",
			status: "draft",
			issuedAt: null,
			totalAmountRub: refundAmountRub,
			payload: { paymentRefundCorrection },
			createdAt: "2026-03-14T10:00:00.000Z",
			updatedAt: "2026-03-14T10:00:00.000Z",
		} as GeneratedDocument;
	}

	function blockReasonFor(document: GeneratedDocument, payments: Payment[]): string | null {
		return documentIssueBlockReason(document, patient, { clinicProfile, payments });
	}

	test("двадцать оплат по 55,55 руб.: квитанция на 1111 руб. выдаётся", () => {
		const payments = repeatedPayments(55.55, 20);
		// Дробное сложение даёт 1110.9999999999995 — именно на этом гейт и падал.
		assert.notStrictEqual(
			floatReduce(payments),
			1111,
			"набор перестал быть дрейфующим — тест потерял смысл, поправьте суммы",
		);
		assert.strictEqual(blockReasonFor(receiptDocument(payments, 1111), payments), null);
	});

	test("десять оплат по 1010,10 руб.: квитанция на 10101 руб. выдаётся", () => {
		const payments = repeatedPayments(1010.1, 10);
		assert.notStrictEqual(
			floatReduce(payments),
			10101,
			"набор перестал быть дрейфующим — тест потерял смысл, поправьте суммы",
		);
		assert.strictEqual(blockReasonFor(receiptDocument(payments, 10101), payments), null);
	});

	test("расхождение в одну копейку по-прежнему блокирует выдачу квитанции", () => {
		// 19 × 55,55 + 55,54 = 1110,99. Заявлено 1111 руб. — не хватает копейки.
		const payments = [...repeatedPayments(55.55, 19), paidPayment(55.54, 19)];
		const reason = blockReasonFor(receiptDocument(payments, 1111), payments);
		assert.ok(reason, "квитанция с расхождением в копейку обязана быть заблокирована");
		assert.match(reason, /выбранные оплаты дают/);
		assert.ok(
			reason.includes(expectedMoney(1110, 99)),
			`в отказе должна быть точная сумма оплат 1 110,99 ₽, получено: ${reason}`,
		);
		assert.ok(
			reason.includes(expectedMoney(1111, 0)),
			`в отказе должна быть заявленная сумма 1 111,00 ₽, получено: ${reason}`,
		);
	});

	test("отказ не показывает человеку дробный мусор из плавающей точки", () => {
		// 100,10 + 200,20 + 300,30 = 600,60. Дробное сложение даёт 600.5999999999999.
		const payments = [paidPayment(100.1, 0), paidPayment(200.2, 1), paidPayment(300.3, 2)];
		assert.notStrictEqual(
			floatReduce(payments),
			600.6,
			"набор перестал быть дрейфующим — тест потерял смысл, поправьте суммы",
		);
		const reason = blockReasonFor(receiptDocument(payments, 601), payments);
		assert.ok(reason, "601 руб. не равно 600,60 руб., выдача обязана быть заблокирована");
		assert.ok(reason.includes(expectedMoney(600, 60)), `ожидалось «600,60 ₽», получено: ${reason}`);
		assert.doesNotMatch(reason, /\d\.\d{3,}/, `в тексте для человека остался дробный мусор: ${reason}`);
	});

	/**
	 * ОГРАНИЧЕНИЕ КОНТРАКТА СНЯТО — и этот тест сторожит именно снятие.
	 *
	 * Здесь стоял сторож с обратным условием: он требовал, чтобы квитанция на
	 * 600,60 руб. НЕ проходила контракт, потому что на момент того пакета
	 * paymentReceiptPayloadSchema.totalPaidRub было объявлено как
	 * z.number().int(). Дефект признавался чужим («владелец контракта увидит
	 * здесь, что ограничение всё ещё живо») и оставлялся жить.
	 *
	 * Владелец контракта его и закрыл — коммит 3537333a2 «контракт отвергал сумму
	 * с копейками в 38 из 45 денежных полей»; сейчас в packages/shared/src/index.ts
	 * стоит totalPaidRub: positiveMoneyRubSchema, а комментарий рядом описывает
	 * ровно этот случай. Сторож после этого начал падать: он утверждал про
	 * контракт то, что перестало быть правдой. Ослаблять его нельзя, но и держать
	 * ложное утверждение нельзя — поэтому он развёрнут в ту сторону, в которую
	 * система теперь работает, и стал строже прежнего: проверяется не только то,
	 * что контракт сумму принимает и не округляет её, но и то, что гейт выдачи
	 * такую квитанцию ВЫПУСКАЕТ. Пока обе половины держатся, пациент получает
	 * документ об оплате на ровно уплаченную сумму с копейками.
	 *
	 * Клиническая цена возврата дефекта: оплату на 600,60 руб. принять можно, а
	 * квитанцию на неё выдать нельзя — сервер требует точного совпадения с суммой
	 * платежей, и человек остаётся без документа для налогового вычета.
	 */
	test("копеечный итог квитанции контракт принимает, и гейт её выдаёт", () => {
		const payments = [paidPayment(100.1, 0), paidPayment(200.2, 1), paidPayment(300.3, 2)];
		const result = paymentReceiptPayloadSchema.safeParse({
			receiptNumber: "КВ-2026-015",
			receiptDate: "2026-03-14",
			selectedPaymentIds: payments.map((payment) => payment.id),
			totalPaidRub: 600.6,
			payerFullName,
			taxSupportRequested: false,
			paymentPurpose: "Оплата лечения по плану от 10.03.2026",
			fiscalReceiptNumbers: payments.map((payment) => payment.fiscalReceiptNumber),
			issuedByFullName: "Сидорова Мария Павловна",
			paymentAndFiscalDataVerified: true,
			payerIdentityVerified: true,
			receiptDoesNotReplaceFiscalReceipt: true,
		});
		assert.strictEqual(result.success, true);
		// Копейки обязаны дойти до документа без округления: 600,60, а не 601 и не
		// 600. Деньги в документах точны до копейки.
		assert.strictEqual(result.success && result.data.totalPaidRub, 600.6);

		// И вторая половина: гейт выдачи такую квитанцию пропускает. Дробное
		// сложение этих же оплат даёт 600.5999999999999, поэтому проверка гейта
		// обязана считать в копейках, а не в плавающей точке.
		assert.notStrictEqual(floatReduce(payments), 600.6, "набор перестал быть дрейфующим — поправьте суммы");
		assert.strictEqual(blockReasonFor(receiptDocument(payments, 600.6), payments), null);
	});

	test("возврат всей уплаченной суммы 1111 руб. не отклоняется потолком", () => {
		const payments = repeatedPayments(55.55, 20);
		const reason = blockReasonFor(refundDocument(payments, 1111), payments);
		assert.doesNotMatch(
			reason ?? "",
			/больше фактически оплаченной/,
			`потолок возврата снова считается в плавающей точке: ${reason}`,
		);
	});

	test("возврат больше уплаченного по-прежнему отклоняется, и суммы отформатированы", () => {
		const payments = repeatedPayments(55.55, 20);
		const reason = blockReasonFor(refundDocument(payments, 1112), payments);
		assert.ok(reason, "возврат 1112 руб. при оплате 1111 руб. обязан быть заблокирован");
		assert.match(reason, /больше фактически оплаченной/);
		assert.ok(
			reason.includes(expectedMoney(1112, 0)) && reason.includes(expectedMoney(1111, 0)),
			`в отказе должны быть обе суммы в формате «1 112,00 ₽» и «1 111,00 ₽», получено: ${reason}`,
		);
	});
});
