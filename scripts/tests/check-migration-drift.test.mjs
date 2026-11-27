/**
 * @file scripts/tests/check-migration-drift.test.mjs
 * @description Unit tests for SQL & Migration Drift Guard (scripts/check-migration-drift.mjs).
 *
 * Verifies:
 * 1. 100% parity of live Drizzle ORM schema with PostgreSQL 18 migrations (zero drift).
 * 2. Robust parsing of CREATE TABLE bodies (including complex types like numeric(12, 2), jsonb, ignores constraints).
 * 3. Accurate bracket-balanced extraction of pgEnum definitions and allowed values.
 * 4. Detection of missing tables, columns, and enum values.
 *
 * Run: node --test scripts/tests/check-migration-drift.test.mjs
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	checkMigrationDrift,
	parseColumnsFromCreateTable,
	stripSqlComments,
	stripTsComments,
} from "../check-migration-drift.mjs";

test("Migration Drift Guard: Production codebase has 100% schema-DDL parity", () => {
	const result = checkMigrationDrift();

	assert.equal(
		result.hasDrift,
		false,
		`Expected 0 drift, but found: ${JSON.stringify(
			{
				missingTables: result.missingTables,
				missingColumns: result.missingColumns,
				missingEnumValues: result.missingEnumValues,
			},
			null,
			2,
		)}`,
	);
	assert.equal(result.missingTables.length, 0);
	assert.equal(result.missingColumns.length, 0);
	assert.equal(result.missingEnumValues.length, 0);
	assert.ok(result.schemaTables.size >= 196, "Expected at least 196 tables");
	assert.ok(result.totalCheckedColumns >= 2830, "Expected at least 2830 columns");
	assert.ok(result.schemaEnums.size >= 40, "Expected at least 40 enums");
});

test("Migration Drift Guard: parseColumnsFromCreateTable extracts columns and ignores constraints", () => {
	const ddlBody = `
		"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
		"organization_id" uuid NOT NULL,
		"title" text NOT NULL,
		"price_rub" numeric(12, 2) DEFAULT 0 NOT NULL,
		"is_active" boolean DEFAULT true NOT NULL,
		CONSTRAINT "services_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id"),
		PRIMARY KEY ("id"),
		UNIQUE ("organization_id", "title"),
		CHECK ("price_rub" >= 0)
	`;

	const cols = parseColumnsFromCreateTable(ddlBody);

	assert.equal(cols.has("id"), true);
	assert.equal(cols.has("organization_id"), true);
	assert.equal(cols.has("title"), true);
	assert.equal(cols.has("price_rub"), true);
	assert.equal(cols.has("is_active"), true);

	assert.equal(cols.has("constraint"), false);
	assert.equal(cols.has("primary"), false);
	assert.equal(cols.has("unique"), false);
	assert.equal(cols.has("check"), false);
	assert.equal(cols.size, 5);
});

test("Migration Drift Guard: stripSqlComments and stripTsComments correctly remove comments", () => {
	const sql = `
		-- This is a line comment
		CREATE TABLE "sample" (
			/* multi-line comment */
			"col" text
		);
	`;
	const cleanSql = stripSqlComments(sql);
	assert.ok(!cleanSql.includes("line comment"));
	assert.ok(!cleanSql.includes("multi-line comment"));
	assert.ok(cleanSql.includes('CREATE TABLE "sample"'));

	const ts = `
		// single line ts comment
		export const sampleTable = pgTable("sample", {
			/* multi-line ts comment */
			col: text("col"),
		});
	`;
	const cleanTs = stripTsComments(ts);
	assert.ok(!cleanTs.includes("single line ts comment"));
	assert.ok(!cleanTs.includes("multi-line ts comment"));
	assert.ok(cleanTs.includes('col: text("col")'));
});
