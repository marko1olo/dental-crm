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

export interface StaffPresenceInfo {
	staffId: string;
	staffName: string;
	role: string;
	visitId?: string | undefined;
	patientId?: string | undefined;
	action: "viewing" | "editing";
	lastSeen: number;
}

type ClientConn = {
	ws: WebSocket;
	organizationId: string;
	patientId?: string | undefined;
	isClinical?: boolean | undefined;
	presence?: StaffPresenceInfo | undefined;
};

const clients = new Set<ClientConn>();
const PRESENCE_TTL_MS = 45_000;

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
				wsBroker.removePresence(ws);
				clients.delete(conn);
			});
			ws.on("error", () => {
				wsBroker.removePresence(ws);
				clients.delete(conn);
			});
		}
	},
	updatePresence(
		ws: WebSocket,
		organizationId: string,
		info: Omit<StaffPresenceInfo, "lastSeen">,
	): StaffPresenceInfo | null {
		let targetConn: ClientConn | null = null;
		for (const client of clients) {
			if (client.ws === ws) {
				targetConn = client;
				break;
			}
		}
		if (!targetConn) return null;

		const fullPresence: StaffPresenceInfo = {
			...info,
			lastSeen: Date.now(),
		};
		targetConn.presence = fullPresence;

		// Рассылаем обновление коллегам в той же клинике/организации
		const activePeers = this.getPresence(organizationId, {
			visitId: info.visitId,
			patientId: info.patientId,
		});

		this.broadcastToOrganization(organizationId, {
			type: "STAFF_PRESENCE_UPDATE",
			payload: {
				presence: fullPresence,
				activePeers,
				visitId: info.visitId,
				patientId: info.patientId,
			},
		});

		return fullPresence;
	},
	removePresence(ws: WebSocket): boolean {
		let targetConn: ClientConn | null = null;
		for (const client of clients) {
			if (client.ws === ws) {
				targetConn = client;
				break;
			}
		}
		if (!targetConn || !targetConn.presence) return false;

		const old = targetConn.presence;
		targetConn.presence = undefined;

		const activePeers = this.getPresence(targetConn.organizationId, {
			visitId: old.visitId,
			patientId: old.patientId,
		});

		this.broadcastToOrganization(targetConn.organizationId, {
			type: "STAFF_PRESENCE_LEAVE",
			payload: {
				staffId: old.staffId,
				visitId: old.visitId,
				patientId: old.patientId,
				activePeers,
			},
		});

		return true;
	},
	getPresence(
		organizationId: string,
		filter?: { visitId?: string | undefined; patientId?: string | undefined } | undefined,
	): StaffPresenceInfo[] {
		const now = Date.now();
		const result: StaffPresenceInfo[] = [];
		const seenStaff = new Set<string>();

		for (const client of clients) {
			if (client.organizationId !== organizationId) continue;
			if (!client.presence) continue;
			if (now - client.presence.lastSeen > PRESENCE_TTL_MS) {
				client.presence = undefined;
				continue;
			}
			if (filter?.visitId && client.presence.visitId !== filter.visitId) continue;
			if (filter?.patientId && client.presence.patientId !== filter.patientId) continue;

			if (!seenStaff.has(client.presence.staffId)) {
				seenStaff.add(client.presence.staffId);
				result.push(client.presence);
			}
		}
		return result;
	},
	broadcastToOrganization(organizationId: string, message: object) {
		const rawData = JSON.stringify(message);
		const isClinical = isClinicalWsEvent(message);
		let sanitizedData: string | null = null;
		for (const client of clients) {
			if (client.ws.readyState !== 1) {
				if (client.ws.readyState === 2 || client.ws.readyState === 3) {
					clients.delete(client);
				}
				continue;
			}
			if (client.organizationId === organizationId) {
				if (client.isClinical) {
					try {
						client.ws.send(rawData, (err) => {
							if (err) clients.delete(client);
						});
					} catch {
						clients.delete(client);
					}
				} else {
					// 152-ФЗ / 323-ФЗ ст. 13: События с клиническими данными (одонтограмма, диагнозы МКБ,
					// протоколы приемов) фильтруются и не отправляются на сокеты неклинических ролей!
					if (isClinical) {
						continue;
					}
					if (!sanitizedData) {
						sanitizedData = JSON.stringify(stripDiagnosisPayload(message));
					}
					try {
						client.ws.send(sanitizedData, (err) => {
							if (err) clients.delete(client);
						});
					} catch {
						clients.delete(client);
					}
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
			if (client.ws.readyState !== 1) {
				if (client.ws.readyState === 2 || client.ws.readyState === 3) {
					clients.delete(client);
				}
				continue;
			}
			if (
				client.organizationId === organizationId &&
				client.patientId === patientId
			) {
				if (client.isClinical) {
					try {
						client.ws.send(rawData, (err) => {
							if (err) clients.delete(client);
						});
					} catch {
						clients.delete(client);
					}
				} else {
					// 152-ФЗ / 323-ФЗ: Сырые клинические события персонала не передаются на сокеты пациентов
					if (isClinical) {
						continue;
					}
					if (!sanitizedData) {
						sanitizedData = JSON.stringify(stripDiagnosisPayload(message));
					}
					try {
						client.ws.send(sanitizedData, (err) => {
							if (err) clients.delete(client);
						});
					} catch {
						clients.delete(client);
					}
				}
			}
		}
	},
	removeClient(ws: WebSocket): boolean {
		wsBroker.removePresence(ws);
		let removed = false;
		for (const client of clients) {
			if (client.ws === ws) {
				clients.delete(client);
				removed = true;
			}
		}
		return removed;
	},
	getClientCount(): number {
		return clients.size;
	},
	pruneDeadClients(): number {
		let count = 0;
		for (const client of clients) {
			if (client.ws.readyState !== 1) {
				clients.delete(client);
				count++;
			}
		}
		return count;
	},
	clear(): void {
		clients.clear();
	},
};
