/**
 * DENTE Dental CRM — System Printers, Silent A4 Spooling, ESC/POS & COM Serial Ports
 */

const net = require("node:net");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { createDesktopLogger } = require("./desktopLogger.cjs");

const execFileAsync = promisify(execFile);
const logger = createDesktopLogger("PrinterSerialBridge");

function getElectronBrowserWindow() {
	try {
		return require("electron")?.BrowserWindow || null;
	} catch (err) {
		logger.debug("Electron BrowserWindow unavailable (Node harness)", {
			error: err instanceof Error ? err.message : String(err),
		});
		return null;
	}
}

async function getWindowsSerialPorts() {
	const ports = [];
	if (process.platform !== "win32") {
		return ports;
	}
	try {
		const { stdout } = await execFileAsync(
			"reg.exe",
			["query", "HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM"],
			{ encoding: "utf8", timeout: 1500, windowsHide: true },
		);
		for (const line of stdout.split(/\r?\n/)) {
			const match = line.trim().match(/\s+REG_SZ\s+(COM\d+)/i);
			if (match && match[1]) {
				const portName = match[1].toUpperCase();
				ports.push({
					path: portName,
					manufacturer: "Serial Communication Port",
					serialNumber: portName,
					vendorId: undefined,
					productId: undefined,
				});
			}
		}
	} catch (err) {
		logger.debug("No Windows SERIALCOMM entries or registry query failed", {
			error: err instanceof Error ? err.message : String(err),
		});
	}
	return ports;
}

async function getSystemPrinters(getMainWindow) {
	const mainWindow = typeof getMainWindow === "function" ? getMainWindow() : null;
	if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents?.getPrintersAsync) {
		try {
			const rawPrinters = await mainWindow.webContents.getPrintersAsync();
			return rawPrinters.map((p) => ({
				name: p.name,
				isDefault: Boolean(p.isDefault),
				status: p.status,
				isThermal: /thermal|label|zebra|xprinter|tsc|godex|pos-?58|pos-?80|bixolon|citizen|gprinter/i.test(p.name),
			}));
		} catch (err) {
			logger.warn("Error querying Electron webContents printers", err);
		}
	}

	if (process.platform === "win32") {
		try {
			const { stdout } = await execFileAsync(
				"powershell.exe",
				[
					"-NoProfile",
					"-NonInteractive",
					"-Command",
					"Get-Printer | Select-Object Name,Default,PrinterStatus | ConvertTo-Json -Compress",
				],
				{ encoding: "utf8", timeout: 2000, windowsHide: true },
			);
			const trimmed = stdout.trim();
			if (trimmed) {
				const parsed = JSON.parse(trimmed);
				const list = Array.isArray(parsed) ? parsed : [parsed];
				return list
					.filter((p) => p && typeof p.Name === "string")
					.map((p) => ({
						name: p.Name,
						isDefault: Boolean(p.Default),
						status: typeof p.PrinterStatus === "number" ? p.PrinterStatus : 0,
						isThermal: /thermal|label|zebra|xprinter|tsc|godex|pos-?58|pos-?80|bixolon|citizen|gprinter/i.test(p.Name),
					}));
			}
		} catch (err) {
			logger.warn("PowerShell Get-Printer unavailable (spooler stopped or restricted)", {
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	return [];
}

async function printWithHiddenWindow({
	contentHtml,
	printerName,
	silent = true,
	widthPx,
	heightPx,
	printOptions,
	timeoutMs,
	errorPrefix,
	fallbackPrinterName,
}) {
	const BrowserWindow = getElectronBrowserWindow();
	if (!BrowserWindow) {
		return {
			success: false,
			error: `${errorPrefix}: системный спулер Electron BrowserWindow недоступен вне графической оболочки`,
			printerName: printerName || fallbackPrinterName,
			silent: true,
		};
	}

	return new Promise((resolve) => {
		let printWin = new BrowserWindow({
			show: false,
			width: widthPx,
			height: heightPx,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
			},
		});
		let settled = false;

		const cleanup = () => {
			if (printWin) {
				printWin.destroy();
				printWin = null;
			}
		};

		const finish = (res) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			cleanup();
			resolve(res);
		};

		const timeout = setTimeout(() => {
			finish({
				success: false,
				error: `${errorPrefix}: таймаут ожидания спулера печати (${timeoutMs}мс)`,
				printerName: printerName || fallbackPrinterName,
			});
		}, timeoutMs);

		printWin.webContents.on("did-finish-load", () => {
			printWin.webContents.print(
				{
					silent: silent !== false,
					printBackground: true,
					deviceName: printerName || "",
					...printOptions,
				},
				(success, failureReason) => {
					if (!success) {
						return finish({
							success: false,
							error: `${errorPrefix}: ${failureReason || "печать отменена спулером"}`,
						});
					}
					finish({
						success: true,
						printedAt: new Date().toISOString(),
						printerName: printerName || fallbackPrinterName,
						silent: true,
					});
				},
			);
		});

		const encodedHtml = `data:text/html;charset=utf-8,${encodeURIComponent(contentHtml)}`;
		printWin.loadURL(encodedHtml).catch((err) => {
			finish({
				success: false,
				error: `${errorPrefix}: ошибка загрузки печатной формы (${err instanceof Error ? err.message : String(err)})`,
			});
		});
	});
}

async function printThermalLabel({
	html,
	text,
	printerName,
	silent = true,
	widthMm = 58,
	heightMm = 40,
	copies = 1,
} = {}) {
	const contentHtml =
		html ||
		[
			"<!DOCTYPE html><html><head><meta charset=\"utf-8\">",
			`<style>@page{size:${widthMm}mm ${heightMm}mm;margin:0;}`,
			"body{margin:0;font-family:sans-serif;font-size:10px;padding:2mm;}</style>",
			`</head><body><pre>${text || ""}</pre></body></html>`,
		].join("");

	const res = await printWithHiddenWindow({
		contentHtml,
		printerName,
		silent,
		widthPx: Math.round(widthMm * 3.7795),
		heightPx: Math.round(heightMm * 3.7795),
		timeoutMs: 4000,
		errorPrefix: "Ошибка печати термоэтикетки",
		fallbackPrinterName: "Default Thermal Printer",
		printOptions: {
			margins: { marginType: "none" },
			pageSize: {
				width: Math.round(widthMm * 1000),
				height: Math.round(heightMm * 1000),
			},
			copies: copies || 1,
		},
	});

	return { ...res, widthMm, heightMm, copies };
}

async function printDocumentSilent({
	htmlContent,
	pdfBase64,
	printerName,
	title,
	silent = true,
	copies = 1,
	pageSize = "A4",
	landscape = false,
	margins = { marginType: "printableArea" },
} = {}) {
	const orientationStyle = landscape ? "size: A4 landscape;" : `size: ${pageSize} portrait;`;
	const titleText = title || "Документ DENTE";
	const contentHtml =
		htmlContent ||
		(pdfBase64
			? [
					`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titleText}</title>`,
					`<style>@page{${orientationStyle}margin:10mm;}body{margin:0;}</style></head>`,
					`<body><embed width="100%" height="100%" src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" /></body></html>`,
				].join("")
			: [
					`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titleText}</title>`,
					`<style>@page{${orientationStyle}margin:10mm;}body{margin:0;font-family:sans-serif;}</style></head>`,
					"<body><div>Пустой документ</div></body></html>",
				].join(""));

	const res = await printWithHiddenWindow({
		contentHtml,
		printerName,
		silent,
		widthPx: landscape ? 1123 : 794,
		heightPx: landscape ? 794 : 1123,
		timeoutMs: 6000,
		errorPrefix: "Ошибка печати документа",
		fallbackPrinterName: "Default System Printer",
		printOptions: {
			pageSize: pageSize || "A4",
			landscape: Boolean(landscape),
			margins: margins || { marginType: "printableArea" },
			copies: copies || 1,
		},
	});

	return { ...res, pageSize, landscape, copies };
}

async function printEscPosReceipt({
	host,
	port = 9100,
	printerName,
	rawEscPosBase64,
	text,
	html,
	silent = true,
	widthMm = 80,
	cutPaper = true,
	timeoutMs = 3000,
} = {}) {
	if (host && port) {
		return new Promise((resolve) => {
			const socket = new net.Socket();
			let resolved = false;

			const finish = (res) => {
				if (resolved) return;
				resolved = true;
				clearTimeout(timeout);
				resolve(res);
			};

			const timeout = setTimeout(() => {
				socket.destroy();
				finish({
					success: false,
					error: `Таймаут подключения к LAN принтеру ${host}:${port}`,
				});
			}, timeoutMs);
			if (typeof timeout.unref === "function") timeout.unref();

			socket.connect(port, host, () => {
				let bufferToSend;
				if (rawEscPosBase64) {
					bufferToSend = Buffer.from(rawEscPosBase64, "base64");
				} else {
					const initCmd = Buffer.from([0x1b, 0x40]);
					const textBuf = Buffer.from(text || "", "utf8");
					const cutCmd = cutPaper ? Buffer.from([0x1d, 0x56, 0x00]) : Buffer.alloc(0);
					bufferToSend = Buffer.concat([initCmd, textBuf, cutCmd]);
				}

				socket.write(bufferToSend, () => {
					socket.end();
					finish({
						success: true,
						printedAt: new Date().toISOString(),
						target: `tcp://${host}:${port}`,
						bytesSent: bufferToSend.length,
						silent: true,
					});
				});
			});

			socket.on("error", (err) => {
				socket.destroy();
				finish({
					success: false,
					error: `Ошибка TCP соединения с принтером чеков ${host}:${port}: ${err.message}`,
				});
			});
		});
	}

	const fallbackHtml = text
		? [
				"<!DOCTYPE html><html><head><meta charset=\"utf-8\">",
				`<style>@page{size:${widthMm}mm auto;margin:0;}`,
				"body{font-family:monospace;font-size:11px;padding:3mm;white-space:pre-wrap;}</style>",
				`</head><body>${text}</body></html>`,
			].join("")
		: undefined;

	return await printThermalLabel({
		html: html || fallbackHtml,
		printerName,
		silent,
		widthMm,
		heightMm: 120,
		copies: 1,
	});
}

module.exports = {
	getWindowsSerialPorts,
	getSystemPrinters,
	printThermalLabel,
	printDocumentSilent,
	printEscPosReceipt,
};
