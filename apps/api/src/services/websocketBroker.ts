import type { WebSocket } from "ws";
import {
	evaluateClinicalAccess,
	stripDiagnosisPayload,
} from "../security/medicalSecrecyWarden.js";

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
		let sanitizedData: string | null = null;
		for (const client of clients) {
			if (
				client.organizationId === organizationId &&
				client.ws.readyState === 1
			) {
				// Клиническим сотрудникам отдаем полное сообщение, неклиническим — усеченное (152-ФЗ / 323-ФЗ)
				if (client.isClinical) {
					client.ws.send(rawData);
				} else {
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
		const data = JSON.stringify(stripDiagnosisPayload(message));
		for (const client of clients) {
			if (
				client.organizationId === organizationId &&
				client.patientId === patientId &&
				client.ws.readyState === 1
			) {
				client.ws.send(data);
			}
		}
	},
};
