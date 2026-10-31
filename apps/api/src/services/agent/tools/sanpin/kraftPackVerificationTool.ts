/**
 * kraftPackVerificationTool.ts — Verification of Sterile Kraft Packs & Autoclave Cycles.
 *
 * Sweet Spot: ~260 lines.
 */

import {
	computePackagingExpirationDate,
	STERILIZATION_INDICATOR_TYPES,
	STERILIZATION_PACKAGING_TYPES,
	type SterilizationPackagingType,
} from "@dental/shared";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db/client.js";
import { sterilizationLogs, users } from "../../../../db/schema.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";

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

export type VerifyKraftPackInput = z.infer<typeof verifyKraftPackSchema>;

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
	handler: async (ctx: AgentContext, args: VerifyKraftPackInput): Promise<VerifyKraftPackResult> => {
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
					"Крафт-пакет или партия стерилизации не найдены в электронном журнале ЦСО клиники (Журнал автоклавирования по СанПиН 3.3686-21).",
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
