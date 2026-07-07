import type { FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";

// Global connection pool
const connections = new Set<WebSocket>();

export async function setupWebsockets(app: FastifyInstance) {
  // Register the plugin
  await app.register(fastifyWebsocket);

  // Define the WS route
  app.get("/api/ws", { websocket: true }, (connection, req) => {
    // Cast fastify websocket wrapper to native WebSocket if needed, or just keep it
    const ws = connection.socket;
    connections.add(ws);

    ws.on("message", (message: Buffer) => {
      // In a real app, handle PING/PONG or client events
      const msgStr = message.toString();
      if (msgStr === "PING") {
        ws.send("PONG");
      }
    });

    ws.on("close", () => {
      connections.delete(ws);
    });
  });
}

/**
 * Broadcast an event to all connected clients
 */
export function broadcastWsEvent(type: string, payload: any) {
  const message = JSON.stringify({ type, payload });
  for (const ws of connections) {
    if (ws.readyState === 1) { // OPEN
      ws.send(message);
    }
  }
}
