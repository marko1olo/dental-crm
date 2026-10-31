/**
 * workstationAppTools.ts — Launch Dental Workstation Applications & Viewers.
 *
 * Sweet Spot: ~140 lines.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import { z } from "zod";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";

export function isCloudEnvironment(): boolean {
	return process.platform !== "win32" || process.env.CLOUD_ENV === "true";
}

export const CLOUD_GUARD_DENIAL = {
	success: false,
	reason: "cloud_environment_no_direct_hardware_access",
	message:
		"Данная операция (управление ПК/визиографом/скриншот) недоступна в облачной среде. Требуется локальная рабочая станция врача на Windows (Dente Desktop).",
};

export const launchWorkstationAppSchema = z.object({
	appType: z
		.enum([
			"vatech_ezdent",
			"planmeca_romexis",
			"ezsensor",
			"ondemand3d",
			"sidexis",
			"3shape_dental_system",
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
	"3shape_dental_system": [
		"C:\\Program Files\\3Shape\\Dental System\\DentalSystem.exe",
		"C:\\Program Files (x86)\\3Shape\\Dental System\\DentalSystem.exe",
		"C:\\3Shape\\DentalSystem.exe",
	],
};

export const launchWorkstationAppTool: ToolDefinition<
	typeof launchWorkstationAppSchema,
	Record<string, unknown>
> = {
	name: "launch_workstation_app",
	description:
		"Запуск специализированного стоматологического ПО (VATECH EzDent-i, Planmeca Romexis, EzSensor, OnDemand3D, Sirona Sidexis, 3Shape Dental System) или проводника Windows на ПК врача (desktop_native).",
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
