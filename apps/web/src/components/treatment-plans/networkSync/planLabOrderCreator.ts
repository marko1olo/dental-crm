import { submitExpressLabOrder } from "../../lab/expressLabOrderHelper";
import type { LabOrderCreationParams } from "./types";

export async function createExpressLabOrder({
	patientId,
	doctorId,
	targetTeeth,
	currentTierTitle,
}: LabOrderCreationParams): Promise<void> {
	await submitExpressLabOrder({
		patientId,
		doctorId,
		targetTeeth,
		currentTierTitle,
		sourceContext: "treatment_plan",
	});
}
