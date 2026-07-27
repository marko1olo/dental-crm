/**
 * Проверяет, существует ли вообще WebSocket-эндпоинт /api/ws/schedule.
 * Клиентские компоненты подключаются двумя разными путями: часть напрямую
 * на :4100, часть через хост страницы (:5173, прокси Vite). Проверяются оба.
 */
import { WebSocket } from "ws";

const targets = [
	"ws://127.0.0.1:4100/api/ws/schedule",
	"ws://127.0.0.1:5173/api/ws/schedule",
];

for (const url of targets) {
	await new Promise((resolve) => {
		const ws = new WebSocket(url);
		const done = (verdict) => {
			console.log(`${url}\n    ${verdict}`);
			try {
				ws.close();
			} catch {}
			resolve();
		};
		const timer = setTimeout(() => done("ТАЙМАУТ 5с — ответа нет"), 5000);
		ws.on("open", () => {
			clearTimeout(timer);
			done("СОЕДИНЕНИЕ ОТКРЫТО");
		});
		ws.on("unexpected-response", (_req, res) => {
			clearTimeout(timer);
			done(`ОТКАЗ: HTTP ${res.statusCode} ${res.statusMessage} — эндпоинта нет`);
		});
		ws.on("error", (e) => {
			clearTimeout(timer);
			done(`ОШИБКА: ${String(e.message).slice(0, 120)}`);
		});
	});
}

// Есть ли вообще регистрация плагина на сервере.
const res = await fetch("http://127.0.0.1:4100/api/ws/schedule").catch((e) => ({ status: `нет ответа: ${e.message}` }));
console.log(`\nобычный GET /api/ws/schedule → HTTP ${res.status}`);
