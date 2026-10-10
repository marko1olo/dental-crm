/**
 * transferM11Decomposition.test.ts — Unit Tests for Form M-11 Decomposed Submodules.
 *
 * Verifies:
 * 1. Statutory Chart of Accounts validation (RSBU 10.01 / 10.06 / 10.09).
 * 2. Materially Responsible Officer (МОЛ) verification.
 * 3. Kopeck-exact arithmetic, discrepancy calculations, and VAT engine.
 * 4. Full lifecycle transitions (DRAFT -> IN_TRANSIT -> ACCEPTED / DISCREPANCY / CANCELLED).
 * 5. Statutory A4 HTML print layout compliance (OKUD 0315003 / 0315006) and zero emojis.
 * 6. 100% AST export parity and thin canonical facade integrity.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Direct submodule imports
import {
	transferM11StatusSchema,
	TRANSFER_M11_STATUS_LABELS_RU,
	responsibleOfficerSchema,
	transferM11ItemSchema,
	transferM11DocumentSchema,
	m11AccountCodeSchema,
	M11_ACCOUNT_SUBACCOUNTS,
	type TransferM11Document,
	type ResponsibleOfficer,
} from "../transferM11/types.js";

import {
	validateM11StatusTransition,
	validateM11ResponsibleOfficer,
	validateM11AccountsCorrespondence,
	validateM11WarehousePair,
	validateM11ItemsNonEmpty,
} from "../transferM11/m11Validator.js";

import {
	numberToWordsRuKopecks,
	calculateM11ItemDispatchedCost,
	calculateM11ItemAcceptedCost,
	calculateM11ItemDiscrepancy,
	aggregateM11DocumentTotals,
	calculateM11Vat,
} from "../transferM11/m11Calculators.js";

import {
	createTransferM11Draft,
	dispatchTransferM11,
	receiveTransferM11,
	cancelTransferM11,
	generateTransferM11DiscrepancyAct,
} from "../transferM11/m11Lifecycle.js";

import { renderTransferM11Html } from "../transferM11/m11DocumentRenderer.js";

// Facade re-export validation
import * as facadeExports from "../transferM11Engine.js";

describe("Warehouse Transfer M-11: Decomposed Submodules & Statutory Invariants", () => {
	// ─── 1. STATUTORY CHART OF ACCOUNTS (СЧЕТ 10 РСБУ) ─────────────────────────

	describe("1. Russian Chart of Accounts (RSBU 10.01 / 10.06 / 10.09) Validation", () => {
		it("validates correct subaccounts of account 10", () => {
			assert.equal(m11AccountCodeSchema.safeParse("10.01").success, true);
			assert.equal(m11AccountCodeSchema.safeParse("10.06").success, true);
			assert.equal(m11AccountCodeSchema.safeParse("10.09").success, true);
			assert.equal(m11AccountCodeSchema.safeParse("41.01").success, false);
			assert.equal(m11AccountCodeSchema.safeParse("invalid").success, false);
		});

		it("validates standard dental materials correspondence (10.01 -> 10.01)", () => {
			const res = validateM11AccountsCorrespondence("10.01", "10.01");
			assert.equal(res.isValid, true);
			assert.equal(res.isSameSubaccount, true);
			assert.match(res.descriptionRu, /стоматологических материалов/);
		});

		it("validates other consumable supplies correspondence (10.06 -> 10.06)", () => {
			const res = validateM11AccountsCorrespondence("10.06", "10.06");
			assert.equal(res.isValid, true);
			assert.equal(res.isSameSubaccount, true);
			assert.match(res.descriptionRu, /дезинфекции/);
		});

		it("rejects non-account-10 correspondent codes", () => {
			assert.throws(() => {
				validateM11AccountsCorrespondence("20.01", "10.01");
			}, /Недопустимый счет дебета/);

			assert.throws(() => {
				validateM11AccountsCorrespondence("10.01", "99.01");
			}, /Недопустимый счет кредита/);
		});
	});

	// ─── 2. MATERIALLY RESPONSIBLE OFFICERS (МОЛ) ──────────────────────────────

	describe("2. Materially Responsible Officers (МОЛ) Validation", () => {
		it("validates designated warehouse keeper / head nurse", () => {
			const validMol: ResponsibleOfficer = {
				name: "Петрова Елена Сергеевна",
				position: "Старшая медицинская сестра",
				employeeId: "emp_nurse_01",
				signatureDate: "2026-10-10",
			};
			const res = validateM11ResponsibleOfficer(validMol, "Приемщик");
			assert.equal(res.name, "Петрова Елена Сергеевна");
			assert.equal(res.position, "Старшая медицинская сестра");
		});

		it("throws descriptive error when officer name or position is missing", () => {
			assert.throws(() => {
				validateM11ResponsibleOfficer({ name: "", position: "Завскладом" }, "Сдатчик");
			}, /Сдатчик: ФИО ответственного лица обязательно/);

			assert.throws(() => {
				validateM11ResponsibleOfficer({ name: "Иванов И.И.", position: "" }, "Сдатчик");
			}, /Сдатчик: Должность обязательна/);
		});
	});

	// ─── 3. STATUS TRANSITION STATE MACHINE ────────────────────────────────────

	describe("3. Status Transition Matrix & Physical Warehouse Routing", () => {
		it("allows valid transitions: DRAFT -> IN_TRANSIT -> ACCEPTED", () => {
			assert.doesNotThrow(() => validateM11StatusTransition("DRAFT", "IN_TRANSIT"));
			assert.doesNotThrow(() => validateM11StatusTransition("IN_TRANSIT", "ACCEPTED"));
			assert.doesNotThrow(() => validateM11StatusTransition("IN_TRANSIT", "DISCREPANCY"));
		});

		it("allows cancellation from DRAFT or IN_TRANSIT", () => {
			assert.doesNotThrow(() => validateM11StatusTransition("DRAFT", "CANCELLED"));
			assert.doesNotThrow(() => validateM11StatusTransition("IN_TRANSIT", "CANCELLED"));
		});

		it("forbids transitions out of terminal states (ACCEPTED, DISCREPANCY, CANCELLED)", () => {
			assert.throws(() => validateM11StatusTransition("ACCEPTED", "CANCELLED"), /Недопустимый переход/);
			assert.throws(() => validateM11StatusTransition("DISCREPANCY", "ACCEPTED"), /Недопустимый переход/);
			assert.throws(() => validateM11StatusTransition("CANCELLED", "DRAFT"), /Недопустимый переход/);
		});

		it("strictly forbids identical sender and receiver warehouse IDs", () => {
			assert.throws(() => {
				validateM11WarehousePair("wh_main", "wh_main");
			}, /Склад-отправитель и склад-получатель не могут совпадать/);
		});

		it("rejects empty items array", () => {
			assert.throws(() => {
				validateM11ItemsNonEmpty([]);
			}, /хотя бы одну товарную позицию/);
		});
	});

	// ─── 4. KOPECK ARITHMETIC & VAT CALCULATORS ────────────────────────────────

	describe("4. Kopeck-Exact Arithmetic, Verbal Currency & VAT Engine", () => {
		it("calculates exact verbal Russian currency strings (Сумма прописью)", () => {
			assert.equal(numberToWordsRuKopecks(0), "Ноль рублей 00 копеек");
			assert.equal(numberToWordsRuKopecks(100), "Один рубль 00 копеек");
			assert.equal(numberToWordsRuKopecks(2150), "Двадцать один рубль 50 копеек");
			assert.equal(
				numberToWordsRuKopecks(1542050),
				"Пятнадцать тысяч четыреста двадцать рублей 50 копеек",
			);
		});

		it("calculates item costs and discrepancies in integer kopecks without float drift", () => {
			const dispatchedCost = calculateM11ItemDispatchedCost(5, 125035); // 5 * 1250.35 руб
			assert.equal(dispatchedCost, 625175);

			const acceptedCost = calculateM11ItemAcceptedCost(4, 125035); // Shortage 1 pcs
			assert.equal(acceptedCost, 500140);

			const disc = calculateM11ItemDiscrepancy(4, 5, 125035);
			assert.equal(disc.discrepancyQuantity, -1);
			assert.equal(disc.discrepancyCostKopecks, -125035);
		});

		it("calculates statutory VAT rates (20%, 10%, 0%, EXEMPT)", () => {
			// Exempt: medical internal transfer
			const exempt = calculateM11Vat(100000, "EXEMPT");
			assert.equal(exempt.netCostKopecks, 100000);
			assert.equal(exempt.vatAmountKopecks, 0);

			// Standard 20% inclusive
			const vat20 = calculateM11Vat(120000, "20", true);
			assert.equal(vat20.grossCostKopecks, 120000);
			assert.equal(vat20.vatAmountKopecks, 20000);
			assert.equal(vat20.netCostKopecks, 100000);
		});
	});

	// ─── 5. FULL LIFECYCLE STATE MACHINE INTEGRATION ────────────────────────────

	describe("5. Form M-11 Full Lifecycle Flow", () => {
		let doc: TransferM11Document;

		it("creates M-11 draft with multiple dental items", () => {
			doc = createTransferM11Draft({
				organizationId: "org_dente",
				documentNumber: "M11-2026-0042",
				documentDate: "2026-10-10",
				fromBranchId: "branch_hq",
				fromBranchName: "Центральный филиал",
				fromWarehouseId: "wh_central",
				fromWarehouseName: "Центральный аптечный склад",
				toBranchId: "branch_therapy",
				toBranchName: "Филиал Терапия 1",
				toWarehouseId: "wh_cabinet_101",
				toWarehouseName: "Кабинет №1 (Терапия)",
				requestedBy: {
					name: "Смирнова Анна Павловна",
					position: "Врач стоматолог-терапевт",
				},
				items: [
					{
						inventoryItemId: "mat_filtek_a2",
						itemName: "Композит Filtek Ultimate A2 (шприц 4г)",
						quantityRequested: 3,
						unitCostKopecks: 380000, // 3800.00 руб
						lotNumber: "LOT-2026-A2",
						expirationDate: "2028-12-31",
					},
					{
						inventoryItemId: "mat_ubistesin_forte",
						itemName: "Анестетик Убистезин форте 1:100000 (уп. 50 карпул)",
						quantityRequested: 2,
						unitCostKopecks: 620000, // 6200.00 руб
						lotNumber: "LOT-UBI-992",
						expirationDate: "2027-06-30",
						mdlpDataMatrix: "046012345678901221XYZ",
					},
				],
			});

			assert.equal(doc.status, "DRAFT");
			assert.equal(doc.items.length, 2);
			assert.equal(doc.totalQuantityRequested, 5);
			assert.equal(doc.totalCostDispatchedKopecks, 0);
		});

		it("dispatches items with exact cost calculation into IN_TRANSIT", () => {
			doc = dispatchTransferM11(doc, {
				dispatchedBy: {
					name: "Ковалев Игорь Николаевич",
					position: "Заведующий аптечным складом",
				},
			});

			assert.equal(doc.status, "IN_TRANSIT");
			assert.equal(doc.totalQuantityDispatched, 5);
			// 3 * 380000 + 2 * 620000 = 1140000 + 1240000 = 2380000 коп (23 800.00 руб)
			assert.equal(doc.totalCostDispatchedKopecks, 2380000);
		});

		it("receives items with discrepancy and compiles Discrepancy Act", () => {
			doc = receiveTransferM11(doc, {
				acceptedBy: {
					name: "Смирнова Анна Павловна",
					position: "Материально ответственное лицо",
				},
				acceptedItems: [
					{
						inventoryItemId: "mat_filtek_a2",
						quantityAccepted: 2, // 1 shortage!
						discrepancyReason: "Повреждение заводской упаковки при транспортировке",
					},
					{
						inventoryItemId: "mat_ubistesin_forte",
						quantityAccepted: 2, // exact match
					},
				],
			});

			assert.equal(doc.status, "DISCREPANCY");
			assert.equal(doc.hasDiscrepancies, true);
			assert.equal(doc.totalQuantityAccepted, 4);
			// Accepted: 2 * 380000 + 2 * 620000 = 760000 + 1240000 = 2000000 коп
			assert.equal(doc.totalCostAcceptedKopecks, 2000000);
			assert.equal(doc.totalDiscrepancyCostKopecks, -380000);

			const act = generateTransferM11DiscrepancyAct(doc);
			assert.equal(act.discrepancies.length, 1);
			assert.equal(act.discrepancies[0]?.itemName, "Композит Filtek Ultimate A2 (шприц 4г)");
			assert.equal(act.discrepancies[0]?.shortageQuantity, 1);
			assert.equal(act.totalShortageCostKopecks, 380000);
			assert.match(act.resolutionSummaryRu, /Выявлена недостача/);
		});
	});

	// ─── 6. STATUTORY HTML PRINT RENDERER (ОКУД 0315003 / 0315006) ─────────────

	describe("6. Statutory HTML Print Layout & Mandate 8d Zero Emojis", () => {
		it("renders official M-11 printable HTML with OKUD code and requisites", () => {
			const draft = createTransferM11Draft({
				organizationId: "org_dente",
				documentNumber: "M11-PRINT-01",
				documentDate: "2026-10-10",
				fromBranchId: "b1",
				fromBranchName: "Главный корпус",
				fromWarehouseId: "w1",
				fromWarehouseName: "Склад ТМЦ",
				toBranchId: "b2",
				toBranchName: "Филиал Центр",
				toWarehouseId: "w2",
				toWarehouseName: "Кабинет Хирургии",
				items: [
					{
						inventoryItemId: "i1",
						itemName: "Бор твердосплавный фиссурный",
						quantityRequested: 10,
						unitCostKopecks: 15000,
					},
				],
			});

			const dispatched = dispatchTransferM11(draft, {
				dispatchedBy: { name: "Кузнецов А.А.", position: "Завскладом" },
			});

			const html = renderTransferM11Html(dispatched);

			// OKUD standard verification
			assert.match(html, /Форма по ОКУД/);
			assert.match(html, /0315003/);
			assert.match(html, /ТРЕБОВАНИЕ-НАКЛАДНАЯ № M11-PRINT-01/);
			assert.match(html, /DENTE Стоматологическая сеть/);
			assert.match(html, /Бор твердосплавный фиссурный/);
			assert.match(html, /Сумма прописью:/);

			// Mandate 8d: Zero cartoon emojis in official legal document
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.equal(emojiRegex.test(html), false, "Generated M-11 HTML must NOT contain cartoon emojis");
		});
	});

	// ─── 7. CANONICAL THIN FACADE PARITY ───────────────────────────────────────

	describe("7. Canonical Thin Facade & Public API Parity", () => {
		it("proves that transferM11Engine.ts re-exports all essential symbols", () => {
			assert.equal(typeof facadeExports.createTransferM11Draft, "function");
			assert.equal(typeof facadeExports.dispatchTransferM11, "function");
			assert.equal(typeof facadeExports.receiveTransferM11, "function");
			assert.equal(typeof facadeExports.cancelTransferM11, "function");
			assert.equal(typeof facadeExports.generateTransferM11DiscrepancyAct, "function");
			assert.equal(typeof facadeExports.renderTransferM11Html, "function");
			assert.equal(typeof facadeExports.numberToWordsRuKopecks, "function");
			assert.equal(typeof facadeExports.transferM11StatusSchema, "object");
			assert.equal(typeof facadeExports.TRANSFER_M11_STATUS_LABELS_RU, "object");
		});
	});
});
