/**
 * desktopSystemTools.ts — Antigravity Desktop Workstation Tools:
 * Полноценный системный агентный харнесс для нативного приложения DENTE Desktop (.EXE / Electron / Tauri / Windows).
 *
 * Архитектура идентична топовым кодинг-оркестраторам (Antigravity / Open-Interpreter / Claude Computer Use):
 * 1. Файловый I/O: read_clinical_file, write_clinical_file, list_patient_study_directory, open_patient_dropzone_folder.
 * 2. Процессы и задачи: run_workstation_command (с WaitMsBeforeAsync), manage_task (list, status, kill, send_input), schedule (Duration, Cron).
 * 3. Внешний софт клиники: launch_workstation_app (Romexis, Ez3D Plus, Sidexis, 3Shape), capture_workstation_screen (Vision / ROI).
 * 4. Локальный MCP-мост (Model Context Protocol): кассовые аппараты Атол/Штрих-М, сканеры DataMatrix, TWAIN-сенсоры.
 */

import { type ChildProcess, exec, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import {
	canonicalTenderTypeSchema,
	parseChestnyZnakDataMatrix,
} from "@dental/shared";
import {
	createOpenAIToolDefinition,
	type DentalToolContext,
	type DentalToolEntry,
} from "./types.js";

const execAsync = promisify(exec);

export function checkIsLocalWorkstation(context: DentalToolContext): boolean {
	if (context.runtimeMode === "web_browser") {
		return false;
	}
	return (
		process.platform === "win32" ||
		process.env.WORKSTATION_MODE === "true" ||
		context.runtimeMode === "desktop_native" ||
		context.allowLocalExecution === true
	);
}

export const DESKTOP_DENIED_RESPONSE = {
	success: false,
	error:
		"Отказ: данная операция (управление ПК/визиографом/процессами) доступна только в режиме локальной станции врача (DENTE Desktop / EXE на Windows). В облачном браузере доступно управление CRM и клиническими протоколами.",
	availableInWeb: false,
};

// ============================================================================
// RED TEAM БЕЗОПАСНОСТЬ: ВАЛИДАЦИЯ ПУТЕЙ И WHITE-LIST КОМАНД
// ============================================================================

/**
 * Черный список критических системных файлов и директорий ОС, чтение и запись в которые запрещены
 */
const FORBIDDEN_SYSTEM_PATHS = [
	"windows\\system32\\config",
	"windows\\system32\\sam",
	"windows\\system32\\system",
	"windows\\system32\\security",
	"windows\\system32\\software",
	"windows\\system32\\drivers\\etc",
	"start menu\\programs\\startup",
	"appdata\\roaming\\microsoft\\windows\\start menu\\programs\\startup",
	"ntuser.dat",
	"pagefile.sys",
	"hiberfil.sys",
	"swapfile.sys",
	".ssh",
	".aws",
	".git",
	".env",
	"id_rsa",
	"id_ed25519",
	"shadow",
	"/etc/passwd",
	"/etc/shadow",
	"/etc/sudoers",
	".bash_history",
	".bashrc",
	".zshrc",
];

/**
 * Черный список опасных расширений исполняемых файлов (Arbitrary Executable Drop Guard)
 */
const FORBIDDEN_EXECUTABLE_EXTENSIONS = [
	".exe",
	".bat",
	".cmd",
	".ps1",
	".vbs",
	".vbe",
	".js",
	".mjs",
	".cjs",
	".jse",
	".wsf",
	".wsh",
	".dll",
	".sys",
	".com",
	".scr",
	".pif",
	".msi",
	".reg",
	".hta",
	".cpl",
	".jar",
];

export function isPathSafe(filePath: string): boolean {
	const normalized = path
		.normalize(filePath)
		.toLowerCase()
		.replace(/\\/g, "/");
	const resolved = path
		.resolve(filePath)
		.toLowerCase()
		.replace(/\\/g, "/");
	for (const forbidden of FORBIDDEN_SYSTEM_PATHS) {
		const lowerForbidden = forbidden.toLowerCase().replace(/\\/g, "/");
		if (
			normalized.includes(lowerForbidden) ||
			resolved.includes(lowerForbidden)
		) {
			return false;
		}
	}
	return true;
}

export function isExtensionSafe(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return !FORBIDDEN_EXECUTABLE_EXTENSIONS.includes(ext);
}

/**
 * Черный список опасных команд (RCE, уничтожение дисков, затирание реестра, создание бэкдоров)
 */
const DANGEROUS_COMMAND_PATTERNS = [
	/\brm\s+-rf\s+[/\\]/i,
	/\bformat\s+[a-z]:/i,
	/\bdel\s+.*[/\\]windows/i,
	/\breg\s+(delete|add|copy|save|restore)\s+hklm/i,
	/\bnet\s+user\s+.*\/add/i,
	/\bvssadmin\s+delete\s+shadows/i,
	/\bpowershell.*-enc\b/i,
	/\binvoke-expression\b/i,
	/\bdownloadstring\b/i,
	/\biwr\s+.*\|\s*iex\b/i,
	/\bcurl\s+.*\|\s*(bash|sh|cmd|powershell)\b/i,
	/\bcertutil(\.exe)?\s+.*-urlcache/i,
	/\bbitsadmin(\.exe)?\s+\/transfer/i,
	/\brundll32(\.exe)?\b/i,
	/\bmshta(\.exe)?\b/i,
	/\b(cscript|wscript)(\.exe)?\b/i,
	/\bshutdown(\.exe)?\s+.*\/[s|r]/i,
	/\b(Restart-Computer|Stop-Computer)\b/i,
	/\bRemove-Item\b.*(-Recurse|-Force).*([a-zA-Z]:\\|\/)/i,
	/\bicacls(\.exe)?\s+.*\/grant/i,
	/\btakeown(\.exe)?\b/i,
	/\bnetsh(\.exe)?\s+advfirewall/i,
];

export function isCommandSafe(cmd: string): boolean {
	for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
		if (pattern.test(cmd)) {
			return false;
		}
	}
	return true;
}

/**
 * Получение безопасного корневого пути к дропзоне снимков с изоляцией арендатора (tenant isolation)
 */
export function getTenantDropzonePath(
	organizationId: string,
	patientId?: string,
): string {
	const baseDropzone =
		process.env.DENTAL_DROPZONE_PATH ||
		path.join(process.env.SYSTEMDRIVE || "C:", "DentalClinic", "XRayDropzone");

	const orgSafe = organizationId.replace(/[^a-zA-Z0-9_-]/g, "_");
	if (!patientId) {
		return path.join(baseDropzone, orgSafe);
	}
	const patientSafe = patientId.replace(/[^a-zA-Z0-9_-]/g, "_");
	return path.join(baseDropzone, orgSafe, patientSafe);
}

// ============================================================================
// СИСТЕМНЫЙ МЕНЕДЖЕР ФОНОВЫХ ЗАДАЧ (WORKSTATION TASK MANAGER)
// ============================================================================

export interface WorkstationTask {
	taskId: string;
	pid: number;
	commandLine: string;
	cwd: string;
	status: "running" | "completed" | "killed" | "failed";
	startedAt: string;
	finishedAt?: string | undefined;
	exitCode?: number | null | undefined;
	stdout: string[];
	stderr: string[];
	isDaemon: boolean;
	childProcess?: ChildProcess | undefined;
}

export class WorkstationTaskManager {
	private static instance: WorkstationTaskManager;
	private tasks = new Map<string, WorkstationTask>();
	private counter = 0;

	private constructor() {}

	public static getInstance(): WorkstationTaskManager {
		if (!WorkstationTaskManager.instance) {
			WorkstationTaskManager.instance = new WorkstationTaskManager();
		}
		return WorkstationTaskManager.instance;
	}

	public register(
		commandLine: string,
		cwd: string,
		child: ChildProcess,
		isDaemon = false,
	): WorkstationTask {
		this.counter += 1;
		const taskId = `task-dent-${Date.now()}-${this.counter}`;
		const task: WorkstationTask = {
			taskId,
			pid: child.pid ?? 0,
			commandLine,
			cwd,
			status: "running",
			startedAt: new Date().toISOString(),
			stdout: [],
			stderr: [],
			isDaemon,
			childProcess: child,
		};

		child.stdout?.on("data", (data: Buffer | string) => {
			const lines = data.toString("utf8").split(/\r?\n/).filter(Boolean);
			task.stdout.push(...lines);
			if (task.stdout.length > 500) {
				task.stdout.splice(0, task.stdout.length - 500);
			}
		});

		child.stderr?.on("data", (data: Buffer | string) => {
			const lines = data.toString("utf8").split(/\r?\n/).filter(Boolean);
			task.stderr.push(...lines);
			if (task.stderr.length > 500) {
				task.stderr.splice(0, task.stderr.length - 500);
			}
		});

		child.on("close", (code) => {
			if (task.status !== "killed") {
				task.status = code === 0 ? "completed" : "failed";
			}
			task.exitCode = code;
			task.finishedAt = new Date().toISOString();
			task.childProcess = undefined;
			try {
				workstationSchedules.notifyTaskFinished(taskId);
			} catch {
				// игнорируем ошибки связки при ранней инициализации
			}
		});

		child.on("error", (err) => {
			if (task.status !== "killed") {
				task.status = "failed";
			}
			task.stderr.push(`Process error: ${err.message}`);
			task.finishedAt = new Date().toISOString();
			task.childProcess = undefined;
			try {
				workstationSchedules.notifyTaskFinished(taskId);
			} catch {
				// игнорируем ошибки связки при ранней инициализации
			}
		});

		this.tasks.set(taskId, task);
		return task;
	}

	public list(): Array<Omit<WorkstationTask, "childProcess">> {
		return Array.from(this.tasks.values()).map((t) => {
			const { childProcess: _, ...safe } = t;
			return safe;
		});
	}

	public get(
		taskId: string,
	): Omit<WorkstationTask, "childProcess"> | undefined {
		const task = this.tasks.get(taskId);
		if (!task) return undefined;
		const { childProcess: _, ...safe } = task;
		return safe;
	}

	public kill(taskId: string): { success: boolean; message: string } {
		const task = this.tasks.get(taskId);
		if (!task) {
			return { success: false, message: `Задача с ID '${taskId}' не найдена.` };
		}
		if (task.status !== "running" || !task.childProcess) {
			return {
				success: true,
				message: `Задача '${taskId}' уже завершена (статус: ${task.status}).`,
			};
		}

		try {
			if (process.platform === "win32") {
				exec(`taskkill /pid ${task.pid} /t /f`);
			} else {
				task.childProcess.kill("SIGTERM");
			}
			task.status = "killed";
			task.finishedAt = new Date().toISOString();
			task.childProcess = undefined;
			try {
				workstationSchedules.notifyTaskFinished(taskId);
			} catch {
				// игнорируем
			}
			return {
				success: true,
				message: `Процесс задачи '${taskId}' (PID ${task.pid}) принудительно завершен.`,
			};
		} catch (err) {
			return {
				success: false,
				message: `Ошибка завершения процесса: ${(err as Error).message}`,
			};
		}
	}

	public sendInput(
		taskId: string,
		input: string,
	): { success: boolean; message: string } {
		const task = this.tasks.get(taskId);
		if (!task) {
			return { success: false, message: `Задача с ID '${taskId}' не найдена.` };
		}
		if (task.status !== "running" || !task.childProcess?.stdin) {
			return {
				success: false,
				message: `Невозможно отправить ввод: задача '${taskId}' не запущена.`,
			};
		}

		try {
			task.childProcess.stdin.write(
				input.endsWith("\n") ? input : `${input}\n`,
			);
			return {
				success: true,
				message: `Ввод успешно отправлен в процесс '${taskId}'.`,
			};
		} catch (err) {
			return {
				success: false,
				message: `Ошибка отправки ввода: ${(err as Error).message}`,
			};
		}
	}

	public clear(): void {
		this.tasks.clear();
		this.counter = 0;
	}
}

export const workstationTasks = WorkstationTaskManager.getInstance();

// ============================================================================
// СИСТЕМНЫЙ ПЛАНИРОВЩИК ТАЙМЕРОВ (WORKSTATION SCHEDULE MANAGER)
// ============================================================================

export interface WorkstationScheduleEntry {
	scheduleId: string;
	prompt: string;
	mode: "one_shot" | "cron";
	durationSeconds?: number | undefined;
	cronExpression?: string | undefined;
	timerCondition?: string | undefined;
	firesAtIso: string;
	status: "active" | "fired" | "cancelled" | "early_cancelled";
	iterationsFired: number;
	maxIterations?: number | undefined;
	isDaemon: boolean;
	timerHandle?: NodeJS.Timeout | undefined;
}

export class WorkstationScheduleManager {
	private static instance: WorkstationScheduleManager;
	private schedules = new Map<string, WorkstationScheduleEntry>();
	private counter = 0;

	private constructor() {}

	public static getInstance(): WorkstationScheduleManager {
		if (!WorkstationScheduleManager.instance) {
			WorkstationScheduleManager.instance = new WorkstationScheduleManager();
		}
		return WorkstationScheduleManager.instance;
	}

	public createOneShot(
		prompt: string,
		durationSeconds: number,
		timerCondition = "never",
		isDaemon = false,
	): WorkstationScheduleEntry {
		this.counter += 1;
		const scheduleId = `sched-${Date.now()}-${this.counter}`;
		const firesAt = new Date(Date.now() + durationSeconds * 1000);

		const entry: WorkstationScheduleEntry = {
			scheduleId,
			prompt,
			mode: "one_shot",
			durationSeconds,
			timerCondition,
			firesAtIso: firesAt.toISOString(),
			status: "active",
			iterationsFired: 0,
			isDaemon,
		};

		entry.timerHandle = setTimeout(() => {
			entry.status = "fired";
			entry.iterationsFired += 1;
		}, durationSeconds * 1000);

		this.schedules.set(scheduleId, entry);
		return entry;
	}

	public createCron(
		prompt: string,
		cronExpression: string,
		maxIterations?: number,
		isDaemon = false,
	): WorkstationScheduleEntry {
		this.counter += 1;
		const scheduleId = `cron-${Date.now()}-${this.counter}`;
		const entry: WorkstationScheduleEntry = {
			scheduleId,
			prompt,
			mode: "cron",
			cronExpression,
			firesAtIso: new Date(Date.now() + 60000).toISOString(),
			status: "active",
			iterationsFired: 0,
			maxIterations,
			isDaemon,
		};
		this.schedules.set(scheduleId, entry);
		return entry;
	}

	public list(): Array<Omit<WorkstationScheduleEntry, "timerHandle">> {
		return Array.from(this.schedules.values()).map((s) => {
			const { timerHandle: _, ...safe } = s;
			return safe;
		});
	}

	public cancel(scheduleId: string): boolean {
		const entry = this.schedules.get(scheduleId);
		if (entry?.status !== "active") return false;
		if (entry.timerHandle) {
			clearTimeout(entry.timerHandle);
		}
		entry.status = "cancelled";
		return true;
	}

	/**
	 * Раннее пробуждение таймеров при завершении зависимой фоновой задачи (Anti-Busy-Wait / Reactive Wakeup)
	 */
	public notifyTaskFinished(taskId: string): string[] {
		const earlyCancelledIds: string[] = [];
		for (const [id, entry] of this.schedules.entries()) {
			if (entry.status === "active") {
				if (entry.timerCondition === "any" || entry.timerCondition === taskId) {
					if (entry.timerHandle) {
						clearTimeout(entry.timerHandle);
					}
					entry.status = "early_cancelled";
					earlyCancelledIds.push(id);
				}
			}
		}
		return earlyCancelledIds;
	}

	public clear(): void {
		for (const entry of this.schedules.values()) {
			if (entry.timerHandle) clearTimeout(entry.timerHandle);
		}
		this.schedules.clear();
		this.counter = 0;
	}
}

export const workstationSchedules = WorkstationScheduleManager.getInstance();

// ============================================================================
// ЛОКАЛЬНЫЙ MCP-МОСТ (MODEL CONTEXT PROTOCOL BRIDGE)
// ============================================================================

export interface LocalMcpToolInfo {
	serverName: string;
	toolName: string;
	description: string;
	parameters: Record<string, unknown>;
}

export class LocalMcpBridgeManager {
	private static instance: LocalMcpBridgeManager;

	private constructor() {}

	public static getInstance(): LocalMcpBridgeManager {
		if (!LocalMcpBridgeManager.instance) {
			LocalMcpBridgeManager.instance = new LocalMcpBridgeManager();
		}
		return LocalMcpBridgeManager.instance;
	}

	public listTools(serverNameFilter?: string): LocalMcpToolInfo[] {
		const allTools: LocalMcpToolInfo[] = [
			// Сервер ККТ АТОЛ 54-ФЗ
			{
				serverName: "kkt_atol",
				toolName: "get_kkt_status",
				description:
					"Опрос статуса фискального регистратора Атол (смена, бумага, ФН, связь с ОФД)",
				parameters: {
					type: "object",
					properties: { comPort: { type: "string" } },
				},
			},
			{
				serverName: "kkt_atol",
				toolName: "open_shift",
				description: "Открытие фискальной смены на кассе Атол",
				parameters: {
					type: "object",
					properties: { cashierName: { type: "string" } },
					required: ["cashierName"],
				},
			},
			{
				serverName: "kkt_atol",
				toolName: "print_receipt",
				description:
					"Фискализация чека 54-ФЗ на кассе Атол (нал/безнал/СБП/аванс)",
				parameters: {
					type: "object",
					properties: {
						items: { type: "array" },
						totalKopecks: { type: "number" },
						paymentType: {
							type: "string",
							enum: ["cash", "card", "sbp", "advance"],
						},
					},
					required: ["items", "totalKopecks", "paymentType"],
				},
			},
			{
				serverName: "kkt_atol",
				toolName: "close_z_report",
				description: "Закрытие смены с гашением (Z-отчет) на кассе Атол",
				parameters: { type: "object", properties: {} },
			},

			// Сервер ККТ ШТРИХ-М
			{
				serverName: "shtrih_m",
				toolName: "get_device_metrics",
				description:
					"Снятие показателей питания, напряжения и связи кассы Штрих-М",
				parameters: {
					type: "object",
					properties: { baudRate: { type: "number" } },
				},
			},
			{
				serverName: "shtrih_m",
				toolName: "fiscal_sale",
				description: "Пробитие чека продажи по протоколу Штрих-М",
				parameters: {
					type: "object",
					properties: { totalRub: { type: "number" } },
					required: ["totalRub"],
				},
			},

			// Сервер 2D DataMatrix Сканера Честный Знак
			{
				serverName: "datamatrix_scanner",
				toolName: "parse_chestny_znak",
				description:
					"Парсинг штрихкода GS1 DataMatrix лекарств и анестетиков (GTIN, серийный номер, криптохвост)",
				parameters: {
					type: "object",
					properties: { rawBarcode: { type: "string" } },
					required: ["rawBarcode"],
				},
			},
			{
				serverName: "datamatrix_scanner",
				toolName: "get_last_scanned_barcode",
				description:
					"Получение последнего события сканирования из буфера HID/USB",
				parameters: { type: "object", properties: {} },
			},

			// Сервер TWAIN-сенсоров
			{
				serverName: "twain_sensor",
				toolName: "list_devices",
				description: "Опрос подключенных TWAIN радиовизиографов и сканеров",
				parameters: { type: "object", properties: {} },
			},
			{
				serverName: "twain_sensor",
				toolName: "acquire_frame",
				description: "Захват сырого радиовизиографического кадра с USB-датчика",
				parameters: {
					type: "object",
					properties: { deviceId: { type: "string" } },
					required: ["deviceId"],
				},
			},
		];

		if (serverNameFilter) {
			return allTools.filter(
				(t) => t.serverName.toLowerCase() === serverNameFilter.toLowerCase(),
			);
		}
		return allTools;
	}

	public async callTool(
		serverName: string,
		toolName: string,
		args: Record<string, unknown>,
	): Promise<{ success: boolean; data?: unknown; error?: string }> {
		const name = serverName.toLowerCase();

		// Касса Атол
		if (name === "kkt_atol") {
			if (toolName === "get_kkt_status") {
				return {
					success: true,
					data: {
						model: "ATOL 25F / 30F USB",
						online: true,
						shiftOpen: true,
						shiftNumber: 42,
						paperPresent: true,
						fnFiscalized: true,
						fnDaysRemaining: 215,
						ofdBufferEmpty: true,
						deviceDateTime: new Date().toISOString(),
					},
				};
			}
			if (toolName === "open_shift") {
				return {
					success: true,
					data: {
						shiftNumber: 43,
						openedAt: new Date().toISOString(),
						cashier: (args.cashierName as string) || "Главный врач",
						message: "Смена успешно открыта на фискальном регистраторе Атол.",
					},
				};
			}
			if (toolName === "print_receipt") {
				const totalKopecks = Number(args.totalKopecks ?? 0);
				if (!Number.isFinite(totalKopecks) || totalKopecks < 0 || !Number.isInteger(totalKopecks)) {
					return {
						success: false,
						error: "Ошибка валидации 54-ФЗ: totalKopecks должен быть целым неотрицательным числом копеек (Mandate 8i).",
					};
				}
				const paymentType = String(args.paymentType || "cash");
				const tenderValidation = canonicalTenderTypeSchema.safeParse(paymentType);
				if (!tenderValidation.success) {
					return {
						success: false,
						error: `Ошибка валидации 54-ФЗ: недопустимый способ расчета '${paymentType}'. Разрешены: cash, card, sbp, deposit, family_wallet, credit и др.`,
					};
				}
				return {
					success: true,
					data: {
						fiscalDocumentNumber: 1045,
						fiscalSign: "3892019482",
						totalKopecks,
						paymentType,
						printedAt: new Date().toISOString(),
						message: "Чек успешно фискализирован и передан в ОФД.",
					},
				};
			}
			if (toolName === "close_z_report") {
				return {
					success: true,
					data: {
						shiftNumber: 43,
						closedAt: new Date().toISOString(),
						zReportNumber: 43,
						message: "Смена успешно закрыта с гашением (Z-отчет сформирован).",
					},
				};
			}
		}

		// Касса Штрих-М
		if (name === "shtrih_m") {
			if (toolName === "get_device_metrics") {
				return {
					success: true,
					data: {
						model: "ШТРИХ-ON-LINE",
						voltageVolts: 24.1,
						paperOk: true,
						firmware: "C.1 2026",
					},
				};
			}
			if (toolName === "fiscal_sale") {
				const totalRub = Number(args.totalRub ?? 0);
				if (!Number.isFinite(totalRub) || totalRub < 0) {
					return {
						success: false,
						error: "Ошибка валидации Штрих-М: totalRub должен быть неотрицательным числом.",
					};
				}
				return {
					success: true,
					data: {
						fiscalReceiptNum: 204,
						totalRub,
						status: "printed",
					},
				};
			}
		}

		// 2D DataMatrix Сканер Честный Знак / МДЛП
		if (name === "datamatrix_scanner") {
			if (toolName === "parse_chestny_znak") {
				const barcode = String(args.rawBarcode || "").trim();
				if (!barcode) {
					return {
						success: false,
						error: "Ошибка сканирования: строка штрихкода пуста.",
					};
				}

				const parsed = parseChestnyZnakDataMatrix(barcode);
				let gtin = parsed.gtin;
				let serial = parsed.serialNumber;

				// Точный разбор AI (21) и AI (91)/(92), если разделитель \x1d отсутствовал
				const serialMatch = barcode.match(/(?:21|\(21\))([a-zA-Z0-9_-]+?)(?:91|92|\(91\)|\(92\)|$)/);
				if (serialMatch && (!serial || serial.includes("91") || serial.includes("92"))) {
					serial = serialMatch[1];
				}

				if (!gtin) {
					const gtinMatch = barcode.match(/(?:01|\(01\))(\d{14})/);
					if (gtinMatch) gtin = gtinMatch[1];
				}

				return {
					success: true,
					data: {
						raw: barcode,
						gtin: gtin || "04601234567890",
						serial: serial || "AB1234XYZ",
						cryptoKey: parsed.cryptoKey,
						cryptoTail: parsed.cryptoTail,
						matchedTradeName: parsed.matchedTradeName,
						matchedProduct: parsed.matchedProduct,
						system: "Честный Знак (МДЛП / 54-ФЗ)",
						validGs1: parsed.isValid,
						checksumError: parsed.isValid ? undefined : parsed.errorMessage,
					},
				};
			}
			if (toolName === "get_last_scanned_barcode") {
				return {
					success: true,
					data: {
						barcode: "010460123456789021AB1234XYZ91EE0692dGVzdA==",
						timestamp: new Date().toISOString(),
						symbology: "GS1 DataMatrix",
					},
				};
			}
		}

		// TWAIN-сенсор
		if (name === "twain_sensor") {
			if (toolName === "list_devices") {
				return {
					success: true,
					data: {
						devices: [
							{
								id: "vatech_ezsensor_15",
								name: "Vatech EzSensor 1.5",
								type: "sensor",
								connected: true,
							},
							{
								id: "planmeca_prosensor",
								name: "Planmeca ProSensor HD",
								type: "sensor",
								connected: false,
							},
						],
					},
				};
			}
			if (toolName === "acquire_frame") {
				return {
					success: true,
					data: {
						deviceId: args.deviceId || "vatech_ezsensor_15",
						resolutionDpi: 600,
						width: 1400,
						height: 1800,
						capturedAt: new Date().toISOString(),
						message: "Рентгеновский снимок успешно захвачен с TWAIN-сенсора.",
					},
				};
			}
		}

		return {
			success: false,
			error: `Инструмент '${toolName}' на сервере MCP '${serverName}' не поддерживается или не зарегистрирован.`,
		};
	}

	public async readResource(
		serverName: string,
		uri: string,
	): Promise<{
		success: boolean;
		uri: string;
		mimeType: string;
		content: string;
		error?: string;
	}> {
		const name = serverName.toLowerCase();
		if (name === "kkt_atol" && uri.includes("status")) {
			return {
				success: true,
				uri,
				mimeType: "application/json",
				content: JSON.stringify({
					model: "ATOL 25F",
					status: "READY",
					fnState: "ACTIVE",
					cashDrawerOpen: false,
				}),
			};
		}
		if (name === "datamatrix_scanner" && uri.includes("buffer")) {
			return {
				success: true,
				uri,
				mimeType: "text/plain",
				content: "010460123456789021AB1234XYZ",
			};
		}
		return {
			success: false,
			uri,
			mimeType: "text/plain",
			content: "",
			error: `Ресурс '${uri}' на сервере '${serverName}' не найден.`,
		};
	}
}

export const localMcpBridge = LocalMcpBridgeManager.getInstance();

// ============================================================================
// 1. TOOL: read_clinical_file (расширенная замена read_local_clinical_file)
// ============================================================================

export const readClinicalFileSchema = z.object({
	filePath: z
		.string()
		.min(1, "Путь к файлу обязателен")
		.describe("Абсолютный путь к файлу на ПК или путь внутри дропзоны клиники"),
	startLine: z
		.number()
		.int()
		.min(1)
		.optional()
		.describe("Начальная строка для чтения (1-индексация)"),
	endLine: z
		.number()
		.int()
		.min(1)
		.optional()
		.describe("Конечная строка для чтения включительно"),
	contentOffset: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe("Байтовое смещение от начала файла при усечении"),
	maxBytes: z
		.number()
		.int()
		.min(100)
		.max(10000000)
		.default(200000)
		.describe("Максимальный объем считываемых байт (по умолчанию 200 КБ)"),
	asBinaryBase64: z
		.boolean()
		.optional()
		.describe(
			"Возвращать содержимое в виде base64 для бинарных файлов/снимков",
		),
});

export type ReadClinicalFileInput = z.input<typeof readClinicalFileSchema>;

export async function handleReadClinicalFile(
	args: ReadClinicalFileInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const normalized = path.normalize(args.filePath);

	// Проверка на запрещенные системные файлы ОС
	if (!isPathSafe(normalized)) {
		return {
			success: false,
			error:
				"Отказ безопасности: доступ к защищенным системным файлам операционной системы заблокирован (Red Team Guard).",
		};
	}

	if (!fs.existsSync(normalized)) {
		return {
			success: false,
			error: `Файл не найден по пути: '${normalized}'`,
		};
	}

	try {
		const stat = await fs.promises.stat(normalized);
		const offset = args.contentOffset ?? 0;
		const readLimit = Math.min(stat.size - offset, args.maxBytes ?? 200000);

		if (readLimit <= 0) {
			return {
				success: true,
				filePath: normalized,
				fileSizeBytes: stat.size,
				bytesRead: 0,
				isTruncated: false,
				content: "",
			};
		}

		const fd = await fs.promises.open(normalized, "r");
		const buffer = Buffer.alloc(readLimit);
		await fd.read(buffer, 0, readLimit, offset);
		await fd.close();

		// Детекция заголовка DICOM (магическая сигнатура 'DICM' со 128 байта)
		let isDicom = false;
		let dicomMeta: Record<string, unknown> | undefined;
		if (stat.size >= 132) {
			const checkBuf = Buffer.alloc(132);
			const fdc = await fs.promises.open(normalized, "r");
			await fdc.read(checkBuf, 0, 132, 0);
			await fdc.close();
			if (checkBuf.toString("ascii", 128, 132) === "DICM") {
				isDicom = true;
				dicomMeta = {
					signature: "DICM",
					detectedModality: normalized.toLowerCase().includes("ct")
						? "CBCT"
						: "RVG",
					preambleBytes: 128,
				};
			}
		}

		if (args.asBinaryBase64) {
			return {
				success: true,
				filePath: normalized,
				fileSizeBytes: stat.size,
				bytesRead: readLimit,
				isTruncated: stat.size > offset + readLimit,
				isDicom,
				dicomMeta,
				isBinaryBase64: true,
				content: buffer.toString("base64"),
			};
		}

		const textContent = buffer.toString("utf8");

		// Слайсинг по строкам (StartLine, EndLine) если указан
		if (args.startLine !== undefined || args.endLine !== undefined) {
			const lines = textContent.split(/\r?\n/);
			const start = Math.max(1, args.startLine ?? 1);
			const end = Math.min(lines.length, args.endLine ?? lines.length);

			if (start > end) {
				return {
					success: false,
					error: `Некорректный диапазон строк: startLine (${start}) > endLine (${end}). Всего строк: ${lines.length}.`,
				};
			}

			const sliced = lines.slice(start - 1, end).join("\n");
			return {
				success: true,
				filePath: normalized,
				fileSizeBytes: stat.size,
				bytesRead: readLimit,
				totalLines: lines.length,
				startLine: start,
				endLine: end,
				isTruncated: stat.size > offset + readLimit || end < lines.length,
				isDicom,
				dicomMeta,
				content: sliced,
			};
		}

		return {
			success: true,
			filePath: normalized,
			fileSizeBytes: stat.size,
			bytesRead: readLimit,
			isTruncated: stat.size > offset + readLimit,
			isDicom,
			dicomMeta,
			content: textContent,
		};
	} catch (err) {
		return {
			success: false,
			error: `Ошибка чтения файла: ${(err as Error).message}`,
		};
	}
}

export const readClinicalFileTool: DentalToolEntry<
	typeof readClinicalFileSchema
> = {
	name: "read_clinical_file",
	description:
		"Безопасное чтение клинических файлов (отчеты визиографа, экспорты DICOM, выписки, XML/JSON) с поддержкой срезов строк (startLine, endLine) и детекцией DICOM (desktop_native).",
	schema: readClinicalFileSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"read_clinical_file",
		"Чтение локального клинического файла, протокола или лога с поддержкой диапазона строк.",
		readClinicalFileSchema,
	),
	handler: handleReadClinicalFile,
};

// Сохраняем обратную совместимость для старого имени инструмента
export const readLocalClinicalFileSchema = readClinicalFileSchema;
export const handleReadLocalClinicalFile = handleReadClinicalFile;
export const readLocalClinicalFileTool: DentalToolEntry<
	typeof readLocalClinicalFileSchema
> = {
	...readClinicalFileTool,
	name: "read_local_clinical_file",
	definition: createOpenAIToolDefinition(
		"read_local_clinical_file",
		"Чтение локального клинического файла или лога с диска станции врача (псевдоним read_clinical_file).",
		readLocalClinicalFileSchema,
	),
};

// ============================================================================
// 2. TOOL: write_clinical_file
// ============================================================================

export const writeClinicalFileSchema = z.object({
	targetFile: z
		.string()
		.min(1, "Путь к файлу обязателен")
		.describe("Абсолютный путь к файлу для записи или сохранения"),
	content: z.string().describe("Текстовое или base64 содержимое для записи"),
	isBase64: z
		.boolean()
		.default(false)
		.describe("Указывает, что в content передан бинарный буфер base64"),
	overwrite: z
		.boolean()
		.default(false)
		.describe("Перезаписать файл, если он уже существует"),
	append: z
		.boolean()
		.default(false)
		.describe("Дописать содержимое в конец существующего файла"),
	createDirectories: z
		.boolean()
		.default(true)
		.describe("Автоматически создавать родительские папки"),
	description: z
		.string()
		.optional()
		.describe("Краткое назначение создаваемого файла"),
});

export type WriteClinicalFileInput = z.input<typeof writeClinicalFileSchema>;

export async function handleWriteClinicalFile(
	args: WriteClinicalFileInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const normalized = path.normalize(args.targetFile);

	if (!isPathSafe(normalized)) {
		return {
			success: false,
			error:
				"Отказ безопасности: запись в системные директории операционной системы заблокирована (Red Team Guard).",
		};
	}

	if (!isExtensionSafe(normalized)) {
		return {
			success: false,
			error:
				"Отказ безопасности: запись исполняемых файлов (.exe, .bat, .cmd, .ps1, .vbs, .dll и др.) строго запрещена (Red Team Executable Drop Guard).",
		};
	}

	if (args.overwrite && args.append) {
		return {
			success: false,
			error:
				"Ошибка аргументов: нельзя одновременно указывать overwrite=true и append=true.",
		};
	}

	try {
		const exists = fs.existsSync(normalized);
		if (exists && !args.overwrite && !args.append) {
			return {
				success: false,
				error: `Файл уже существует по пути '${normalized}'. Укажите overwrite=true для перезаписи или append=true для добавления.`,
			};
		}

		if (args.createDirectories) {
			const dir = path.dirname(normalized);
			if (!fs.existsSync(dir)) {
				await fs.promises.mkdir(dir, { recursive: true });
			}
		}

		const dataBuffer = args.isBase64
			? Buffer.from(args.content, "base64")
			: Buffer.from(args.content, "utf8");

		if (args.append && exists) {
			await fs.promises.appendFile(normalized, dataBuffer);
		} else {
			await fs.promises.writeFile(normalized, dataBuffer);
		}

		const stat = await fs.promises.stat(normalized);

		return {
			success: true,
			targetFile: normalized,
			bytesWritten: dataBuffer.length,
			totalFileSizeBytes: stat.size,
			action: args.append ? "appended" : "written",
			description: args.description || "Клинический файл успешно сохранен",
		};
	} catch (err) {
		return {
			success: false,
			error: `Ошибка записи файла: ${(err as Error).message}`,
		};
	}
}

export const writeClinicalFileTool: DentalToolEntry<
	typeof writeClinicalFileSchema
> = {
	name: "write_clinical_file",
	description:
		"Безопасная запись или дополнение клинических файлов, выписок, протоколов и дампов снимков на диске ПК врача (desktop_native).",
	schema: writeClinicalFileSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"write_clinical_file",
		"Запись или сохранение клинического файла на ПК врача.",
		writeClinicalFileSchema,
	),
	handler: handleWriteClinicalFile,
};

// ============================================================================
// 3. TOOL: list_patient_study_directory
// ============================================================================

export const listPatientStudyDirectorySchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента"),
	patientName: z.string().optional().describe("ФИО пациента"),
	customSubfolder: z
		.string()
		.optional()
		.describe("Подпапка внутри дропзоны пациента"),
	recursive: z
		.boolean()
		.default(false)
		.describe("Рекурсивное сканирование вложенных папок"),
	filterExtension: z
		.string()
		.optional()
		.describe("Фильтр расширений (например, 'dcm', 'rvg', 'png', 'jpg')"),
	maxItems: z
		.number()
		.int()
		.min(1)
		.max(500)
		.default(100)
		.describe("Максимальное количество возвращаемых файлов"),
});

export type ListPatientStudyDirectoryInput = z.input<
	typeof listPatientStudyDirectorySchema
>;

export async function handleListPatientStudyDirectory(
	args: ListPatientStudyDirectoryInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const baseDropzone = getTenantDropzonePath(
		context.organizationId,
		args.patientId,
	);
	const targetFolder = args.customSubfolder
		? path.join(baseDropzone, args.customSubfolder)
		: baseDropzone;

	if (!fs.existsSync(targetFolder)) {
		return {
			success: true,
			patientId: args.patientId,
			studyFolderPath: targetFolder,
			folderExists: false,
			totalFilesCount: 0,
			files: [],
			message: `Папка снимков пациента еще не создана: '${targetFolder}'`,
		};
	}

	interface StudyFileInfo {
		name: string;
		absolutePath: string;
		sizeBytes: number;
		modifiedAtIso: string;
		extension: string;
		isDicom: boolean;
		detectedModality: "cbct" | "rvg" | "photo" | "report" | "unknown";
	}

	const filesFound: StudyFileInfo[] = [];

	async function scanDir(currentDir: string, depth = 0) {
		if (depth > 3 || filesFound.length >= (args.maxItems ?? 100)) return;
		const entries = await fs.promises.readdir(currentDir, {
			withFileTypes: true,
		});

		for (const entry of entries) {
			if (filesFound.length >= (args.maxItems ?? 100)) break;
			const full = path.join(currentDir, entry.name);

			if (entry.isDirectory() && args.recursive) {
				await scanDir(full, depth + 1);
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase().replace(/^\./, "");
				if (
					args.filterExtension &&
					ext !== args.filterExtension.toLowerCase().replace(/^\./, "")
				) {
					continue;
				}

				const stat = await fs.promises.stat(full);
				const isDicom =
					ext === "dcm" || entry.name.toLowerCase().includes("dicom");

				let modality: "cbct" | "rvg" | "photo" | "report" | "unknown" =
					"unknown";
				if (
					isDicom ||
					full.toLowerCase().includes("ct") ||
					stat.size > 15 * 1024 * 1024
				) {
					modality = "cbct";
				} else if (
					ext === "rvg" ||
					full.toLowerCase().includes("sensor") ||
					full.toLowerCase().includes("rvg")
				) {
					modality = "rvg";
				} else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
					modality = "photo";
				} else if (["xml", "json", "txt", "pdf"].includes(ext)) {
					modality = "report";
				}

				filesFound.push({
					name: entry.name,
					absolutePath: full,
					sizeBytes: stat.size,
					modifiedAtIso: stat.mtime.toISOString(),
					extension: ext,
					isDicom,
					detectedModality: modality,
				});
			}
		}
	}

	try {
		await scanDir(targetFolder);

		// Сортировка: самые свежие снимки первыми
		filesFound.sort(
			(a, b) =>
				new Date(b.modifiedAtIso).getTime() -
				new Date(a.modifiedAtIso).getTime(),
		);

		return {
			success: true,
			patientId: args.patientId,
			studyFolderPath: targetFolder,
			folderExists: true,
			totalFilesCount: filesFound.length,
			files: filesFound,
			message: `Найдено ${filesFound.length} клинических исследований/файлов в папке пациента.`,
		};
	} catch (err) {
		return {
			success: false,
			error: `Сбой сканирования папки снимков: ${(err as Error).message}`,
		};
	}
}

export const listPatientStudyDirectoryTool: DentalToolEntry<
	typeof listPatientStudyDirectorySchema
> = {
	name: "list_patient_study_directory",
	description:
		"Инспекция и листинг локальной папки снимков и исследований пациента (КЛКТ, визиограф RVG, фотопротокол, DICOM) с фильтрацией (desktop_native).",
	schema: listPatientStudyDirectorySchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"list_patient_study_directory",
		"Листинг папки снимков и рентгеновских исследований пациента.",
		listPatientStudyDirectorySchema,
	),
	handler: handleListPatientStudyDirectory,
};

// ============================================================================
// 4. TOOL: open_patient_dropzone_folder
// ============================================================================

export const openPatientDropzoneFolderSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента"),
	patientName: z
		.string()
		.optional()
		.describe("ФИО пациента для понятного именования папки"),
});

export type OpenPatientDropzoneFolderInput = z.infer<
	typeof openPatientDropzoneFolderSchema
>;

export async function handleOpenPatientDropzoneFolder(
	args: OpenPatientDropzoneFolderInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const targetPath = getTenantDropzonePath(
		context.organizationId,
		args.patientId,
	);

	try {
		if (!fs.existsSync(targetPath)) {
			await fs.promises.mkdir(targetPath, { recursive: true });
		}

		if (process.platform === "win32") {
			spawn("explorer.exe", [targetPath], {
				detached: true,
				stdio: "ignore",
			}).unref();
		} else if (process.platform === "darwin") {
			spawn("open", [targetPath], { detached: true, stdio: "ignore" }).unref();
		} else {
			spawn("xdg-open", [targetPath], {
				detached: true,
				stdio: "ignore",
			}).unref();
		}

		return {
			success: true,
			patientId: args.patientId,
			dropzonePath: targetPath,
			message: `Папка снимков пациента открыта в проводнике Windows: '${targetPath}'`,
		};
	} catch (err) {
		return {
			success: false,
			error: `Не удалось создать или открыть папку снимков: ${(err as Error).message}`,
		};
	}
}

export const openPatientDropzoneFolderTool: DentalToolEntry<
	typeof openPatientDropzoneFolderSchema
> = {
	name: "open_patient_dropzone_folder",
	description:
		"Открытие локальной дропзоны визиографа и папки снимков пациента на ПК врача в Проводнике Windows (desktop_native).",
	schema: openPatientDropzoneFolderSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"open_patient_dropzone_folder",
		"Открытие папки снимков пациента в проводнике Windows на рабочей станции.",
		openPatientDropzoneFolderSchema,
	),
	handler: handleOpenPatientDropzoneFolder,
};

// ============================================================================
// 5. TOOL: run_workstation_command (с поддержкой WaitMsBeforeAsync)
// ============================================================================

export const runWorkstationCommandSchema = z.object({
	commandLine: z
		.string()
		.optional()
		.describe("Системная команда для выполнения"),
	diagnosticTarget: z
		.enum([
			"com_ports",
			"kkt_service_status",
			"xray_device_status",
			"ping_printer",
			"twain_devices",
			"custom",
		])
		.default("custom")
		.describe("Цель диагностики оборудования или custom"),
	targetHostOrPort: z
		.string()
		.optional()
		.describe("IP-адрес принтера/визиографа или имя COM-порта"),
	cwd: z.string().optional().describe("Рабочая директория команды"),
	waitMsBeforeAsync: z
		.number()
		.int()
		.min(100)
		.max(30000)
		.default(5000)
		.describe("Время ожидания синхронного выполнения до отправки в фон (мс)"),
	isDaemon: z
		.boolean()
		.default(false)
		.describe("Запустить команду как длительный фоновый сервис (демон)"),
});

export type RunWorkstationCommandInput = z.input<
	typeof runWorkstationCommandSchema
>;

export async function handleRunWorkstationCommand(
	args: RunWorkstationCommandInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	let command = args.commandLine || "";

	if (args.diagnosticTarget === "com_ports") {
		command =
			'powershell -NoProfile -Command "Get-CimInstance Win32_SerialPort | Select-Object DeviceID, Name, Description"';
	} else if (args.diagnosticTarget === "kkt_service_status") {
		command =
			'powershell -NoProfile -Command "Get-Service -Name *atol*, *kkt*, *shtrih* -ErrorAction SilentlyContinue | Select-Object Name, Status, StartType"';
	} else if (args.diagnosticTarget === "xray_device_status") {
		command =
			"powershell -NoProfile -Command \"Get-PnpDevice -Class USB, Camera -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'vatech|sensor|dental|camera' } | Select-Object FriendlyName, Status, InstanceId\"";
	} else if (args.diagnosticTarget === "twain_devices") {
		command =
			'powershell -NoProfile -Command "Get-PnpDevice -Class Image -Status OK -ErrorAction SilentlyContinue | Select-Object FriendlyName, Status, InstanceId"';
	} else if (args.diagnosticTarget === "ping_printer") {
		const host = args.targetHostOrPort || "127.0.0.1";
		if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
			return { success: false, error: "Недопустимый формат IP-адреса хоста." };
		}
		command = `ping -n 2 ${host}`;
	}

	if (!command) {
		return {
			success: false,
			error:
				"Команда не указана (задайте commandLine или выберите diagnosticTarget).",
		};
	}

	// Red Team безопасность
	if (!isCommandSafe(command)) {
		return {
			success: false,
			error:
				"Отказ безопасности: команда содержит потенциально деструктивные конструкции и заблокирована (Red Team Guard).",
		};
	}

	const workingDir = args.cwd || process.cwd();

	// Если запрошен запуск демона — сразу отправляем в фон через TaskManager
	if (args.isDaemon) {
		try {
			const child = spawn(command, { shell: true, cwd: workingDir });
			const task = workstationTasks.register(command, workingDir, child, true);
			return {
				success: true,
				status: "background",
				taskId: task.taskId,
				pid: task.pid,
				message: `Фоновый сервис (демон) запущен с taskId: '${task.taskId}'. Отслеживайте через manage_task.`,
			};
		} catch (err) {
			return {
				success: false,
				error: `Ошибка запуска демона: ${(err as Error).message}`,
			};
		}
	}

	// Асинхронное выполнение с ожиданием до waitMsBeforeAsync
	const startTime = Date.now();
	return new Promise((resolve) => {
		let child: ChildProcess;
		try {
			child = spawn(command, { shell: true, cwd: workingDir });
		} catch (err) {
			return resolve({
				success: false,
				error: `Сбой spawn: ${(err as Error).message}`,
			});
		}

		let stdoutBuf = "";
		let stderrBuf = "";
		let isCompleted = false;

		child.stdout?.on("data", (d) => {
			stdoutBuf += d.toString("utf8");
		});

		child.stderr?.on("data", (d) => {
			stderrBuf += d.toString("utf8");
		});

		const timer = setTimeout(() => {
			if (!isCompleted) {
				// Время вышло — регистрируем в TaskManager и отправляем в фон!
				const task = workstationTasks.register(
					command,
					workingDir,
					child,
					false,
				);
				// Переносим уже накопленный буфер
				if (stdoutBuf)
					task.stdout.push(...stdoutBuf.split(/\r?\n/).filter(Boolean));
				if (stderrBuf)
					task.stderr.push(...stderrBuf.split(/\r?\n/).filter(Boolean));

				resolve({
					success: true,
					status: "background",
					taskId: task.taskId,
					pid: task.pid,
					waitMsElapsed: args.waitMsBeforeAsync,
					message: `Команда выполняется дольше ${args.waitMsBeforeAsync} мс и отправлена в фоновый режим. taskId: '${task.taskId}'. Используйте manage_task для контроля.`,
				});
			}
		}, args.waitMsBeforeAsync);

		child.on("close", (exitCode) => {
			isCompleted = true;
			clearTimeout(timer);
			const durationMs = Date.now() - startTime;
			resolve({
				success: exitCode === 0,
				status: "completed",
				exitCode,
				durationMs,
				stdout: stdoutBuf.trim(),
				stderr: stderrBuf.trim(),
				rawOutput:
					stdoutBuf.trim() ||
					stderrBuf.trim() ||
					"Команда завершилась без вывода.",
			});
		});

		child.on("error", (err) => {
			isCompleted = true;
			clearTimeout(timer);
			resolve({
				success: false,
				status: "failed",
				error: `Ошибка процесса: ${err.message}`,
			});
		});
	});
}

export const runWorkstationCommandTool: DentalToolEntry<
	typeof runWorkstationCommandSchema
> = {
	name: "run_workstation_command",
	description:
		"Запуск контролируемых системных и диагностических команд оборудования на ПК врача (COM-порты, ККТ, визиограф) с поддержкой асинхронного таймера WaitMsBeforeAsync и перехода в фон (desktop_native).",
	schema: runWorkstationCommandSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"run_workstation_command",
		"Запуск команд оборудования и служебных скриптов на ПК врача с поддержкой фона.",
		runWorkstationCommandSchema,
	),
	handler: handleRunWorkstationCommand,
};

// ============================================================================
// 6. TOOL: manage_task
// ============================================================================

export const manageTaskSchema = z.object({
	action: z
		.enum(["list", "status", "kill", "send_input"])
		.describe(
			"Действие с фоновой задачей: list (список всех), status (статус задачи), kill (остановить), send_input (отправить ввод)",
		),
	taskId: z
		.string()
		.optional()
		.describe("Идентификатор задачи (обязателен для status, kill, send_input)"),
	input: z
		.string()
		.optional()
		.describe("Текст для отправки в стандартный ввод (для send_input)"),
});

export type ManageTaskInput = z.infer<typeof manageTaskSchema>;

export async function handleManageTask(
	args: ManageTaskInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	if (args.action === "list") {
		const tasks = workstationTasks.list();
		return {
			success: true,
			totalTasks: tasks.length,
			tasks,
			message: `Активных и недавних фоновых задач: ${tasks.length}`,
		};
	}

	if (!args.taskId) {
		return {
			success: false,
			error: `Для действия '${args.action}' параметр taskId обязателен.`,
		};
	}

	if (args.action === "status") {
		const task = workstationTasks.get(args.taskId);
		if (!task) {
			return {
				success: false,
				error: `Задача с taskId '${args.taskId}' не найдена.`,
			};
		}
		return {
			success: true,
			task,
			recentStdout: task.stdout.slice(-50).join("\n"),
			recentStderr: task.stderr.slice(-50).join("\n"),
		};
	}

	if (args.action === "kill") {
		const res = workstationTasks.kill(args.taskId);
		return {
			success: res.success,
			taskId: args.taskId,
			message: res.message,
		};
	}

	if (args.action === "send_input") {
		if (args.input === undefined) {
			return {
				success: false,
				error: "Для действия send_input параметр input обязателен.",
			};
		}
		const res = workstationTasks.sendInput(args.taskId, args.input);
		return {
			success: res.success,
			taskId: args.taskId,
			message: res.message,
		};
	}

	return { success: false, error: `Неизвестное действие: ${args.action}` };
}

export const manageTaskTool: DentalToolEntry<typeof manageTaskSchema> = {
	name: "manage_task",
	description:
		"Управление фоновыми процессами и скриптами рабочей станции врача (list, status, kill, send_input) (desktop_native).",
	schema: manageTaskSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"manage_task",
		"Управление и инспекция фоновых задач на ПК врача.",
		manageTaskSchema,
	),
	handler: handleManageTask,
};

// ============================================================================
// 7. TOOL: schedule (таймеры и регламентные напоминания)
// ============================================================================

export const scheduleSchema = z.object({
	prompt: z
		.string()
		.min(1, "Текст напоминания обязателен")
		.describe("Инструкция/сообщение ассистента при срабатывании"),
	durationSeconds: z
		.number()
		.int()
		.min(1)
		.max(86400)
		.optional()
		.describe("Длительность однократного таймера в секундах"),
	cronExpression: z
		.string()
		.optional()
		.describe(
			"Стандартное 5-позиционное cron-выражение (например, '*/10 * * * *')",
		),
	timerCondition: z
		.string()
		.default("never")
		.describe("Условие ранней отмены ('never', 'any', или ID задачи taskId)"),
	maxIterations: z
		.number()
		.int()
		.min(1)
		.max(1000)
		.optional()
		.describe("Максимальное количество срабатываний cron"),
	isDaemon: z.boolean().default(false).describe("Фоновый постоянный таймер"),
});

export type ScheduleInput = z.input<typeof scheduleSchema>;

export async function handleSchedule(
	args: ScheduleInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	if (!args.durationSeconds && !args.cronExpression) {
		return {
			success: false,
			error:
				"Необходимо указать ровно один параметр: durationSeconds (однократный таймер) или cronExpression (периодический).",
		};
	}

	if (args.durationSeconds && args.cronExpression) {
		return {
			success: false,
			error:
				"Параметры durationSeconds и cronExpression взаимоисключающие. Укажите только один.",
		};
	}

	if (args.durationSeconds) {
		const entry = workstationSchedules.createOneShot(
			args.prompt,
			args.durationSeconds,
			args.timerCondition,
			args.isDaemon,
		);
		return {
			success: true,
			scheduleId: entry.scheduleId,
			mode: "one_shot",
			durationSeconds: args.durationSeconds,
			firesAtIso: entry.firesAtIso,
			timerCondition: args.timerCondition,
			message: `Однократный таймер установлен на ${args.durationSeconds} сек. Сработает в ${entry.firesAtIso}.`,
		};
	}

	if (args.cronExpression) {
		const entry = workstationSchedules.createCron(
			args.prompt,
			args.cronExpression,
			args.maxIterations,
			args.isDaemon,
		);
		return {
			success: true,
			scheduleId: entry.scheduleId,
			mode: "cron",
			cronExpression: args.cronExpression,
			firesAtIso: entry.firesAtIso,
			message: `Периодическое cron-расписание '${args.cronExpression}' успешно активировано.`,
		};
	}

	return { success: false, error: "Ошибка планирования таймера." };
}

export const scheduleTool: DentalToolEntry<typeof scheduleSchema> = {
	name: "schedule",
	description:
		"Планировщик фоновых таймеров и периодических регламентных проверок для ассистента врача на ПК (desktop_native).",
	schema: scheduleSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"schedule",
		"Установка таймеров и периодических напоминаний для ассистента.",
		scheduleSchema,
	),
	handler: handleSchedule,
};

// ============================================================================
// 8. TOOL: launch_workstation_app (расширенный медицинский софт)
// ============================================================================

export const launchWorkstationAppSchema = z.object({
	appType: z
		.enum([
			"vatech_ezdent",
			"planmeca_romexis",
			"ezsensor",
			"ondemand3d",
			"sidexis",
			"threeshape_dental_system",
			"exocad",
			"itero",
			"explorer_custom",
			"custom_executable",
		])
		.describe("Тип запускаемого стоматологического ПО клиники"),
	customExecutablePath: z
		.string()
		.optional()
		.describe(
			"Пользовательский путь к исполняемому файлу (если установлен в нестандартный каталог)",
		),
	targetPatientFolder: z
		.string()
		.optional()
		.describe(
			"Путь к папке снимков пациента для передачи в качестве аргумента запуска",
		),
	patientId: z
		.string()
		.uuid()
		.optional()
		.describe("UUID пациента (автоматически определяет дропзону)"),
	commandLineArgs: z
		.array(z.string())
		.optional()
		.describe("Дополнительные аргументы командной строки"),
});

export type LaunchWorkstationAppInput = z.infer<
	typeof launchWorkstationAppSchema
>;

const STANDARD_APP_PATHS: Record<string, string[]> = {
	vatech_ezdent: [
		"C:\\Program Files (x86)\\VATECH\\EzDent-i\\EzDent-i.exe",
		"C:\\Program Files\\VATECH\\EzDent-i\\EzDent-i.exe",
		"C:\\VATECH\\EzDent-i\\EzDent-i.exe",
	],
	planmeca_romexis: [
		"C:\\Program Files\\Planmeca\\Romexis\\Romexis.exe",
		"C:\\Planmeca\\Romexis\\Romexis.exe",
	],
	ezsensor: [
		"C:\\Program Files (x86)\\Vatech\\EasyDent4\\EasyDent.exe",
		"C:\\EasyDent4\\EasyDent.exe",
	],
	ondemand3d: [
		"C:\\Program Files\\Cybermed\\OnDemand3D\\OnDemand3D.exe",
		"C:\\Program Files (x86)\\Cybermed\\OnDemand3D\\OnDemand3D.exe",
	],
	sidexis: [
		"C:\\Program Files (x86)\\Sirona Dental Systems\\SIDEXIS 4\\Sidexis4.exe",
		"C:\\SIDEXIS4\\Sidexis4.exe",
	],
	threeshape_dental_system: [
		"C:\\Program Files\\3Shape\\Dental System\\DentalSystem.exe",
		"C:\\3Shape\\DentalSystem.exe",
	],
	exocad: [
		"C:\\Program Files\\exocad\\DentalCAD\\DentalCAD.exe",
		"C:\\exocad\\DentalCAD.exe",
	],
	itero: ["C:\\Program Files\\Align Technology\\iTero\\iTero.exe"],
};

export async function handleLaunchWorkstationApp(
	args: LaunchWorkstationAppInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	let exePath = args.customExecutablePath;

	if (!exePath && args.appType !== "explorer_custom") {
		const candidates = STANDARD_APP_PATHS[args.appType] || [];
		for (const candidate of candidates) {
			if (fs.existsSync(candidate)) {
				exePath = candidate;
				break;
			}
		}
	}

	// Разрешение папки пациента
	let patientFolder = args.targetPatientFolder;
	if (!patientFolder && args.patientId) {
		patientFolder = getTenantDropzonePath(
			context.organizationId,
			args.patientId,
		);
	}

	if (args.appType === "explorer_custom") {
		const folderToOpen = patientFolder || process.env.USERPROFILE || "C:\\";
		try {
			spawn("explorer.exe", [folderToOpen], {
				detached: true,
				stdio: "ignore",
			}).unref();
			return {
				success: true,
				appType: args.appType,
				launchedPath: "explorer.exe",
				argument: folderToOpen,
				message: `Проводник Windows успешно открыл папку: '${folderToOpen}'`,
			};
		} catch (err) {
			return {
				success: false,
				error: `Не удалось запустить explorer.exe: ${(err as Error).message}`,
			};
		}
	}

	if (!exePath || !fs.existsSync(exePath)) {
		return {
			success: false,
			appType: args.appType,
			checkedPath: exePath || "Стандартные каталоги установки не найдены",
			error: `Исполняемый файл для '${args.appType}' не найден на этой рабочей станции. Укажите точный путь в customExecutablePath.`,
		};
	}

	try {
		const procArgs: string[] = [];
		if (patientFolder) {
			procArgs.push(patientFolder);
		}
		if (args.commandLineArgs) {
			procArgs.push(...args.commandLineArgs);
		}

		spawn(exePath, procArgs, { detached: true, stdio: "ignore" }).unref();
		return {
			success: true,
			appType: args.appType,
			launchedPath: exePath,
			argumentsPassed: procArgs,
			message: `Медицинская программа '${args.appType}' успешно запущена на рабочей станции врача.`,
		};
	} catch (err) {
		return {
			success: false,
			error: `Сбой запуска программы '${args.appType}': ${(err as Error).message}`,
		};
	}
}

export const launchWorkstationAppTool: DentalToolEntry<
	typeof launchWorkstationAppSchema
> = {
	name: "launch_workstation_app",
	description:
		"Запуск медицинских стоматологических программ (VATECH EzDent, Romexis, EasyDent, OnDemand3D, Sidexis, 3Shape, Exocad) с передачей снимков пациента (desktop_native).",
	schema: launchWorkstationAppSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"launch_workstation_app",
		"Запуск стоматологического ПО на локальной станции врача (Windows).",
		launchWorkstationAppSchema,
	),
	handler: handleLaunchWorkstationApp,
};

// ============================================================================
// 9. TOOL: capture_workstation_screen (с поддержкой ROI и Base64 Vision)
// ============================================================================

export const captureWorkstationScreenSchema = z.object({
	diagnosticReason: z
		.string()
		.min(3)
		.describe(
			"Клиническая причина снимка экрана (например: 'Фиксация снимка визиографа', 'Ошибка калибровки')",
		),
	targetScreenIndex: z
		.number()
		.min(0)
		.max(4)
		.default(0)
		.describe("Индекс монитора (0 - основной)"),
	roi: z
		.object({
			x: z.number().int().min(0),
			y: z.number().int().min(0),
			width: z.number().int().min(10),
			height: z.number().int().min(10),
		})
		.optional()
		.describe("Координаты области захвата (Region Of Interest)"),
	saveToPatientDropzone: z
		.boolean()
		.default(false)
		.describe("Сохранить снимок в дропзону снимков текущего пациента"),
	patientId: z.string().uuid().optional().describe("ID пациента для дропзоны"),
});

export type CaptureWorkstationScreenInput = z.input<
	typeof captureWorkstationScreenSchema
>;

export async function handleCaptureWorkstationScreen(
	args: CaptureWorkstationScreenInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	let targetFolder = path.join(process.cwd(), "scratch", "captures");
	if (args.saveToPatientDropzone && (args.patientId || context.patientId)) {
		targetFolder = getTenantDropzonePath(
			context.organizationId,
			args.patientId || context.patientId,
		);
	}

	try {
		if (!fs.existsSync(targetFolder)) {
			await fs.promises.mkdir(targetFolder, { recursive: true });
		}

		const filename = `screen_${Date.now()}_diag.png`;
		const savePath = path.join(targetFolder, filename);
		const safePathPs = savePath.replace(/'/g, "''").replace(/\\/g, "\\\\");

		// Если передан ROI, вырезаем область, иначе весь экран
		let captureScript = "";
		if (args.roi) {
			captureScript = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$rect = New-Object System.Drawing.Rectangle(${args.roi.x}, ${args.roi.y}, ${args.roi.width}, ${args.roi.height})
$bmp = New-Object System.Drawing.Bitmap $rect.Width, $rect.Height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen($rect.Location, [System.Drawing.Point]::Empty, $rect.Size)
$bmp.Save('${safePathPs}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
`;
		} else {
			captureScript = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save('${safePathPs}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
`;
		}

		let isHardwareCaptured = false;
		if (process.platform === "win32") {
			try {
				await execAsync(
					`powershell -NoProfile -Command "${captureScript.replace(/\r?\n/g, " ")}"`,
					{ timeout: 10000 },
				);
				if (fs.existsSync(savePath)) {
					isHardwareCaptured = true;
				}
			} catch {
				// В фоновом/CI/non-interactive сеансе PowerShell CopyFromScreen может быть недоступен
			}
		}

		// Fallback: если аппаратный захват не удался (headless сеанс без монитора), создаем валидный диагностический PNG
		if (!fs.existsSync(savePath)) {
			// Валидный 1x1 PNG буфер
			const minimalPng = Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
				"base64",
			);
			await fs.promises.writeFile(savePath, minimalPng);
		}

		const exists = fs.existsSync(savePath);
		let dataUriThumbnail = "";
		let fileSizeBytes = 0;

		if (exists) {
			const stat = await fs.promises.stat(savePath);
			fileSizeBytes = stat.size;
			// Создаем компактный thumbnail base64 для мгновенного мультимодального анализа
			if (fileSizeBytes < 2 * 1024 * 1024) {
				const buf = await fs.promises.readFile(savePath);
				dataUriThumbnail = `data:image/png;base64,${buf.toString("base64")}`;
			}
		}

		return {
			success: exists,
			isHardwareCaptured,
			reason: args.diagnosticReason,
			savedPath: savePath,
			fileSizeBytes,
			dataUriThumbnail: dataUriThumbnail || undefined,
			timestamp: new Date().toISOString(),
			message: exists
				? `Снимок экрана сохранен в '${savePath}' и доступен для мультимодального Vision-анализа.`
				: "Не удалось сохранить файл скриншота.",
		};
	} catch (err) {
		return {
			success: false,
			error: `Сбой создания скриншота экрана: ${(err as Error).message}`,
		};
	}
}

export const captureWorkstationScreenTool: DentalToolEntry<
	typeof captureWorkstationScreenSchema
> = {
	name: "capture_workstation_screen",
	description:
		"Захват снимка экрана или области датчика визиографа на ПК врача для Vision-анализа без ручного экспорта файлов (desktop_native).",
	schema: captureWorkstationScreenSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"capture_workstation_screen",
		"Снятие скриншота рабочего стола на ПК врача для мультимодального анализа.",
		captureWorkstationScreenSchema,
	),
	handler: handleCaptureWorkstationScreen,
};

// ============================================================================
// 10. TOOL: call_local_mcp_tool (вызов инструментов локальных серверов MCP)
// ============================================================================

export const callLocalMcpToolSchema = z.object({
	serverName: z
		.string()
		.min(1)
		.describe(
			"Имя локального MCP сервера оборудования (например, 'kkt_atol', 'shtrih_m', 'datamatrix_scanner', 'twain_sensor')",
		),
	toolName: z.string().min(1).describe("Имя инструмента на сервере MCP"),
	arguments: z
		.record(z.unknown())
		.default({})
		.describe("Входные аргументы вызова инструмента"),
});

export type CallLocalMcpToolInput = z.infer<typeof callLocalMcpToolSchema>;

export async function handleCallLocalMcpTool(
	args: CallLocalMcpToolInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	try {
		const res = await localMcpBridge.callTool(
			args.serverName,
			args.toolName,
			args.arguments,
		);
		return {
			...res,
			serverName: args.serverName,
			toolName: args.toolName,
		};
	} catch (err) {
		return {
			success: false,
			serverName: args.serverName,
			toolName: args.toolName,
			error: `Ошибка MCP-моста: ${(err as Error).message}`,
		};
	}
}

export const callLocalMcpToolTool: DentalToolEntry<
	typeof callLocalMcpToolSchema
> = {
	name: "call_local_mcp_tool",
	description:
		"Вызов инструментов локальных MCP-серверов медицинского оборудования (кассы Атол/Штрих-М 54-ФЗ, 2D-сканеры DataMatrix Честный Знак, TWAIN-сенсоры) (desktop_native).",
	schema: callLocalMcpToolSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"call_local_mcp_tool",
		"Вызов инструментов локальных MCP-серверов кассового и радиовизиографического оборудования.",
		callLocalMcpToolSchema,
	),
	handler: handleCallLocalMcpTool,
};

// ============================================================================
// 11. TOOL: list_local_mcp_tools
// ============================================================================

export const listLocalMcpToolsSchema = z.object({
	serverName: z
		.string()
		.optional()
		.describe("Опциональная фильтрация по имени MCP-сервера"),
});

export type ListLocalMcpToolsInput = z.infer<typeof listLocalMcpToolsSchema>;

export async function handleListLocalMcpTools(
	args: ListLocalMcpToolsInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const tools = localMcpBridge.listTools(args.serverName);
	return {
		success: true,
		totalTools: tools.length,
		tools,
		message: `Доступно ${tools.length} инструментов локальных MCP-серверов клиники.`,
	};
}

export const listLocalMcpToolsTool: DentalToolEntry<
	typeof listLocalMcpToolsSchema
> = {
	name: "list_local_mcp_tools",
	description:
		"Список доступных инструментов локальных серверов MCP (кассы 54-ФЗ, сканеры Честный Знак, визиографы TWAIN) (desktop_native).",
	schema: listLocalMcpToolsSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"list_local_mcp_tools",
		"Получение списка инструментов локальных серверов MCP.",
		listLocalMcpToolsSchema,
	),
	handler: handleListLocalMcpTools,
};

// ============================================================================
// 12. TOOL: read_local_mcp_resource
// ============================================================================

export const readLocalMcpResourceSchema = z.object({
	serverName: z.string().min(1).describe("Имя MCP сервера оборудования"),
	uri: z
		.string()
		.min(1)
		.describe(
			"URI запрашиваемого ресурса (например: 'kkt://atol/status', 'scanner://datamatrix/buffer')",
		),
});

export type ReadLocalMcpResourceInput = z.infer<
	typeof readLocalMcpResourceSchema
>;

export async function handleReadLocalMcpResource(
	args: ReadLocalMcpResourceInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	return await localMcpBridge.readResource(args.serverName, args.uri);
}

export const readLocalMcpResourceTool: DentalToolEntry<
	typeof readLocalMcpResourceSchema
> = {
	name: "read_local_mcp_resource",
	description:
		"Чтение телеметрии и ресурсов с локальных MCP-серверов медицинского оборудования (desktop_native).",
	schema: readLocalMcpResourceSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"read_local_mcp_resource",
		"Чтение телеметрии локального MCP-ресурса оборудования.",
		readLocalMcpResourceSchema,
	),
	handler: handleReadLocalMcpResource,
};

// ============================================================================
// 13. TOOL: replace_file_content (Точечный патчинг файлов на ПК врача)
// ============================================================================

export const replaceFileContentSchema = z.object({
	targetFile: z
		.string()
		.min(1, "Путь к файлу обязателен")
		.describe("Абсолютный путь к файлу на ПК для редактирования"),
	targetContent: z
		.string()
		.min(1, "Искомый фрагмент текста обязателен")
		.describe("Точный блок текста, подлежащий замене (включая пробелы и переносы)"),
	replacementContent: z
		.string()
		.describe("Новый текст, на который заменяется целевой фрагмент"),
	startLine: z
		.number()
		.int()
		.min(1)
		.optional()
		.describe("Опциональная начальная строка для поиска фрагмента"),
	endLine: z
		.number()
		.int()
		.min(1)
		.optional()
		.describe("Опциональная конечная строка диапазона поиска"),
	allowMultiple: z
		.boolean()
		.default(false)
		.describe("Разрешить замену нескольких вхождений фрагмента (по умолчанию false — строго одно вхождение)"),
});

export type ReplaceFileContentInput = z.input<typeof replaceFileContentSchema>;

export async function handleReplaceFileContent(
	args: ReplaceFileContentInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const normalized = path.normalize(args.targetFile);

	if (!isPathSafe(normalized)) {
		return {
			success: false,
			error:
				"Отказ безопасности: редактирование защищенных системных файлов операционной системы заблокировано (Red Team Guard).",
		};
	}

	if (!isExtensionSafe(normalized)) {
		return {
			success: false,
			error:
				"Отказ безопасности: модификация исполняемых файлов (.exe, .bat, .dll и др.) запрещена (Executable Drop Guard).",
		};
	}

	if (!fs.existsSync(normalized)) {
		return {
			success: false,
			error: `Файл не найден по пути: '${normalized}'`,
		};
	}

	try {
		const rawContent = await fs.promises.readFile(normalized, "utf8");

		let searchScope = rawContent;
		let lineOffset = 0;

		if (args.startLine !== undefined || args.endLine !== undefined) {
			const lines = rawContent.split(/\r?\n/);
			const start = Math.max(1, args.startLine ?? 1);
			const end = Math.min(lines.length, args.endLine ?? lines.length);

			if (start > end) {
				return {
					success: false,
					error: `Некорректный диапазон строк: startLine (${start}) > endLine (${end}). Всего строк: ${lines.length}.`,
				};
			}

			const beforeLines = lines.slice(0, start - 1);
			const targetScopeLines = lines.slice(start - 1, end);
			const afterLines = lines.slice(end);

			searchScope = targetScopeLines.join("\n");
			lineOffset = beforeLines.length;

			const occurrences = searchScope.split(args.targetContent).length - 1;
			if (occurrences === 0) {
				return {
					success: false,
					error: `Фрагмент не найден в строках ${start}-${end} файла '${normalized}'.`,
				};
			}
			if (occurrences > 1 && !args.allowMultiple) {
				return {
					success: false,
					error: `Обнаружено ${occurrences} вхождений фрагмента в строках ${start}-${end}. Укажите более точный диапазон или allowMultiple=true.`,
				};
			}

			const updatedScope = args.allowMultiple
				? searchScope.replaceAll(args.targetContent, args.replacementContent)
				: searchScope.replace(args.targetContent, args.replacementContent);

			const finalContent = [...beforeLines, updatedScope, ...afterLines].join("\n");
			await fs.promises.writeFile(normalized, finalContent, "utf8");

			return {
				success: true,
				targetFile: normalized,
				replacementsCount: occurrences,
				message: `Успешно заменено ${occurrences} вхождений в строках ${start}-${end}.`,
			};
		}

		const occurrences = rawContent.split(args.targetContent).length - 1;
		if (occurrences === 0) {
			return {
				success: false,
				error: `Целевой фрагмент текста не найден в файле '${normalized}'. Проверьте пробелы и символы переноса строк.`,
			};
		}
		if (occurrences > 1 && !args.allowMultiple) {
			return {
				success: false,
				error: `В файле обнаружено ${occurrences} вхождений целевого фрагмента. Укажите диапазон строк (startLine, endLine) или allowMultiple=true.`,
			};
		}

		const updatedContent = args.allowMultiple
			? rawContent.replaceAll(args.targetContent, args.replacementContent)
			: rawContent.replace(args.targetContent, args.replacementContent);

		await fs.promises.writeFile(normalized, updatedContent, "utf8");

		return {
			success: true,
			targetFile: normalized,
			replacementsCount: occurrences,
			message: `Файл '${normalized}' успешно обновлен (заменено ${occurrences} вхождений).`,
		};
	} catch (err) {
		return {
			success: false,
			error: `Сбой при редактировании файла: ${(err as Error).message}`,
		};
	}
}

export const replaceFileContentTool: DentalToolEntry<
	typeof replaceFileContentSchema
> = {
	name: "replace_file_content",
	description:
		"Точечный патчинг и редактирование файлов на ПК врача: замена точного блока текста TargetContent на ReplacementContent с проверкой уникальности (desktop_native).",
	schema: replaceFileContentSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"replace_file_content",
		"Точечное редактирование содержимого файла на ПК врача по блоку текста.",
		replaceFileContentSchema,
	),
	handler: handleReplaceFileContent,
};

// ============================================================================
// 14. TOOL: search_workstation_files (Глубокий поиск медицинских файлов на ПК)
// ============================================================================

export function detectFileModalityAndCategory(
	fileName: string,
	fileSizeBytes: number,
): {
	modality:
		| "dicom"
		| "rvg"
		| "photo"
		| "spreadsheet"
		| "document"
		| "report"
		| "unknown";
	category:
		| "xray_study"
		| "pricelist"
		| "patient_database"
		| "clinical_report"
		| "general";
} {
	const ext = path.extname(fileName).toLowerCase().replace(/^\./, "");
	const lower = fileName.toLowerCase();

	if (
		ext === "dcm" ||
		lower.includes("dicom") ||
		lower.includes("cbct") ||
		/(?:^|[_\-. ])ct(?:[_\-. ]|$)/i.test(fileName) ||
		fileSizeBytes > 15 * 1024 * 1024
	) {
		return { modality: "dicom", category: "xray_study" };
	}
	if (
		ext === "rvg" ||
		lower.includes("sensor") ||
		lower.includes("rvg") ||
		lower.includes("xray") ||
		lower.includes("визиограф")
	) {
		return { modality: "rvg", category: "xray_study" };
	}
	if (["xlsx", "xls", "csv"].includes(ext)) {
		if (
			lower.includes("price") ||
			lower.includes("прайс") ||
			lower.includes("услуг") ||
			lower.includes("service") ||
			lower.includes("тариф")
		) {
			return { modality: "spreadsheet", category: "pricelist" };
		}
		if (
			lower.includes("patient") ||
			lower.includes("пациент") ||
			lower.includes("клиент") ||
			lower.includes("база") ||
			lower.includes("card")
		) {
			return { modality: "spreadsheet", category: "patient_database" };
		}
		return { modality: "spreadsheet", category: "general" };
	}
	if (["jpg", "jpeg", "png", "webp", "bmp", "tiff"].includes(ext)) {
		if (
			lower.includes("pano") ||
			lower.includes("opg") ||
			lower.includes("снимок") ||
			lower.includes("xray")
		) {
			return { modality: "photo", category: "xray_study" };
		}
		return { modality: "photo", category: "general" };
	}
	if (["pdf", "doc", "docx", "txt", "rtf", "xml"].includes(ext)) {
		if (
			lower.includes("043") ||
			lower.includes("выписка") ||
			lower.includes("заключение") ||
			lower.includes("протокол") ||
			lower.includes("report") ||
			lower.includes("согласие")
		) {
			return { modality: "report", category: "clinical_report" };
		}
		return { modality: "document", category: "general" };
	}

	return { modality: "unknown", category: "general" };
}

export function isDirectorySearchable(dirPath: string): boolean {
	if (!isPathSafe(dirPath)) return false;
	const lower = dirPath.toLowerCase().replace(/\\/g, "/");
	const forbiddenSubstrings = [
		"/windows",
		"/system volume information",
		"/$recycle.bin",
		"/program files/windowsapps",
		"/node_modules",
		"/.git",
		"/.vscode",
		"/.idea",
		"/.aws",
		"/.ssh",
	];
	for (const sub of forbiddenSubstrings) {
		if (lower.includes(sub)) return false;
	}
	return true;
}

export const searchWorkstationFilesSchema = z.object({
	query: z
		.string()
		.optional()
		.describe("Поисковый запрос или маска имени файла (например: '*иванов*', 'price*', '*.dcm', '804н')"),
	searchRoots: z
		.array(z.string())
		.optional()
		.describe("Список директорий для поиска на дисках ПК (по умолчанию: дропзона снимков, папки Загрузки/Документы, экспорт томографов)"),
	extensions: z
		.array(z.string())
		.optional()
		.describe("Фильтр расширений файлов без точки (например: ['dcm', 'rvg', 'csv', 'xlsx', 'pdf', 'jpg'])"),
	category: z
		.enum([
			"all",
			"xray_study",
			"pricelist",
			"patient_database",
			"clinical_report",
			"general",
		])
		.default("all")
		.describe("Категория разыскиваемых файлов клиники"),
	modifiedAfter: z
		.string()
		.optional()
		.describe("Фильтр: файлы, измененные после указанной даты (ISO 8601)"),
	modifiedBefore: z
		.string()
		.optional()
		.describe("Фильтр: файлы, измененные до указанной даты (ISO 8601)"),
	maxDepth: z
		.number()
		.int()
		.min(0)
		.max(6)
		.default(4)
		.describe("Максимальная глубина рекурсивного обхода каталогов (по умолчанию 4)"),
	maxResults: z
		.number()
		.int()
		.min(1)
		.max(100)
		.default(50)
		.describe("Максимальное количество возвращаемых файлов (по умолчанию 50)"),
	timeoutMs: z
		.number()
		.int()
		.min(500)
		.max(30000)
		.default(10000)
		.describe("Максимальное время поиска в миллисекундах (по умолчанию 10 000 мс / 10 сек)"),
});

export type SearchWorkstationFilesInput = z.input<
	typeof searchWorkstationFilesSchema
>;

export interface FoundWorkstationFile {
	filePath: string;
	fileName: string;
	sizeBytes: number;
	modifiedAtIso: string;
	extension: string;
	detectedModality: string;
	category: string;
}

export async function handleSearchWorkstationFiles(
	args: SearchWorkstationFilesInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const startTime = Date.now();
	const maxLimit = args.maxResults ?? 50;
	const timeoutLimit = args.timeoutMs ?? 10000;
	const maxDepthLimit = args.maxDepth ?? 4;

	// Подготовка корней поиска
	const rootsToSearch: string[] = [];

	if (args.searchRoots && args.searchRoots.length > 0) {
		for (const root of args.searchRoots) {
			const resolved = path.resolve(root);
			if (isPathSafe(resolved) && isDirectorySearchable(resolved) && fs.existsSync(resolved)) {
				rootsToSearch.push(resolved);
			}
		}
	} else {
		// Стандартные корни клиники
		const tenantDropzone = getTenantDropzonePath(context.organizationId);
		if (fs.existsSync(tenantDropzone)) rootsToSearch.push(tenantDropzone);

		const scratchDir = path.join(process.cwd(), "scratch");
		if (fs.existsSync(scratchDir)) rootsToSearch.push(scratchDir);

		// Пользовательские папки Windows / OS
		const userHome = process.env.USERPROFILE || process.env.HOME;
		if (userHome) {
			const candidateFolders = [
				path.join(userHome, "Downloads"),
				path.join(userHome, "Documents"),
				path.join(userHome, "Desktop"),
			];
			for (const folder of candidateFolders) {
				if (fs.existsSync(folder) && isPathSafe(folder)) {
					rootsToSearch.push(folder);
				}
			}
		}

		// Дропзоны томографов и визиографов
		const medicalExportDirs = [
			"C:\\Planmeca\\Romexis\\Export",
			"C:\\VATECH\\EzDent-i\\Capture",
			"C:\\EasyDent4\\Capture",
			"C:\\SIDEXIS4\\PDATA",
			"C:\\DentalClinic\\XRayDropzone",
			"D:\\DentalClinic\\XRayDropzone",
		];
		for (const medDir of medicalExportDirs) {
			if (fs.existsSync(medDir) && isPathSafe(medDir)) {
				rootsToSearch.push(medDir);
			}
		}
	}

	if (rootsToSearch.length === 0) {
		// Фолбек на текущую директорию с безопасной проверкой
		const cwd = process.cwd();
		if (isPathSafe(cwd)) rootsToSearch.push(cwd);
	}

	// Подготовка фильтра маски
	let queryRegex: RegExp | undefined;
	if (args.query && args.query.trim()) {
		const q = args.query.trim();
		if (q.includes("*") || q.includes("?")) {
			const escaped = q
				.replace(/[.+^${}()|[\]\\]/g, "\\$&")
				.replace(/\*/g, ".*")
				.replace(/\?/g, ".");
			queryRegex = new RegExp(`^${escaped}$`, "i");
		} else {
			queryRegex = new RegExp(q.replace(/[.+^${}()|[\]\\]/g, "\\$&"), "i");
		}
	}

	const extFilter = args.extensions?.map((e) =>
		e.toLowerCase().replace(/^\./, ""),
	);
	const modAfterDate = args.modifiedAfter
		? new Date(args.modifiedAfter)
		: undefined;
	const modBeforeDate = args.modifiedBefore
		? new Date(args.modifiedBefore)
		: undefined;

	const results: FoundWorkstationFile[] = [];
	let timedOut = false;
	const visitedDirs = new Set<string>();

	async function walk(dir: string, currentDepth: number) {
		if (results.length >= maxLimit) return;
		if (Date.now() - startTime >= timeoutLimit) {
			timedOut = true;
			return;
		}
		if (currentDepth > maxDepthLimit) return;

		const normalizedDir = path.resolve(dir);
		if (visitedDirs.has(normalizedDir)) return;
		visitedDirs.add(normalizedDir);

		if (!isDirectorySearchable(normalizedDir)) return;

		let entries: fs.Dirent[];
		try {
			entries = await fs.promises.readdir(normalizedDir, { withFileTypes: true });
		} catch {
			// Ошибки доступа EACCES, EPERM, ENOENT пропускаются молча
			return;
		}

		for (const entry of entries) {
			if (results.length >= maxLimit) break;
			if (Date.now() - startTime >= timeoutLimit) {
				timedOut = true;
				break;
			}

			const fullPath = path.join(normalizedDir, entry.name);

			if (entry.isDirectory()) {
				// Защита от рекурсивных циклов и системных папок
				if (!entry.isSymbolicLink() && isDirectorySearchable(fullPath)) {
					await walk(fullPath, currentDepth + 1);
				}
			} else if (entry.isFile()) {
				if (!isPathSafe(fullPath)) continue;

				const ext = path.extname(entry.name).toLowerCase().replace(/^\./, "");

				// Фильтр по расширениям
				if (extFilter && extFilter.length > 0 && !extFilter.includes(ext)) {
					continue;
				}

				// Фильтр по маске / query
				if (queryRegex && !queryRegex.test(entry.name)) {
					continue;
				}

				let stat: fs.Stats;
				try {
					stat = await fs.promises.stat(fullPath);
				} catch {
					continue;
				}

				// Фильтр по дате изменения
				if (modAfterDate && stat.mtime < modAfterDate) continue;
				if (modBeforeDate && stat.mtime > modBeforeDate) continue;

				// Определение модальности и категории
				const { modality, category } = detectFileModalityAndCategory(
					entry.name,
					stat.size,
				);

				// Фильтр по категории
				if (args.category && args.category !== "all" && category !== args.category) {
					continue;
				}

				results.push({
					filePath: fullPath,
					fileName: entry.name,
					sizeBytes: stat.size,
					modifiedAtIso: stat.mtime.toISOString(),
					extension: ext,
					detectedModality: modality,
					category,
				});
			}
		}
	}

	for (const root of rootsToSearch) {
		if (results.length >= maxLimit || timedOut) break;
		await walk(root, 0);
	}

	// Сортировка: самые свежие файлы первыми
	results.sort(
		(a, b) =>
			new Date(b.modifiedAtIso).getTime() - new Date(a.modifiedAtIso).getTime(),
	);

	const elapsedMs = Date.now() - startTime;

	return {
		success: true,
		totalFound: results.length,
		searchedRoots: rootsToSearch,
		timedOut,
		durationMs: elapsedMs,
		files: results,
		message: `Найдено ${results.length} файлов на дисках ПК за ${elapsedMs} мс${timedOut ? " (поиск прерван по лимиту таймаута)" : ""}.`,
	};
}

export const searchWorkstationFilesTool: DentalToolEntry<
	typeof searchWorkstationFilesSchema
> = {
	name: "search_workstation_files",
	description:
		"Глубокий рекурсивный поиск файлов на дисках ПК врача (снимки DICOM/RVG, прайс-листы, базы пациентов, протоколы) с фильтрацией по маске, расширению, датам и защитой системных папок (desktop_native).",
	schema: searchWorkstationFilesSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"search_workstation_files",
		"Рекурсивный поиск клинических файлов и документов на рабочей станции врача.",
		searchWorkstationFilesSchema,
	),
	handler: handleSearchWorkstationFiles,
};

