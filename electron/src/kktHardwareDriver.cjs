/**
 * DENTE Dental CRM — Honest KKT Hardware Driver (TCP Socket Client)
 */

const net = require("node:net");
const framing = require("./kktProtocolFramingCjs.cjs");

function checkKktStatusTcpSocket({ host, port, protocol = "atol", timeoutMs = 2000 } = {}) {
	return new Promise((resolve) => {
		if (!host || !port) {
			return resolve(
				framing.makeUnreachableStatus({
					latencyMs: 0,
					status: "invalid_config",
					error: "Не указаны host и port фискального регистратора",
				}),
			);
		}

		const startTime = Date.now();
		const socket = new net.Socket();
		let responseData = Buffer.alloc(0);
		let resolved = false;

		const finish = (result) => {
			if (resolved) return;
			resolved = true;
			clearTimeout(timeout);
			socket.destroy();
			resolve(result);
		};

		const timeout = setTimeout(() => {
			finish(
				framing.makeUnreachableStatus({
					latencyMs: Date.now() - startTime,
					status: "unreachable",
					error: `Таймаут опроса ККТ ${host}:${port} (${timeoutMs}мс)`,
				}),
			);
		}, timeoutMs);
		if (typeof timeout.unref === "function") timeout.unref();

		socket.connect(port, host, () => {
			const packet =
				protocol === "shtrih"
					? framing.buildShtrikhMCommandPacket(0x11, Buffer.alloc(0), 30)
					: protocol === "atol_v3"
						? framing.buildAtolV3StatusPacket()
						: framing.buildAtolStatusHttpRequest(host, port);
			socket.write(packet);
		});

		socket.on("data", (chunk) => {
			if (resolved) return;
			const bufChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			responseData = Buffer.concat([responseData, bufChunk]);
			if (framing.isKktTcpResponseComplete(protocol, responseData)) {
				finish(framing.parseKktStatusFrame(protocol, responseData, Date.now() - startTime));
			}
		});

		socket.on("end", () => {
			if (!resolved) {
				finish(framing.parseKktStatusFrame(protocol, responseData, Date.now() - startTime));
			}
		});

		socket.on("error", (err) => {
			finish(
				framing.makeUnreachableStatus({
					latencyMs: Date.now() - startTime,
					status: "unreachable",
					error: `Ошибка TCP соединения с ККТ (${host}:${port}): ${err.message}`,
				}),
			);
		});
	});
}

function printFiscalReceiptTcpSocket({ host, port, protocol = "atol", timeoutMs = 3000, payloadJson } = {}) {
	return new Promise((resolve) => {
		if (!host || !port) {
			return resolve({
				success: false,
				status: "hardware_offline",
				error: "Не указаны host и port фискального регистратора",
			});
		}

		let payload = {};
		try {
			payload = typeof payloadJson === "string" ? JSON.parse(payloadJson) : (payloadJson || {});
		} catch (err) {
			return resolve({
				success: false,
				status: "hardware_offline",
				error: `Некорректный JSON фискального чека: ${err instanceof Error ? err.message : String(err)}`,
			});
		}

		const socket = new net.Socket();
		let responseData = Buffer.alloc(0);
		let resolved = false;

		const finish = (result) => {
			if (resolved) return;
			resolved = true;
			clearTimeout(timeout);
			resolve(result);
		};

		const timeout = setTimeout(() => {
			if (!resolved) {
				socket.destroy();
				finish({
					success: false,
					status: "hardware_offline",
					error: `Таймаут подключения к фискальному регистратору ${host}:${port}`,
				});
			}
		}, timeoutMs);
		if (typeof timeout.unref === "function") timeout.unref();

		socket.connect(port, host, () => {
			const commandHeader = protocol === "shtrih"
				? Buffer.from([0x02, 0x05, 0x11, 0x00, 0x00, 0x00, 0x00])
				: Buffer.from([0x02, 0x30, 0x30, 0x41, 0x54, 0x4f, 0x4c]);
			const bodyBuffer = Buffer.from(JSON.stringify(payload), "utf8");
			socket.write(Buffer.concat([commandHeader, bodyBuffer]));
		});

		socket.on("data", (chunk) => {
			if (resolved) return;
			const bufChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			responseData = Buffer.concat([responseData, bufChunk]);
			if (framing.isKktTcpResponseComplete(protocol, responseData)) {
				const parsedResult = framing.parseKktTcpResponse(protocol, responseData, payload);
				socket.end();
				finish(parsedResult);
			}
		});

		socket.on("end", () => {
			if (!resolved) {
				const parsedResult = framing.parseKktTcpResponse(protocol, responseData, payload);
				socket.destroy();
				finish(parsedResult);
			}
		});

		socket.on("error", (err) => {
			if (!resolved) {
				socket.destroy();
				finish({
					success: false,
					status: "hardware_offline",
					error: `Ошибка соединения с ККТ (${host}:${port}): ${err.message}`,
				});
			}
		});
	});
}

async function printAtol10FiscalReceipt(params) {
	return await printFiscalReceiptTcpSocket({
		host: params?.host || "127.0.0.1",
		port: params?.port || 16732,
		protocol: "atol",
		payloadJson: params?.payloadJson,
		timeoutMs: params?.timeoutMs,
	});
}

async function printShtrihMFiscalReceipt(params) {
	return await printFiscalReceiptTcpSocket({
		host: params?.host || "127.0.0.1",
		port: params?.port || 5555,
		protocol: "shtrih",
		payloadJson: params?.payloadJson,
		timeoutMs: params?.timeoutMs,
	});
}

module.exports = {
	...framing,
	checkKktStatusTcpSocket,
	printFiscalReceiptTcpSocket,
	printAtol10FiscalReceipt,
	printShtrihMFiscalReceipt,
};
