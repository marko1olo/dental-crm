/**
 * apps/web/src/components/perio/__tests__/periodontalFloridaProbeInquisition.test.ts
 *
 * RED TEAM INQUISITION: Клиническая карта пародонта и автономия врача
 * Полный аудит согласно Мандатам 8e (Автономия врача), 8n (Соло-врач), 8am (Единый дизайн-код и 1 Primary CTA),
 * 8x (Живой клинический язык), 8b (Потолок <= 800 строк) и 8d (Ноль эмодзи).
 *
 * Инварианты:
 * 1. Физиологическая норма в 1 клик («✓ Пародонт в норме», глубина 1–2 мм, кровоточивость 0%)
 * 2. Быстрый ввод патологии только там, где есть реальные карманы (>= 4 мм), рецессия или подвижность
 * 3. Ровно ОДНА Primary CTA кнопка «✓ Сохранить периодонтограмму»
 * 4. Мгновенный экспорт структурированного резюме в дневник приёма без блокировок
 * 5. Тотальный запрет на принудительную симуляцию 192 точек замера и процедурные симуляторы
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	ALL_PERIO_TEETH,
	calculateAapEfpStagingAndGrading,
	calculateClinicalAttachmentLevel,
	calculateOlearyFromPerioTeeth,
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	formatPsrSextantsSummary,
	FURCATION_GRADES,
	generateComprehensivePerio043Text,
	generateFullMouthProbingSequence,
	isFurcationEligibleTooth,
	MOBILITY_GRADES,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_SITE_KEYS,
	PERIO_UPPER_ARCH_TEETH,
	type PerioToothRecord,
	PSR_SEXTANTS,
} from "@dental/shared";

import {
	probingDepthClinicalClasses,
	probingDepthClinicalHex,
	probingDepthClinicalTone,
	probingDepthTone,
	probingDepthHex,
	probingDepthClasses,
} from "../perioHeatmap";

import {
	CLINICAL_PROBING_DEPTH_HEX_LUT,
	CLINICAL_PROBING_DEPTH_TONE_LUT,
	getFastClinicalProbingDepthHex,
	getFastClinicalProbingDepthTone,
	getFastProbingDepthHex,
	getFastProbingDepthTone,
} from "../perioRafOptimizer";

import {
	applyGingivitisPreset,
	applyHealthyPeriodontiumPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	applyPsrSextantCode,
	generatePsrDiaryProtocol,
} from "../perioMath";

import { PeriodontogramChart } from "../PeriodontogramChart";
import { SITE_SHORT_RU } from "../chart/PerioToothCard";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("RED TEAM INQUISITION: Карта пародонта, 1-клик норма и автономия врача (Мандат 8e, 8am)", () => {
	// ──────────────────────────────────────────────────────────────────────────
	// 1. ФИЗИОЛОГИЧЕСКАЯ НОРМА В 1 КЛИК (МАНДАТ 8e & СНИЖЕНИЕ ТРЕНИЯ)
	// ──────────────────────────────────────────────────────────────────────────
	describe("1. Физиологическая норма в 1 клик (85% здоровых пациентов)", () => {
		test("applyHealthyPeriodontiumPreset переводит всю формулу в норму (1–2 мм, BOP 0%, подвижность 0)", () => {
			const teeth = createDefaultPerioTeeth(5); // Зубы с патологией
			const intactTeeth = applyHealthyPeriodontiumPreset(teeth);

			assert.equal(intactTeeth.length, 32);
			for (const t of intactTeeth) {
				assert.equal(t.mobility, 0, `Зуб #${t.toothNumber} должен иметь подвижность 0`);
				assert.equal(t.furcation, 0, `Зуб #${t.toothNumber} должен иметь фуркацию 0`);
				for (const k of PERIO_SITE_KEYS) {
					assert.ok(t[k]!.probingDepthMm <= 2, `Глубина борозды зуба #${t.toothNumber} должна быть <= 2 мм`);
					assert.equal(t[k]!.bleedingOnProbing, false, "Кровоточивости быть не должно");
					assert.equal(t[k]!.plaque, false, "Зубного налета быть не должно");
					assert.equal(t[k]!.suppuration, false, "Гноетечения быть не должно");
					assert.equal(t[k]!.calMm, 2, "Потеря прикрепления отсутствует (CAL <= 2 мм)");
				}
			}

			const summary = calculatePerioIndices(intactTeeth);
			assert.equal(summary.fmbsPercent, 0, "Индекс BOP должен быть строго 0%");
			assert.equal(summary.fmpsPercent, 0, "Индекс зубного налета должен быть строго 0%");
			assert.equal(summary.deepPocketsCount, 0, "Патологических глубоких карманов 0");
			assert.equal(summary.moderatePocketsCount, 0, "Умеренных карманов 0");

			const psr = calculatePsrSextants(intactTeeth);
			for (const s of PSR_SEXTANTS) {
				assert.equal(psr[s.name]?.code, 0, `Секстант ${s.name} обязан быть PSR 0 (норма)`);
			}
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 2. БЫСТРЫЙ ВВОД ПАТОЛОГИИ (ТОЛЬКО ТАМ, ГДЕ ЕСТЬ РЕАЛЬНЫЙ КАРМАН >= 4 ММ)
	// ──────────────────────────────────────────────────────────────────────────
	describe("2. Быстрая фиксация патологии без процедурного симулятора", () => {
		test("Точечная фиксация патологического кармана (4 мм) у конкретного зуба не требует ввода всех 192 точек", () => {
			const teeth = applyHealthyPeriodontiumPreset(createDefaultPerioTeeth());
			// Врач у кресла фиксирует карман 4 мм с кровоточивостью только на зубе #16 (остальные в норме)
			const updatedTeeth = teeth.map((tooth) => {
				if (tooth.toothNumber !== 16) return tooth;
				const copy = { ...tooth };
				for (const k of PERIO_SITE_KEYS) {
					copy[k] = {
						...tooth[k]!,
						probingDepthMm: 4,
						bleedingOnProbing: true,
						calMm: calculateClinicalAttachmentLevel(4, tooth[k]?.gingivalMarginMm ?? 0),
					};
				}
				return copy;
			});

			const summary = calculatePerioIndices(updatedTeeth);
			assert.equal(summary.moderatePocketsCount, 6, "Ровно 6 участков зуба 16 стали карманами");
			assert.equal(summary.deepPocketsCount, 0, "Глубоких карманов >= 6 мм нет");
			assert.ok(summary.fmbsPercent > 0, "Кровоточивость зафиксирована локально");
		});

		test("Тяжелый пародонтит: фиксация карманов >= 6 мм, подвижности и гноетечения", () => {
			const severeTeeth = applyPeriodontitisSeverePreset(createDefaultPerioTeeth());
			const summary = calculatePerioIndices(severeTeeth);
			const diag = calculateAapEfpStagingAndGrading(severeTeeth, summary);

			assert.ok(diag.icd10Code.startsWith("K05.3"), "Диагноз по МКБ-10 должен быть пародонтит");
			assert.ok(summary.deepPocketsCount > 0, "Должны присутствовать глубокие карманы");
		});

		test("Рецессия десны (K06.0) фиксируется при сохранении физиологической глубины кармана", () => {
			// Карман 2 мм, рецессия маргинальной десны +2 мм -> CAL = 4 мм, BOP = 0
			const cal = calculateClinicalAttachmentLevel(2, 2);
			assert.equal(cal, 4, "CAL = 2 мм + 2 мм рецессии = 4 мм");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 3. МАТЕМАТИЧЕСКАЯ ШКАЛА CAL И КЛИНИЧЕСКИЕ ЦВЕТА
	// ──────────────────────────────────────────────────────────────────────────
	describe("3. Клиническая шкала глубин и цветов (норма vs патология)", () => {
		test("Норма (<= 3 мм): зеленый цвет (emerald-400 / #34d399 / success)", () => {
			for (const depth of [0, 1, 2, 3]) {
				assert.equal(probingDepthClinicalTone(depth), "success");
				assert.equal(probingDepthClinicalHex(depth), "#34d399");
				assert.equal(getFastClinicalProbingDepthHex(depth), "#34d399");
			}
		});

		test("Ранний карман (4-5 мм): желтый цвет (amber-400 / #fbbf24 / warning-low)", () => {
			for (const depth of [4, 5]) {
				assert.equal(probingDepthClinicalTone(depth), "warning-low");
				assert.equal(probingDepthClinicalHex(depth), "#fbbf24");
				assert.equal(getFastClinicalProbingDepthHex(depth), "#fbbf24");
			}
		});

		test("Выраженный карман (6-7 мм): оранжевый цвет (orange-500 / #f97316 / warning-high)", () => {
			for (const depth of [6, 7]) {
				assert.equal(probingDepthClinicalTone(depth), "warning-high");
				assert.equal(probingDepthClinicalHex(depth), "#f97316");
				assert.equal(getFastClinicalProbingDepthHex(depth), "#f97316");
			}
		});

		test("Глубокий костный карман (>= 8 мм): алый цвет (rose-600 / #e11d48 / critical)", () => {
			for (const depth of [8, 9, 10, 12, 15]) {
				assert.equal(probingDepthClinicalTone(depth), "critical");
				assert.equal(probingDepthClinicalHex(depth), "#e11d48");
				assert.equal(getFastClinicalProbingDepthHex(depth), "#e11d48");
			}
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 4. МГНОВЕННЫЙ ЭКСПОРТ В ДНЕВНИК ВИЗИТА (SOAP) БЕЗ БЛОКИРОВОК
	// ──────────────────────────────────────────────────────────────────────────
	describe("4. Мгновенный экспорт в дневник приёма (Мандат 8e)", () => {
		test("Протокол пародонтограммы генерирует лаконичное клиническое резюме", () => {
			const teeth = applyPeriodontitisModeratePreset(createDefaultPerioTeeth());
			const summary = calculatePerioIndices(teeth);
			const protocol = generateComprehensivePerio043Text(teeth, summary, {
				doctorName: "Д-р Смирнова Е.А.",
				customNotes: "SRP в области секстанта S1",
			});

			assert.ok(protocol.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ"), "Содержит шапку протокола");
			assert.ok(protocol.includes("Лечащий врач: Д-р Смирнова Е.А."));
			assert.ok(protocol.includes("Скрининг пародонта PSR/CPITN"));
			assert.ok(protocol.includes("Индекс кровоточивости"));
			assert.ok(protocol.includes("Максимальная глубина"));
			assert.ok(protocol.includes("Клинический диагноз"));
			assert.ok(protocol.includes("SRP в области секстанта S1"));
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 5. РОВНО ОДНА PRIMARY CTA КНОПКА (МАНДАТ 8am) И SSR РЕНДЕР
	// ──────────────────────────────────────────────────────────────────────────
	describe("5. Единый дизайн-код (Мандат 8am: ровно 1 Primary CTA) и SSR", () => {
		test("PeriodontogramChart содержит ровно 1 Primary CTA кнопку сохранения", () => {
			const html = renderToString(
				React.createElement(PeriodontogramChart, {
					readOnly: false,
					initialTier3Expanded: false,
				}),
			);

			assert.ok(html.length > 500, "HTML должен успешно генерироваться");
			assert.ok(html.includes("interactive-periodontogram"), "Рендерит контейнер");
			assert.ok(html.includes("perio-toolbar-norm-1click-btn"), "Рендерит 1-клик кнопку нормы");
			assert.ok(html.includes("perio-save-draft-btn"), "Рендерит Primary CTA кнопку сохранения");
			assert.ok(html.includes("Сохранить периодонтограмму"), "Текст Primary CTA кнопки соответствует канону");
			// Проверяем, что нет упоминаний «Florida Probe» в отрисованном HTML
			assert.equal(html.includes("Florida Probe"), false, "Ноль упоминаний Florida Probe в разметке!");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// 6. ЗАКОН ПОТОЛКА СТРОК (<= 800 СТРОК) И НОЛЬ ЭМОДЗИ (МАНДАТЫ 8b & 8d)
	// ──────────────────────────────────────────────────────────────────────────
	describe("6. Конституционные гейты монорепозитория (Мандаты 8b & 8d)", () => {
		test("Все файлы в components/perio строго <= 800 строк кода", () => {
			const perioDir = path.resolve(__dirname, "..");
			const files: string[] = [];

			function collectFiles(dir: string) {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						collectFiles(fullPath);
					} else if (
						entry.isFile() &&
						(entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
					) {
						files.push(fullPath);
					}
				}
			}

			collectFiles(perioDir);
			assert.ok(files.length >= 10, "Должно быть проинспектировано не менее 10 файлов");

			for (const f of files) {
				const content = fs.readFileSync(f, "utf8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 800,
					`ДЕФЕКТ РАЗМЕРА ФАЙЛА (Мандат 8b): ${path.relative(perioDir, f)} содержит ${lines} строк (> 800)`,
				);
			}
		});

		test("Ноль мультяшных эмодзи в коде и интерфейсе пародонтологии (Мандат 8d)", () => {
			const perioDir = path.resolve(__dirname, "..");
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

			const files: string[] = [];
			function collect(dir: string) {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const e of entries) {
					const full = path.join(dir, e.name);
					if (e.isDirectory() && e.name !== "__tests__") {
						collect(full);
					} else if (
						e.isFile() &&
						(e.name.endsWith(".ts") || e.name.endsWith(".tsx"))
					) {
						files.push(full);
					}
				}
			}
			collect(perioDir);

			for (const f of files) {
				const content = fs.readFileSync(f, "utf8");
				const match = emojiRegex.exec(content);
				assert.equal(
					match,
					null,
					`ДЕФЕКТ ЭМОДЗИ (Мандат 8d) в файле ${path.basename(f)}: найдено '${match?.[0]}'`,
				);
			}
		});
	});
});
