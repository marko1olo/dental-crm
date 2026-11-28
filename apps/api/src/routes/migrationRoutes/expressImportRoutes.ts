/**
 * apps/api/src/routes/migrationRoutes/expressImportRoutes.ts
 *
 * Express data import routes with Two-Phase Confirmation Guard (Preview vs Commit).
 * Mandate 8d: Strict tenant isolation by organizationId.
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { kopecksToRubles, parseKopecks } from "@dental/shared";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantWriteCtx } from "../../db/rls.js";
import { auditEvents, patients, serviceCatalogItems } from "../../db/schema.js";
import { parseDelimited } from "../../migration/parsers/delimited.js";
import {
	extractIdempotencyKey,
	isValidUuid,
} from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";

export const expressImportBodySchema = z
	.object({
		phase: z.enum(["preview", "commit"]).optional(),
		confirm: z.boolean().optional(),
		dryRun: z.boolean().optional(),
		entityKind: z.enum(["patients", "price_list"]).optional(),
		sourceName: z.string().optional(),
		rawText: z.string().optional(),
		rows: z.array(z.record(z.string(), z.unknown())).optional(),
	})
	.strict();

export type ExpressImportBody = z.infer<typeof expressImportBodySchema>;

export async function registerExpressImportRoutes(app: FastifyInstance) {
	/**
	 * Экспресс-импорт данных с 2-фазным барьером подтверждения (Two-Phase Guard):
	 * Phase 1: preview / dry_run — анализ колонок (ФИО, Телефон, Баланс), детекция дублей, превью строк.
	 * Phase 2: commit — транзакционная запись в PostgreSQL 18 с изоляцией по organizationId.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/migration/import",
		permission: "public",
		handler: async ({ request, reply }) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"express migration import",
		);
		if (!context) return reply;

		const parseResult = expressImportBodySchema.safeParse(request.body ?? {});
		if (!parseResult.success) {
			return reply.code(400).send({
				error: "MigrationValidationError",
				message: "Некорректные параметры тела запроса импорта данных.",
				details: parseResult.error.errors,
			});
		}
		const body = parseResult.data;

		const phase =
			body.phase === "commit" && (body.confirm === true || body.dryRun === false)
				? "commit"
				: "preview";
		const entityKind =
			body.entityKind === "price_list" ? "price_list" : "patients";
		const sourceName =
			typeof body.sourceName === "string" ? body.sourceName : "express_import.csv";

		let rawRows: Array<Record<string, unknown>> = [];
		if (Array.isArray(body.rows) && body.rows.length > 0) {
			rawRows = body.rows;
		} else if (
			typeof body.rawText === "string" &&
			body.rawText.trim().length > 0
		) {
			const delimited = parseDelimited(body.rawText);
			if (delimited.rows.length > 0) {
				let headers = delimited.columns;
				let dataRows = delimited.rows;
				if (!delimited.hasHeader && delimited.rows.length >= 2) {
					const firstCandidate = delimited.rows[0] ?? [];
					const looksLikeExpressHeader = firstCandidate.some((cell) =>
						/ф.?и.?о|имя|пациент|клиент|тел|phone|баланс|код|услуга|цена|title|name/i.test(
							cell.trim(),
						),
					);
					if (looksLikeExpressHeader) {
						headers = firstCandidate.map((h, idx) => h.trim() || `col_${idx}`);
						dataRows = delimited.rows.slice(1);
					}
				}
				for (const parts of dataRows) {
					const row: Record<string, string> = {};
					for (let j = 0; j < headers.length; j++) {
						row[headers[j] || `col_${j}`] = (parts[j] ?? "").trim();
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

		const idempotencyKey = extractIdempotencyKey(request);
		if (phase === "commit") {
			if (!idempotencyKey || !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Для фазы фиксации импорта (commit) обязателен валидный заголовок Idempotency-Key (UUID/UUIDv7).",
				});
			}
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		let importedRows = 0;
		let skippedDuplicatesCount = 0;
		if (entityKind === "patients") {
			const nameCol = detectedColumns.find((c) => c.field === "fullName")?.key;
			const phoneCol = detectedColumns.find((c) => c.field === "phone")?.key;
			const birthCol = detectedColumns.find((c) => c.field === "birthDate")?.key;
			const balanceCol = detectedColumns.find((c) => c.field === "balanceRub")?.key;

			const batchAuditId = randomUUID();
			await withTenantWriteCtx(context.organizationId, async (tx) => {
				const existingPatients = await tx
					.select({ fullName: patients.fullName, phone: patients.phone })
					.from(patients)
					.where(eq(patients.organizationId, context.organizationId));

				const knownPhones = new Set(
					existingPatients
						.map((p) => (p.phone ?? "").replace(/\D/g, ""))
						.filter(Boolean),
				);
				const knownNames = new Set(
					existingPatients.map((p) => p.fullName.trim().toLowerCase()),
				);

				const patientRowsToInsert: Array<typeof patients.$inferInsert & { id: string }> = [];
				for (const r of rawRows) {
					const fullName =
						(nameCol ? String(r[nameCol] ?? "") : "").trim() ||
						"Пациент из импорта";
					const phone = phoneCol ? String(r[phoneCol] ?? "").trim() : null;
					const normPhone = phone ? phone.replace(/\D/g, "") : "";
					const normName = fullName.toLowerCase();

					if (
						(normPhone && knownPhones.has(normPhone)) ||
						(normName && knownNames.has(normName))
					) {
						skippedDuplicatesCount++;
						continue;
					}
					if (normPhone) knownPhones.add(normPhone);
					if (normName) knownNames.add(normName);

					const birthDate = birthCol ? String(r[birthCol] ?? "").trim() : null;
					const rawBal = balanceCol ? String(r[balanceCol] ?? "").trim() : "";
					let balanceRub = 0;
					if (rawBal) {
						try {
							balanceRub = kopecksToRubles(parseKopecks(rawBal));
						} catch (err) {
							request.log.warn(
								{ err, rawBal, fullName },
								"expressImport failed to parse patient balance, defaulting to 0",
							);
							balanceRub = 0;
						}
					}
					const notes =
						balanceRub !== 0 ? `Баланс при переносе: ${balanceRub} руб.` : null;

					patientRowsToInsert.push({
						id: randomUUID(),
						organizationId: context.organizationId,
						fullName,
						phone: phone || null,
						birthDate: birthDate || null,
						notes,
						status: "active" as const,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}

				const BATCH_SIZE = 100;
				for (let i = 0; i < patientRowsToInsert.length; i += BATCH_SIZE) {
					const batch = patientRowsToInsert.slice(i, i + BATCH_SIZE);
					if (batch.length > 0) {
						await tx.insert(patients).values(batch);
						await tx.insert(auditEvents).values(
							batch.map((p) => ({
								organizationId: context.organizationId,
								entityType: "patient" as const,
								entityId: p.id,
								action: "express_patient_imported" as const,
								reason: `Экспресс-импорт из «${sourceName}»`,
							})),
						);
					}
				}
				importedRows = patientRowsToInsert.length;

				await tx.insert(auditEvents).values({
					organizationId: context.organizationId,
					entityType: "import_batch",
					entityId: batchAuditId,
					action: "express_import_committed",
					reason: `Экспресс-импорт пациентов «${sourceName}»: перенесено ${importedRows}, пропущено дублей ${skippedDuplicatesCount}.`,
				});
			});
		} else if (entityKind === "price_list") {
			const codeCol = detectedColumns.find((c) => c.field === "code")?.key;
			const titleCol = detectedColumns.find((c) => c.field === "title")?.key;
			const priceCol = detectedColumns.find((c) => c.field === "priceRub")?.key;

			const batchAuditId = randomUUID();
			await withTenantWriteCtx(context.organizationId, async (tx) => {
				const existingItems = await tx
					.select({ code: serviceCatalogItems.code, title: serviceCatalogItems.title })
					.from(serviceCatalogItems)
					.where(eq(serviceCatalogItems.organizationId, context.organizationId));

				const knownCodes = new Set(
					existingItems.map((i) => i.code.trim().toLowerCase()).filter(Boolean),
				);
				const knownTitles = new Set(
					existingItems.map((i) => i.title.trim().toLowerCase()).filter(Boolean),
				);

				const catalogRowsToInsert: Array<typeof serviceCatalogItems.$inferInsert> = [];
				for (let idx = 0; idx < rawRows.length; idx++) {
					const r = rawRows[idx] ?? {};
					const title =
						(titleCol ? String(r[titleCol] ?? "") : "").trim() ||
						`Услуга ${idx + 1}`;
					const code =
						(codeCol ? String(r[codeCol] ?? "") : "").trim() ||
						`IMP-${idx + 1}`;
					const normCode = code.toLowerCase();
					const normTitle = title.toLowerCase();

					if (knownCodes.has(normCode) || knownTitles.has(normTitle)) {
						skippedDuplicatesCount++;
						continue;
					}
					knownCodes.add(normCode);
					knownTitles.add(normTitle);

					const rawPrice = priceCol ? String(r[priceCol] ?? "").trim() : "";
					let priceKopNum = 0;
					if (rawPrice) {
						try {
							priceKopNum = Math.max(0, parseKopecks(rawPrice));
						} catch (err) {
							request.log.warn(
								{ err, rawPrice, rowIndex: idx },
								"expressImport failed to parse service price, defaulting to 0",
							);
							priceKopNum = 0;
						}
					}
					const priceNum = kopecksToRubles(priceKopNum);

					catalogRowsToInsert.push({
						organizationId: context.organizationId,
						code,
						title,
						category: "therapy" as const,
						specialty: "universal" as const,
						basePriceRub: priceNum,
						priceRub: priceNum,
						basePriceKopecks: BigInt(priceKopNum),
						priceKopecks: BigInt(priceKopNum),
						durationMinutes: 30,
						isActive: true,
					});
				}

				const BATCH_SIZE = 100;
				for (let i = 0; i < catalogRowsToInsert.length; i += BATCH_SIZE) {
					const batch = catalogRowsToInsert.slice(i, i + BATCH_SIZE);
					if (batch.length > 0) {
						await tx.insert(serviceCatalogItems).values(batch);
					}
				}
				importedRows = catalogRowsToInsert.length;

				await tx.insert(auditEvents).values({
					organizationId: context.organizationId,
					entityType: "import_batch",
					entityId: batchAuditId,
					action: "express_pricelist_import_committed",
					reason: `Экспресс-импорт прейскуранта «${sourceName}»: перенесено ${importedRows}, пропущено дублей ${skippedDuplicatesCount}.`,
				});
			});
		}

		return {
			success: true,
			phase: "commit",
			sourceName,
			entityKind,
			totalRows: rawRows.length,
			importedRows,
			duplicatesCount: Math.max(duplicatesCount, skippedDuplicatesCount),
			skippedDuplicatesCount,
			message: `Импорт успешно завершен: перенесено ${importedRows} записей в базу данных клиники.`,
		};
		},
	});
}
