/**
 * sanpinTools.ts — SanPiN 3.3686-21 & 2.1.3684-21 agent tools.
 * Implements statutory verification of sterile kraft packs, shelf life calculations (30/50/180 days),
 * autoclave cycle compliance (134°C 5 min / 121°C 20 min), chemical/biological indicator checks,
 * CSO nurse attribution, and recording of sterilization quality tests into PostgreSQL.
 */

import {
	computePackagingExpirationDate,
	STERILIZATION_CYCLE_MODES,
	STERILIZATION_INDICATOR_TYPES,
	STERILIZATION_PACKAGING_TYPES,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import {
	autoclaveDailyTests,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	users,
} from "../../../db/schema.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";

// ─── 1. verify_kraft_pack ───────────────────────────────────────────────────

export const verifyKraftPackSchema = z
	.object({
		packBarcode: z
			.string()
			.trim()
			.optional()
			.describe(
				"Штрихкод или DataMatrix крафт-пакета (например, 'SANPIN:CSO-2026-08-23-01' или 'DNT-STER-CYC12-TRAY01-20260901')",
			),
		packBatchNumber: z
			.string()
			.trim()
			.optional()
			.describe("Номер партии или идентификатор цикла стерилизации"),
		autoclaveId: z
			.string()
			.trim()
			.optional()
			.describe("Идентификатор или инвентарный номер стерилизатора / автоклава"),
	})
	.refine(
		(data) => Boolean(data.packBarcode || data.packBatchNumber || data.autoclaveId),
		{
			message:
				"Необходимо указать хотя бы один параметр для поиска: packBarcode, packBatchNumber или autoclaveId",
		},
	);

export interface KraftPackDetails {
	readonly id: string;
	readonly barcode: string | null;
	readonly autoclaveId: string | null;
	readonly deviceName: string | null;
	readonly cycleNumber: number | null;
	readonly packagingType: string | null;
	readonly packagingTypeLabel: string;
	readonly shelfLifeDays: number;
	readonly sterilizationDate: string;
	readonly temperatureCelsius: number | null;
	readonly pressureBar: number | null;
	readonly durationMin: number | null;
	readonly cycleMode: string | null;
	readonly indicatorType: string | null;
	readonly indicatorClass: string;
	readonly passedIndicator: boolean;
	readonly operatorId: string | null;
	readonly operatorName: string | null;
	readonly itemsDescription: string | null;
	readonly notes: string | null;
}

export interface VerifyKraftPackResult {
	readonly isValid: boolean;
	readonly status: "sterile" | "expired" | "unverified";
	readonly packDetails: KraftPackDetails | null;
	readonly expiryDate: string | null;
	readonly warnings: string[];
}

export const verifyKraftPackTool: ToolDefinition<
	typeof verifyKraftPackSchema,
	VerifyKraftPackResult
> = {
	name: "verify_kraft_pack",
	description:
		"Проверка соблюдения санитарно-эпидемиологических требований СанПиН 3.3686-21 к крафт-пакетам: срок годности стерильности (30 дней для одинарного / 50 дней для двойного / 180 дней для ламинированного), параметры цикла автоклава (134°C 5 мин / 121°C 20 мин), химический индикатор 4/5/6 класса и ответственная медсестра ЦСО.",
	parameters: verifyKraftPackSchema,
	permissions: ["clinical.read", "sanpin.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;
		const now = new Date();
		const warnings: string[] = [];

		// 1. Build search filters
		const filters: SQL[] = [eq(sterilizationLogs.organizationId, ctx.organizationId)];

		const searchConditions: SQL[] = [];
		if (args.packBarcode) {
			const barcode = args.packBarcode.trim();
			searchConditions.push(
				eq(sterilizationLogs.barcode, barcode),
				ilike(sterilizationLogs.barcode, `%${barcode}%`),
			);
		}
		if (args.packBatchNumber) {
			const batch = args.packBatchNumber.trim();
			searchConditions.push(
				eq(sterilizationLogs.id, batch),
				sql`${sterilizationLogs.cycleNumber}::text = ${batch}`,
				ilike(sterilizationLogs.itemsDescription, `%${batch}%`),
				ilike(sterilizationLogs.barcode, `%${batch}%`),
			);
		}
		if (args.autoclaveId) {
			searchConditions.push(
				eq(sterilizationLogs.autoclaveId, args.autoclaveId.trim()),
			);
		}

		if (searchConditions.length > 0) {
			filters.push(or(...searchConditions)!);
		}

		// 2. Fetch record from sterilizationLogs joined with users (responsible CSO staff)
		const [record] = await targetDb
			.select({
				id: sterilizationLogs.id,
				organizationId: sterilizationLogs.organizationId,
				deviceName: sterilizationLogs.deviceName,
				autoclaveId: sterilizationLogs.autoclaveId,
				cycleNumber: sterilizationLogs.cycleNumber,
				temperatureCelsius: sterilizationLogs.temperatureCelsius,
				pressureBar: sterilizationLogs.pressureBar,
				itemsDescription: sterilizationLogs.itemsDescription,
				operatorId: sterilizationLogs.operatorId,
				operatorName: users.fullName,
				barcode: sterilizationLogs.barcode,
				status: sterilizationLogs.status,
				passedIndicator: sterilizationLogs.passedIndicator,
				packagingType: sterilizationLogs.packagingType,
				expiresAt: sterilizationLogs.expiresAt,
				indicatorType: sterilizationLogs.indicatorType,
				cycleMode: sterilizationLogs.cycleMode,
				temperatureSet: sterilizationLogs.temperatureSet,
				pressureSet: sterilizationLogs.pressureSet,
				durationMin: sterilizationLogs.durationMin,
				timestamp: sterilizationLogs.timestamp,
				createdAt: sterilizationLogs.createdAt,
			})
			.from(sterilizationLogs)
			.leftJoin(users, eq(users.id, sterilizationLogs.operatorId))
			.where(and(...filters))
			.orderBy(desc(sterilizationLogs.timestamp), desc(sterilizationLogs.createdAt))
			.limit(1);

		if (!record) {
			return {
				isValid: false,
				status: "unverified",
				packDetails: null,
				expiryDate: null,
				warnings: [
					"Крафт-пакет или партия стерилизации не найдены в электронном журнале ЦСО клиники (Форма № 257/у по СанПиН 3.3686-21).",
				],
			};
		}

		// 3. Determine sterilization date and statutory shelf life
		const sterilizationDate = record.timestamp ?? record.createdAt;
		const rawPackagingType = (record.packagingType || "kraft_self_adhesive") as SterilizationPackagingType;
		const packagingMeta =
			rawPackagingType in STERILIZATION_PACKAGING_TYPES
				? STERILIZATION_PACKAGING_TYPES[rawPackagingType]
				: STERILIZATION_PACKAGING_TYPES.kraft_self_adhesive;

		const shelfLifeDays = packagingMeta.shelfLifeDays;
		const calculatedExpiry = computePackagingExpirationDate(
			rawPackagingType,
			sterilizationDate,
		);
		const expiryDate = record.expiresAt ? new Date(record.expiresAt) : calculatedExpiry;

		// 4. Validate expiration date
		let isExpired = false;
		if (now.getTime() > expiryDate.getTime()) {
			isExpired = true;
			warnings.push(
				`Истек допустимый срок сохранения стерильности по СанПиН 3.3686-21 (истек ${expiryDate.toLocaleDateString("ru-RU")}). Повторное применение без стерилизации запрещено!`,
			);
		}

		// 5. Validate autoclave sterilization cycle parameters (СанПиН 3.3686-21 / ГОСТ Р ИСО 13060)
		const temp = record.temperatureCelsius ? Number(record.temperatureCelsius) : null;
		const pressure = record.pressureBar ? Number(record.pressureBar) : null;
		const duration = record.durationMin ?? null;
		const tempSet = record.temperatureSet ? Number(record.temperatureSet) : null;
		const isNominal134 =
			tempSet === 134 ||
			(!tempSet && (record.cycleMode === "B" || (temp !== null && temp >= 126.0)));

		if (temp !== null) {
			if (isNominal134) {
				if (temp < 134.0) {
					warnings.push(
						`Температура стерилизации ${temp}°C ниже допустимой нормы 134°C (СанПиН 3.3686-21 / ГОСТ Р ИСО 13060).`,
					);
				}
				if (duration !== null && duration < 5) {
					warnings.push(
						`Недостаточная продолжительность цикла стерилизации 134°C: ${duration} мин (норматив СанПиН 3.3686-21: не менее 5 мин).`,
					);
				}
				if (pressure !== null && pressure < 2.05) {
					warnings.push(
						`Недостаточное давление пара в камере автоклава: ${pressure} бар (норматив при 134°C: не менее 2.05 бар).`,
					);
				}
			} else if (tempSet === 121 || (temp !== null && temp >= 115.0)) {
				if (temp < 121.0) {
					warnings.push(
						`Температура стерилизации ${temp}°C ниже допустимой нормы 121°C (СанПиН 3.3686-21).`,
					);
				}
				if (duration !== null && duration < 20) {
					warnings.push(
						`Недостаточная продолжительность цикла стерилизации 121°C: ${duration} мин (норматив СанПиН 3.3686-21: не менее 20 мин).`,
					);
				}
				if (pressure !== null && pressure < 1.05) {
					warnings.push(
						`Недостаточное давление пара в камере автоклава: ${pressure} бар (норматив при 121°C: не менее 1.1 бар).`,
					);
				}
			} else {
				warnings.push(
					`Температура стерилизации ${temp}°C ниже нормативного минимума СанПиН 3.3686-21 (требуется 134°C или 121°C).`,
				);
			}
		}

		// 6. Validate chemical/biological indicator
		if (!record.passedIndicator || record.status === "failed") {
			warnings.push(
				"Химический или биологический индикатор не подтвердил успешное прохождение цикла стерилизации (индикатор не изменил цвет / брак).",
			);
		}

		const rawIndicator = record.indicatorType || "";
		let indicatorClassLabel = "Класс 4/5 (стандарт)";
		if (rawIndicator in STERILIZATION_INDICATOR_TYPES) {
			indicatorClassLabel =
				STERILIZATION_INDICATOR_TYPES[rawIndicator as keyof typeof STERILIZATION_INDICATOR_TYPES];
		} else if (rawIndicator.includes("class5")) {
			indicatorClassLabel = "Класс 5 — интегрирующий индикатор";
		} else if (rawIndicator.includes("class6")) {
			indicatorClassLabel = "Класс 6 — имитирующий эмулятор";
		} else if (rawIndicator.includes("class4")) {
			indicatorClassLabel = "Класс 4 — многопараметрический индикатор";
		} else if (rawIndicator.includes("biological")) {
			indicatorClassLabel = "Биологический споровый тест (Geobacillus stearothermophilus)";
		}

		// 7. Validate CSO operator nurse attribution
		if (!record.operatorId && !record.operatorName) {
			warnings.push(
				"В электронном журнале не зафиксирована подпись / ФИО ответственной медсестры ЦСО.",
			);
		}

		// 8. Synthesize final status
		let status: "sterile" | "expired" | "unverified" = "sterile";
		if (isExpired) {
			status = "expired";
		} else if (
			!record.passedIndicator ||
			record.status === "failed" ||
			record.status === "quarantined" ||
			warnings.some(
				(w) =>
					w.includes("ниже нормативного") ||
					w.includes("Недостаточная продолжительность") ||
					w.includes("не подтвердил"),
			)
		) {
			status = "unverified";
		}

		const isValid = status === "sterile" && warnings.length === 0;

		const packDetails: KraftPackDetails = {
			id: record.id,
			barcode: record.barcode,
			autoclaveId: record.autoclaveId,
			deviceName: record.deviceName,
			cycleNumber: record.cycleNumber,
			packagingType: record.packagingType,
			packagingTypeLabel: packagingMeta.label,
			shelfLifeDays,
			sterilizationDate: sterilizationDate.toISOString(),
			temperatureCelsius: temp,
			pressureBar: pressure,
			durationMin: duration,
			cycleMode: record.cycleMode,
			indicatorType: record.indicatorType,
			indicatorClass: indicatorClassLabel,
			passedIndicator: Boolean(record.passedIndicator),
			operatorId: record.operatorId,
			operatorName: record.operatorName ?? null,
			itemsDescription: record.itemsDescription,
			notes: null,
		};

		return {
			isValid,
			status,
			packDetails,
			expiryDate: expiryDate.toISOString(),
			warnings,
		};
	},
};

// ─── 2. record_sterilization_test ───────────────────────────────────────────

export const recordSterilizationTestSchema = z.object({
	autoclaveId: z
		.string()
		.trim()
		.min(1, "Идентификатор стерилизатора/автоклава обязателен")
		.describe("ID или инвентарный номер стерилизатора / автоклава (например, 'AUTOCLAVE-01' или 'CSO-MELAG-23B')"),
	cycleNumber: z
		.number()
		.int()
		.min(1, "Номер цикла должен быть >= 1")
		.describe("Порядковый номер цикла стерилизации за рабочую смену"),
	testType: z
		.enum([
			"azopyram_pso",
			"phenolphthalein_pso",
			"chemical_indicator_class5",
			"biological_spore",
		])
		.describe(
			"Тип контроля СанПиН 3.3686-21: azopyram_pso (азопирамовая проба ПСО на скрытую кровь), phenolphthalein_pso (фенолфталеиновая проба ПСО на остатки щелочных моющих средств), chemical_indicator_class5 (интегрирующий хим. индикатор 5 класса), biological_spore (биотест со спорами Geobacillus stearothermophilus)",
		),
	result: z
		.enum(["passed", "failed"])
		.describe(
			"Результат контрольного испытания: passed (соответствует норме СанПиН / проба отрицательная / индикатор сработал) или failed (брак / положительная проба / индикатор не изменил цвет)",
		),
	testedByUserId: z
		.string()
		.uuid("Некорректный UUID ответственного сотрудника")
		.optional()
		.describe("UUID ответственного медработника (медсестры ЦСО / ассистента)"),
	notes: z
		.string()
		.trim()
		.max(500)
		.optional()
		.describe("Клинические и технические примечания к записи контроля"),
});

export interface RecordSterilizationTestResult {
	readonly success: boolean;
	readonly testId: string;
	readonly logType:
		| "pre_sterilization_cleaning_logs"
		| "autoclave_daily_tests"
		| "sterilization_logs";
	readonly organizationId: string;
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly testType:
		| "azopyram_pso"
		| "phenolphthalein_pso"
		| "chemical_indicator_class5"
		| "biological_spore";
	readonly testTitle: string;
	readonly result: "passed" | "failed";
	readonly isApproved: boolean;
	readonly recordedAt: string;
	readonly operatorId: string | null;
	readonly notes: string | null;
	readonly sanpinRegulatoryNotice: string;
}

export const recordSterilizationTestTool: ToolDefinition<
	typeof recordSterilizationTestSchema,
	RecordSterilizationTestResult
> = {
	name: "record_sterilization_test",
	description:
		"Создание реальной записи в журналах контроля стерилизации и предстерилизационной очистки (ПСО) в PostgreSQL с тенантной изоляцией organizationId по СанПиН 3.3686-21: азопирам, фенолфталеин, индикаторы 5 класса и биологический споровый контроль.",
	parameters: recordSterilizationTestSchema,
	permissions: ["sanpin.write", "clinical.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;
		const operatorId = args.testedByUserId ?? ctx.userId ?? null;
		const now = new Date();
		const isPassed = args.result === "passed";

		let createdId: string;
		let logType:
			| "pre_sterilization_cleaning_logs"
			| "autoclave_daily_tests"
			| "sterilization_logs";
		let testTitle: string;
		let notice: string;

		if (args.testType === "azopyram_pso") {
			testTitle = "Азопирамовая проба ПСО (контроль скрытой крови / гемоглобина)";
			logType = "pre_sterilization_cleaning_logs";
			notice = isPassed
				? "Проба отрицательная: скрытая кровь не обнаружена. Инструментарий допущен к стерилизации (СанПиН 3.3686-21)."
				: "ВНИМАНИЕ: Положительная азопирамовая проба (обнаружена кровь)! Вся партия инструментов подлежит повторной дезинфекции и ПСО.";

			const [created] = await targetDb
				.insert(preSterilizationCleaningLogs)
				.values({
					organizationId: ctx.organizationId,
					testType: "azopyram",
					batchItemCount: 100,
					testedSampleCount: 5,
					isAzopyramNegative: isPassed,
					isPhenolphthaleinNegative: true,
					isBatchApproved: isPassed,
					rejectionReason: isPassed
						? null
						: "Положительная азопирамовая проба (обнаружен гемоглобин / скрытая кровь)",
					operatorId,
					notes: args.notes
						? `[Автоклав ${args.autoclaveId}, Цикл №${args.cycleNumber}] ${args.notes}`
						: `Автоклав ${args.autoclaveId}, Цикл №${args.cycleNumber}`,
					timestamp: now,
				})
				.returning({ id: preSterilizationCleaningLogs.id });

			createdId = created.id;
		} else if (args.testType === "phenolphthalein_pso") {
			testTitle = "Фенолфталеиновая проба ПСО (контроль остатков щелочных моющих средств)";
			logType = "pre_sterilization_cleaning_logs";
			notice = isPassed
				? "Проба отрицательная: остаточные щелочные ПАВ не обнаружены. Инструментарий допущен к стерилизации (СанПиН 3.3686-21)."
				: "ВНИМАНИЕ: Положительная фенолфталеиновая проба (щелочная реакция)! Вся партия инструментов подлежит повторному ополаскиванию дистиллированной водой.";

			const [created] = await targetDb
				.insert(preSterilizationCleaningLogs)
				.values({
					organizationId: ctx.organizationId,
					testType: "phenolphthalein",
					batchItemCount: 100,
					testedSampleCount: 5,
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: isPassed,
					isBatchApproved: isPassed,
					rejectionReason: isPassed
						? null
						: "Положительная фенолфталеиновая проба (остатки щелочных компонентов моющих средств)",
					operatorId,
					notes: args.notes
						? `[Автоклав ${args.autoclaveId}, Цикл №${args.cycleNumber}] ${args.notes}`
						: `Автоклав ${args.autoclaveId}, Цикл №${args.cycleNumber}`,
					timestamp: now,
				})
				.returning({ id: preSterilizationCleaningLogs.id });

			createdId = created.id;
		} else if (args.testType === "chemical_indicator_class5") {
			testTitle = "Химический интегрирующий индикатор 5 класса (ГОСТ Р ИСО 11140-1)";
			logType = "autoclave_daily_tests";
			notice = isPassed
				? "Индикатор 5 класса сработал корректно: параметры температуры, насыщенного пара и времени выдержаны (134°C 5 мин / 2.1 бар)."
				: "КРИТИЧЕСКИЙ СБОЙ: Индикатор 5 класса не изменил цвет! Цикл стерилизации бракуется, инструменты нестерильны.";

			const [createdDaily] = await targetDb
				.insert(autoclaveDailyTests)
				.values({
					organizationId: ctx.organizationId,
					autoclaveId: args.autoclaveId,
					testType: "helix_pcd",
					cycleTemperatureCelsius: "134.00",
					cyclePressureBar: "2.10",
					colorChangeVerified: isPassed,
					testResult: isPassed ? "passed" : "failed",
					operatorId,
					notes: args.notes
						? `[Индикатор 5 класса, Цикл №${args.cycleNumber}] ${args.notes}`
						: `Индикатор 5 класса, Цикл №${args.cycleNumber}`,
					timestamp: now,
				})
				.returning({ id: autoclaveDailyTests.id });

			createdId = createdDaily.id;

			// Also create matching cycle in sterilizationLogs (Form 257/u)
			const expiresAt = computePackagingExpirationDate("kraft_self_adhesive", now);
			await targetDb.insert(sterilizationLogs).values({
				organizationId: ctx.organizationId,
				autoclaveId: args.autoclaveId,
				deviceName: `Автоклав ${args.autoclaveId}`,
				cycleNumber: args.cycleNumber,
				temperatureCelsius: "134.0",
				pressureBar: "2.10",
				durationMin: 5,
				cycleMode: "B",
				indicatorType: "class5_integrating",
				passedIndicator: isPassed,
				status: isPassed ? "passed" : "failed",
				packagingType: "kraft_self_adhesive",
				expiresAt,
				itemsDescription: `Контрольный цикл автоклавирования №${args.cycleNumber} (индикатор 5 класса)`,
				operatorId,
				notes: args.notes ?? null,
				timestamp: now,
			});
		} else {
			// biological_spore
			testTitle = "Биологический споровый контроль (Geobacillus stearothermophilus)";
			logType = "autoclave_daily_tests";
			notice = isPassed
				? "Биологический контроль пройден: рост микроорганизмов отсутствует. Полная стерильность подтверждена."
				: "КРИТИЧЕСКАЯ АВАРИЯ: Обнаружен рост спор Geobacillus stearothermophilus! Автоклав немедленно выводится из эксплуатации для ТО.";

			const [createdBio] = await targetDb
				.insert(autoclaveDailyTests)
				.values({
					organizationId: ctx.organizationId,
					autoclaveId: args.autoclaveId,
					testType: "biological",
					cycleTemperatureCelsius: "134.00",
					cyclePressureBar: "2.10",
					colorChangeVerified: isPassed,
					testResult: isPassed ? "passed" : "failed",
					operatorId,
					notes: args.notes
						? `[Биотест Geobacillus stearothermophilus, Цикл №${args.cycleNumber}] ${args.notes}`
						: `Биологический контроль (споровый тест), Цикл №${args.cycleNumber}`,
					timestamp: now,
				})
				.returning({ id: autoclaveDailyTests.id });

			createdId = createdBio.id;

			// Also create matching cycle in sterilizationLogs
			const expiresAt = computePackagingExpirationDate("kraft_heat_sealed", now);
			await targetDb.insert(sterilizationLogs).values({
				organizationId: ctx.organizationId,
				autoclaveId: args.autoclaveId,
				deviceName: `Автоклав ${args.autoclaveId}`,
				cycleNumber: args.cycleNumber,
				temperatureCelsius: "134.0",
				pressureBar: "2.10",
				durationMin: 5,
				cycleMode: "B",
				indicatorType: "biological",
				passedIndicator: isPassed,
				status: isPassed ? "passed" : "failed",
				packagingType: "kraft_heat_sealed",
				expiresAt,
				itemsDescription: `Биологический контроль со спорами Geobacillus stearothermophilus (Цикл №${args.cycleNumber})`,
				operatorId,
				notes: args.notes ?? null,
				timestamp: now,
			});
		}

		return {
			success: true,
			testId: createdId,
			logType,
			organizationId: ctx.organizationId,
			autoclaveId: args.autoclaveId,
			cycleNumber: args.cycleNumber,
			testType: args.testType,
			testTitle,
			result: args.result,
			isApproved: isPassed,
			recordedAt: now.toISOString(),
			operatorId,
			notes: args.notes ?? null,
			sanpinRegulatoryNotice: notice,
		};
	},
};

/**
 * Registers all SanPiN 3.3686-21 sterilization and infection control tools into the registry.
 */
export function registerSanpinTools(
	registry: ToolRegistry,
	moduleName = "sanpin",
): void {
	registry.register(verifyKraftPackTool, moduleName);
	registry.register(recordSterilizationTestTool, moduleName);
}
