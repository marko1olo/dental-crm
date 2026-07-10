import type { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export const wsBroker = {
  addClient(conn: WebSocket) {
    clients.add(conn);
    conn.on("close", () => {
      clients.delete(conn);
    });
    conn.on("error", () => {
      clients.delete(conn);
    });
  },
  broadcast(message: object) {
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === 1) { // OPEN
        client.send(data);
      }
    }
  }
};
