import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import {
	printFiscalReceiptTcpSocket,
	printAtol10FiscalReceipt,
	printShtrihMFiscalReceipt,
} from "../main.cjs";

function createOneShotTcpServer(onRequest) {
	return new Promise((resolve) => {
		const server = net.createServer((socket) => {
			let received = Buffer.alloc(0);
			socket.on("data", (chunk) => {
				received = Buffer.concat([received, chunk]);
				const response = onRequest(received, socket);
				if (response) {
					socket.write(response);
					socket.end();
				}
			});
		});
		server.listen(0, "127.0.0.1", () => {
			const addr = server.address();
			resolve({ server, port: typeof addr === "object" && addr ? addr.port : 0 });
		});
	});
}

test("Electron KKT TCP Driver Bridge (ATOL & Shtrikh-M)", async (t) => {
	await t.test("ATOL JSON TCP response with errorCode=0 returns success: true and parsed fiscalParams", async () => {
		let capturedPacket = Buffer.alloc(0);
		const { server, port } = await createOneShotTcpServer((buf) => {
			capturedPacket = buf;
			return Buffer.from(
				JSON.stringify({
					results: [
						{
							errorCode: 0,
							fiscalParams: {
								fiscalDocumentNumber: 1245,
								fiscalDocumentSign: "3910482756",
								fnNumber: "9960440302145896",
								registrationNumber: "0010670000012345",
								shiftNumber: 18,
							},
						},
					],
				}),
				"utf8",
			);
		});

		try {
			const res = await printAtol10FiscalReceipt({
				host: "127.0.0.1",
				port,
				payloadJson: JSON.stringify({ cashierName: "Иванова А. С.", totalRub: 4500 }),
				timeoutMs: 1500,
			});

			assert.equal(res.success, true);
			assert.equal(res.status, "printed");
			assert.equal(res.fiscalDocNum, "1245");
			assert.equal(res.fiscalSign, "3910482756");
			assert.equal(res.fnSerial, "9960440302145896");
			assert.equal(res.kktSerialNumber, "0010670000012345");
			assert.equal(res.shiftNum, 18);
			assert.ok(res.qrString?.includes("fn=9960440302145896"));
			assert.ok(capturedPacket.includes(Buffer.from("ATOL", "utf8")));
		} finally {
			server.close();
		}
	});

	await t.test("ATOL HTTP-over-TCP response with errorCode!=0 returns hardware_offline with mapped error", async () => {
		const { server, port } = await createOneShotTcpServer(() => {
			const body = JSON.stringify({ results: [{ errorCode: 2 }] });
			return Buffer.from(`HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n${body}`, "utf8");
		});

		try {
			const res = await printFiscalReceiptTcpSocket({
				host: "127.0.0.1",
				port,
				protocol: "atol",
				payloadJson: JSON.stringify({ totalRub: 1000 }),
			});

			assert.equal(res.success, false);
			assert.equal(res.status, "hardware_offline");
			assert.equal(res.errorCode, "ATOL_ERR_2");
			assert.match(res.error || "", /лента|Paper/i);
		} finally {
			server.close();
		}
	});

	await t.test("Shtrikh-M binary frame with errorCode=0 extracts FD/FPD and returns success: true", async () => {
		const { server, port } = await createOneShotTcpServer(() => {
			// Frame: [0x02, len=13, cmd=0x85, err=0x00, operator=0x1e, fd(4 LE), fpd(4 LE), crc]
			const frame = Buffer.alloc(15, 0);
			frame[0] = 0x02;
			frame[1] = 13;
			frame[2] = 0x85;
			frame[3] = 0x00;
			frame[4] = 30;
			frame.writeUInt32LE(7788, 5);
			frame.writeUInt32LE(987654321, 9);
			frame[14] = 0x55;
			return frame;
		});

		try {
			const res = await printShtrihMFiscalReceipt({
				host: "127.0.0.1",
				port,
				payloadJson: JSON.stringify({ cashierName: "Петров П. П.", totalRub: 3500 }),
			});

			assert.equal(res.success, true);
			assert.equal(res.status, "printed");
			assert.equal(res.errorCode, 0);
			assert.equal(res.fiscalDocNum, "7788");
			assert.equal(res.fiscalSign, "987654321");
		} finally {
			server.close();
		}
	});

	await t.test("Shtrikh-M binary frame with non-zero errorCode returns hardware_offline", async () => {
		const { server, port } = await createOneShotTcpServer(() => {
			// errorCode = 0x04 (Out of paper)
			return Buffer.from([0x02, 0x03, 0x85, 0x04, 0x1e, 0x9c]);
		});

		try {
			const res = await printShtrihMFiscalReceipt({
				host: "127.0.0.1",
				port,
				payloadJson: JSON.stringify({ totalRub: 1200 }),
			});

			assert.equal(res.success, false);
			assert.equal(res.status, "hardware_offline");
			assert.equal(res.errorCode, "SHTRIKH_ERR_4");
			assert.match(res.error || "", /бумага|Paper/i);
		} finally {
			server.close();
		}
	});

	await t.test("Unreachable TCP port returns hardware_offline honestly", async () => {
		// Reserve and immediately close an ephemeral port so nothing listens on it
		const probeServer = net.createServer();
		await new Promise((r) => probeServer.listen(0, "127.0.0.1", r));
		const addr = probeServer.address();
		const closedPort = typeof addr === "object" && addr ? addr.port : 59999;
		await new Promise((r) => probeServer.close(r));

		const res = await printFiscalReceiptTcpSocket({
			host: "127.0.0.1",
			port: closedPort,
			protocol: "atol",
			timeoutMs: 500,
			payloadJson: JSON.stringify({ totalRub: 500 }),
		});

		assert.equal(res.success, false);
		assert.equal(res.status, "hardware_offline");
		assert.ok(res.error);
	});
});
