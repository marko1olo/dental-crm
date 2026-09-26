import http from "node:http";
import crypto from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import Redis from "ioredis";

// Configuration
const PORT = parseInt(process.env.PORT || "4000", 10);
const RELAY_SECRET = process.env.RELAY_SECRET;
const REDIS_URL = process.env.REDIS_URL;

if (!RELAY_SECRET) {
  console.error("FATAL: RELAY_SECRET environment variable is missing.");
  process.exit(1);
}

// Optional Redis client for pub/sub and distributed relay state
let redis = null;
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      lazyConnect: true,
    });
    redis.connect().then(() => {
      console.log("[Relay:Redis] Connected to Redis successfully.");
    }).catch((err) => {
      console.warn("[Relay:Redis] Warning: Redis connection failed:", err.message);
    });
  } catch (err) {
    console.warn("[Relay:Redis] Redis initialization warning:", err.message);
  }
}

// Active connection state
let clinicSocket = null;
let clinicInfo = { clinicId: "default-clinic", appVersion: "0.1.0", connectedAt: null };
const labSockets = new Map(); // socketId -> { ws, labId, connectedAt }
const pendingRequests = new Map(); // callId -> { resolve, reject, timeout }

// Metrics
const metrics = {
  startedAt: new Date().toISOString(),
  messagesForwarded: 0,
  requestsCompleted: 0,
  requestsFailed: 0,
  lastClinicConnectAt: null,
  lastClinicDisconnectAt: null,
};

// HTTP Request Router
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Relay-Secret");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Healthcheck Endpoint
  if (url.pathname === "/health") {
    const isClinicOnline = clinicSocket !== null && clinicSocket.readyState === WebSocket.OPEN;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      uptime: Math.floor(process.uptime()),
      clinicConnected: isClinicOnline,
      clinicId: isClinicOnline ? clinicInfo.clinicId : null,
      activeLabTunnels: labSockets.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. Metrics & Status Endpoint
  if (url.pathname === "/api/status") {
    const isClinicOnline = clinicSocket !== null && clinicSocket.readyState === WebSocket.OPEN;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      version: "1.0.0",
      service: "dente-cloud-relay",
      isClinicOnline,
      clinic: isClinicOnline ? clinicInfo : null,
      metrics: {
        ...metrics,
        uptimeSeconds: Math.floor(process.uptime()),
        activeLabConnections: labSockets.size,
        pendingRequestCount: pendingRequests.size
      }
    }));
    return;
  }

  // 3. RPC & HTTP Proxy to Clinic (Internal API)
  if ((url.pathname === "/api/rpc/clinic" || url.pathname === "/api/forward") && req.method === "POST") {
    // Validate authentication
    const authHeader = req.headers.authorization || "";
    const secretHeader = req.headers["x-relay-secret"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "") || secretHeader;

    if (!token || !timingSafeEqual(token, RELAY_SECRET)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Unauthorized", message: "Invalid relay secret" }));
      return;
    }

    if (!clinicSocket || clinicSocket.readyState !== WebSocket.OPEN) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: false,
        error: "ClinicOffline",
        message: "Клиника в данный момент офлайн. Запрос может быть поставлен в очередь."
      }));
      return;
    }

    // Read POST body
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const reqId = crypto.randomUUID();

        const reqPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            pendingRequests.delete(reqId);
            metrics.requestsFailed++;
            reject(new Error("Clinic tunnel timeout after 15s"));
          }, 15000);

          pendingRequests.set(reqId, { resolve, reject, timeout });
        });

        // Format tunnel payload matching cloudRelayClient.ts HTTP_REQUEST standard
        const tunnelPayload = {
          type: "HTTP_REQUEST",
          id: reqId,
          clinicId: clinicInfo.clinicId,
          method: payload.method || "POST",
          url: payload.path || payload.url || "/",
          headers: payload.headers || { "content-type": "application/json" },
          body: payload.data ? JSON.stringify(payload.data) : (payload.body || null)
        };

        // Also support rpc_request legacy format
        const rpcPayload = {
          ...tunnelPayload,
          callId: reqId // for backward-compatibility
        };

        clinicSocket.send(JSON.stringify(rpcPayload));
        metrics.messagesForwarded++;

        const response = await reqPromise;
        metrics.requestsCompleted++;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, data: response }));
      } catch (err) {
        res.writeHead(504, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "GatewayTimeout", message: err.message }));
      }
    });
    return;
  }

  // 4. Default Not Found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "NotFound", message: "Relay endpoint not found" }));
});

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Extract auth token
  const tokenParam = url.searchParams.get("token") || "";
  const authHeader = req.headers.authorization || "";
  const tokenHeader = authHeader.replace(/^Bearer\s+/i, "") || req.headers["x-relay-secret"] || "";
  const token = tokenParam || tokenHeader;

  // Validate Secret (accepts RELAY_SECRET or dev token)
  if (!token || (!timingSafeEqual(token, RELAY_SECRET) && token !== "dev-edge-relay-secret-token")) {
    console.warn(`[Relay:WS] Unauthorized upgrade attempt from ${req.socket.remoteAddress} on ${pathname}`);
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  // Route upgrade (supports /edge, /ws/clinic, /clinic/tunnel, /ws)
  if (pathname === "/edge" || pathname === "/ws/clinic" || pathname === "/clinic/tunnel" || pathname === "/ws") {
    const clinicIdParam = url.searchParams.get("clinicId") || "default-clinic";
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, "clinic", clinicIdParam);
    });
  } else if (pathname === "/ws/lab" || pathname === "/lab/tunnel") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, "lab", "lab-technician");
    });
  } else {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
  }
});

wss.on("connection", (ws, req, role, entityId) => {
  const remoteIp = req.socket.remoteAddress;

  if (role === "clinic") {
    console.log(`[Relay:Clinic] Clinic server [${entityId}] connected from ${remoteIp}. Tunnel active.`);
    if (clinicSocket && clinicSocket.readyState === WebSocket.OPEN) {
      console.log("[Relay:Clinic] Terminating older clinic session to ensure single master tunnel.");
      clinicSocket.close(1000, "Superseded by newer clinic connection");
    }

    clinicSocket = ws;
    clinicInfo = {
      clinicId: entityId || "default-clinic",
      appVersion: "0.1.0",
      connectedAt: new Date().toISOString()
    };
    metrics.lastClinicConnectAt = clinicInfo.connectedAt;

    // Notify Redis if available
    if (redis) {
      redis.publish("dente:tunnel_events", JSON.stringify({ event: "clinic_connected", clinicId: clinicInfo.clinicId, timestamp: Date.now() })).catch(() => {});
    }

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // 1. Handle EDGE_HELLO registration
        if (msg.type === "EDGE_HELLO") {
          clinicInfo.clinicId = msg.clinicId || clinicInfo.clinicId;
          clinicInfo.appVersion = msg.appVersion || clinicInfo.appVersion;
          console.log(`[Relay:Clinic] Registered ${clinicInfo.clinicId} (v${clinicInfo.appVersion})`);
          return;
        }

        // 2. Handle Keepalive PING / PONG
        if (msg.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
          return;
        }
        if (msg.type === "pong" || msg.type === "PONG") {
          return;
        }

        // 3. Handle HTTP_RESPONSE from cloudRelayClient.ts
        if (msg.type === "HTTP_RESPONSE" && msg.id) {
          const pending = pendingRequests.get(msg.id);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingRequests.delete(msg.id);
            pending.resolve(msg.body ? JSON.parse(msg.body) : msg);
          }
          return;
        }

        // 4. Handle legacy rpc_response
        if (msg.type === "rpc_response" && msg.callId) {
          const pending = pendingRequests.get(msg.callId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingRequests.delete(msg.callId);
            if (msg.error) {
              pending.reject(new Error(msg.error));
            } else {
              pending.resolve(msg.data);
            }
          }
          return;
        }
      } catch (err) {
        console.warn("[Relay:Clinic] Failed to parse message:", err.message);
      }
    });

    ws.on("close", (code, reason) => {
      console.warn(`[Relay:Clinic] Clinic server disconnected (Code: ${code}, Reason: ${reason}).`);
      if (clinicSocket === ws) {
        clinicSocket = null;
      }
      metrics.lastClinicDisconnectAt = new Date().toISOString();

      if (redis) {
        redis.publish("dente:tunnel_events", JSON.stringify({ event: "clinic_disconnected", timestamp: Date.now() })).catch(() => {});
      }
    });

    ws.on("error", (err) => {
      console.error("[Relay:Clinic] Tunnel socket error:", err.message);
    });

  } else if (role === "lab") {
    const labId = crypto.randomUUID();
    console.log(`[Relay:Lab] Dental lab technician connected: ${labId}`);
    labSockets.set(labId, { ws, connectedAt: Date.now() });

    ws.on("message", (raw) => {
      // Forward lab technician updates to clinic if online
      if (clinicSocket && clinicSocket.readyState === WebSocket.OPEN) {
        clinicSocket.send(raw);
        metrics.messagesForwarded++;
      }
    });

    ws.on("close", () => {
      labSockets.delete(labId);
      console.log(`[Relay:Lab] Dental lab disconnected: ${labId}`);
    });
  }
});

// Heartbeat ping interval to keep stateful firewalls/NAT open
const pingInterval = setInterval(() => {
  if (clinicSocket && clinicSocket.readyState === WebSocket.OPEN) {
    try {
      clinicSocket.send(JSON.stringify({ type: "PING", timestamp: Date.now() }));
    } catch (err) {
      console.warn("[Relay] Failed to ping clinic:", err.message);
    }
  }

  for (const [id, item] of labSockets.entries()) {
    if (item.ws.readyState === WebSocket.OPEN) {
      try {
        item.ws.ping();
      } catch {
        labSockets.delete(id);
      }
    }
  }
}, 20000);

// Constant-time string comparison for security
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Graceful shutdown
function shutdown() {
  console.log("[Relay] Shutting down gracefully...");
  clearInterval(pingInterval);
  if (clinicSocket) clinicSocket.close(1001, "Server shutting down");
  for (const item of labSockets.values()) {
    item.ws.close(1001, "Server shutting down");
  }
  server.close(() => {
    console.log("[Relay] HTTP/WS server closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[DENTE Cloud Relay] Service listening on port ${PORT}`);
  console.log(`[DENTE Cloud Relay] Ready for clinic connections at /edge and /ws/clinic`);
});
