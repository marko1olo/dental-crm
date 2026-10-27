import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	featureDistinguishes,
	prevailingFeature,
} from "./patientListFeatureSalience.js";

describe("преобладающее значение признака", () => {
	test("большинство считается, а не просто самое частое", () => {
		assert.deepEqual(prevailingFeature(["watch", "watch", "high"]), {
			count: 2,
			total: 3,
			value: "watch",
		});
	});

	test("самое частое без большинства преобладающим не считается", () => {
		const values = ["a", "a", "a", "a", "b", "b", "b", "c", "c", "c"];
		assert.equal(prevailingFeature(values), null);
	});

	test("ничья большинством не бывает", () => {
		assert.equal(prevailingFeature(["watch", "high"]), null);
	});

	test("пустая клиника не даёт преобладающего значения", () => {
		assert.equal(prevailingFeature([]), null);
	});

	test("один пациент — его признак и есть преобладающий", () => {
		assert.deepEqual(prevailingFeature(["watch"]), {
			count: 1,
			total: 1,
			value: "watch",
		});
	});
});

describe("рисовать ли признак в строке", () => {
	test("совпал с преобладающим — не рисуется", () => {
		assert.equal(
			featureDistinguishes("watch", { count: 14, total: 17, value: "watch" }),
			false,
		);
	});

	test("отличается от преобладающего — рисуется", () => {
		assert.equal(
			featureDistinguishes("high", { count: 14, total: 17, value: "watch" }),
			true,
		);
	});

	test("преобладающего нет — рисуется, различает по определению", () => {
		assert.equal(featureDistinguishes("watch", null), true);
	});
});
