import type { WebSocket } from "ws";
import { BoundedTtlMap } from "../lib/boundedTtlMap.js";
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
	const msgType = "type" in message && typeof message.type === "string" ? message.type : undefined;
	if (msgType !== undefined) {
		const upperType = msgType.toUpperCase();
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
	if ("payload" in message && message.payload && typeof message.payload === "object") {
		const p = message.payload;
		if (
			"odontogram" in p ||
			"toothStates" in p ||
			("states" in p && msgType !== undefined && msgType.toUpperCase().includes("ODONTOGRAM")) ||
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

export type WsClientSocket =
	| WebSocket
	| {
			readyState: number;
			ping?: () => void;
			terminate: () => void;
			on?: (event: string, listener: (...args: unknown[]) => void) => void;
			send: (data: string, cb?: (err?: Error) => void) => void;
	  };

export type ClientConn = {
	ws: WsClientSocket;
	organizationId: string;
	branchId?: string | undefined;
	patientId?: string | undefined;
	userId?: string | undefined;
	role?: string | undefined;
	isClinical?: boolean | undefined;
	isPatient?: boolean | undefined;
	presence?: StaffPresenceInfo | undefined;
	isAlive?: boolean | undefined;
};

const clients = new BoundedTtlMap<ClientConn, true>({
	maxEntries: 2000,
	touchOnGet: false,
	onEvict: (client, _val, reason) => {
		if (reason === "capacity") {
			try {
				client.ws.terminate();
			} catch {
				// socket already closed
			}
		}
	},
});

function isStrictSecrecyClient(client: ClientConn): boolean {
	return (
		client.isPatient === true ||
		!client.role ||
		client.role === "marketer" ||
		client.role === "marketing" ||
		client.role === "patient"
	);
}
const PRESENCE_TTL_MS = 45_000;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export const wsBroker = {
	addClient(
		ws: WsClientSocket,
		organizationId: string,
		patientIdOrOptions?: string | {
			patientId?: string | undefined;
			roleOrClinical?: boolean | string | null | undefined;
			branchId?: string | undefined;
			userId?: string | undefined;
			isPatient?: boolean | undefined;
		} | undefined,
		roleOrClinical?: boolean | string | null | undefined,
		branchId?: string | undefined,
		userId?: string | undefined,
		isPatient?: boolean | undefined,
	) {
		let patientId: string | undefined;
		let clinicalParam = roleOrClinical;
		let branch = branchId;
		let user = userId;
		let patientFlag = isPatient ?? false;

		if (typeof patientIdOrOptions === "object" && patientIdOrOptions !== null) {
			patientId = patientIdOrOptions.patientId;
			clinicalParam = patientIdOrOptions.roleOrClinical;
			branch = patientIdOrOptions.branchId;
			user = patientIdOrOptions.userId;
			patientFlag = patientIdOrOptions.isPatient ?? false;
		} else {
			patientId = patientIdOrOptions;
		}

		let isClinical = false;
		let normalizedClientRole: string | undefined = patientFlag ? "patient" : undefined;
		if (typeof clinicalParam === "boolean") {
			isClinical = clinicalParam;
		} else if (typeof clinicalParam === "string") {
			normalizedClientRole = clinicalParam.trim().toLowerCase() || normalizedClientRole;
			isClinical = evaluateClinicalAccess(clinicalParam).hasClinicalAccess;
		}
		const conn: ClientConn = {
			ws,
			organizationId,
			branchId: branch ? branch : undefined,
			patientId: patientId ? patientId : undefined,
			userId: user ? user : undefined,
			role: normalizedClientRole,
			isClinical,
			isPatient: patientFlag,
			isAlive: true,
		};
		clients.set(conn, true);
		if (typeof ws?.on === "function") {
			ws.on("pong", () => {
				conn.isAlive = true;
			});
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
		ws: WsClientSocket,
		organizationId: string,
		info: Omit<StaffPresenceInfo, "lastSeen">,
	): StaffPresenceInfo | null {
		let targetConn: ClientConn | null = null;
		for (const client of clients.keys()) {
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
	removePresence(ws: WsClientSocket): boolean {
		let targetConn: ClientConn | null = null;
		for (const client of clients.keys()) {
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

		for (const client of clients.keys()) {
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
	broadcastToOrganization(
		organizationId: string,
		message: object,
		branchId?: string,
	) {
		const rawData = JSON.stringify(message);
		const isClinical = isClinicalWsEvent(message);
		let sanitizedData: string | null = null;
		let strictSanitizedData: string | null = null;
		for (const client of clients.keys()) {
			if (client.ws.readyState !== 1) {
				if (client.ws.readyState === 2 || client.ws.readyState === 3) {
					clients.delete(client);
				}
				continue;
			}
			if (client.organizationId === organizationId) {
				// Межпользовательская изоляция: сокеты пациентов НЕ получают общеклинические события персонала
				if (client.isPatient) {
					continue;
				}
				// Branch-level isolation: if branchId is specified, only send to matching branch (or un-scoped client)
				if (branchId && client.branchId && client.branchId !== branchId) {
					continue;
				}
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
					let payloadToSend: string;
					if (isStrictSecrecyClient(client)) {
						if (!strictSanitizedData) {
							strictSanitizedData = JSON.stringify(stripDiagnosisPayload(message, { strict: true }));
						}
						payloadToSend = strictSanitizedData;
					} else {
						if (!sanitizedData) {
							sanitizedData = JSON.stringify(stripDiagnosisPayload(message, { strict: false }));
						}
						payloadToSend = sanitizedData;
					}
					try {
						client.ws.send(payloadToSend, (err) => {
							if (err) clients.delete(client);
						});
					} catch {
						clients.delete(client);
					}
				}
			}
		}
	},
	broadcastToBranch(organizationId: string, branchId: string, message: object) {
		this.broadcastToOrganization(organizationId, message, branchId);
	},
	broadcastToPatient(
		organizationId: string,
		patientId: string,
		message: object,
	) {
		const isClinical = isClinicalWsEvent(message);
		const rawData = JSON.stringify(message);
		let sanitizedData: string | null = null;
		let strictSanitizedData: string | null = null;

		for (const client of clients.keys()) {
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
					let payloadToSend: string;
					if (isStrictSecrecyClient(client)) {
						if (!strictSanitizedData) {
							strictSanitizedData = JSON.stringify(stripDiagnosisPayload(message, { strict: true }));
						}
						payloadToSend = strictSanitizedData;
					} else {
						if (!sanitizedData) {
							sanitizedData = JSON.stringify(stripDiagnosisPayload(message, { strict: false }));
						}
						payloadToSend = sanitizedData;
					}
					try {
						client.ws.send(payloadToSend, (err) => {
							if (err) clients.delete(client);
						});
					} catch {
						clients.delete(client);
					}
				}
			}
		}
	},
	broadcastToUser(
		organizationId: string,
		userId: string,
		message: object,
	) {
		const isClinical = isClinicalWsEvent(message);
		const rawData = JSON.stringify(message);
		let sanitizedData: string | null = null;
		let strictSanitizedData: string | null = null;

		for (const client of clients.keys()) {
			if (client.ws.readyState !== 1) {
				if (client.ws.readyState === 2 || client.ws.readyState === 3) {
					clients.delete(client);
				}
				continue;
			}
			if (client.organizationId === organizationId && client.userId === userId) {
				if (client.isClinical) {
					try {
						client.ws.send(rawData, (err) => {
							if (err) clients.delete(client);
						});
					} catch {
						clients.delete(client);
					}
				} else {
					if (isClinical) {
						continue;
					}
					let payloadToSend: string;
					if (isStrictSecrecyClient(client)) {
						if (!strictSanitizedData) {
							strictSanitizedData = JSON.stringify(stripDiagnosisPayload(message, { strict: true }));
						}
						payloadToSend = strictSanitizedData;
					} else {
						if (!sanitizedData) {
							sanitizedData = JSON.stringify(stripDiagnosisPayload(message, { strict: false }));
						}
						payloadToSend = sanitizedData;
					}
					try {
						client.ws.send(payloadToSend, (err) => {
							if (err) clients.delete(client);
						});
					} catch {
						clients.delete(client);
					}
				}
			}
		}
	},
	removeClient(ws: WsClientSocket): boolean {
		wsBroker.removePresence(ws);
		let removed = false;
		for (const client of clients.keys()) {
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
		for (const client of clients.keys()) {
			if (client.ws.readyState !== 1) {
				clients.delete(client);
				count++;
			}
		}
		return count;
	},
	startHeartbeat(intervalMs = 30_000): void {
		if (heartbeatTimer) {
			clearInterval(heartbeatTimer);
		}
		const timer = setInterval(() => {
			for (const client of clients.keys()) {
				if (client.isAlive === false) {
					wsBroker.removePresence(client.ws);
					try {
						client.ws.terminate();
					} catch {
						clients.delete(client);
					}
					clients.delete(client);
					continue;
				}
				client.isAlive = false;
				try {
					if (typeof client.ws.ping === "function") {
						client.ws.ping();
					}
				} catch {
					wsBroker.removePresence(client.ws);
					clients.delete(client);
				}
			}
		}, intervalMs);
		timer.unref();
		heartbeatTimer = timer;
	},
	stopHeartbeat(): void {
		if (heartbeatTimer) {
			clearInterval(heartbeatTimer);
			heartbeatTimer = null;
		}
	},
	clear(): void {
		wsBroker.stopHeartbeat();
		for (const client of clients.keys()) {
			try {
				client.ws.terminate();
			} catch {
				// ignore socket cleanup error during shutdown
			}
		}
		clients.clear();
	},
};
