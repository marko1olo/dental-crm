import type { WebSocket } from "ws";

type ClientConn = {
  ws: WebSocket;
  organizationId: string;
  patientId?: string;
};

const clients = new Set<ClientConn>();

export const wsBroker = {
  addClient(ws: WebSocket, organizationId: string, patientId?: string) {
    const conn: ClientConn = { ws, organizationId };
    if (patientId !== undefined) conn.patientId = patientId;
    clients.add(conn);
    ws.on("close", () => {
      clients.delete(conn);
    });
    ws.on("error", () => {
      clients.delete(conn);
    });
  },
  broadcast(message: object) {
    // Kept for backward compatibility if needed, but discouraged
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.ws.readyState === 1) { // OPEN
        client.ws.send(data);
      }
    }
  },
  broadcastToOrganization(organizationId: string, message: object) {
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.organizationId === organizationId && client.ws.readyState === 1) {
        client.ws.send(data);
      }
    }
  },
  broadcastToPatient(organizationId: string, patientId: string, message: object) {
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.organizationId === organizationId && client.patientId === patientId && client.ws.readyState === 1) {
        client.ws.send(data);
      }
    }
  }
};
