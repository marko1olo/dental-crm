/**
 * workstationTools.ts — Antigravity Workstation & Local Windows Hardware Agent Tools.
 *
 * Implements native PC and hardware management at the dental workstation (VATECH EzDent,
 * Planmeca Romexis, EzSensor, OnDemand3D, explorer dropzones, and screen diagnostics).
 *
 * CLOUD GUARD INVARIANT:
 * If executed in a cloud environment (non-Windows OS or process.env.CLOUD_ENV === "true"),
 * returns a graceful structured denial without throwing or crashing.
 */

import { exec, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import type { AgentContext } from "../context.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";

const execAsync = promisify(exec);

export function isCloudEnvironment(): boolean {
	return process.platform !== "win32" || process.env.CLOUD_ENV === "true";
}

export const CLOUD_GUARD_DENIAL = {
	success: false,
	reason: "cloud_environment_no_direct_hardware_access",
	message:
		"Данная операция (управление ПК/визиографом/скриншот) недоступна в облачной среде. Требуется локальная рабочая станция врача на Windows (Dente Desktop).",
};

// ============================================================================
// 1. TOOL: launch_workstation_app
// ============================================================================

export const launchWorkstationAppSchema = z.object({
	appType: z
		.enum([
			"vatech_ezdent",
			"planmeca_romexis",
			"ezsensor",
			"ondemand3d",
			"sidexis",
			"explorer_custom",
		])
		.describe("Тип запускаемого стоматологического приложения или проводника"),
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

export const STANDARD_APP_PATHS: Record<string, string[]> = {
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

export const launchWorkstationAppTool: ToolDefinition<
	typeof launchWorkstationAppSchema,
	Record<string, unknown>
> = {
	name: "launch_workstation_app",
	description:
		"Запуск специализированного стоматологического ПО (VATECH EzDent-i, Planmeca Romexis, EzSensor, OnDemand3D) или проводника Windows на ПК врача (desktop_native).",
	parameters: launchWorkstationAppSchema,
	permissions: ["clinical.read"],
	category: "write",
	handler: async (
		_ctx: AgentContext,
		args: LaunchWorkstationAppInput,
	): Promise<Record<string, unknown>> => {
		if (isCloudEnvironment()) {
			return CLOUD_GUARD_DENIAL;
		}

		if (args.appType === "explorer_custom") {
			const folderToOpen =
				args.targetPatientFolder || process.env.USERPROFILE || "C:\\";
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
					message: `Проводник Windows успешно запущен с папкой: '${folderToOpen}'`,
				};
			} catch (err) {
				return {
					success: false,
					error: `Не удалось запустить explorer.exe: ${(err as Error).message}`,
				};
			}
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
	},
};

// ============================================================================
// 2. TOOL: open_patient_dropzone_folder
// ============================================================================

export const openPatientDropzoneFolderSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	patientName: z.string().optional().describe("ФИО пациента для понятного именования папки"),
});

export type OpenPatientDropzoneFolderInput = z.infer<
	typeof openPatientDropzoneFolderSchema
>;

export const openPatientDropzoneFolderTool: ToolDefinition<
	typeof openPatientDropzoneFolderSchema,
	Record<string, unknown>
> = {
	name: "open_patient_dropzone_folder",
	description:
		"Открытие локальной дропзоны визиографа и папки снимков пациента на ПК врача в Проводнике Windows (desktop_native).",
	parameters: openPatientDropzoneFolderSchema,
	permissions: ["clinical.read", "patients.read"],
	category: "write",
	handler: async (
		_ctx: AgentContext,
		args: OpenPatientDropzoneFolderInput,
	): Promise<Record<string, unknown>> => {
		if (isCloudEnvironment()) {
			return CLOUD_GUARD_DENIAL;
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

			spawn("explorer.exe", [targetPath], {
				detached: true,
				stdio: "ignore",
			}).unref();

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
	},
};

// ============================================================================
// 3. TOOL: capture_workstation_screen
// ============================================================================

export const captureWorkstationScreenSchema = z.object({
	diagnosticReason: z
		.string()
		.min(3)
		.describe(
			"Клиническая причина снимка экрана (например, 'Фиксация ошибки визиографа', 'Снимок КЛКТ')",
		),
	targetScreenIndex: z
		.number()
		.min(0)
		.max(4)
		.default(0)
		.optional()
		.describe("Индекс монитора (0 - основной)"),
});

export type CaptureWorkstationScreenInput = z.infer<
	typeof captureWorkstationScreenSchema
>;

export const captureWorkstationScreenTool: ToolDefinition<
	typeof captureWorkstationScreenSchema,
	Record<string, unknown>
> = {
	name: "capture_workstation_screen",
	description:
		"Захват снимка экрана рабочего места врача на Windows для визуального анализа снимков визиографа или ошибок софта (desktop_native).",
	parameters: captureWorkstationScreenSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (
		_ctx: AgentContext,
		args: CaptureWorkstationScreenInput,
	): Promise<Record<string, unknown>> => {
		if (isCloudEnvironment()) {
			return CLOUD_GUARD_DENIAL;
		}

		const capturesDir = path.join(process.cwd(), "scratch", "captures");
		try {
			if (!fs.existsSync(capturesDir)) {
				await fs.promises.mkdir(capturesDir, { recursive: true });
			}

			const filename = `screen_${Date.now()}_diag.png`;
			const savePath = path.join(capturesDir, filename);

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
			await execAsync(
				`powershell -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
				{
					timeout: 7000,
				},
			);

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
	},
};

/**
 * Registers all workstation tools into the provided tool registry.
 */
export function registerWorkstationTools(
	registry: ToolRegistry,
	moduleName = "workstation",
): void {
	registry.register(launchWorkstationAppTool, moduleName);
	registry.register(openPatientDropzoneFolderTool, moduleName);
	registry.register(captureWorkstationScreenTool, moduleName);
}
