/**
 * dentalLabStatusMapping.ts — Маппинг канонических статусов ЗТЛ и 5-этапного клинического пайплайна.
 * Единый SSOT таблицы переходов и маппинга статусов в PostgreSQL.
 */

import type { Canonical5LabStatus } from "../labMath";
import type { CanonicalPgLabStatus } from "@dental/shared";
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
			return "fitting";
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

export function mapOrderStatusToCanonicalPgStatus(status: DentalLabOrderStatus): CanonicalPgLabStatus {
	switch (status) {
		case "draft":
			return "draft";
		case "sent_to_lab":
			return "sent";
		case "in_progress":
			return "in_progress";
		case "try_in":
			return "fitting";
		case "ready_in_clinic":
			return "ready_in_clinic";
		case "delivered_to_patient":
			return "completed";
		case "warranty_rework":
			return "refitting";
		case "delayed":
			return "in_progress";
		default:
			return "sent";
	}
}

export function getNextLabStatus(current: DentalLabOrderStatus): DentalLabOrderStatus | null {
	switch (current) {
		case "sent_to_lab":
			return "in_progress";
		case "in_progress":
			return "ready_in_clinic";
		case "ready_in_clinic":
			return "try_in";
		case "try_in":
			return "delivered_to_patient";
		case "warranty_rework":
			return "sent_to_lab";
		case "delivered_to_patient":
			return null;
		default:
			return null;
	}
}

export function canTransitionLabStatus(from: DentalLabOrderStatus, to: DentalLabOrderStatus): boolean {
	if (from === to) return true;
	if (to === "warranty_rework") {
		return from === "delivered_to_patient" || from === "try_in" || from === "ready_in_clinic";
	}
	if (from === "warranty_rework") {
		return to === "sent_to_lab" || to === "in_progress" || to === "ready_in_clinic";
	}
	return true;
}
