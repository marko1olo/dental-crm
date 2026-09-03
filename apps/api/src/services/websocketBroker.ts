import type { WebSocket } from "ws";
import {
	evaluateClinicalAccess,
	stripDiagnosisPayload,
} from "../security/medicalSecrecyWarden.js";

/**
 * 152-ФЗ / 323-ФЗ ст. 13: Клинические события WebSocket, содержащие врачебную тайну.
 * Данные события КАТЕГОРИЧЕСКИ запрещено передавать неклиническим ролям (маркетологам,
 * администраторам ресепшена, системным администраторам без прав врача).
 */
export const CLINICAL_WS_EVENT_TYPES: ReadonlySet<string> = new Set([
	"UPDATE_ODONTOGRAM",
	"UPDATE_IMPLANT_RECORD",
	"TOOTH_HISTORY_CREATED",
	"CLINICAL_PROTOCOL_UPDATED",
	"PROTOCOL_043_UPDATED",
	"EMR_RECORD_CREATED",
	"EMR_RECORD_UPDATED",
	"EMR_RECORD_DELETED",
	"VISIT_RECORDED",
	"VISIT_CLINICAL_UPDATED",
	"CLINICAL_NOTE_ADDED",
	"CLINICAL_NOTE_UPDATED",
	"DIAGNOSIS_RECORDED",
	"DIAGNOSIS_UPDATED",
	"DIAGNOSIS_SET",
	"DIAGNOSIS_DELETED",
	"ANAMNESIS_UPDATED",
	"TOOTH_EXTRACTION_RECORDED",
	"PERIODONTAL_CHART_UPDATED",
	"ANESTHESIA_LOG_CREATED",
	"ANESTHESIA_LOG_DELETED",
	"PRESCRIPTION_ISSUED",
	"PRESCRIPTION_SIGNED",
	"TREATMENT_PLAN_CREATED",
	"TREATMENT_PLAN_UPDATED",
	"LAB_ORDER_CREATED",
	"LAB_ORDER_UPDATED",
	"LAB_ORDER_STAGE_CHANGED",
	"SPEECH_TRANSCRIPT_INTERIM",
	"SPEECH_TRANSCRIPT_FINAL",
	"SPEECH_ENTITIES_EXTRACTED",
	"HISTOLOGY_ORDER_CREATED",
	"BIOPSY_ORDER_CREATED",
	"PATHOLOGY_REPORT_UPDATED",
	"IMPLANT_PASSPORT_CREATED",
	"IMPLANT_PASSPORT_UPDATED",
]);

export function isClinicalWsEvent(message: unknown): boolean {
	if (!message || typeof message !== "object") return false;
	const msg = message as { type?: unknown; payload?: unknown };
	if (typeof msg.type === "string") {
		const upperType = msg.type.toUpperCase();
		if (CLINICAL_WS_EVENT_TYPES.has(upperType)) return true;
		if (
			upperType.includes("ODONTOGRAM") ||
			upperType.includes("DIAGNOSIS") ||
			upperType.includes("CLINICAL") ||
			upperType.includes("EMR") ||
			upperType.includes("IMPLANT") ||
			upperType.includes("ANAMNESIS") ||
			upperType.includes("PROTOCOL_043") ||
			upperType.includes("PERIO") ||
			upperType.includes("ANESTHESIA") ||
			upperType.includes("PRESCRIPTION") ||
			upperType.includes("TREATMENT_PLAN") ||
			upperType.includes("LAB_ORDER") ||
			upperType.includes("SPEECH") ||
			upperType.includes("TRANSCRIPT") ||
			upperType.includes("BIOPSY") ||
			upperType.includes("PATHOLOGY") ||
			upperType.includes("HISTOLOGY") ||
			upperType.includes("EXTRACTION")
		) {
			return true;
		}
	}
	if (msg.payload && typeof msg.payload === "object") {
		const p = msg.payload as Record<string, unknown>;
		if (
			"odontogram" in p ||
			"toothStates" in p ||
			("states" in p && typeof msg.type === "string" && msg.type.toUpperCase().includes("ODONTOGRAM")) ||
			"clinicalNotes" in p ||
			"clinicalData" in p ||
			"diagnoses" in p ||
			"diagnosis" in p ||
			"mkb10" in p ||
			"emrRecords" in p ||
			"protocols" in p ||
			"toothFormula" in p ||
			"tooth_formula" in p ||
			"toothNumber" in p ||
			"tooth_number" in p ||
			"teeth" in p ||
			"anamnesis" in p ||
			"complaint" in p ||
			"complaints" in p ||
			"treatmentPlan" in p ||
			"treatment_plan" in p ||
			"treatmentDescription" in p ||
			"anesthesia" in p ||
			"prescription" in p ||
			"labOrder" in p ||
			"medicalEntities" in p ||
			"speechTranscript" in p ||
			"transcript" in p
		) {
			return true;
		}
	}
	return false;
}

type ClientConn = {
	ws: WebSocket;
	organizationId: string;
	patientId?: string;
	isClinical?: boolean;
};

const clients = new Set<ClientConn>();

export const wsBroker = {
	addClient(
		ws: WebSocket,
		organizationId: string,
		patientId?: string,
		roleOrClinical?: boolean | string | null,
	) {
		let isClinical = false;
		if (typeof roleOrClinical === "boolean") {
			isClinical = roleOrClinical;
		} else if (typeof roleOrClinical === "string") {
			isClinical = evaluateClinicalAccess(roleOrClinical).hasClinicalAccess;
		}
		const conn: ClientConn = {
			ws,
			organizationId,
			isClinical,
		};
		if (patientId !== undefined) conn.patientId = patientId;
		clients.add(conn);
		if (typeof ws?.on === "function") {
			ws.on("close", () => {
				clients.delete(conn);
			});
			ws.on("error", () => {
				clients.delete(conn);
			});
		}
	},
	broadcastToOrganization(organizationId: string, message: object) {
		const rawData = JSON.stringify(message);
		const isClinical = isClinicalWsEvent(message);
		let sanitizedData: string | null = null;
		for (const client of clients) {
			if (
				client.organizationId === organizationId &&
				client.ws.readyState === 1
			) {
				// Клиническим сотрудникам отдаем полное сообщение
				if (client.isClinical) {
					client.ws.send(rawData);
				} else {
					// 152-ФЗ / 323-ФЗ ст. 13: События с клиническими данными (одонтограмма, диагнозы МКБ,
					// протоколы приемов) фильтруются и не отправляются на сокеты неклинических ролей!
					if (isClinical) {
						continue;
					}
					if (!sanitizedData) {
						sanitizedData = JSON.stringify(stripDiagnosisPayload(message));
					}
					client.ws.send(sanitizedData);
				}
			}
		}
	},
	broadcastToPatient(
		organizationId: string,
		patientId: string,
		message: object,
	) {
		const isClinical = isClinicalWsEvent(message);
		const rawData = JSON.stringify(message);
		let sanitizedData: string | null = null;

		for (const client of clients) {
			if (
				client.organizationId === organizationId &&
				client.patientId === patientId &&
				client.ws.readyState === 1
			) {
				if (client.isClinical) {
					client.ws.send(rawData);
				} else {
					// 152-ФЗ / 323-ФЗ: Сырые клинические события персонала не передаются на сокеты пациентов
					if (isClinical) {
						continue;
					}
					if (!sanitizedData) {
						sanitizedData = JSON.stringify(stripDiagnosisPayload(message));
					}
					client.ws.send(sanitizedData);
				}
			}
		}
	},
};
