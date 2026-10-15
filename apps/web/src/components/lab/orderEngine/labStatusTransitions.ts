import type { DentalLabOrderStatus } from "../dentalLabDefinitions";

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

let _labOrderSequenceCounter = 100;

export function generateDeterministicLabOrderNumber(params?: {
	date?: Date | string;
	patientId?: string;
	patientName?: string;
	sequence?: number;
}): string {
	const d = params?.date ? (typeof params.date === "string" ? new Date(params.date) : params.date) : new Date();
	const year = d.getFullYear();
	const seq = params?.sequence ?? (_labOrderSequenceCounter++);
	return `ЗТЛ-${year}-${String(seq).padStart(3, "0")}`;
}

export function generateDeterministicLabOrderId(params?: {
	patientId?: string;
	date?: Date | string;
	sequence?: number;
}): string {
	const d = params?.date ? (typeof params.date === "string" ? new Date(params.date) : params.date) : new Date();
	const pat = (params?.patientId || "pat").replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001";
	const seq = params?.sequence ?? (_labOrderSequenceCounter++);
	return `ztl-ord-${d.getTime()}-${pat}-${seq}`;
}
