/**
 * wave117DocumentTitlesPurification.test.ts
 * Tests for Wave 117 Document Titles Purification (Mandates 8a–8q, 8b <= 120 lines).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

describe("Wave 117: Document Titles Purification (Mandates 8a–8q)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../../../..");

	it("6. Anesthesia cluster: AnesthesiaProtocolModal is eradicated, zero synthetic nurse leaks", () => {
		const modalPath = path.join(
			repoRoot,
			"apps/web/src/components/anesthesia/AnesthesiaProtocolModal.tsx",
		);
		assert.ok(!fs.existsSync(modalPath), "AnesthesiaProtocolModal.tsx must be eradicated (Wave 197)");

		const quickBarPath = path.join(
			repoRoot,
			"apps/web/src/components/anesthesia/AnesthesiaQuickBar.tsx",
		);
		const content = fs.readFileSync(quickBarPath, "utf-8");
		assert.ok(!content.includes("Смирнова А. В."), "AnesthesiaQuickBar.tsx must not leak 'Смирнова А. В.'");
	});

	it("7. documentQuery.ts: absence of «003-В/у» and presence of dental extract title", () => {
		const filePath = path.join(repoRoot, "apps/api/src/db/documentQuery.ts");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("003-В/у"), "documentQuery.ts must not contain '003-В/у'");
		assert.ok(
			content.includes("Выписка из медицинской карты стоматологического пациента"),
			"documentQuery.ts must use semantic dental extract title",
		);
	});

	it("8. forms003vu.ts: absence of Soviet order 1030 and presence of clean clinical standard", () => {
		const filePath = path.join(
			repoRoot,
			"packages/shared/src/documents/forms003vu.ts",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("Приказ Минздрава СССР № 1030"), "forms003vu.ts must NOT reference USSR Order 1030");
		assert.ok(!content.includes("USSR Order 1030"), "forms003vu.ts must NOT reference USSR Order 1030");
		assert.ok(
			content.includes("ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА"),
			"forms003vu.ts must state clean dental patient extract title",
		);
		assert.ok(
			content.includes("а не госпитальная форма 003/у"),
			"forms003vu.ts must explicitly distinguish from hospital form 003/u",
		);
	});
});
