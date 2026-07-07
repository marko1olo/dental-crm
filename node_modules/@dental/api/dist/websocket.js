import fastifyWebsocket from "@fastify/websocket";
// Global connection pool
const connections = new Set();
export async function setupWebsockets(app) {
    // Register the plugin
    await app.register(fastifyWebsocket);
    // Define the WS route
    app.get("/api/ws", { websocket: true }, (connection, _req) => {
        const ws = connection.socket ?? connection;
        connections.add(ws);
        ws.on("message", (message) => {
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
export function broadcastWsEvent(type, payload) {
    const message = JSON.stringify({ type, payload });
    for (const ws of connections) {
        if (ws.readyState === 1) { // OPEN
            ws.send(message);
        }
    }
}
