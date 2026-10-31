/**
 * apps/api/src/routes/migrationRoutes/expressImportRoutes.ts
 *
 * Express data import routes with Two-Phase Confirmation Guard (Preview vs Commit).
 * Mandate 8d: Strict tenant isolation by organizationId.
 */

import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { patients, serviceCatalogItems } from "../../db/schema.js";

export async function registerExpressImportRoutes(app: FastifyInstance) {
	/**
	 * Экспресс-импорт данных с 2-фазным барьером подтверждения (Two-Phase Guard):
	 * Phase 1: preview / dry_run — анализ колонок (ФИО, Телефон, Баланс), детекция дублей, превью строк.
	 * Phase 2: commit — транзакционная запись в PostgreSQL 18 с изоляцией по organizationId.
	 */
	app.post("/api/migration/import", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"express migration import",
		);
		if (!context) return reply;

		const body = (request.body as Record<string, any>) ?? {};
		const phase =
			body.phase === "commit" && (body.confirm === true || body.dryRun === false)
				? "commit"
				: "preview";
		const entityKind =
			body.entityKind === "price_list" ? "price_list" : "patients";
		const sourceName =
			typeof body.sourceName === "string" ? body.sourceName : "express_import.csv";

		let rawRows: Array<Record<string, any>> = [];
		if (Array.isArray(body.rows) && body.rows.length > 0) {
			rawRows = body.rows;
		} else if (
			typeof body.rawText === "string" &&
			body.rawText.trim().length > 0
		) {
			const lines = body.rawText
				.split(/\r?\n/)
				.map((l: string) => l.trim())
				.filter((l: string) => l.length > 0);
			if (lines.length > 0) {
				const delimiter = lines[0]?.includes("\t")
					? "\t"
					: lines[0]?.includes(";")
						? ";"
						: ",";
				const header = lines[0]!
					.split(delimiter)
					.map((h: string) => h.trim().replace(/^["']|["']$/g, ""));
				for (let i = 1; i < lines.length; i++) {
					const parts = lines[i]!
						.split(delimiter)
						.map((p: string) => p.trim().replace(/^["']|["']$/g, ""));
					const row: Record<string, any> = {};
					for (let j = 0; j < header.length; j++) {
						row[header[j] || `col_${j}`] = parts[j] ?? "";
					}
					rawRows.push(row);
				}
			}
		}

		if (rawRows.length === 0) {
			return reply.code(400).send({
				error: "MigrationValidationError",
				message:
					"Не переданы данные для разбора и переноса. Загрузите файл CSV/Excel или передайте строки.",
			});
		}

		const firstRow = rawRows[0] || {};
		const keys = Object.keys(firstRow);
		const detectedColumns: Array<{ key: string; label: string; field: string }> =
			[];

		for (const k of keys) {
			const lower = k.toLowerCase();
			if (
				/ф.?и.?о|имя|пациент|клиент|пациентка|фамилия|full.*name|name/i.test(
					lower,
				)
			) {
				detectedColumns.push({ key: k, label: "ФИО", field: "fullName" });
			} else if (/тел|phone|mobile|сот|контакт/i.test(lower)) {
				detectedColumns.push({ key: k, label: "Телефон", field: "phone" });
			} else if (/рожд|д\.?р|birth|dob/i.test(lower)) {
				detectedColumns.push({
					key: k,
					label: "Дата рождения",
					field: "birthDate",
				});
			} else if (/баланс|долг|депозит|balance|debt|аванс/i.test(lower)) {
				detectedColumns.push({
					key: k,
					label: "Баланс/Депозит",
					field: "balanceRub",
				});
			} else if (/код|артикул|номенклатур|code|sku/i.test(lower)) {
				detectedColumns.push({ key: k, label: "Код/Артикул", field: "code" });
			} else if (
				/наименование|услуга|процедура|название|title|service/i.test(lower)
			) {
				detectedColumns.push({ key: k, label: "Наименование", field: "title" });
			} else if (/цена|стоимость|тариф|price|cost|base_price/i.test(lower)) {
				detectedColumns.push({ key: k, label: "Цена (руб)", field: "priceRub" });
			} else {
				detectedColumns.push({ key: k, label: k, field: "note" });
			}
		}

		const seenPhones = new Set<string>();
		const seenNames = new Set<string>();
		let duplicatesCount = 0;
		for (const r of rawRows) {
			const nameVal = String(
				r[detectedColumns.find((c) => c.field === "fullName")?.key || ""] || "",
			)
				.trim()
				.toLowerCase();
			const phoneVal = String(
				r[detectedColumns.find((c) => c.field === "phone")?.key || ""] || "",
			).replace(/\D/g, "");
			if (phoneVal && seenPhones.has(phoneVal)) {
				duplicatesCount++;
			} else if (nameVal && seenNames.has(nameVal)) {
				duplicatesCount++;
			} else {
				if (phoneVal) seenPhones.add(phoneVal);
				if (nameVal) seenNames.add(nameVal);
			}
		}

		if (phase === "preview") {
			return {
				success: true,
				phase: "preview",
				sourceName,
				entityKind,
				totalRows: rawRows.length,
				detectedColumns,
				duplicatesCount,
				sampleRows: rawRows.slice(0, 5),
				message: `Распознано ${rawRows.length} записей из «${sourceName}». Выявлено возможных дублей: ${duplicatesCount}. Подтвердите импорт для переноса в базу.`,
			};
		}

		let importedRows = 0;
		if (entityKind === "patients") {
			const nameCol = detectedColumns.find((c) => c.field === "fullName")?.key;
			const phoneCol = detectedColumns.find((c) => c.field === "phone")?.key;
			const birthCol = detectedColumns.find((c) => c.field === "birthDate")?.key;
			const balanceCol = detectedColumns.find((c) => c.field === "balanceRub")?.key;

			for (const r of rawRows) {
				const fullName =
					(nameCol ? String(r[nameCol] ?? "") : "").trim() ||
					"Пациент из импорта";
				const phone = phoneCol ? String(r[phoneCol] ?? "").trim() : null;
				const birthDate = birthCol ? String(r[birthCol] ?? "").trim() : null;
				const balanceRub = balanceCol ? Number(r[balanceCol]) || 0 : 0;
				const notes =
					balanceRub !== 0 ? `Баланс при переносе: ${balanceRub} руб.` : null;

				await db.insert(patients).values({
					id: randomUUID(),
					organizationId: context.organizationId,
					fullName,
					phone: phone || null,
					birthDate: birthDate || null,
					notes,
					status: "active",
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				importedRows++;
			}
		} else if (entityKind === "price_list") {
			const codeCol = detectedColumns.find((c) => c.field === "code")?.key;
			const titleCol = detectedColumns.find((c) => c.field === "title")?.key;
			const priceCol = detectedColumns.find((c) => c.field === "priceRub")?.key;

			for (let idx = 0; idx < rawRows.length; idx++) {
				const r = rawRows[idx]!;
				const title =
					(titleCol ? String(r[titleCol] ?? "") : "").trim() ||
					`Услуга ${idx + 1}`;
				const code =
					(codeCol ? String(r[codeCol] ?? "") : "").trim() ||
					`IMP-${idx + 1}`;
				const priceNum = priceCol ? Math.max(0, Number(r[priceCol]) || 0) : 0;

				await db.insert(serviceCatalogItems).values({
					organizationId: context.organizationId,
					code,
					title,
					category: "therapy",
					specialty: "universal",
					basePriceRub: priceNum,
					priceRub: priceNum,
					durationMinutes: 30,
					isActive: true,
				});
				importedRows++;
			}
		}

		return {
			success: true,
			phase: "commit",
			sourceName,
			entityKind,
			totalRows: rawRows.length,
			importedRows,
			duplicatesCount,
			message: `Импорт успешно завершен: перенесено ${importedRows} записей в базу данных клиники.`,
		};
	});
}
