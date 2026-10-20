/**
 * apps/web/src/components/settings/__tests__/deepClinicalMigrationAndAudit.test.ts
 *
 * Unit tests for:
 * 1. Deep Clinical Settings: anesthetic dosage calculation and ICD-10 protocol templates.
 * 2. Migration Wizard: CSV/TSV parser, +7 phone normalization, auto-column mapping, and deduplication.
 * 3. Settings Audit Tab: staff audit row normalization, diff comparison, and multi-criteria filtering.
 */

import { describe, expect, it } from "vitest";
import {
	DEFAULT_ICD10_PROTOCOL_TEMPLATES,
	calculateMaxArticaineCarpules,
} from "../deepClinicalModules/deepClinicalTypes";
import {
	autoDetectColumnMappings,
	buildMigrationPreviewAndDeduplication,
	normalizeRussianPhone,
	parseCsvOrTsvText,
} from "../migrationModules/migrationWizardTypes";
import {
	filterStaffAuditRows,
	normalizeAuditRow,
} from "../auditModules/AuditLogFilterBar";

describe("Deep Clinical Settings Modules", () => {
	it("calculates safe articaine carpules for standard adult without cardiovascular risks", () => {
		const result = calculateMaxArticaineCarpules(70, false);
		expect(result.maxCarpules).toBe(7);
		expect(result.maxDoseMg).toBe(490);
		expect(result.recommendedDilution).toBe("1:100000");
	});

	it("strictly limits articaine carpules for patients with cardiovascular risks", () => {
		const result = calculateMaxArticaineCarpules(70, true);
		expect(result.maxCarpules).toBe(2);
		expect(result.maxDoseMg).toBe(136);
		expect(result.recommendedDilution).toBe("1:200000");
	});

	it("provides valid ICD-10 templates with warranty periods and physiological norm snippets", () => {
		expect(DEFAULT_ICD10_PROTOCOL_TEMPLATES.length).toBeGreaterThanOrEqual(4);
		const caries = DEFAULT_ICD10_PROTOCOL_TEMPLATES.find((t) => t.code === "K02.1");
		expect(caries).toBeDefined();
		expect(caries?.diagnosisTitle).toContain("Кариес");
		expect(caries?.physiologicalNormSnippet).toBeTruthy();
		expect(caries?.defaultWarrantyMonths).toBe(12);
	});
});

describe("Migration Wizard Parsing & Deduplication Modules", () => {
	it("normalizes Russian phone numbers in various formats to standard +7XXXXXXXXXX", () => {
		expect(normalizeRussianPhone("8 (999) 123-45-67")).toEqual({
			normalized: "+79991234567",
			formatted: "+7 (999) 123-45-67",
			valid: true,
		});

		expect(normalizeRussianPhone("+7 916 555 44 33")).toEqual({
			normalized: "+79165554433",
			formatted: "+7 (916) 555-44-33",
			valid: true,
		});

		expect(normalizeRussianPhone("9031112233")).toEqual({
			normalized: "+79031112233",
			formatted: "+7 (903) 111-22-33",
			valid: true,
		});

		expect(normalizeRussianPhone("12345")).toEqual({
			normalized: "+12345",
			formatted: "12345",
			valid: false,
		});
	});

	it("honestly parses CSV and TSV text with auto-detected delimiters and stripped BOM", () => {
		const csvData = `\uFEFFФИО;Телефон;Баланс;Последний визит
Иванов Иван Иванович;+7 (999) 111-22-33;1500;2026-03-15
Петров Петр Петрович;8 (916) 222-33-44;-500;2026-04-01`;

		const parsed = parseCsvOrTsvText(csvData);
		expect(parsed.delimiter).toBe(";");
		expect(parsed.headers).toEqual(["ФИО", "Телефон", "Баланс", "Последний визит"]);
		expect(parsed.rows.length).toBe(2);
		expect(parsed.rows[0]?.[0]).toBe("Иванов Иван Иванович");
		expect(parsed.rows[1]?.[2]).toBe("-500");

		const tsvData = "Name\tPhone\tNote\nSmirnov\t+79001234567\tAllergy";
		const parsedTsv = parseCsvOrTsvText(tsvData);
		expect(parsedTsv.delimiter).toBe("\t");
		expect(parsedTsv.headers).toEqual(["Name", "Phone", "Note"]);
		expect(parsedTsv.rows.length).toBe(1);
	});

	it("automatically detects column targets based on Russian and English keywords", () => {
		const headers = ["ФИО Пациента", "Мобильный телефон", "Текущий баланс", "Дата последнего приема", "Аллергии"];
		const mapping = autoDetectColumnMappings(headers);

		expect(mapping["ФИО Пациента"]).toBe("fullName");
		expect(mapping["Мобильный телефон"]).toBe("phone");
		expect(mapping["Текущий баланс"]).toBe("balance");
		expect(mapping["Дата последнего приема"]).toBe("lastVisitDate");
		expect(mapping["Аллергии"]).toBe("notes");
	});

	it("detects phone duplicates and calculates deduplication report accurately", () => {
		const headers = ["ФИО", "Телефон", "Баланс"];
		const mapping = autoDetectColumnMappings(headers);
		const rows = [
			["Сидорова Анна", "+7 (999) 111-22-33", "2000"],
			["Сидорова А. В.", "8 (999) 111-22-33", "500"], // duplicate phone
			["Козлов Игорь", "+7 (905) 999-88-77", "-1500"], // debt
			["", "+7 (911) 222-33-44", "0"], // invalid no name
		];

		const result = buildMigrationPreviewAndDeduplication(rows, headers, mapping);
		expect(result.records.length).toBe(4);
		expect(result.report.totalRows).toBe(4);
		expect(result.report.readyCount).toBe(2);
		expect(result.report.duplicateCount).toBe(1);
		expect(result.report.invalidCount).toBe(1);
		expect(result.report.totalPositiveBalanceRub).toBe(2000);
		expect(result.report.totalDebtBalanceRub).toBe(1500);

		expect(result.records[1]?.isDuplicatePhone).toBe(true);
		expect(result.records[1]?.duplicateOfRowIndex).toBe(1);
		expect(result.records[3]?.validationStatus).toBe("invalid");
	});
});

describe("Audit Journal Filtering & Normalization Modules", () => {
	const rawRecords = [
		{
			id: "evt-1",
			actionType: "appointment_delete",
			actorName: "Доктор Смирнов",
			actorRole: "doctor",
			createdAt: "2026-10-10T10:00:00Z",
			details: {
				reason: "Пациент отказался от приёма",
				ipAddress: "192.168.1.101",
				oldState: { appointmentId: "app-100", status: "booked" },
				newState: { appointmentId: "app-100", status: "deleted" },
			},
		},
		{
			id: "evt-2",
			actionType: "discount_apply",
			actorName: "Администратор Елена",
			actorRole: "admin",
			createdAt: "2026-10-10T11:00:00Z",
			details: {
				discountPercent: 15,
				amountKopecks: 450000,
				reason: "Скидка пенсионеру",
			},
		},
		{
			id: "evt-3",
			actionType: "payment_refund",
			actorName: "Кассир Ольга",
			actorRole: "cashier",
			createdAt: "2026-10-10T12:00:00Z",
			details: {
				amountKopecks: 1200000,
				reason: "Возврат чека по эквайрингу",
			},
		},
	];

	it("normalizes raw audit events into structured StaffAuditRow format with diffs", () => {
		const normalized = rawRecords.map(normalizeAuditRow);
		expect(normalized[0]?.actionType).toBe("appointment_delete");
		expect(normalized[0]?.actorName).toBe("Доктор Смирнов");
		expect(normalized[0]?.ipAddress).toBe("192.168.1.101");
		expect(normalized[0]?.oldState).toEqual({ appointmentId: "app-100", status: "booked" });
		expect(normalized[0]?.newState).toEqual({ appointmentId: "app-100", status: "deleted" });

		expect(normalized[1]?.discountPercent).toBe(15);
		expect(normalized[2]?.amountKopecks).toBe(1200000);
	});

	it("filters audit rows by operation type and search query correctly", () => {
		const rows = rawRecords.map(normalizeAuditRow);

		// Filter by operation type: appointment_delete
		const deleteOps = filterStaffAuditRows(rows, {
			searchQuery: "",
			actionCategory: "all",
			operationFilter: "appointment_delete",
		});
		expect(deleteOps.length).toBe(1);
		expect(deleteOps[0]?.id).toBe("evt-1");

		// Filter by search query
		const searchRefund = filterStaffAuditRows(rows, {
			searchQuery: "эквайринг",
			actionCategory: "all",
		});
		expect(searchRefund.length).toBe(1);
		expect(searchRefund[0]?.id).toBe("evt-3");

		// Filter by actor
		const adminOps = filterStaffAuditRows(rows, {
			searchQuery: "",
			actionCategory: "all",
			actorFilter: "Администратор Елена",
		});
		expect(adminOps.length).toBe(1);
		expect(adminOps[0]?.id).toBe("evt-2");
	});
});
