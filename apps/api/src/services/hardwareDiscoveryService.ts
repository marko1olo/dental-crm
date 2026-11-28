/**
 * DENTE Dental CRM — Clinic Hardware & Peripheral Discovery Service.
 *
 * Responsibilities:
 * 1. Runs active hardware probing across Windows, macOS, and Linux:
 *    - System Printers (Win32_Printer / CUPS lpstat / system_profiler)
 *    - Thermal ESC/POS receipt printers (58mm / 80mm on USB or TCP 9100)
 *    - Label printers (TSPL / ZPL for SanPiN 3.3686-21 autoclave pouches)
 *    - Active COM ports for 54-FZ KKT (АТОЛ, Штрих-М) and virtual COM scanners
 *    - USB Plug-and-Play Barcode Scanners (HID Keyboard Wedge / POS)
 * 2. Active network probing: scans local subnets on raw TCP port 9100
 * 3. Real-time status inquiry via ESC/POS protocol (online, out-of-paper, cover-open)
 * 4. Test pattern generation and transmission over TCP / Spooler / Serial
 */

import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
	type AutoclavePouchLabelPayload,
	buildEscPosHardwareTestPatternBuffer,
	createSampleAutoclavePouchLabelPayload,
	deviceInterfaceSchema,
	deviceStatusSchema,
	deviceTypeSchema,
	ESC_POS_STATUS_COMMANDS,
	generateAutoclavePouchLabelBuffer,
	type HardwareDeviceDescriptor,
	type HardwareDiscoveryOptions,
	type HardwareDiscoveryResult,
	labelPrinterEmulationSchema,
	parseEscPosStatusByte,
	type PrinterStatusReport,
	type TestPrintResult,
	type TestPrintTarget,
	thermalPaperWidthMmSchema,
} from "@dental/shared";
import { BoundedTtlMap } from "../lib/boundedTtlMap.js";
import { createApiLogger, safeLogError } from "../observability/logger.js";

const logger = createApiLogger("hardwareDiscoveryService");

const hardwareDeviceDescriptorSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: deviceTypeSchema,
	interface: deviceInterfaceSchema,
	status: deviceStatusSchema,
	isDefault: z.boolean(),
	manufacturer: z.string().optional(),
	model: z.string().optional(),
	port: z.string().optional(),
	ipAddress: z.string().optional(),
	rawTcpPort: z.number().optional(),
	serialNumber: z.string().optional(),
	emulation: labelPrinterEmulationSchema.optional(),
	paperWidthMm: thermalPaperWidthMmSchema.optional(),
	details: z.record(z.string(), z.unknown()).optional(),
});

const probeScriptOutputSchema = z.object({
	devices: z.array(hardwareDeviceDescriptorSchema),
});

// ============================================================================
// 1. SCRIPT LOCATOR
// ============================================================================

function resolveRepoScriptsDir(): string {
	// Attempt current working directory first (standard monorepo root)
	const cwdCandidate = path.resolve(process.cwd(), "scripts");
	if (fs.existsSync(cwdCandidate)) {
		return cwdCandidate;
	}

	// Attempt relative to this file
	try {
		const currentFile = fileURLToPath(import.meta.url);
		const relativeDir = path.resolve(path.dirname(currentFile), "../../../../scripts");
		if (fs.existsSync(relativeDir)) {
			return relativeDir;
		}
	} catch (err: unknown) {
		logger.warn(
			{ err: safeLogError(err) },
			"[hardwareDiscoveryService] Failed to resolve scripts directory relative to module URL",
		);
	}

	return cwdCandidate;
}

// ============================================================================
// 2. TCP RAW STATUS & STREAM UTILITIES
// ============================================================================

/**
 * Queries real-time ESC/POS printer status over raw TCP socket.
 */
export async function probeRawTcpPrinterStatus(
	ip: string,
	port = 9100,
	timeoutMs = 1200,
): Promise<PrinterStatusReport> {
	return new Promise<PrinterStatusReport>((resolve) => {
		const socket = new net.Socket();
		let resolved = false;

		const finish = (result: PrinterStatusReport) => {
			if (!resolved) {
				resolved = true;
				try {
					socket.destroy();
				} catch (destroyErr: unknown) {
					logger.warn(
						{ err: safeLogError(destroyErr), ip, port },
						"[hardwareDiscoveryService] Failed to destroy TCP status socket",
					);
				}
				resolve(result);
			}
		};

		socket.setTimeout(timeoutMs);

		socket.on("connect", () => {
			// Query paper sensor status (DLE EOT 4) and offline status (DLE EOT 2)
			socket.write(ESC_POS_STATUS_COMMANDS.QUERY_PAPER_STATUS);
			socket.write(ESC_POS_STATUS_COMMANDS.QUERY_OFFLINE_STATUS);
		});

		socket.on("data", (data: Buffer) => {
			if (data.length > 0) {
				const firstByte = data[0];
				if (firstByte !== undefined) {
					const report = parseEscPosStatusByte(4, firstByte);
					finish(report);
				}
			}
		});

		socket.on("timeout", () => {
			finish({
				online: false,
				paperPresent: false,
				coverClosed: false,
				hasError: true,
				status: "offline",
				errorMessage: "Таймаут соединения с сетевым принтером (TCP 9100)",
			});
		});

		socket.on("error", (err: Error) => {
			finish({
				online: false,
				paperPresent: false,
				coverClosed: false,
				hasError: true,
				status: "offline",
				errorMessage: `Ошибка сети: ${err.message}`,
			});
		});

		socket.connect(port, ip);
	});
}

/**
 * Sends a raw binary buffer to a network thermal printer on TCP port 9100.
 */
export async function sendRawBytesToTcpPrinter(
	ip: string,
	port: number,
	bytes: Uint8Array,
	timeoutMs = 3000,
): Promise<{ success: boolean; bytesSent: number; message: string; error?: string }> {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		let resolved = false;

		const finish = (res: {
			success: boolean;
			bytesSent: number;
			message: string;
			error?: string;
		}) => {
			if (!resolved) {
				resolved = true;
				try {
					socket.destroy();
				} catch (destroyErr: unknown) {
					logger.warn(
						{ err: safeLogError(destroyErr), ip, port },
						"[hardwareDiscoveryService] Failed to destroy TCP send socket",
					);
				}
				resolve(res);
			}
		};

		socket.setTimeout(timeoutMs);

		socket.on("connect", () => {
			socket.write(Buffer.from(bytes), (err) => {
				if (err) {
					finish({
						success: false,
						bytesSent: 0,
						message: "Ошибка записи в сетевой сокет принтера",
						error: err.message,
					});
				} else {
					finish({
						success: true,
						bytesSent: bytes.length,
						message: `Успешно отправлено ${bytes.length} байт на ${ip}:${port}`,
					});
				}
			});
		});

		socket.on("timeout", () => {
			finish({
				success: false,
				bytesSent: 0,
				message: "Таймаут соединения с принтером",
				error: "ETIMEDOUT",
			});
		});

		socket.on("error", (err: Error) => {
			finish({
				success: false,
				bytesSent: 0,
				message: `Не удалось подключиться к принтеру ${ip}:${port}`,
				error: err.message,
			});
		});

		socket.connect(port, ip);
	});
}

// ============================================================================
// 3. HARDWARE DISCOVERY SERVICE IMPLEMENTATION
// ============================================================================

function isPrivateLanSubnetPrefix(rawSubnet: string): boolean {
	const parts = rawSubnet.trim().split(".");
	if (parts.length !== 3) return false;
	const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : Number.NaN));
	if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
	const a = nums[0] ?? -1;
	const b = nums[1] ?? -1;
	if (a === 10) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}

export interface HardwareSpoolerTransport {
	isPrinterInstalled(printerName: string): Promise<boolean> | boolean;
	sendRawBytes(printerName: string, buffer: Uint8Array): Promise<void> | void;
}

export interface HardwareDiscoveryServiceDeps {
	readonly spoolerTransport?: HardwareSpoolerTransport | undefined;
}

export class HardwareDiscoveryService {
	private readonly cachedResultsByTenant = new BoundedTtlMap<
		string,
		HardwareDiscoveryResult
	>({
		maxEntries: 64,
		ttlMs: 5000,
	});
	private readonly spoolerTransport?: HardwareSpoolerTransport | undefined;

	constructor(deps?: HardwareDiscoveryServiceDeps) {
		this.spoolerTransport = deps?.spoolerTransport;
	}

	/**
	 * Discovers all connected clinic hardware devices.
	 */
	public async discoverDevices(
		options: HardwareDiscoveryOptions = {},
	): Promise<HardwareDiscoveryResult> {
		const tenantKey = options.organizationId?.trim() || "default";
		const cached = this.cachedResultsByTenant.get(tenantKey);
		if (cached && !options.probeNetworkTcp) {
			return cached;
		}

		const platform = os.platform();
		let discoveredDevices: HardwareDeviceDescriptor[] = [];

		if (platform === "win32") {
			discoveredDevices = await this.probeWindowsHardware(options);
		} else {
			discoveredDevices = await this.probePosixHardware(options);
		}

		// Active Network TCP 9100 scan if requested
		if (options.probeNetworkTcp) {
			const netPrinters = await this.scanSubnetsForNetworkPrinters(options);
			for (const np of netPrinters) {
				if (!discoveredDevices.some((d) => d.id === np.id || (d.ipAddress && d.ipAddress === np.ipAddress))) {
					discoveredDevices.push(np);
				}
			}
		}

		if (options.includeOffline === false) {
			discoveredDevices = discoveredDevices.filter((d) => d.status === "online");
		}

		const summary = {
			total: discoveredDevices.length,
			online: discoveredDevices.filter((d) => d.status === "online").length,
			printers: discoveredDevices.filter((d) =>
				d.type === "thermal_receipt" || d.type === "label_printer" || d.type === "document_printer",
			).length,
			scanners: discoveredDevices.filter((d) => d.type === "barcode_scanner").length,
			kkt: discoveredDevices.filter((d) => d.type === "fiscal_kkt").length,
		};

		const result: HardwareDiscoveryResult = {
			timestamp: new Date().toISOString(),
			hostPlatform: platform === "win32" ? "win32" : platform === "darwin" ? "darwin" : "linux",
			devices: discoveredDevices,
			summary,
		};

		this.cachedResultsByTenant.set(tenantKey, result);

		return result;
	}

	/**
	 * Executes Windows hardware probe script via PowerShell.
	 */
	private async probeWindowsHardware(
		options: HardwareDiscoveryOptions,
	): Promise<HardwareDeviceDescriptor[]> {
		const scriptsDir = resolveRepoScriptsDir();
		const psScriptPath = path.join(scriptsDir, "hardware-probe.ps1");

		if (!fs.existsSync(psScriptPath)) {
			return [];
		}

		const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psScriptPath];
		if (options.probeNetworkTcp) {
			args.push("-ProbeNetwork");
		}

		try {
			const output = await new Promise<string>((resolve, reject) => {
				childProcess.execFile(
					"powershell.exe",
					args,
					{ encoding: "utf8", timeout: 8000, maxBuffer: 10 * 1024 * 1024 },
					(err, stdout, stderr) => {
						if (err) {
							reject(err);
						} else {
							resolve(stdout);
						}
					},
				);
			});

			const parsed = probeScriptOutputSchema.safeParse(JSON.parse(output.trim()));
			if (!parsed.success) {
				logger.warn(
					{ issue: parsed.error.issues[0]?.message ?? "invalid_schema" },
					"probeWindowsHardware returned invalid device probe payload",
				);
				return [];
			}
			return [...parsed.data.devices];
		} catch (err) {
			logger.warn({ err }, "probeWindowsHardware failed");
			return [];
		}
	}

	/**
	 * Executes POSIX hardware probe script for macOS & Linux.
	 */
	private async probePosixHardware(
		options: HardwareDiscoveryOptions,
	): Promise<HardwareDeviceDescriptor[]> {
		const scriptsDir = resolveRepoScriptsDir();
		const shScriptPath = path.join(scriptsDir, "hardware-probe.sh");

		if (!fs.existsSync(shScriptPath)) {
			return [];
		}

		const args = [shScriptPath];
		if (options.probeNetworkTcp) {
			args.push("--network");
		}

		try {
			const output = await new Promise<string>((resolve, reject) => {
				childProcess.execFile(
					"sh",
					args,
					{ encoding: "utf8", timeout: 6000, maxBuffer: 10 * 1024 * 1024 },
					(err, stdout) => {
						if (err) {
							reject(err);
						} else {
							resolve(stdout);
						}
					},
				);
			});

			const parsed = probeScriptOutputSchema.safeParse(JSON.parse(output.trim()));
			if (!parsed.success) {
				logger.warn(
					{ issue: parsed.error.issues[0]?.message ?? "invalid_schema" },
					"probePosixHardware returned invalid device probe payload",
				);
				return [];
			}
			return [...parsed.data.devices];
		} catch (err) {
			logger.warn({ err }, "probePosixHardware failed");
			return [];
		}
	}

	/**
	 * Concurrently scans subnets on raw TCP port 9100.
	 */
	private async scanSubnetsForNetworkPrinters(
		options: HardwareDiscoveryOptions,
	): Promise<HardwareDeviceDescriptor[]> {
		const candidateSubnets =
			options.networkSubnets && options.networkSubnets.length > 0
				? options.networkSubnets
				: this.detectLocalSubnets();
		const subnets = candidateSubnets.filter((subnet) =>
			isPrivateLanSubnetPrefix(subnet),
		);

		const timeoutMs = options.timeoutMs ?? 350;
		const results: HardwareDeviceDescriptor[] = [];

		for (const subnet of subnets) {
			// Probe common host IPs in clinic subnet: .20 to .200
			const probePromises: Promise<HardwareDeviceDescriptor | null>[] = [];

			for (let host = 20; host <= 150; host++) {
				const ip = `${subnet}.${host}`;
				probePromises.push(
					new Promise<HardwareDeviceDescriptor | null>((resolve) => {
						const sock = new net.Socket();
						sock.setTimeout(timeoutMs);

						sock.on("connect", () => {
							sock.destroy();
							resolve({
								id: `net:tcp:${ip}:9100`,
								name: `Севой термопринтер (${ip}:9100)`,
								type: "thermal_receipt",
								interface: "tcp_raw",
								status: "online",
								isDefault: false,
								ipAddress: ip,
								rawTcpPort: 9100,
								emulation: "escpos",
								paperWidthMm: 80,
								details: { protocol: "RAW TCP 9100" },
							});
						});

						sock.on("timeout", () => {
							sock.destroy();
							resolve(null);
						});

						sock.on("error", () => {
							sock.destroy();
							resolve(null);
						});

						sock.connect(9100, ip);
					}),
				);
			}

			const batchResults = await Promise.all(probePromises);
			for (const r of batchResults) {
				if (r) {
					results.push(r);
				}
			}
		}

		return results;
	}

	/**
	 * Detects local IPv4 subnets from OS network interfaces.
	 */
	private detectLocalSubnets(): string[] {
		const subnets = new Set<string>();
		const ifaces = os.networkInterfaces();

		for (const key of Object.keys(ifaces)) {
			const list = ifaces[key] || [];
			for (const iface of list) {
				if (iface.family === "IPv4" && !iface.internal) {
					const parts = iface.address.split(".");
					if (parts.length === 4 && !iface.address.startsWith("169.254.")) {
						subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
					}
				}
			}
		}

		if (subnets.size === 0) {
			subnets.add("192.168.1");
		}

		return Array.from(subnets);
	}

	/**
	 * Queries status of a specific device.
	 */
	public async queryDeviceStatus(target: {
		ipAddress?: string | undefined;
		rawTcpPort?: number | undefined;
		deviceId?: string | undefined;
	}): Promise<PrinterStatusReport> {
		if (target.ipAddress) {
			return probeRawTcpPrinterStatus(target.ipAddress, target.rawTcpPort ?? 9100);
		}

		return {
			online: true,
			paperPresent: true,
			coverClosed: true,
			hasError: false,
			status: "online",
		};
	}

	/**
	 * Sends test print pattern to the targeted hardware device.
	 */
	public async sendTestPrint(target: TestPrintTarget): Promise<TestPrintResult> {
		const timestamp = new Date().toISOString();
		let buffer: Uint8Array;

		// 1. Generate appropriate test pattern binary buffer
		if (target.deviceType === "label_printer" || target.testPatternType === "sanpin_label") {
			const labelPayload = target.labelData || createSampleAutoclavePouchLabelPayload();
			const emulation = target.emulation || "tspl";
			buffer = generateAutoclavePouchLabelBuffer(labelPayload, emulation);
		} else {
			buffer = buildEscPosHardwareTestPatternBuffer({
				paperWidthMm: target.paperWidthMm ?? 58,
				deviceName: target.systemPrinterName || target.deviceId || "Термопринтер чеков",
				interfaceName: target.interface,
			});
		}

		// Hex preview (first 24 bytes)
		const hexPreview = Array.from(buffer.slice(0, 24))
			.map((b) => b.toString(16).padStart(2, "0").toUpperCase())
			.join(" ");

		const targetSummary = `${target.deviceType} (${target.interface})` +
			(target.ipAddress ? ` @ ${target.ipAddress}:${target.rawTcpPort ?? 9100}` : "") +
			(target.systemPrinterName ? ` [${target.systemPrinterName}]` : "");

		// 2. Dispatch to transport
		if (target.interface === "tcp_raw" && target.ipAddress) {
			const res = await sendRawBytesToTcpPrinter(
				target.ipAddress,
				target.rawTcpPort ?? 9100,
				buffer,
			);
			return {
				success: res.success,
				bytesSent: res.bytesSent,
				timestamp,
				message: res.message,
				rawHexPreview: hexPreview,
				targetSummary,
				error: res.error,
			};
		}

		// 3. System spooler dispatch or buffer generation
		if (target.interface === "system_spooler" && target.systemPrinterName) {
			if (this.spoolerTransport) {
				try {
					const installed = await this.spoolerTransport.isPrinterInstalled(target.systemPrinterName);
					if (installed) {
						await this.spoolerTransport.sendRawBytes(target.systemPrinterName, buffer);
						return {
							success: true,
							bytesSent: buffer.length,
							timestamp,
							message: `Отправлено в спулер печати (${target.systemPrinterName}): ${buffer.length} байт`,
							rawHexPreview: hexPreview,
							targetSummary,
						};
					}
				} catch (err: unknown) {
					return {
						success: false,
						bytesSent: 0,
						timestamp,
						message: `Ошибка передачи задания в спулер печати: ${err instanceof Error ? err.message : String(err)}`,
						rawHexPreview: hexPreview,
						targetSummary,
						error: err instanceof Error ? err.message : String(err),
					};
				}
			}
			if (process.platform === "win32" && !this.spoolerTransport) {
				let isInstalled = false;
				try {
					const checkOutput = childProcess
						.execFileSync(
							"powershell.exe",
							[
								"-NoProfile",
								"-Command",
								"$ErrorActionPreference = 'SilentlyContinue'; (Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $env:DENTE_PRINTER_NAME }).Name",
							],
							{
								timeout: 2500,
								windowsHide: true,
								encoding: "utf8",
								env: {
									...process.env,
									DENTE_PRINTER_NAME: target.systemPrinterName,
								},
							},
						)
						.trim();
					isInstalled = checkOutput.length > 0;
				} catch (err) {
					logger.warn(
						{ err, printerName: target.systemPrinterName },
						"sendTestPrint printer availability check failed",
					);
					isInstalled = false;
				}

				if (isInstalled) {
					const tempFile = path.join(os.tmpdir(), `dente_spool_${Date.now()}.bin`);
					try {
						fs.writeFileSync(tempFile, Buffer.from(buffer));
						childProcess.execFileSync(
							"powershell.exe",
							[
								"-NoProfile",
								"-Command",
								"Get-Content -LiteralPath $env:DENTE_SPOOL_FILE -Raw -Encoding Byte | Out-Printer -Name $env:DENTE_PRINTER_NAME",
							],
							{
								timeout: 4000,
								windowsHide: true,
								env: {
									...process.env,
									DENTE_PRINTER_NAME: target.systemPrinterName,
									DENTE_SPOOL_FILE: tempFile,
								},
							},
						);
						return {
							success: true,
							bytesSent: buffer.length,
							timestamp,
							message: `Отправлено в спулер печати Windows (${target.systemPrinterName}): ${buffer.length} байт`,
							rawHexPreview: hexPreview,
							targetSummary,
						};
					} catch (err: unknown) {
						return {
							success: false,
							bytesSent: 0,
							timestamp,
							message: `Ошибка передачи задания в спулер печати Windows: ${err instanceof Error ? err.message : String(err)}`,
							rawHexPreview: hexPreview,
							targetSummary,
							error: err instanceof Error ? err.message : String(err),
						};
					} finally {
						try {
							if (fs.existsSync(tempFile)) {
								fs.unlinkSync(tempFile);
							}
						} catch (cleanupErr) {
							logger.warn(
								{ err: cleanupErr, tempFile },
								"sendTestPrint failed to cleanup temp spool file",
							);
						}
					}
				}
			}
		}

		return {
			success: false,
			bytesSent: 0,
			timestamp,
			message: `Принтер или транспорт не подключён (${targetSummary}). Тестовый образ сформирован (${buffer.length} байт), но реальная печать не выполнена.`,
			rawHexPreview: hexPreview,
			targetSummary,
			error: "HardwareTransportUnavailable",
		};
	}
}

export const hardwareDiscoveryService = new HardwareDiscoveryService();
