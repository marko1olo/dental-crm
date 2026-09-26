/**
 * types.ts — Протокол туннелирования между облачным релеем и локальным сервером клиники.
 *
 * Архитектура NAT Traversal:
 * Клиника находится за серым IP провайдера (CGNAT) без белого IP и проброшенных портов.
 * Локальный сервер клиники открывает ИСХОДЯЩЕЕ TLS WebSocket-соединение к облачному шлюзу VPS:
 * wss://relay.yourdomain.com/edge?token=...&clinicId=...
 *
 * Облачный шлюз проксирует входящие HTTP-запросы от зубных техников и сторонних лабораторий
 * через мультиплексированный туннель к локальному серверу клиники и возвращает ответ.
 */

export interface TunnelHttpRequest {
	readonly type: "HTTP_REQUEST";
	readonly id: string;
	readonly clinicId: string;
	readonly method: string;
	readonly url: string;
	readonly headers: Record<string, string>;
	readonly body?: string | null;
	readonly isBase64?: boolean;
}

export interface TunnelHttpResponse {
	readonly type: "HTTP_RESPONSE";
	readonly id: string;
	readonly statusCode: number;
	readonly headers?: Record<string, string>;
	readonly body?: string | null;
	readonly isBase64?: boolean;
}

export interface TunnelPingMessage {
	readonly type: "PING";
	readonly timestamp: number;
}

export interface TunnelPongMessage {
	readonly type: "PONG";
	readonly timestamp: number;
}

export interface TunnelEdgeHello {
	readonly type: "EDGE_HELLO";
	readonly clinicId: string;
	readonly clinicName?: string;
	readonly appVersion?: string;
}

export type TunnelMessage =
	| TunnelHttpRequest
	| TunnelHttpResponse
	| TunnelPingMessage
	| TunnelPongMessage
	| TunnelEdgeHello;

export interface PendingRequest {
	readonly resolve: (res: TunnelHttpResponse) => void;
	readonly reject: (err: Error) => void;
	readonly timer: NodeJS.Timeout;
	readonly startedAt: number;
	readonly method: string;
	readonly url: string;
}

export interface RelayServerOptions {
	readonly port?: number;
	readonly host?: string;
	readonly edgeAuthToken: string;
	readonly defaultClinicId?: string;
	readonly requestTimeoutMs?: number;
	readonly maxPayloadBytes?: number;
}

export interface RelayHealthStatus {
	readonly status: "ok" | "degraded";
	readonly uptimeSeconds: number;
	readonly connectedClinicsCount: number;
	readonly connectedClinics: readonly string[];
	readonly activeRequestsCount: number;
}
