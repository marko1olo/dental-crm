/**
 * @file appLauncherTools.ts
 * @description Запуск внешнего медицинского ПО клиники (Planmeca, Vatech, 3Shape, Sidexis, Exocad).
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import { z } from "zod";
import {
	createOpenAIToolDefinition,
	type DentalToolContext,
	type DentalToolEntry,
} from "../types.js";
import { STANDARD_APP_PATHS } from "./appLauncherPaths.js";
import {
	checkIsLocalWorkstation,
	DESKTOP_DENIED_RESPONSE,
	getTenantDropzonePath,
} from "./desktopSecurity.js";

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
	customExecutablePath: z.string().optional().describe("Пользовательский путь к exe"),
	targetPatientFolder: z.string().optional().describe("Папка снимков пациента"),
	patientId: z.string().uuid().optional().describe("UUID пациента для дропзоны"),
	commandLineArgs: z.array(z.string()).optional().describe("Аргументы запуска"),
});

export type LaunchWorkstationAppInput = z.infer<typeof launchWorkstationAppSchema>;

export async function handleLaunchWorkstationApp(
	args: LaunchWorkstationAppInput,
	context: DentalToolContext,
) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;

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

	let patientFolder = args.targetPatientFolder;
	if (!patientFolder && args.patientId) {
		patientFolder = getTenantDropzonePath(context.organizationId, args.patientId);
	}

	if (args.appType === "explorer_custom") {
		const folderToOpen = patientFolder || process.env.USERPROFILE || "C:\\";
		try {
			spawn("explorer.exe", [folderToOpen], { detached: true, stdio: "ignore" }).unref();
			return {
				success: true,
				appType: args.appType,
				launchedPath: "explorer.exe",
				argument: folderToOpen,
				message: `Проводник Windows успешно открыл папку: '${folderToOpen}'`,
			};
		} catch (err) {
			return { success: false, error: `Не удалось запустить explorer: ${(err as Error).message}` };
		}
	}

	if (!exePath || !fs.existsSync(exePath)) {
		return {
			success: false,
			appType: args.appType,
			checkedPath: exePath || "Стандартные каталоги установки не найдены",
			error: `Исполняемый файл для '${args.appType}' не найден на этой рабочей станции.`,
		};
	}

	try {
		const procArgs: string[] = [];
		if (patientFolder) procArgs.push(patientFolder);
		if (args.commandLineArgs) procArgs.push(...args.commandLineArgs);
		spawn(exePath, procArgs, { detached: true, stdio: "ignore" }).unref();
		return {
			success: true,
			appType: args.appType,
			launchedPath: exePath,
			argumentsPassed: procArgs,
			message: `Медицинская программа '${args.appType}' успешно запущена на рабочей станции врача.`,
		};
	} catch (err) {
		return { success: false, error: `Сбой запуска программы '${args.appType}': ${(err as Error).message}` };
	}
}

export const launchWorkstationAppTool: DentalToolEntry<typeof launchWorkstationAppSchema> = {
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
