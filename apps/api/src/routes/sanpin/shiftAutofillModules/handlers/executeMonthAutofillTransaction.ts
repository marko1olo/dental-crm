import { and, eq } from "drizzle-orm";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	medicalWasteLogs,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
} from "../../../../db/schema.js";
import {
	calculateMonthWorkingDates,
	generateMonthBatchRows,
	getDefaultBactericidalEquipments,
	getDefaultTemperatureHumidityEquipments,
} from "../shiftAutofillCalculators.js";
import type { DatabaseTransaction, MonthAutofillParams } from "./executeShiftAutofillTransaction.js";

export async function executeMonthAutofillTransaction(
	tx: DatabaseTransaction,
	params: MonthAutofillParams,
): Promise<{
	insertedSterilCount: number;
	insertedPsoCount: number;
	workingDaysCount: number;
	monthLabelRu: string;
}> {
	const { organizationId, body, operatorId } = params;
	const { workingDates, monthLabelRu } = calculateMonthWorkingDates(
		body.year,
		body.month,
	);

	let activeEquips = await tx
		.select()
		.from(bactericidalEquipments)
		.where(
			and(
				eq(bactericidalEquipments.organizationId, organizationId),
				eq(bactericidalEquipments.isCommissioned, true),
			),
		);

	if (activeEquips.length === 0) {
		activeEquips = await tx
			.insert(bactericidalEquipments)
			.values(getDefaultBactericidalEquipments(organizationId))
			.returning();
	}

	let tempEquips = await tx
		.select()
		.from(temperatureHumidityEquipments)
		.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

	if (tempEquips.length === 0) {
		tempEquips = await tx
			.insert(temperatureHumidityEquipments)
			.values(getDefaultTemperatureHumidityEquipments(organizationId))
			.returning();
	}

	const batchRows = generateMonthBatchRows({
		workingDates,
		organizationId,
		activeEquips,
		tempEquips,
		operatorId,
	});

	const insertedSteril = await tx.insert(sterilizationLogs).values(batchRows.allSterilRows).returning();
	const insertedPso = await tx.insert(preSterilizationCleaningLogs).values(batchRows.allPsoRows).returning();

	if (batchRows.allBactLogs.length > 0) {
		await tx.insert(bactericidalIrradiatorLogs).values(batchRows.allBactLogs);
	}
	if (batchRows.allTempLogs.length > 0) {
		await tx.insert(temperatureHumidityLogs).values(batchRows.allTempLogs);
	}
	if (batchRows.allWasteLogs.length > 0) {
		await tx.insert(medicalWasteLogs).values(batchRows.allWasteLogs);
	}

	return {
		insertedSterilCount: insertedSteril.length,
		insertedPsoCount: insertedPso.length,
		workingDaysCount: workingDates.length,
		monthLabelRu,
	};
}
