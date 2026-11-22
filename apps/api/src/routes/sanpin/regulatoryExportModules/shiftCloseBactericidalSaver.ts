/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftCloseBactericidalSaver.ts
 * Сохранение наработки бактерицидных облучателей и рециркуляторов при закрытии смены.
 * Мандат 8b: строго <= 120 строк.
 */

import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
} from "../../../db/schema.js";
import {
	calculateBactericidalLampResource,
	calculateCumulativeOperatingHours,
} from "../bactericidalModules/bactericidalHoursCalculator.js";

export async function saveShiftBactericidalRecords(
	tx: TenantDb,
	organizationId: string,
	body: Record<string, unknown>,
	operatorId: string | null,
	dateStr: string,
	operatorName: string,
): Promise<number> {
	const rawRecords =
		body.bactericidalRecords ??
		body.bactericidalLogs ??
		body.bactericidalIrradiatorLogs;

	if (Array.isArray(rawRecords) && rawRecords.length > 0) {
		let count = 0;
		for (const rec of rawRecords as Record<string, unknown>[]) {
			const equipmentId = rec.equipmentId ? String(rec.equipmentId) : undefined;
			if (!equipmentId) continue;

			const [eqItem] = await tx
				.select()
				.from(bactericidalEquipments)
				.where(
					and(
						eq(bactericidalEquipments.id, equipmentId),
						eq(bactericidalEquipments.organizationId, organizationId),
					),
				)
				.for("update");
			if (!eqItem) continue;

			const durationMinutes = Number(rec.durationMinutes) || 360;
			const prevHours = Number(eqItem.totalOperatingHours);
			const newTotalHours = calculateCumulativeOperatingHours(prevHours, durationMinutes);
			const lampLife = calculateBactericidalLampResource(newTotalHours, eqItem.maxLampHours);

			await tx
				.update(bactericidalEquipments)
				.set({
					totalOperatingHours: String(newTotalHours),
					lampStatus: lampLife.status,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(bactericidalEquipments.id, eqItem.id),
						eq(bactericidalEquipments.organizationId, organizationId),
					),
				);

			const startTime = new Date(`${dateStr}T08:00:00Z`);
			const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

			await tx.insert(bactericidalIrradiatorLogs).values({
				organizationId,
				equipmentId: eqItem.id,
				date: dateStr,
				sessionStartTime: startTime,
				sessionEndTime: endTime,
				durationMinutes,
				operatingMode: String(rec.operatingMode || "continuous_presence"),
				cumulativeHoursAfterSession: String(newTotalHours),
				operatorId,
				notes: String(rec.notes || `Рециркулятор воздуха. Фиксация смены: ${operatorName}`),
			});
			count++;
		}
		return count;
	}

	const activeEquipments = await tx
		.select()
		.from(bactericidalEquipments)
		.where(
			and(
				eq(bactericidalEquipments.organizationId, organizationId),
				eq(bactericidalEquipments.isCommissioned, true),
			),
		)
		.for("update");

	if (activeEquipments.length === 0) return 0;

	const durationMinutes = 360;
	for (const eqItem of activeEquipments) {
		const prevHours = Number(eqItem.totalOperatingHours);
		const newTotalHours = calculateCumulativeOperatingHours(prevHours, durationMinutes);
		const lampLife = calculateBactericidalLampResource(newTotalHours, eqItem.maxLampHours);

		await tx
			.update(bactericidalEquipments)
			.set({
				totalOperatingHours: String(newTotalHours),
				lampStatus: lampLife.status,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(bactericidalEquipments.id, eqItem.id),
					eq(bactericidalEquipments.organizationId, organizationId),
				),
			);

		const startTime = new Date(`${dateStr}T08:00:00Z`);
		const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

		await tx.insert(bactericidalIrradiatorLogs).values({
			organizationId,
			equipmentId: eqItem.id,
			date: dateStr,
			sessionStartTime: startTime,
			sessionEndTime: endTime,
			durationMinutes,
			operatingMode: "continuous_presence",
			cumulativeHoursAfterSession: String(newTotalHours),
			operatorId,
			notes: `Автоматический учет смены (6 ч / 360 мин). Ответственный: ${operatorName}`,
		});
	}

	return activeEquipments.length;
}
