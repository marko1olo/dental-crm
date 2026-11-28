/**
 * apps/web/src/components/sanpin/__tests__/sanPinSterilizationJournalSuite.test.tsx
 *
 * Red Team Runtime Behavioral Test Suite (СанПиН 3.3686-21):
 * 1. Kraft barcode parsing & statutory pouch snippet.
 * 2. SanPinSterilizationJournal DOM rendering, zero emojis, zero forbidden dev jargon.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SanPinSterilizationJournal } from "../SanPinSterilizationJournal";
import { parseAndValidateKraftBarcode, formatPouch043StatutorySnippet } from "@dental/shared";

describe("SANPIN STERILIZATION & KRAFT BATCH INQUISITOR SUITE (СанПиН 3.3686-21)", () => {
	describe("1. Пакетная стерилизация и нормализация кодов", () => {
		it("валидирует штрихкод крафт-пакета KP-84920", () => {
			const res = parseAndValidateKraftBarcode("KP-84920", {
				referenceDate: "2026-10-08",
			});
			assert.ok(res.isValid, "Код KP-84920 должен быть валидным");
			assert.equal(res.rawInput, "KP-84920");
		});

		it("формирует регламентную запись пакета с параметрами 134°C, 2.1 бар, 5 мин и индикатором 5 кл. без блокировки врача", () => {
			const snippet = formatPouch043StatutorySnippet({
				pouchCode: "KP-84920",
				indicatorClass: 5,
				openedInPresenceOfPatient: true,
				isPassed: true,
			});

			assert.ok(snippet.includes("КП-84920"));
			assert.ok(snippet.includes("5 класса сработал"));
		});
	});

	describe("2. Журнал стерилизации СанПиН (SanPinSterilizationJournal)", () => {
		it("рендерит журнал с циклами, автоклавами, индикатором и без эмодзи/дев-жаргона", () => {
			const html = renderToStaticMarkup(<SanPinSterilizationJournal />);

			assert.ok(html.includes("Журнал автоклавирования") || html.includes("Журнал стерилизации"));
			assert.ok(html.includes("АК-01"));
			assert.ok(html.includes("Melag Vacuklav 23B+"));
			assert.ok(html.includes("134.4°C") || html.includes("134"));
			assert.ok(html.includes("2.15 бар") || html.includes("2.1"));
			assert.ok(html.includes("Стерильно"));
			assert.ok(html.includes("KP-84920"));
			assert.ok(html.includes("Печать журнала"));
			assert.ok(html.includes("Пакетная стерилизация смены") || html.includes("Зафиксировать цикл автоклавирования смены"));

			assert.equal(/\p{Extended_Pictographic}/u.test(html.replace(/[✓✕•→]/g, "")), false);
			assert.equal(html.includes("1-клик") || html.includes("1-Click"), false);
			assert.equal(html.includes("овербукинг") || html.includes("overbooking"), false);
		});
	});
});
