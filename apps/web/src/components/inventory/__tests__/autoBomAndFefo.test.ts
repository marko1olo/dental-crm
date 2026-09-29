/**
 * autoBomAndFefo.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * 1. Auto-BOM deduction for 804n procedures (A16.07.002 composite filling & A11.07.012 anesthesia)
 *    strictly scoped to cabinet / dental chair (chairId / cabinetId).
 * 2. FEFO (First-Expired, First-Out) traffic light, sorting, and expired batch quarantine
 *    with exact statutory alert: «Срок годности партии истек ДД.ММ.ГГГГ! Партия заблокирована для утилизации».
 * 3. Doctor Autonomy & Soft Overdraft Protection (Mandates 8e, 8n, 8s):
 *    zero stock never blocks Form 043/u completion, records negative balance, and notifies
 *    senior nurse / warehouse head: «Требуется оприходование: материал списан в овердрафт по визиту №...».
 * 4. SanPiN 2.1.3684-21 & 3.3686-21 Class B Carpule Disposal Act:
 *    accounting for broken glass carpules (бой при установке) and partial doses (частичная инфильтрация)
 *    with chemical disinfection (3% Аламинол) and 1-person approval (no 3-person commission).
 * 5. Strict Zero-Emoji compliance (Mandate 8d) in all statutory documents, acts, and alerts.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_804N_CONSUMABLE_LINKS,
	calculateAutoVisitConsumables,
} from "@dental/shared";
import {
	formatRuDate,
	isBatchExpired,
	getFefoTrafficLight,
	validateBatchForClinicalUse,
	sortBatchesByFefo,
	resolveFefoDeductionBatches,
} from "../fefoTrafficLight.js";
import {
	performAutoVisitBomDeduction,
	formatShiftCloseClassBWasteActHtml,
	executeShiftCloseClassBWasteDisposal,
} from "../autoBomDeductionEngine.js";
import {
	computeAuditLineItem,
	calculateInventoryAuditTotals,
	filterAuditLinesByCabinetOrChair,
	quarantineExpiredBatchesFromAudit,
} from "../warehouseInventoryEngine.js";

// Comprehensive Emoji Detector (Mandate 8d)
const FORBIDDEN_EMOJI_REGEX = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

describe("Red Team Inquisitor: Auto-BOM, FEFO Traffic Light & Overdraft", () => {
	// ──────────────────────────────────────────────────────────────────────────
	// TEST SUITE 1: Auto-BOM for A16.07.002 with strict Cabinet/Chair Scoping
	// ──────────────────────────────────────────────────────────────────────────
	describe("1. Auto-BOM Deduction for A16.07.002 & Chair/Cabinet Isolation", () => {
		it("техкарта лечения кариеса A16.07.002 включает композит 0.2г, бонд/адгезив, матрицу, полировочную головку и микробраш", () => {
			const fullCariesBomLinks = [
				{
					id: "cust-link-caries-composite",
					service804nCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой (кариес)",
					inventoryItemId: "mat-composite-filtek",
					itemName: "Светоотверждаемый нанокомпозит (Filtek Z250 / Estelite)",
					category: "composite" as const,
					unit: "шприц_гр" as const,
					quantityPerService: 0.2,
					isMandatory: true,
					costPriceKopecks: 38000,
				},
				{
					id: "cust-link-caries-adhesive",
					service804nCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой (кариес)",
					inventoryItemId: "mat-adhesive-single",
					itemName: "Адгезивная система самопротравливающая (7 пок., бонд)",
					category: "composite" as const,
					unit: "dose" as const,
					quantityPerService: 1,
					isMandatory: true,
					costPriceKopecks: 12000,
				},
				{
					id: "cust-link-caries-matrix",
					service804nCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой (кариес)",
					inventoryItemId: "mat-matrix-sectional",
					itemName: "Секционная матрица контурная металлизированная",
					category: "composite" as const,
					unit: "шт" as const,
					quantityPerService: 1,
					isMandatory: true,
					costPriceKopecks: 4500,
				},
				{
					id: "cust-link-caries-polishing",
					service804nCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой (кариес)",
					inventoryItemId: "mat-polishing-cup",
					itemName: "Полировочная головка / чашка силиконовая финишная",
					category: "composite" as const,
					unit: "шт" as const,
					quantityPerService: 1,
					isMandatory: true,
					costPriceKopecks: 6500,
				},
				{
					id: "cust-link-caries-microbrush",
					service804nCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой (кариес)",
					inventoryItemId: "mat-microbrush",
					itemName: "Микробраш аппликатор стоматологический",
					category: "other" as const,
					unit: "шт" as const,
					quantityPerService: 2,
					isMandatory: true,
					costPriceKopecks: 1200,
				},
			];

			const consumables = calculateAutoVisitConsumables([
				{
					serviceCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой (кариес)",
					quantity: 1,
					toothNumber: 36,
				},
			], { includeStandardPpe: false, customLinks: fullCariesBomLinks });

			// Verify composite 0.2g
			const composite = consumables.find((c) => c.itemName.toLowerCase().includes("композит"));
			assert.ok(composite, "В техкарте A16.07.002 обязан быть композит светового отверждения");
			assert.equal(composite.requiredQuantity, 0.2, "Расход композита должен быть ровно 0.2 г на пломбу");

			// Verify adhesive / bond
			const adhesive = consumables.find((c) => 
				c.itemName.toLowerCase().includes("адгезив") || c.itemName.toLowerCase().includes("бонд")
			);
			assert.ok(adhesive, "В техкарте A16.07.002 обязан быть адгезив/бонд");

			// Verify matrix
			const matrix = consumables.find((c) => c.itemName.toLowerCase().includes("матриц"));
			assert.ok(matrix, "В техкарте A16.07.002 обязана быть матрица секционная/контурная");
			assert.equal(matrix.requiredQuantity, 1);

			// Verify polishing cup / head
			const polishing = consumables.find((c) => 
				c.itemName.toLowerCase().includes("полиров") || c.itemName.toLowerCase().includes("чашка") || c.itemName.toLowerCase().includes("головк")
			);
			assert.ok(polishing, "В техкарте A16.07.002 обязана быть полировочная чашка/головка");
			assert.equal(polishing.requiredQuantity, 1);

			// Verify microbrush / аппликатор
			const microbrush = consumables.find((c) => 
				c.itemName.toLowerCase().includes("микробраш") || c.itemName.toLowerCase().includes("аппликатор")
			);
			assert.ok(microbrush, "В техкарте A16.07.002 обязан быть микробраш");
			assert.equal(microbrush.requiredQuantity, 2);
		});

		it("дефолтный каталог 804н сопоставляет базовый код кариеса A16.07.002 с композитом 0.2г и адгезивом", () => {
			const defaultConsumables = calculateAutoVisitConsumables([
				{
					serviceCode: "A16.07.002",
					serviceTitle: "Восстановление зуба пломбой",
					quantity: 1,
					toothNumber: 46,
				},
			], { includeStandardPpe: false });

			const comp = defaultConsumables.find((c) => c.itemName.includes("нанокомпозит"));
			assert.ok(comp, "Дефолтный каталог должен содержать композит для A16.07.002");
			assert.equal(comp.requiredQuantity, 0.2);

			const adh = defaultConsumables.find((c) => c.itemName.includes("Адгезивная система"));
			assert.ok(adh, "Дефолтный каталог должен содержать адгезив для A16.07.002");
			assert.equal(adh.requiredQuantity, 1);
		});

		it("строго изолирует списание по креслу/кабинету: остатки чужого кресла не списываются", async () => {
			let capturedToast = "";
			let capturedAlert: any = null;

			// Warehouse items partitioned across Cabinet 1 (Chair 1) and Cabinet 2 (Chair 2)
			const warehouseItems = [
				{
					id: "mat-comp-filtek-01",
					name: "Композит светового отверждения (Filtek Z250, шприц 4г)",
					stockQuantity: 10,
					cabinetId: "cab-2",
					chairId: "chair-2",
				},
				{
					id: "mat-comp-filtek-01",
					name: "Композит светового отверждения (Filtek Z250, шприц 4г)",
					stockQuantity: 0, // Chair 1 has 0 in stock!
					cabinetId: "cab-1",
					chairId: "chair-1",
				},
			];

			const result = await performAutoVisitBomDeduction({
				visitId: "visit-scoping-101",
				visitNumber: "В-101",
				patientId: "pat-1",
				doctorId: "doc-1",
				cabinetId: "cab-1",
				chairId: "chair-1",
				renderedServices: [
					{
						serviceCode: "A16.07.002",
						name: "Лечение кариеса 36",
						quantity: 1,
						toothNumber: 36,
					},
				],
				warehouseItems: warehouseItems as any,
				allowOverdraft: true,
				includeStandardPpe: false,
				onToast: (msg) => { capturedToast = msg; },
				onOverdraftAlert: (alert) => { capturedAlert = alert; },
			});

			// Even though Chair 2 has 10 units, Chair 1 had 0, so Chair 1 goes into soft overdraft!
			assert.equal(result.hasOverdraft, true, "Chair 1 обязан уйти в овердрафт, не воруя остатки у Chair 2");
			assert.ok(capturedToast.includes("Мягкий овердрафт"));
			assert.ok(capturedToast.includes("Требуется оприходование: материал списан в овердрафт по визиту №В-101"));
			assert.ok(capturedAlert !== null);
			assert.equal(capturedAlert.chairId, "chair-1");
			assert.equal(capturedAlert.cabinetId, "cab-1");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// TEST SUITE 2: FEFO Principle, Batch Sorting & Red Light Quarantine
	// ──────────────────────────────────────────────────────────────────────────
	describe("2. FEFO Traffic Light & Expired Batch Quarantine", () => {
		const refDate = new Date("2026-05-15T10:00:00Z");

		it("formatRuDate корректно форматирует даты в строгий российский формат ДД.ММ.ГГГГ", () => {
			assert.equal(formatRuDate("2026-04-10"), "10.04.2026");
			assert.equal(formatRuDate(new Date(2026, 3, 10)), "10.04.2026");
			assert.equal(formatRuDate(null), "");
			assert.equal(formatRuDate(undefined), "");
		});

		it("isBatchExpired точно определяет просрочку относительно опорной даты", () => {
			assert.equal(isBatchExpired("2026-04-01", refDate), true);
			assert.equal(isBatchExpired("2026-05-14", refDate), true);
			assert.equal(isBatchExpired("2026-05-16", refDate), false);
			assert.equal(isBatchExpired("2026-12-31", refDate), false);
		});

		it("validateBatchForClinicalUse формирует нормативный текст блокировки просроченной партии", () => {
			const expiredBatch = {
				batchNumber: "LOT-2024-EXP",
				expiryDate: "2026-04-20",
				stockQuantity: 15,
			};

			const val = validateBatchForClinicalUse(expiredBatch, refDate);
			assert.equal(val.isAllowed, false);
			assert.equal(val.isExpired, true);
			assert.equal(
				val.alertMessage,
				"Срок годности партии истек 20.04.2026! Партия заблокирована для утилизации",
			);
			assert.equal(val.status, "red");
		});

		it("sortBatchesByFefo сортирует годные партии по возрастанию срока (ближайшие первыми)", () => {
			const batches = [
				{ id: "b3", expiryDate: "2027-01-01" }, // later
				{ id: "b1", expiryDate: "2026-06-01" }, // nearest unexpired
				{ id: "b4", expiryDate: "2026-04-01" }, // expired
				{ id: "b2", expiryDate: "2026-08-01" }, // mid
			];

			const sorted = sortBatchesByFefo(batches, refDate);
			// b1 (June 2026), b2 (August 2026), b3 (Jan 2027), then expired b4
			assert.equal(sorted[0]!.id, "b1");
			assert.equal(sorted[1]!.id, "b2");
			assert.equal(sorted[2]!.id, "b3");
			assert.equal(sorted[3]!.id, "b4");
		});

		it("resolveFefoDeductionBatches изолирует просроченные партии и не списывает их пациенту", () => {
			const batches = [
				{
					id: "batch-exp",
					batchNumber: "LOT-OLD-99",
					expiryDate: "2026-03-01", // Expired!
					stockQuantity: 50,
				},
				{
					id: "batch-good-near",
					batchNumber: "LOT-2026-06",
					expiryDate: "2026-06-15", // Valid, near
					stockQuantity: 2,
				},
				{
					id: "batch-good-far",
					batchNumber: "LOT-2027-01",
					expiryDate: "2027-01-10", // Valid, far
					stockQuantity: 10,
				},
			];

			// Patient needs 5 units
			const res = resolveFefoDeductionBatches(batches, 5, refDate);

			// Expired batch must be in blockedExpiredBatches and NEVER in allocatedBatches
			assert.equal(res.blockedExpiredBatches.length, 1);
			assert.equal(res.blockedExpiredBatches[0]!.batch.batchNumber, "LOT-OLD-99");
			assert.equal(
				res.blockedExpiredBatches[0]!.alertMessage,
				"Срок годности партии истек 01.03.2026! Партия заблокирована для утилизации",
			);

			// Nearest good batch must be allocated first (all 2 units), then far batch (3 units)
			assert.equal(res.allocatedBatches.length, 2);
			assert.equal(res.allocatedBatches[0]!.batch.id, "batch-good-near");
			assert.equal(res.allocatedBatches[0]!.allocatedQuantity, 2);
			assert.equal(res.allocatedBatches[1]!.batch.id, "batch-good-far");
			assert.equal(res.allocatedBatches[1]!.allocatedQuantity, 3);
			assert.equal(res.allocatedTotalQuantity, 5);
			assert.equal(res.remainingDeficit, 0);
			assert.equal(res.hasOverdraft, false);
		});

		it("при наличии ТОЛЬКО просроченной партии блокирует её и переводит в мягкий овердрафт", () => {
			const onlyExpired = [
				{
					id: "batch-only-exp",
					batchNumber: "LOT-EXPIRED-ONLY",
					expiryDate: "2026-01-10",
					stockQuantity: 20,
				},
			];

			const res = resolveFefoDeductionBatches(onlyExpired, 2, refDate);
			assert.equal(res.allocatedBatches.length, 0, "Просроченная партия не должна быть списана!");
			assert.equal(res.blockedExpiredBatches.length, 1);
			assert.equal(res.remainingDeficit, 2);
			assert.equal(res.hasOverdraft, true);
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// TEST SUITE 3: Doctor Autonomy & Soft Overdraft Protection
	// ──────────────────────────────────────────────────────────────────────────
	describe("3. Doctor Autonomy & Soft Overdraft Protection (Mandates 8e, 8n, 8s)", () => {
		it("нулевой остаток никогда не блокирует завершение приёма и заполнение формы 043/у", async () => {
			let alertTriggered = false;
			let alertData: any = null;

			const result = await performAutoVisitBomDeduction({
				visitId: "visit-autonomy-777",
				visitNumber: "777",
				patientId: "pat-99",
				doctorId: "doc-sokolov",
				cabinetId: "cab-chir-1",
				chairId: "chair-1",
				renderedServices: [
					{
						serviceCode: "A11.07.012",
						name: "Анестезия инфильтрационная",
						quantity: 2,
					},
				],
				currentStockMap: {
					"mat-anes-art-100k": 0, // Zero stock!
					"mat-anes-needle-30g": 0,
				},
				allowOverdraft: true,
				includeStandardPpe: false,
				onOverdraftAlert: (data) => {
					alertTriggered = true;
					alertData = data;
				},
			});

			// Treatment completed without crashing
			assert.equal(result.hasOverdraft, true);
			assert.ok(result.items.length > 0);
			assert.ok(result.softOverdrafts.length >= 2);

			// Alert formatted with exact mandated text
			assert.equal(alertTriggered, true);
			assert.equal(alertData.visitNumber, "777");
			assert.equal(
				alertData.message,
				"Требуется оприходование: материал списан в овердрафт по визиту №777",
			);
			assert.equal(alertData.cabinetId, "cab-chir-1");
			assert.equal(alertData.chairId, "chair-1");
			assert.ok(alertData.items.some((i: any) => i.deficitQty > 0));
		});

		it("складской аудит (calculateInventoryAuditTotals) точно считает позиции и объем овердрафта", () => {
			const line1 = computeAuditLineItem({
				itemId: "art-1",
				sku: "ART-01",
				nameRu: "Артикаин",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-A1",
				expiryDate: "2027-01-01",
				bookQuantity: -3, // Negative balance from overdraft
				actualQuantity: 0,
				unitCostKopecks: 12000,
				cabinetId: "cab-1",
				chairId: "chair-1",
			});
			assert.equal(line1.bookQuantity, -3);
			assert.equal(line1.cabinetId, "cab-1");
			assert.equal(line1.chairId, "chair-1");

			const line2 = computeAuditLineItem({
				itemId: "needle-1",
				sku: "NDL-01",
				nameRu: "Иглы 30G",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-N1",
				expiryDate: "2027-01-01",
				bookQuantity: 5,
				actualQuantity: 5,
				unitCostKopecks: 1500,
				cabinetId: "cab-1",
			});
			assert.equal(line2.bookQuantity, 5);

			const totals = calculateInventoryAuditTotals([line1, line2]);
			assert.equal(totals.overdraftItemsCount, 1);
			assert.equal(totals.totalOverdraftQuantity, 3);
		});

		it("quarantineExpiredBatchesFromAudit корректно отделяет просроченные партии от инвентаризации", () => {
			const lineExpired = computeAuditLineItem({
				itemId: "art-exp",
				sku: "ART-EXP",
				nameRu: "Артикаин просроченный",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "B1",
				expiryDate: "2026-01-01",
				bookQuantity: 10,
				actualQuantity: 10,
				unitCostKopecks: 12000,
			}, "2026-06-01");

			const lineValid = computeAuditLineItem({
				itemId: "art-valid",
				sku: "ART-VALID",
				nameRu: "Артикаин годный",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "B2",
				expiryDate: "2027-01-01",
				bookQuantity: 20,
				actualQuantity: 20,
				unitCostKopecks: 12000,
			}, "2026-06-01");

			const res = quarantineExpiredBatchesFromAudit([lineExpired, lineValid]);
			assert.equal(res.validLines.length, 1);
			assert.equal(res.validLines[0]!.batchNumber, "B2");
			assert.equal(res.expiredQuarantineLines.length, 1);
			assert.equal(res.expiredQuarantineLines[0]!.batchNumber, "B1");
			assert.equal(res.totalExpiredQuantity, 10);
			assert.equal(res.totalExpiredCostKopecks, 120000);
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// TEST SUITE 4: SanPiN Class B Carpule Disposal Act & Zero Emojis (Mandate 8d)
	// ──────────────────────────────────────────────────────────────────────────
	describe("4. SanPiN Class B Carpule Disposal Act (СанПиН 2.1.3684-21 / 3.3686-21)", () => {
		it("учитывает бой стеклянных карпул при установке и неполные дозы с дезинфекцией 3% Аламинол", async () => {
			const disposal = await executeShiftCloseClassBWasteDisposal({
				organizationId: "org-dente",
				shiftDate: "2026-05-15",
				accumulatedCarpulesCount: 10,
				brokenCarpulesCount: 2, // 2 разбиты при зарядке
				partiallyUsedCarpulesCount: 1, // 1 частично введена
				accumulatedNeedlesCount: 10,
				accumulatedSharpsCount: 2,
				contaminatedItemsCount: 20,
				customTareKg: 0.15,
				responsibleStaffName: "Иванова М. С.",
				responsibleStaffPosition: "Старшая медицинская сестра",
				cabinetId: "cab-3",
				chairId: "chair-1",
				clinicName: "ООО «ДЕНТЕ» СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА",
			});

			assert.equal(disposal.brokenCarpulesCount, 2);
			assert.equal(disposal.partiallyUsedCarpulesCount, 1);
			assert.equal(disposal.cabinetId, "cab-3");
			assert.equal(disposal.chairId, "chair-1");
			assert.ok(disposal.disinfectionProtocol.includes("3% Аламинол"));

			// Check generated Act HTML
			const html = disposal.actHtml;
			assert.ok(html.includes("Разбитые стеклянные карпулы анестетиков (бой при установке"));
			assert.ok(html.includes("Не полностью израсходованные карпулы анестетика с остатками раствора"));
			assert.ok(html.includes("Химическая дезинфекция 3% Аламинол (замачивание 60 мин)"));
			assert.ok(html.includes("без комиссии из 3 человек"));
			assert.ok(html.includes("Кабинет: cab-3 (Кресло chair-1)"));
		});

		it("СТРОГОЕ СОБЛЮДЕНИЕ МАНДАТА 8d: ноль эмодзи в сгенерированном акте утилизации", () => {
			const html = formatShiftCloseClassBWasteActHtml(
				"АКТ-Б-999",
				"15.05.2026 20:00",
				"PLOMBA-7711",
				"BAR-CLASSB-999",
				15,
				15,
				3,
				0.85,
				0.15,
				0.7,
				"Петрова А. В.",
				"Медицинская сестра",
				"ООО «ДЕНТЕ»",
				{
					brokenCarpulesCount: 3,
					partiallyUsedCarpulesCount: 2,
					cabinetId: "Кабинет №1",
					chairId: "Кресло A",
				},
			);

			// Must not contain any cartoon emojis
			assert.equal(
				FORBIDDEN_EMOJI_REGEX.test(html),
				false,
				"Акт утилизации отходов Класса Б не должен содержать ни одного эмодзи (Mandate 8d)!",
			);
		});

		it("СТРОГОЕ СОБЛЮДЕНИЕ МАНДАТА 8d: ноль эмодзи в системных предупреждениях и FEFO-метках", () => {
			const expiredBatch = {
				batchNumber: "LOT-ZERO-EMOJI",
				expiryDate: "2026-01-01",
				stockQuantity: 10,
			};
			const val = validateBatchForClinicalUse(expiredBatch, new Date("2026-05-01"));

			assert.equal(
				FORBIDDEN_EMOJI_REGEX.test(val.alertMessage || ""),
				false,
				"Предупреждение о просрочке не должно содержать эмодзи!",
			);

			const traffic = getFefoTrafficLight("2026-01-01", new Date("2026-05-01"));
			assert.equal(
				FORBIDDEN_EMOJI_REGEX.test(traffic.label),
				false,
				"Метка светофора FEFO не должна содержать эмодзи!",
			);
			assert.equal(
				FORBIDDEN_EMOJI_REGEX.test(traffic.badgeText),
				false,
				"Текст бейджа FEFO не должен содержать эмодзи!",
			);
		});
	});
});
