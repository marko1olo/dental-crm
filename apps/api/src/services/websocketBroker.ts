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
	"ANAMNESIS_UPDATED",
	"TOOTH_EXTRACTION_RECORDED",
	"PERIODONTAL_CHART_UPDATED",
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
			upperType.includes("PERIO")
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
			"protocols" in p
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
		ws.on("close", () => {
			clients.delete(conn);
		});
		ws.on("error", () => {
			clients.delete(conn);
		});
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
