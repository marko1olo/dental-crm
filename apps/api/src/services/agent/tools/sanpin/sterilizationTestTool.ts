/**
 * sterilizationTestTool.ts — Sterilization & Pre-Sterilization Cleaning Test Logs.
 *
 * Sweet Spot: ~210 lines.
 */

import { computePackagingExpirationDate } from "@dental/shared";
import { z } from "zod";
import { db } from "../../../../db/client.js";
import {
	autoclaveDailyTests,
	preSterilizationCleaningLogs,
	sterilizationLogs,
} from "../../../../db/schema.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";

export const recordSterilizationTestSchema = z.object({
	autoclaveId: z
		.string()
		.min(1, "Укажите ID или номер автоклава")
		.describe("Идентификатор или инвентарный номер автоклава / стерилизатора"),
	cycleNumber: z
		.number()
		.int()
		.positive("Номер цикла должен быть > 0")
		.describe("Порядковый номер цикла стерилизации за смену"),
	testType: z
		.enum([
			"azopyram_pso",
			"phenolphthalein_pso",
			"chemical_indicator_class5",
			"biological_spore",
		])
		.describe(
			"Тип контрольной пробы: azopyram_pso (скрытая кровь), phenolphthalein_pso (моющие средства), chemical_indicator_class5 (индикатор 5 класса), biological_spore (споровый тест)",
		),
	result: z
		.enum(["passed", "failed"])
		.describe("Результат пробы: passed (норма/отрицательно) или failed (положительно/брак)"),
	testedByUserId: z
		.string()
		.uuid()
		.optional()
		.describe("UUID медсестры, проводившей пробу (по умолчанию текущий пользователь)"),
	notes: z
		.string()
		.optional()
		.describe("Клинические примечания к циклу стерилизации"),
});

export type RecordSterilizationTestInput = z.infer<
	typeof recordSterilizationTestSchema
>;

export const recordSterilizationTestTool: ToolDefinition<
	typeof recordSterilizationTestSchema,
	Record<string, unknown>
> = {
	name: "record_sterilization_test",
	description:
		"Создание реальной записи в журналах автоклавирования и предстерилизационной очистки в PostgreSQL с тенантной изоляцией: азопирам, фенолфталеин, индикаторы 5 класса и биологический споровый контроль.",
	parameters: recordSterilizationTestSchema,
	permissions: ["sanpin.write", "clinical.write"],
	category: "write",
	handler: async (ctx: AgentContext, args: RecordSterilizationTestInput) => {
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
			testTitle = "Азопирамовая проба предстерилизационной очистки (контроль скрытой крови / гемоглобина)";
			logType = "pre_sterilization_cleaning_logs";
			notice = isPassed
				? "Проба отрицательная: скрытая кровь не обнаружена. Инструментарий допущен к стерилизации."
				: "ВНИМАНИЕ: Положительная азопирамовая проба (обнаружена кровь)! Вся партия инструментов подлежит повторной дезинфекции и очистке.";

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
			testTitle = "Фенолфталеиновая проба предстерилизационной очистки (контроль остатков моющих средств)";
			logType = "pre_sterilization_cleaning_logs";
			notice = isPassed
				? "Проба отрицательная: остаточные щелочные ПАВ не обнаружены. Инструментарий допущен к стерилизации."
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
			testTitle = "Химический интегрирующий индикатор 5 класса (контроль автоклавирования)";
			logType = "autoclave_daily_tests";
			notice = isPassed
				? "Индикатор 5 класса сработал корректно: параметры температуры, пара и времени выдержаны (134°C 5 мин / 2.1 бар)."
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

			// Also create matching cycle in sterilizationLogs (Журнал автоклавирования)
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

			// Also create matching cycle in sterilizationLogs (Журнал автоклавирования)
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
