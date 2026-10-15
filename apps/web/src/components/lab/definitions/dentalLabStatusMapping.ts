/**
 * dentalLabStatusMapping.ts — Маппинг канонических статусов ЗТЛ и 5-этапного клинического пайплайна.
 */

import type { Canonical5LabStatus } from "../labMath";
import type { DentalLabOrderStatus } from "./dentalLabStatusData";

export function mapOrderStatusToCanonical5(status: DentalLabOrderStatus): Canonical5LabStatus {
	switch (status) {
		case "sent_to_lab":
			return "sent";
		case "in_progress":
			return "in_progress";
		case "try_in":
			return "fitting";
		case "ready_in_clinic":
			return "ready";
		case "delivered_to_patient":
			return "completed";
		case "warranty_rework":
			return "sent";
		default:
			return "sent";
	}
}

export function mapCanonical5ToOrderStatus(canonical: Canonical5LabStatus): DentalLabOrderStatus {
	switch (canonical) {
		case "sent":
			return "sent_to_lab";
		case "in_progress":
			return "in_progress";
		case "fitting":
			return "try_in";
		case "ready":
			return "ready_in_clinic";
		case "completed":
			return "delivered_to_patient";
		default:
			return "sent_to_lab";
	}
}
