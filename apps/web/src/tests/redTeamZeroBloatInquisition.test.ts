/**
 * redTeamZeroBloatInquisition.test.ts
 *
 * 🔴 RED TEAM CODE PURITY & ZERO-BLOAT INQUISITION TEST SUITE 🔴
 * (Mandates 8d, 8e, 8i, 8k, 8p, 8s, 8t)
 *
 * Бескомпромиссная независимая инквизиция кодовой базы:
 * 1. Ликвидация стационарного больничного бреда (койко-дни, трансфузии, Kell, форма 025/у).
 * 2. Ликвидация процедурных симуляторов реальности (задержки setTimeout, 192-точечные замеры карманов).
 * 3. Автономия врача и регистратора (Мандат 8e: 0 disabled кнопок без причины, 100% скидки, 0 комиссий).
 * 4. Святость официальных документов (Мандат 8d п. 7: 0 мультяшных эмодзи в 043/у, чеках 54-ФЗ, зубной формуле).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

import {
	createDefaultPerioTeeth,
	calculatePsrSextants,
	PSR_SEXTANTS,
} from "@dental/shared";
import {
	applyHealthyPeriodontiumPreset,
} from "../components/perio/perioMath.js";
import {
	process100PercentDiscountCheckout,
} from "../components/finance/cashboxOperations.js";
import {
	calculatePaymentDiscount,
} from "../components/finance/PaymentModal.js";
import {
	createForm043PhysiologicalNorm,
	createIntactOdontogramRecords,
} from "../lib/clinicalProtocols043.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webSrcRoot, "../..");

// Регулярное выражение для обнаружения эмодзи
const CARTOON_EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

// Запрещенные термины стационарного госпитального бреда (Мандат 8i, 8s)
const FORBIDDEN_HOSPITAL_BLOAT = [
	"койко-день",
	"койко-дни",
	"койко-фонд",
	"коечный фонд",
	"коечный режим",
	"палата интенсивной",
	"палатный режим",
	"гемотрансфуз",
	"переливание крови",
	"переливание плазмы",
	"донор крови",
	"kell-антиген",
	"лапаротомия",
	"полостная операция",
	"общий интубационный наркоз",
	"паллиативная помощь",
];

describe("🔴 RED TEAM ZERO-BLOAT & AUTONOMY INQUISITION (MANDATES 8d, 8e, 8i, 8k, 8p, 8s) 🔴", () => {
	// ═════════════════════════════════════════════════════════════════════════
	// БЛОК 1: СУВЕРЕНИТЕТ АМБУЛАТОРНОЙ СТОМАТОЛОГИИ (МАНДАТЫ 8i, 8s)
	// ═════════════════════════════════════════════════════════════════════════
	describe("1. Мандат 8i и 8s: Искоренение стационарного больничного бреда", () => {
		const targetDirs = [
			"components/emr",
			"components/visit",
			"components/patients",
			"components/odontogram",
			"components/documents",
		];

		it("1.1. В ключевых клинических компонентах web отсутствуют термины коечного фонда, трансфузий и лапаротомии", () => {
			for (const relDir of targetDirs) {
				const fullDir = path.join(webSrcRoot, relDir);
				if (!fs.existsSync(fullDir)) continue;

				const entries = fs.readdirSync(fullDir, { recursive: true }) as string[];
				for (const entry of entries) {
					if (!entry.endsWith(".tsx") && !entry.endsWith(".ts")) continue;
					if (entry.includes("__tests__") || entry.includes(".test.")) continue;

					const filePath = path.join(fullDir, entry);
					if (!fs.statSync(filePath).isFile()) continue;

					const content = fs.readFileSync(filePath, "utf-8").toLowerCase();
					for (const term of FORBIDDEN_HOSPITAL_BLOAT) {
						assert.ok(
							!content.includes(term),
							`Файл ${relDir}/${entry} содержит чужеродный госпитальный термин: «${term}»`,
						);
					}
				}
			}
		});

		it("1.2. Схема и каталог создания документов исключают госпитальную форму 025/у в пользу Формы 043/у", () => {
			const documentsViewPath = path.join(webSrcRoot, "DocumentsView.tsx");
			assert.ok(fs.existsSync(documentsViewPath), "DocumentsView.tsx должен существовать");

			const docViewContent = fs.readFileSync(documentsViewPath, "utf-8");
			// Проверяем фильтрацию и редирект 025/у на 043/у
			assert.ok(
				docViewContent.includes('!== "outpatient_medical_card_025u"'),
				"DocumentsView обязан исключать outpatient_medical_card_025u из каталога шаблонов",
			);
			assert.ok(
				docViewContent.includes('setSelectedDocumentKind("dental_medical_card_043u")'),
				"DocumentsView обязан перенаправлять выбор 025/у на стоматологическую Карту 043/у",
			);
		});

		it("1.3. Форма 043/у является единственной легитимной амбулаторной картой в lib/clinicalProtocols043", () => {
			const norm = createForm043PhysiologicalNorm();
			assert.ok(norm, "Норма Формы 043/у должна успешно создаваться");
			assert.ok(!JSON.stringify(norm).toLowerCase().includes("025/у"), "Норма 043/у не содержит упоминаний 025/у");
			assert.ok(norm.chiefComplaint.length > 0, "Жалобы должны быть заполнены физиологической нормой");
			assert.ok(norm.historyOfPresentIllness.length > 0, "Анамнез заболевания заполнен нормой");
			assert.ok(norm.biteType, "Прикус ортогнатический");
			assert.ok(norm.oralMucosaStatus, "СОПР заполнена физиологической нормой");

			const intactFormula = createIntactOdontogramRecords();
			assert.equal(Object.keys(intactFormula).length, 32, "Стоматологическая формула 043/у содержит 32 интактных зуба");
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// БЛОК 2: ЦРМ — НЕ СИМУЛЯТОР РЕАЛЬНОСТИ, А УБИЙЦА ТРЕНИЯ (МАНДАТ 8k)
	// ═════════════════════════════════════════════════════════════════════════
	describe("2. Мандат 8k: Отсутствие процедурных симуляторов и задержек", () => {
		it("2.1. Пародонтограмма: экспресс-скрининг PSR ВОЗ по 6 секстантам в 1 клик вместо ручного ввода 192 точек", () => {
			const teeth = createDefaultPerioTeeth(2);
			const normTeeth = applyHealthyPeriodontiumPreset(teeth);

			// Мгновенный расчет PSR ВОЗ для 6 секстантов
			const sextants = calculatePsrSextants(normTeeth);
			for (const s of PSR_SEXTANTS) {
				const sextantResult = sextants[s.name];
				assert.ok(sextantResult, `Секстант ${s.name} обязан существовать`);
				assert.equal(
					sextantResult.code,
					0,
					`Секстант ${s.name} обязан иметь Код 0 без ручного ввода 192 точек`,
				);
			}
		});

		it("2.2. Медсестра и анестетики: списание пустых карпул в 1 клик без комиссии из 3 человек", () => {
			const visitDiaryPath = path.join(webSrcRoot, "components/visit/VisitDiarySection.tsx");
			const diaryContent = fs.readFileSync(visitDiaryPath, "utf-8");

			assert.ok(
				diaryContent.includes("onDisposalCarpules"),
				"VisitDiarySection обязан содержать коллбэк 1-клик списания карпул",
			);
			assert.ok(
				diaryContent.includes("дезинфекция 1 клик без комиссии"),
				"Списание карпул должно проходить в 1 клик без бюрократических комиссий",
			);
		});

		it("2.3. В критических путях оформления визита и чека отсутствуют симуляторы задержки (fake setTimeout)", () => {
			const visitSoapPath = path.join(webSrcRoot, "components/visit/VisitSoapEditor.tsx");
			const soapContent = fs.readFileSync(visitSoapPath, "utf-8");

			// Запрещены процедурные симуляции ожидания
			assert.ok(
				!soapContent.includes("setTimeout") || !soapContent.includes("simulateProgress"),
				"VisitSoapEditor не должен содержать симуляторов процедурного прогресса",
			);
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// БЛОК 3: АВТОНОМИЯ ВРАЧА И РЕГИСТРАТОРА (МАНДАТ 8e, 8n)
	// ═════════════════════════════════════════════════════════════════════════
	describe("3. Мандат 8e и 8n: Автономия персонала без заблокированных кнопок", () => {
		it("3.1. Печать Карты 043/у всегда доступна (disabled={false}) без бюрократических блокировок", () => {
			const form043ModalPath = path.join(webSrcRoot, "components/emr/Form043PrintModal.tsx");
			const modalContent = fs.readFileSync(form043ModalPath, "utf-8");

			assert.ok(
				modalContent.includes('disabled={false}'),
				"Form043PrintModal обязан содержать активную кнопку печати disabled={false}",
			);
		});

		it("3.2. Врач имеет право применить скидку 100% (гарантийная переделка/персонал) без паролей начмеда", () => {
			const discounted = calculatePaymentDiscount(10000, { discountPercent: 100 });
			assert.equal(discounted.discountRub, 10000, "Скидка 100% должна полностью списывать сумму");
			assert.equal(discounted.totalDueRub, 0, "Итоговая сумма к оплате при 100% скидке равна 0.00 ₽");

			const warranty = calculatePaymentDiscount(10000, { isWarranty100: true });
			assert.equal(warranty.discountRub, 10000, "Гарантийная переделка 100% списывает сумму полностью");
			assert.equal(warranty.totalDueRub, 0, "Итог по гарантийной переделке равен 0.00 ₽");

			const checkoutResult = process100PercentDiscountCheckout({
				totalGrossRub: 15000,
				isWarrantyRework: true,
			});
			assert.equal(checkoutResult.isZeroDue, true);
			assert.equal(checkoutResult.totalNetRub, 0);
			assert.equal(checkoutResult.totalDiscountRub, 15000);
			assert.equal(checkoutResult.status, "completed");
			assert.equal(checkoutResult.bypassKktZeroReceipt, true);
		});

		it("3.3. Регистратор может распечатать пустой договор со строками '_______' без 403-ошибок", () => {
			const blankContractPath = path.join(webSrcRoot, "components/patients/blankContractPrint.ts");
			assert.ok(fs.existsSync(blankContractPath), "Модуль blankContractPrint.ts обязан существовать");

			const blankContent = fs.readFileSync(blankContractPath, "utf-8");
			assert.ok(
				blankContent.includes("printBlankMedicalContract"),
				"Должна экспортироваться функция печати пустого бланка договора ПП 736",
			);
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// БЛОК 4: СВЯТОСТЬ ОФИЦИАЛЬНЫХ БЛАНКОВ И ZERO EMOJIS (МАНДАТ 8d п. 7, 8p)
	// ═════════════════════════════════════════════════════════════════════════
	describe("4. Мандат 8d п. 7: Строгий запрет на мультяшные эмодзи в медицинских и финансовых бланках", () => {
		it("4.1. Form043PrintModal.tsx (Медицинская карта 043/у) содержит 0 мультяшных эмодзи", () => {
			const filePath = path.join(webSrcRoot, "components/emr/Form043PrintModal.tsx");
			const content = fs.readFileSync(filePath, "utf-8");
			const lines = content.split("\n");

			let emojiCount = 0;
			for (const line of lines) {
				if (!line) continue;
				if (CARTOON_EMOJI_REGEX.test(line)) {
					emojiCount++;
				}
			}
			assert.equal(emojiCount, 0, `В Form043PrintModal.tsx обнаружено ${emojiCount} эмодзи! Должно быть 0.`);
		});

		it("4.2. Order804nFiscalReceiptPrint.tsx и FiscalReceipt54FzModal.tsx (Чеки 54-ФЗ) содержат 0 мультяшных эмодзи", () => {
			const files = [
				path.join(webSrcRoot, "components/finance/Order804nFiscalReceiptPrint.tsx"),
				path.join(webSrcRoot, "components/finance/FiscalReceipt54FzModal.tsx"),
			];

			for (const fp of files) {
				const content = fs.readFileSync(fp, "utf-8");
				const lines = content.split("\n");

				let emojiCount = 0;
				for (const line of lines) {
					if (!line) continue;
					const trimmed = line.trim();
					if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
					if (CARTOON_EMOJI_REGEX.test(line)) {
						emojiCount++;
					}
				}
				assert.equal(emojiCount, 0, `В ${path.basename(fp)} обнаружено ${emojiCount} эмодзи! Должно быть 0.`);
			}
		});

		it("4.3. Зубная формула (ToothChart.tsx и ClassicGostOdontogram.tsx) содержит 0 мультяшных эмодзи", () => {
			const files = [
				path.join(webSrcRoot, "components/odontogram/ToothChart.tsx"),
				path.join(webSrcRoot, "components/odontogram/ClassicGostOdontogram.tsx"),
			];

			for (const fp of files) {
				const content = fs.readFileSync(fp, "utf-8");
				const lines = content.split("\n");

				let emojiCount = 0;
				for (const line of lines) {
					if (!line) continue;
					const trimmed = line.trim();
					if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
					if (CARTOON_EMOJI_REGEX.test(line)) {
						emojiCount++;
					}
				}
				assert.equal(emojiCount, 0, `В ${path.basename(fp)} обнаружено ${emojiCount} эмодзи! Должно быть 0.`);
			}
		});
	});
});
