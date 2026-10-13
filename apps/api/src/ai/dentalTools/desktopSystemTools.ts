/**
 * desktopSystemTools.ts — Antigravity Workstation Tools:
 * Нативное управление ПК врача на Windows (просмотрщики VATECH/Planmeca, папка снимков, чтение DICOM/логов, диагностика).
 * В облачном браузере возвращает честный отказ со статусом availableInWeb: false.
 */

import { exec, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import {
	type DentalToolContext,
	type DentalToolEntry,
	createOpenAIToolDefinition,
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

const DESKTOP_DENIED_RESPONSE = {
	success: false,
	error:
		"Отказ: данная операция (управление ПК/визиографом) доступна только в режиме локальной станции врача (Dente Desktop / EXE на Windows). В облачном браузере доступно управление CRM и клиническими протоколами.",
	availableInWeb: false,
};

// ============================================================================
// 1. TOOL: launch_workstation_app
// ============================================================================

export const launchWorkstationAppSchema = z.object({
	appType: z
		.enum(["vatech_ezdent", "planmeca_romexis", "ezsensor", "ondemand3d", "sidexis", "explorer_custom"])
		.describe("Тип запускаемого стоматологического приложения"),
	customExecutablePath: z
		.string()
		.optional()
		.describe("Пользовательский путь к исполняемому файлу (если установлен в нестандартный каталог)"),
	targetPatientFolder: z
		.string()
		.optional()
		.describe("Путь к папке снимков пациента для передачи в качестве аргумента запуска"),
});

export type LaunchWorkstationAppInput = z.infer<typeof launchWorkstationAppSchema>;

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
};

export async function handleLaunchWorkstationApp(
	args: LaunchWorkstationAppInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	let exePath = args.customExecutablePath;

	if (!exePath) {
		const candidates = STANDARD_APP_PATHS[args.appType] || [];
		for (const candidate of candidates) {
			if (fs.existsSync(candidate)) {
				exePath = candidate;
				break;
			}
		}
	}

	if (args.appType === "explorer_custom") {
		const folderToOpen = args.targetPatientFolder || process.env.USERPROFILE || "C:\\";
		try {
			spawn("explorer.exe", [folderToOpen], { detached: true, stdio: "ignore" }).unref();
			return {
				success: true,
				appType: args.appType,
				launchedPath: "explorer.exe",
				argument: folderToOpen,
				message: `Проводник Windows успешно запущен с папкой: '${folderToOpen}'`,
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
			checkedPath: exePath || "Стандартные пути не найдены",
			error: `Исполняемый файл для '${args.appType}' не найден на этой рабочей станции. Укажите точный путь в customExecutablePath.`,
		};
	}

	try {
		const procArgs = args.targetPatientFolder ? [args.targetPatientFolder] : [];
		spawn(exePath, procArgs, { detached: true, stdio: "ignore" }).unref();
		return {
			success: true,
			appType: args.appType,
			launchedPath: exePath,
			message: `Программа '${args.appType}' успешно запущена на рабочей станции врача.`,
		};
	} catch (err) {
		return {
			success: false,
			error: `Сбой при запуске процесса: ${(err as Error).message}`,
		};
	}
}

export const launchWorkstationAppTool: DentalToolEntry<typeof launchWorkstationAppSchema> = {
	name: "launch_workstation_app",
	description:
		"Запуск внешних стоматологических программ (VATECH EzDent-i, Planmeca Romexis, EzSensor, OnDemand3D) или проводника Windows на ПК врача (desktop_native).",
	schema: launchWorkstationAppSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"launch_workstation_app",
		"Запуск специализированного стоматологического ПО на локальной станции врача (Windows).",
		launchWorkstationAppSchema,
	),
	handler: handleLaunchWorkstationApp,
};

// ============================================================================
// 2. TOOL: open_patient_dropzone_folder
// ============================================================================

export const openPatientDropzoneFolderSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	patientName: z.string().optional().describe("ФИО пациента для понятного именования папки"),
});

export type OpenPatientDropzoneFolderInput = z.infer<typeof openPatientDropzoneFolderSchema>;

export async function handleOpenPatientDropzoneFolder(
	args: OpenPatientDropzoneFolderInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const baseDropzone =
		process.env.DENTAL_DROPZONE_PATH ||
		path.join(process.env.SYSTEMDRIVE || "C:", "DentalClinic", "XRayDropzone");

	const folderName = args.patientName
		? `${args.patientName.replace(/[/\\?%*:|"<>]/g, "_")}_${args.patientId.slice(0, 8)}`
		: args.patientId;

	const targetPath = path.join(baseDropzone, folderName);

	try {
		if (!fs.existsSync(targetPath)) {
			await fs.promises.mkdir(targetPath, { recursive: true });
		}

		spawn("explorer.exe", [targetPath], { detached: true, stdio: "ignore" }).unref();

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

export const openPatientDropzoneFolderTool: DentalToolEntry<typeof openPatientDropzoneFolderSchema> = {
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
// 3. TOOL: read_local_clinical_file
// ============================================================================

export const readLocalClinicalFileSchema = z.object({
	filePath: z.string().min(1, "Путь к файлу обязателен").describe("Абсолютный путь к файлу на ПК"),
	maxBytes: z
		.number()
		.min(100)
		.max(5000000)
		.default(100000)
		.describe("Максимальный размер считываемого содержимого (по умолчанию 100 КБ)"),
});

export type ReadLocalClinicalFileInput = z.infer<typeof readLocalClinicalFileSchema>;

export async function handleReadLocalClinicalFile(
	args: ReadLocalClinicalFileInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const normalized = path.normalize(args.filePath);

	// Защита от опасных системных путей
	const lower = normalized.toLowerCase();
	if (
		lower.includes("windows\\system32\\config") ||
		lower.includes(".ssh") ||
		lower.includes("sam") ||
		lower.includes("ntuser.dat")
	) {
		return {
			success: false,
			error: "Доступ к защищенным системным файлам операционной системы заблокирован.",
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
		const readLimit = Math.min(stat.size, args.maxBytes ?? 100000);

		const fd = await fs.promises.open(normalized, "r");
		const buffer = Buffer.alloc(readLimit);
		await fd.read(buffer, 0, readLimit, 0);
		await fd.close();

		const contentText = buffer.toString("utf8");

		return {
			success: true,
			filePath: normalized,
			fileSizeBytes: stat.size,
			bytesRead: readLimit,
			isTruncated: stat.size > readLimit,
			content: contentText,
		};
	} catch (err) {
		return {
			success: false,
			error: `Ошибка чтения файла: ${(err as Error).message}`,
		};
	}
}

export const readLocalClinicalFileTool: DentalToolEntry<typeof readLocalClinicalFileSchema> = {
	name: "read_local_clinical_file",
	description:
		"Безопасное чтение клинических файлов (отчеты визиографа, экспорты DICOM/XML, логи датчиков) с диска ПК (desktop_native).",
	schema: readLocalClinicalFileSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"read_local_clinical_file",
		"Чтение локального клинического файла или лога с диска станции врача.",
		readLocalClinicalFileSchema,
	),
	handler: handleReadLocalClinicalFile,
};

// ============================================================================
// 4. TOOL: run_workstation_command
// ============================================================================

export const runWorkstationCommandSchema = z.object({
	diagnosticTarget: z
		.enum(["com_ports", "kkt_service_status", "xray_device_status", "ping_printer"])
		.describe("Цель диагностики оборудования"),
	targetHostOrPort: z
		.string()
		.optional()
		.describe("IP-адрес принтера/визиографа или имя COM-порта (например, COM3 или 192.168.1.50)"),
});

export type RunWorkstationCommandInput = z.infer<typeof runWorkstationCommandSchema>;

export async function handleRunWorkstationCommand(
	args: RunWorkstationCommandInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	let command = "";
	if (args.diagnosticTarget === "com_ports") {
		command = 'powershell -NoProfile -Command "Get-CimInstance Win32_SerialPort | Select-Object DeviceID, Name, Description"';
	} else if (args.diagnosticTarget === "kkt_service_status") {
		command = 'powershell -NoProfile -Command "Get-Service -Name *atol*, *kkt*, *shtrih* -ErrorAction SilentlyContinue | Select-Object Name, Status, StartType"';
	} else if (args.diagnosticTarget === "xray_device_status") {
		command = 'powershell -NoProfile -Command "Get-PnpDevice -Class USB, Camera -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match \'vatech|sensor|dental|camera\' } | Select-Object FriendlyName, Status, InstanceId"';
	} else if (args.diagnosticTarget === "ping_printer") {
		const host = args.targetHostOrPort || "127.0.0.1";
		// Санитизация хоста
		if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
			return { success: false, error: "Недопустимый формат IP-адреса хоста." };
		}
		command = `ping -n 2 ${host}`;
	}

	try {
		const { stdout, stderr } = await execAsync(command, { timeout: 8000 });
		return {
			success: true,
			target: args.diagnosticTarget,
			rawOutput: stdout.trim() || stderr.trim() || "Команда завершилась без вывода (устройства не найдены)",
			status: "executed",
		};
	} catch (err) {
		return {
			success: false,
			error: `Сбой выполнения команды диагностики: ${(err as Error).message}`,
		};
	}
}

export const runWorkstationCommandTool: DentalToolEntry<typeof runWorkstationCommandSchema> = {
	name: "run_workstation_command",
	description:
		"Запуск контролируемых диагностических команд оборудования на ПК врача (COM-порты, статус службы ККТ Атол, датчики визиографа, пинг принтера) (desktop_native).",
	schema: runWorkstationCommandSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"run_workstation_command",
		"Диагностика оборудования (COM-порты датчиков, служба ККТ, пинг) на ПК врача.",
		runWorkstationCommandSchema,
	),
	handler: handleRunWorkstationCommand,
};

// ============================================================================
// 5. TOOL: capture_workstation_screen
// ============================================================================

export const captureWorkstationScreenSchema = z.object({
	diagnosticReason: z
		.string()
		.min(3)
		.describe("Клиническая причина снимка экрана (например, 'Фиксация ошибки визиографа', 'Снимок КЛКТ')"),
	targetScreenIndex: z.number().min(0).max(4).default(0).describe("Индекс монитора (0 - основной)"),
});

export type CaptureWorkstationScreenInput = z.infer<typeof captureWorkstationScreenSchema>;

export async function handleCaptureWorkstationScreen(
	args: CaptureWorkstationScreenInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) {
		return DESKTOP_DENIED_RESPONSE;
	}

	const capturesDir = path.join(process.cwd(), "scratch", "captures");
	try {
		if (!fs.existsSync(capturesDir)) {
			await fs.promises.mkdir(capturesDir, { recursive: true });
		}

		const filename = `screen_${Date.now()}_diag.png`;
		const savePath = path.join(capturesDir, filename);

		// PowerShell захват экрана
		const psScript = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save('${savePath.replace(/\\/g, "\\\\")}')
$graphics.Dispose()
$bmp.Dispose()
`;
		await execAsync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`, {
			timeout: 7000,
		});

		const exists = fs.existsSync(savePath);

		return {
			success: exists,
			reason: args.diagnosticReason,
			savedPath: savePath,
			timestamp: new Date().toISOString(),
			message: exists
				? `Снимок экрана сохранен в '${savePath}' и готов к визуальному анализу.`
				: "Не удалось сохранить файл скриншота.",
		};
	} catch (err) {
		return {
			success: false,
			error: `Сбой создания скриншота экрана: ${(err as Error).message}`,
		};
	}
}

export const captureWorkstationScreenTool: DentalToolEntry<typeof captureWorkstationScreenSchema> = {
	name: "capture_workstation_screen",
	description:
		"Захват снимка экрана рабочего места врача на Windows для визуального анализа снимков визиографа или ошибок софта (desktop_native).",
	schema: captureWorkstationScreenSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition(
		"capture_workstation_screen",
		"Снятие скриншота рабочего стола на ПК врача для визуального клинического анализа.",
		captureWorkstationScreenSchema,
	),
	handler: handleCaptureWorkstationScreen,
};
