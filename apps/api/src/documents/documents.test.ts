import assert from "node:assert";
import { describe, test } from "node:test";
import {
	normalizedDocumentChainValue,
	normalizedTaxpayerInn,
} from "../routes/documents.js";

describe("normalizedDocumentChainValue", () => {
	test("returns empty string for null", () => {
		assert.strictEqual(normalizedDocumentChainValue(null), "");
	});

	test("returns empty string for undefined", () => {
		assert.strictEqual(normalizedDocumentChainValue(undefined), "");
	});

	test("trims whitespace", () => {
		assert.strictEqual(normalizedDocumentChainValue("  hello  "), "hello");
	});

	test("replaces multiple spaces with a single space", () => {
		assert.strictEqual(
			normalizedDocumentChainValue("hello   world"),
			"hello world",
		);
		assert.strictEqual(
			normalizedDocumentChainValue("hello \n \t world"),
			"hello world",
		);
	});

	test("converts to lower case (ru-RU)", () => {
		assert.strictEqual(
			normalizedDocumentChainValue("HELLO WORLD"),
			"hello world",
		);
		assert.strictEqual(
			normalizedDocumentChainValue("ПРИВЕТ МИР"),
			"привет мир",
		);
	});

	test("combines all transformations", () => {
		assert.strictEqual(
			normalizedDocumentChainValue("  ПРИВЕТ   МИР  \n "),
			"привет мир",
		);
	});
});

describe('normalizedTaxpayerInn', () => {
  test('returns empty string for null', () => {
    assert.strictEqual(normalizedTaxpayerInn(null), "");
  });

  test('returns empty string for undefined', () => {
    assert.strictEqual(normalizedTaxpayerInn(undefined), "");
  });

  test('removes all non-digit characters', () => {
    assert.strictEqual(normalizedTaxpayerInn("123-456-789"), "123456789");
    assert.strictEqual(normalizedTaxpayerInn("A123B456C"), "123456");
    assert.strictEqual(normalizedTaxpayerInn("  123 456  "), "123456");
import { frozenTaxXmlPayments } from '../routes/documents.js';
import type { GeneratedDocument, Payment } from '@dental/shared';

describe('frozenTaxXmlPayments', () => {
  const fallbackPayments: Payment[] = [
    { id: 'payment-1', amountRub: 100 } as Payment,
    { id: 'payment-2', amountRub: 200 } as Payment,
  ];

  test('returns payments from taxXmlSourceSnapshot if it exists', () => {
    const document: GeneratedDocument = {
      taxXmlSourceSnapshot: {
        payments: [
          { id: 'payment-3', amountRub: 300 } as Payment,
        ]
      }
    } as GeneratedDocument;

    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, document.taxXmlSourceSnapshot?.payments);

  test('returns fallback payments if taxXmlSourceSnapshot is missing', () => {
    const document: GeneratedDocument = {} as GeneratedDocument;

    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, fallbackPayments);

  test('returns fallback payments if taxXmlSourceSnapshot is present but payments is undefined', () => {
    const document: GeneratedDocument = {
      taxXmlSourceSnapshot: {}
    } as GeneratedDocument;

    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, fallbackPayments);
  });
});
