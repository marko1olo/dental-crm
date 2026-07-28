import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ClinicProfile, GeneratedDocument, Patient, Payment, TaxPaymentSnapshot } from "@dental/shared";
import { transformRow } from "../migration/rowTransform.js";
import { normalizeMoneyRubles, normalizeMoneyValue } from "../migration/valueNormalize.js";
import { taxPaymentSnapshotTotalRub } from "./taxPaymentSnapshot.js";
import { buildKnd1151156Xml, type Knd1151156XmlContext } from "./taxXml.js";

/**
 * Деньги в документах и при переносе — до копейки.
 *
 * Три места, каждое из которых ломало сумму по-своему:
 *   1) итог справки для налогового вычета складывался в плавающей точке;
 *   2) суммы в выгрузке для ФНС складывались там же, вторым независимым
 *      выражением, и печатались через toFixed от уже испорченного числа;
 *   3) перенос из чужой системы округлял каждый платёж до целого рубля,
 *      посчитав точные копейки строкой выше и выбросив их.
 *
 * Наборы сумм взяты не наугад: 20 × 55,55 и 10 × 1010,10 — те самые, на которых
 * сложение в double даёт 1110.9999999999995 и 10101.000000000002.
 */

function paymentWith(id: string, amountRub: number): Payment {
  return {
    id,
    amountRub,
    taxDeductionCode: "1",
    patientId: "patient-1",
    status: "paid",
    paidAt: "2024-05-15T12:00:00Z",
    payerFullName: "Иванов Иван Иванович",
    payerBirthDate: "1990-01-01",
    payerInn: "123456789012",
    payerRelationship: "self"
  } as unknown as Payment;
}

function snapshotOf(amounts: number[]): TaxPaymentSnapshot {
  const payments = amounts.map((amount, index) => paymentWith(`payment-${index + 1}`, amount));
  return {
    createdAt: "2024-05-15T12:00:00Z",
    taxYear: 2024,
    taxPayerInn: "123456789012",
    paymentIds: payments.map((payment) => payment.id),
    fiscalReceiptKeys: payments.map((payment) => payment.id),
    payments
  } as unknown as TaxPaymentSnapshot;
}

describe("итог справки для налогового вычета", () => {
  test("двадцать приёмов по 55,55 дают ровно 1111, а не 1110.9999999999995", () => {
    const amounts = Array.from({ length: 20 }, () => 55.55);
    // Контрольный замер: именно так считал прежний код.
    const floatReduce = amounts.reduce((total, amount) => total + amount, 0);
    assert.notEqual(floatReduce, 1111);
    assert.equal(floatReduce, 1110.9999999999995);

    assert.equal(taxPaymentSnapshotTotalRub(snapshotOf(amounts)), 1111);
  });

  test("десять приёмов по 1010,10 дают ровно 10101", () => {
    const amounts = Array.from({ length: 10 }, () => 1010.1);
    assert.equal(
      amounts.reduce((total, amount) => total + amount, 0),
      10101.000000000002
    );
    assert.equal(taxPaymentSnapshotTotalRub(snapshotOf(amounts)), 10101);
  });

  test("копейки итога не теряются и не появляются из ниоткуда", () => {
    assert.equal(taxPaymentSnapshotTotalRub(snapshotOf([100.1, 200.2, 300.3])), 600.6);
    assert.equal(taxPaymentSnapshotTotalRub(snapshotOf([5400.5])), 5400.5);
    assert.equal(taxPaymentSnapshotTotalRub(snapshotOf([0.01, 0.01, 0.01])), 0.03);
    // Классический 0.1 + 0.2: прежний код давал 0.30000000000000004.
    assert.equal(0.1 + 0.2, 0.30000000000000004);
    const total = taxPaymentSnapshotTotalRub(snapshotOf([0.1, 0.2]));
    assert.equal(total, 0.3);
    // Итог обязан быть целым числом копеек: именно эту строку получит numeric(12,2).
    assert.equal(total.toFixed(2), "0.30");
  });
});

describe("суммы в выгрузке КНД 1184043 для ФНС", () => {
  const baseDocument = {
    id: "doc-1",
    patientId: "patient-1",
    kind: "tax_deduction_certificate",
    taxYear: 2024,
    issuedAt: "2024-05-15T12:00:00Z"
  } as unknown as GeneratedDocument;

  const basePatient = {
    id: "patient-1",
    fullName: "Иванов Иван Иванович",
    birthDate: "1990-01-01",
    administrativeProfile: {
      taxpayerInn: "123456789012",
      identityDocument: "Паспорт 11 22 333444 выдан 01.01.2010"
    }
  } as unknown as Patient;

  const baseClinic = {
    clinicName: "Тестовая клиника",
    legalName: "ООО Тест",
    inn: "1234567890",
    kpp: "123456789",
    ogrn: "1234567890123",
    address: "123456, г Москва, ул Тестовая, д 1",
    phone: "88005553535",
    email: "test@example.com",
    signatoryName: "Петров Петр Петрович"
  } as unknown as ClinicProfile;

  function xmlFor(amounts: number[]): string {
    const payments = amounts.map((amount, index) => paymentWith(`payment-${index + 1}`, amount));
    const document = {
      ...baseDocument,
      payload: { taxPaymentSelection: { selectedPaymentIds: payments.map((payment) => payment.id) } }
    } as unknown as GeneratedDocument;
    const context: Knd1151156XmlContext = {
      clinicProfile: baseClinic,
      payments,
      taxOfficeCode: "7700"
    };
    const result = buildKnd1151156Xml(document, basePatient, context);
    assert.equal(result.ok, true, result.ok ? "" : result.error);
    return result.ok ? result.xml : "";
  }

  test("дрейфующий набор выгружается как 1111.00", () => {
    assert.match(xmlFor(Array.from({ length: 20 }, () => 55.55)), /СуммаКод1="1111\.00"/);
  });

  test("копеечная сумма выгружается двумя знаками, а не одним", () => {
    assert.match(xmlFor([5400.5]), /СуммаКод1="5400\.50"/);
    assert.match(xmlFor([0.01]), /СуммаКод1="0\.01"/);
  });

  test("круглая сумма сохраняет прежний вид 1000.00", () => {
    assert.match(xmlFor([1000]), /СуммаКод1="1000\.00"/);
  });
});

describe("перенос истории из чужой системы", () => {
  function paymentRow(amountText: string): Record<string, unknown> {
    const transformed = transformRow({
      entityKind: "payment",
      columns: ["Код", "Пациент", "Сумма", "Дата оплаты"],
      row: ["5001", "101", amountText, "05.02.2020"],
      mapping: [
        {
          sourceColumn: "Код",
          targetField: "payment.externalId",
          decidedBy: "deterministic",
          confidence: 1,
          rationale: "тест",
          sampleValues: []
        },
        {
          sourceColumn: "Пациент",
          targetField: "payment.patientRef",
          decidedBy: "deterministic",
          confidence: 1,
          rationale: "тест",
          sampleValues: []
        },
        {
          sourceColumn: "Сумма",
          targetField: "payment.amountRub",
          decidedBy: "deterministic",
          confidence: 1,
          rationale: "тест",
          sampleValues: []
        },
        {
          sourceColumn: "Дата оплаты",
          targetField: "payment.paidAt",
          decidedBy: "deterministic",
          confidence: 1,
          rationale: "тест",
          sampleValues: []
        }
      ],
      dateHints: new Map(),
      confidenceThreshold: 0.5
    });
    assert.equal(
      transformed.issues.filter((issue) => issue.blocking).length,
      0,
      transformed.issues.map((issue) => issue.message).join("; ")
    );
    return transformed.values;
  }

  test("«23 400,50» доезжает до колонки суммы целиком", () => {
    const values = paymentRow("23 400,50");
    // Значение для колонки numeric(12,2) — рубли с копейками.
    assert.equal(values.amountRub, 23400.5);
    // Точные копейки продолжают лежать рядом: по ним сверяется перенос.
    assert.equal(values.amountKopecks, 2340050);
    // Ровно эту строку drizzle отдаст драйверу для numeric(12,2).
    assert.equal(String(values.amountRub as number), "23400.5");
  });

  test("одна копейка не превращается в ноль рублей", () => {
    const values = paymentRow("0,01");
    assert.equal(values.amountRub, 0.01);
    assert.equal(values.amountKopecks, 1);
  });

  test("русская и американская записи дают один и тот же результат", () => {
    assert.equal(paymentRow("1500,50").amountRub, 1500.5);
    assert.equal(paymentRow("1500.50").amountRub, 1500.5);
    assert.equal(paymentRow("1 500,50 руб.").amountRub, 1500.5);
  });

  test("нормализатор больше не помечает округление, потому что не округляет", () => {
    const parsed = normalizeMoneyRubles("27 900,50");
    assert.equal(parsed.value, 27900.5);
    assert.ok(!parsed.transforms.includes("round-kopecks-to-rubles"));
    assert.equal(normalizeMoneyValue("27 900,50").value, 2790050);
  });

  test("вся история из десяти платежей сходится до копейки", () => {
    const source = ["1 500,50", "2 300,25", "980,99", "12 000,01", "45,45", "7 777,77", "0,01", "150,50", "99,99", "1 010,10"];
    const rublesTotal = source.reduce((total, text) => total + (normalizeMoneyRubles(text).value ?? 0), 0);
    const kopecksTotal = source.reduce((total, text) => total + (normalizeMoneyValue(text).value ?? 0), 0);
    // Точная сумма считается на целых копейках, поэтому она и есть эталон.
    assert.equal(kopecksTotal, 2586557);
    /**
     * Сколько отнимало прежнее округление до рубля — посчитано его же формулой
     * (`Math.round(kopecks / 100)`) на этих десяти суммах: 207 копеек искажения
     * на десять платежей, из них 50 на «1 500,50» и 50 на «150,50».
     */
    const distortedByOldRounding = source.reduce((distorted, text) => {
      const kopecks = normalizeMoneyValue(text).value ?? 0;
      return distorted + Math.abs(Math.round(kopecks / 100) * 100 - kopecks);
    }, 0);
    assert.equal(distortedByOldRounding, 207);
    // А теперь колонка получает ровно разобранное значение.
    assert.equal(Math.round(rublesTotal * 100), kopecksTotal);
  });
});
