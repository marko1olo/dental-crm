/**
 * @file fileWriteTools.ts
 * @description Инструменты записи клинических файлов и открытия папки снимков пациента в проводнике.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
	createOpenAIToolDefinition,
	type DentalToolContext,
	type DentalToolEntry,
} from "../types.js";
import {
	checkIsLocalWorkstation,
	DESKTOP_DENIED_RESPONSE,
	getTenantDropzonePath,
	isExtensionSafe,
	isPathSafe,
} from "./desktopSecurity.js";

export const writeClinicalFileSchema = z.object({
	targetFile: z.string().min(1, "Путь к файлу обязателен").describe("Путь к файлу для записи"),
	content: z.string().describe("Текстовое или base64 содержимое для записи"),
	isBase64: z.boolean().default(false).describe("Указывает, что в content передан base64"),
	overwrite: z.boolean().default(false).describe("Перезаписать файл, если существует"),
	append: z.boolean().default(false).describe("Дописать в конец существующего файла"),
	createDirectories: z.boolean().default(true).describe("Автоматически создавать папки"),
	description: z.string().optional().describe("Краткое назначение файла"),
});
export type WriteClinicalFileInput = z.input<typeof writeClinicalFileSchema>;

export async function handleWriteClinicalFile(args: WriteClinicalFileInput, context: DentalToolContext) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	const normalized = path.normalize(args.targetFile);
	if (!isPathSafe(normalized)) {
		return { success: false, error: "Отказ безопасности: запись в системные директории заблокирована." };
	}
	if (!isExtensionSafe(normalized)) {
		return { success: false, error: "Отказ безопасности: запись исполняемых файлов строго запрещена." };
	}
	if (args.overwrite && args.append) {
		return { success: false, error: "Ошибка аргументов: нельзя одновременно указывать overwrite=true и append=true." };
	}
	try {
		const exists = fs.existsSync(normalized);
		if (exists && !args.overwrite && !args.append) {
			return { success: false, error: `Файл уже существует по пути '${normalized}'. Укажите overwrite=true или append=true.` };
		}
		if (args.createDirectories) {
			const dir = path.dirname(normalized);
			if (!fs.existsSync(dir)) await fs.promises.mkdir(dir, { recursive: true });
		}
		const dataBuffer = args.isBase64 ? Buffer.from(args.content, "base64") : Buffer.from(args.content, "utf8");
		if (args.append && exists) {
			await fs.promises.appendFile(normalized, dataBuffer);
		} else {
			await fs.promises.writeFile(normalized, dataBuffer);
		}
		const stat = await fs.promises.stat(normalized);
		return {
			success: true, targetFile: normalized, bytesWritten: dataBuffer.length,
			totalFileSizeBytes: stat.size, action: args.append ? "appended" : "written",
			description: args.description || "Клинический файл успешно сохранен",
		};
	} catch (err) {
		return { success: false, error: `Ошибка записи файла: ${(err as Error).message}` };
	}
}

export const writeClinicalFileTool: DentalToolEntry<typeof writeClinicalFileSchema> = {
	name: "write_clinical_file",
	description: "Безопасная запись или дополнение клинических файлов, выписок и дампов снимков (desktop_native).",
	schema: writeClinicalFileSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition("write_clinical_file", "Запись клинического файла на ПК врача.", writeClinicalFileSchema),
	handler: handleWriteClinicalFile,
};

export const openPatientDropzoneFolderSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	patientName: z.string().optional().describe("ФИО пациента для понятного именования"),
});
export type OpenPatientDropzoneFolderInput = z.infer<typeof openPatientDropzoneFolderSchema>;

export async function handleOpenPatientDropzoneFolder(args: OpenPatientDropzoneFolderInput, context: DentalToolContext) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	const targetPath = getTenantDropzonePath(context.organizationId, args.patientId);
	try {
		if (!fs.existsSync(targetPath)) await fs.promises.mkdir(targetPath, { recursive: true });
		const cmd = process.platform === "win32" ? "explorer.exe" : process.platform === "darwin" ? "open" : "xdg-open";
		spawn(cmd, [targetPath], { detached: true, stdio: "ignore" }).unref();
		return {
			success: true, patientId: args.patientId, dropzonePath: targetPath,
			message: `Папка снимков пациента открыта в проводнике Windows: '${targetPath}'`,
		};
	} catch (err) {
		return { success: false, error: `Не удалось создать или открыть папку снимков: ${(err as Error).message}` };
	}
}

export const openPatientDropzoneFolderTool: DentalToolEntry<typeof openPatientDropzoneFolderSchema> = {
	name: "open_patient_dropzone_folder",
	description: "Открытие локальной дропзоны визиографа и папки снимков пациента на ПК врача в Проводнике Windows (desktop_native).",
	schema: openPatientDropzoneFolderSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition("open_patient_dropzone_folder", "Открытие папки снимков пациента в проводнике.", openPatientDropzoneFolderSchema),
	handler: handleOpenPatientDropzoneFolder,
};
