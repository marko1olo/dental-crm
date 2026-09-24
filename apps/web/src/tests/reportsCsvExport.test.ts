import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	safeDivide,
	safePercentWidth,
	escapeCsvField,
	formatCsvRow,
	buildRfc4180Csv,
	generateManagerReportsCsv,
} from "../components/reports/reportsCsvExport.js";

describe("reportsCsvExport — RFC 4180 CSV Engine & Safe Division (Mandates 8d, 8e, 8n)", () => {
	it("safeDivide guarantees 0 occurrences of division by zero", () => {
		// Valid cases
		assert.strictEqual(safeDivide(100, 20), 5);
		assert.strictEqual(safeDivide(0, 100), 0);
		assert.strictEqual(safeDivide(7, 2), 3.5);

		// Division by zero
		assert.strictEqual(safeDivide(100, 0), null);
		assert.strictEqual(safeDivide(0, 0), null);
		assert.strictEqual(safeDivide(100, 0, 0), 0);

		// Null and undefined
		assert.strictEqual(safeDivide(null, 10), null);
		assert.strictEqual(safeDivide(10, null), null);
		assert.strictEqual(safeDivide(undefined, undefined), null);

		// Non-finite
		assert.strictEqual(safeDivide(NaN, 10), null);
		assert.strictEqual(safeDivide(10, Infinity), null);
		assert.strictEqual(safeDivide(Infinity, 10), null);
	});

	it("safePercentWidth produces valid integer percentages bounded by min/max", () => {
		assert.strictEqual(safePercentWidth(50, 100), 50);
		assert.strictEqual(safePercentWidth(1, 1000), 2); // clamped to minPercent 2
		assert.strictEqual(safePercentWidth(200, 100), 100); // clamped to maxPercent 100

		// Zero total or value
		assert.strictEqual(safePercentWidth(0, 100), 2);
		assert.strictEqual(safePercentWidth(100, 0), 2);
		assert.strictEqual(safePercentWidth(null, 100), 2);
		assert.strictEqual(safePercentWidth(100, undefined), 2);
	});

	it("escapeCsvField follows RFC 4180 escaping rules", () => {
		assert.strictEqual(escapeCsvField("простой текст"), "простой текст");
		assert.strictEqual(escapeCsvField(123), "123");
		assert.strictEqual(escapeCsvField(null), "");
		assert.strictEqual(escapeCsvField(undefined), "");

		// Field with quotes
		assert.strictEqual(escapeCsvField('ООО "Клиника"'), '"ООО ""Клиника"""');

		// Field with commas and semicolons
		assert.strictEqual(escapeCsvField("Иванов, Иван"), '"Иванов, Иван"');
		assert.strictEqual(escapeCsvField("Терапия; Хирургия"), '"Терапия; Хирургия"');

		// Field with CRLF
		assert.strictEqual(escapeCsvField("Строка 1\nСтрока 2"), '"Строка 1\nСтрока 2"');
	});

	it("buildRfc4180Csv prepends UTF-8 BOM and separates rows with CRLF", () => {
		const rows = [
			["ID", "Название", "Цена"],
			[1, 'Коронка "Цирконий"', 15000],
			[2, "Удаление зуба", 2500],
		];
		const csv = buildRfc4180Csv(rows, ";");

		// Starts with UTF-8 BOM \uFEFF
		assert.ok(csv.startsWith("\uFEFF"), "Starts with UTF-8 BOM for Windows Excel");

		// Uses CRLF \r\n
		assert.ok(csv.includes("\r\n"), "Uses RFC 4180 CRLF line terminators");
		assert.ok(!csv.includes("\r\r"), "No duplicate CR");

		// Contains escaped quote
		assert.ok(csv.includes('""Цирконий""'), "Properly doubles internal quotes");
	});

	it("generateManagerReportsCsv generates full multi-section report without throwing on empty data", () => {
		const emptyCsv = generateManagerReportsCsv({
			period: { from: "2026-07-01", to: "2026-07-31" },
			summary: null,
			services: null,
			receivables: null,
			scheduleLoad: null,
		});

		assert.ok(emptyCsv.startsWith("\uFEFF"), "Has BOM");
		assert.ok(emptyCsv.includes("ОТЧЁТ РУКОВОДИТЕЛЯ КЛИНИКИ"), "Header is present");
		assert.ok(emptyCsv.includes("2026-07-01 — 2026-07-31"), "Period is present");
	});

	it("generateManagerReportsCsv includes revenue, doctors, services, and receivables", () => {
		const csv = generateManagerReportsCsv({
			period: { from: "2026-07-01", to: "2026-07-31" },
			summary: {
				period: { from: "2026-07-01", to: "2026-07-31" },
				revenue: {
					granularity: "day",
					points: [
						{
							bucket: "2026-07-01",
							revenueRub: 50000,
							paymentCount: 5,
							payingPatients: 4,
						},
					],
					totalRub: 50000,
					isEmpty: false,
				},
				doctors: {
					rows: [
						{
							doctorUserId: "doc-1",
							doctorName: "Д-р Смирнов А.В.",
							revenueRub: 50000,
							appointmentsTotal: 5,
							appointmentsCompleted: 4,
							appointmentsCancelled: 1,
							appointmentsNoShow: 0,
							completionRate: 0.8,
							noShowRate: 0,
							averageTicketRub: 12500,
							marginRub: null,
						},
					],
					unattributedRevenueRub: 0,
					attributionNote: "",
					isEmpty: false,
				},
				chairs: {
					rows: [],
					basis: { workingDays: 20, minutesPerDay: 480, totalMinutesPerChair: 9600, note: "" },
					isEmpty: true,
				},
				appointments: {
					byStatus: { completed: 4, cancelled: 1 },
					total: 5,
					arrivalRate: 0.8,
					completionRate: 0.8,
					cancellationRate: 0.2,
					noShowRate: 0,
					lostAppointments: 1,
					isEmpty: false,
				},
				reminderEffect: {
					reminded: { appointments: 5, completed: 4, cancelled: 1, noShow: 0, lost: 1, lostRate: 0.2 },
					notReminded: { appointments: 0, completed: 0, cancelled: 0, noShow: 0, lost: 0, lostRate: null },
					lostRateDifference: null,
					caveat: "",
					smallestGroupSize: 0,
					enoughData: false,
					isEmpty: true,
				},
				patientFlow: {
					points: [],
					newTotal: 2,
					returningTotal: 2,
				},
				receivables: {
					totalDebtRub: 15000,
					byBucket: { current: 15000 },
					debtors: 1,
					totalPrepaidRub: 5000,
					prepayments: [
						{ patientId: "pat-2", patientName: "Петров П.П.", prepaidRub: 5000 },
					],
				},
				isEmpty: false,
			},
			services: {
				rows: [
					{
						title: "Профессиональная гигиена",
						quantity: 3,
						plannedRub: 15000,
						averagePriceRub: 5000,
						discountRub: 0,
					},
				],
				plannedTotalRub: 15000,
				discountTotalRub: 0,
				note: "",
				isEmpty: false,
			},
			receivables: {
				rows: [
					{
						patientId: "pat-1",
						patientName: "Сидоров С.С.",
						debtRub: 15000,
						oldestChargeAt: "2026-07-15",
						bucket: "до 30 дней",
					},
				],
				totalDebtRub: 15000,
				byBucket: { current: 15000 },
				prepayments: [
					{ patientId: "pat-2", patientName: "Петров П.П.", prepaidRub: 5000 },
				],
				totalPrepaidRub: 5000,
				note: "",
				isEmpty: false,
			},
			scheduleLoad: {
				cells: [],
				busiestWeekday: null,
				busiestHour: null,
				isEmpty: true,
			},
		});

		assert.ok(csv.includes("Д-р Смирнов А.В."), "Contains doctor name");
		assert.ok(csv.includes("Профессиональная гигиена"), "Contains service title");
		assert.ok(csv.includes("Сидоров С.С."), "Contains debtor name");
		assert.ok(csv.includes("Петров П.П."), "Contains prepaying patient name");
		assert.ok(csv.includes("50000"), "Contains revenue amount");
	});
});
