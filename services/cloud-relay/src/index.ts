import { loadRelayConfig } from "./config.js";
import { RelayServer } from "./relayServer.js";

async function main() {
	const config = loadRelayConfig();
	const server = new RelayServer({
		port: config.PORT,
		host: config.HOST,
		edgeAuthToken: config.EDGE_AUTH_TOKEN,
		defaultClinicId: config.DEFAULT_CLINIC_ID,
		requestTimeoutMs: config.REQUEST_TIMEOUT_MS,
		maxPayloadBytes: config.MAX_PAYLOAD_BYTES,
	});

	const url = await server.start();
	console.log(`[CloudRelay] Облачный шлюз NAT Traversal запущен на ${url}`);
	console.log(
		`[CloudRelay] Ожидание исходящих WSS подключений от серверов клиник на ${url.replace("http", "ws")}/edge?token=...`,
	);

	const shutdown = async (signal: string) => {
		console.log(`[CloudRelay] Получен сигнал ${signal}, корректное завершение...`);
		await server.stop();
		process.exit(0);
	};

	process.on("SIGINT", () => void shutdown("SIGINT"));
	process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

if (process.env.NODE_ENV !== "test") {
	main().catch((err) => {
		console.error("[CloudRelay] Фатальная ошибка запуска:", err);
		process.exit(1);
	});
}

export * from "./config.js";
export * from "./relayServer.js";
export * from "./types.js";
