/**
 * workstationFileTools.ts — Local File System & Radiology Dropzone Tools for Dental Workstation.
 *
 * Sweet Spot: ~210 lines.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";
import { CLOUD_GUARD_DENIAL, isCloudEnvironment } from "./workstationAppTools.js";

// ============================================================================
// 1. TOOL: open_patient_dropzone_folder
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
// 2. TOOL: search_workstation_files
// ============================================================================

export const searchWorkstationFilesSchema = z.object({
	searchFolder: z
		.string()
		.optional()
		.describe("Путь к каталогу поиска (по умолчанию папка дропзоны визиографа/снимков)"),
	pattern: z
		.string()
		.optional()
		.default("*")
		.describe("Паттерн имени файла или ID пациента"),
	extensions: z
		.array(z.string())
		.optional()
		.default([".dcm", ".png", ".jpg", ".jpeg", ".tiff", ".pdf"])
		.describe("Список расширений для фильтрации"),
});

export type SearchWorkstationFilesInput = z.infer<typeof searchWorkstationFilesSchema>;

export const searchWorkstationFilesTool: ToolDefinition<
	typeof searchWorkstationFilesSchema,
	Record<string, unknown>
> = {
	name: "search_workstation_files",
	description:
		"Поиск снимков визиографа, КЛКТ (DICOM) и клинических файлов на дисках локальной рабочей станции врача (desktop_native).",
	parameters: searchWorkstationFilesSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (
		_ctx: AgentContext,
		args: SearchWorkstationFilesInput,
	): Promise<Record<string, unknown>> => {
		if (isCloudEnvironment()) {
			return CLOUD_GUARD_DENIAL;
		}

		const rootFolder =
			args.searchFolder ||
			process.env.DENTAL_DROPZONE_PATH ||
			path.join(process.env.SYSTEMDRIVE || "C:", "DentalClinic", "XRayDropzone");

		if (!fs.existsSync(rootFolder)) {
			return {
				success: true,
				folderPath: rootFolder,
				totalFound: 0,
				files: [],
				message: `Папка '${rootFolder}' не существует на рабочей станции.`,
			};
		}

		try {
			const dirEntries = await fs.promises.readdir(rootFolder, { withFileTypes: true });
			const allowedExts = new Set(args.extensions?.map((e) => e.toLowerCase()));
			const query = (args.pattern || "*").toLowerCase();

			const files: Array<{ name: string; path: string; sizeBytes: number; modifiedAt: string }> = [];

			for (const entry of dirEntries) {
				if (entry.isFile()) {
					const ext = path.extname(entry.name).toLowerCase();
					if (allowedExts.size === 0 || allowedExts.has(ext)) {
						if (query === "*" || entry.name.toLowerCase().includes(query)) {
							const filePath = path.join(rootFolder, entry.name);
							const stat = await fs.promises.stat(filePath);
							files.push({
								name: entry.name,
								path: filePath,
								sizeBytes: stat.size,
								modifiedAt: stat.mtime.toISOString(),
							});
						}
					}
				}
			}

			return {
				success: true,
				folderPath: rootFolder,
				totalFound: files.length,
				files,
				workstation_files: {
					folderPath: rootFolder,
					totalFound: files.length,
					files,
				},
				message: `Найдено файлов на рабочей станции: ${files.length}`,
			};
		} catch (err) {
			return {
				success: false,
				error: `Ошибка при сканировании файлов: ${(err as Error).message}`,
			};
		}
	},
};

// ============================================================================
// 3. TOOL: read_clinical_file & write_clinical_file
// ============================================================================

export const readClinicalFileSchema = z.object({
	filePath: z.string().min(3).describe("Абсолютный путь к файлу на рабочей станции"),
	maxBytes: z.number().optional().default(65536).describe("Максимальный объем считываемых байт"),
});

export const readClinicalFileTool: ToolDefinition<
	typeof readClinicalFileSchema,
	Record<string, unknown>
> = {
	name: "read_clinical_file",
	description:
		"Чтение локального клинического файла (отчет, выгрузка, JSON/текст снимка) с диска рабочей станции врача (desktop_native).",
	parameters: readClinicalFileSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx: AgentContext, args: { filePath: string; maxBytes?: number }) => {
		if (isCloudEnvironment()) {
			return CLOUD_GUARD_DENIAL;
		}

		if (args.filePath.includes("..")) {
			return { success: false, error: "Относительные пути (..) запрещены по соображениям безопасности." };
		}

		if (!fs.existsSync(args.filePath)) {
			return { success: false, error: `Файл не найден: ${args.filePath}` };
		}

		try {
			const stat = await fs.promises.stat(args.filePath);
			const readBytes = Math.min(stat.size, args.maxBytes ?? 65536);
			const buf = Buffer.alloc(readBytes);
			const fd = await fs.promises.open(args.filePath, "r");
			await fd.read(buf, 0, readBytes, 0);
			await fd.close();

			const isText = !buf.some((b) => b === 0);
			return {
				success: true,
				filePath: args.filePath,
				sizeBytes: stat.size,
				readBytes,
				encoding: isText ? "utf-8" : "base64",
				content: isText ? buf.toString("utf-8") : buf.toString("base64"),
			};
		} catch (err) {
			return { success: false, error: `Не удалось прочитать файл: ${(err as Error).message}` };
		}
	},
};

export const writeClinicalFileSchema = z.object({
	filePath: z.string().min(3).describe("Абсолютный путь для сохранения файла на рабочей станции"),
	content: z.string().describe("Текстовое содержимое файла для записи"),
});

export const writeClinicalFileTool: ToolDefinition<
	typeof writeClinicalFileSchema,
	Record<string, unknown>
> = {
	name: "write_clinical_file",
	description:
		"Экспорт и сохранение клинического документа или отчета на диск рабочей станции врача (desktop_native).",
	parameters: writeClinicalFileSchema,
	permissions: ["clinical.write"],
	category: "write",
	handler: async (_ctx: AgentContext, args: { filePath: string; content: string }) => {
		if (isCloudEnvironment()) {
			return CLOUD_GUARD_DENIAL;
		}

		if (args.filePath.includes("..")) {
			return { success: false, error: "Относительные пути (..) запрещены." };
		}

		try {
			const dir = path.dirname(args.filePath);
			if (!fs.existsSync(dir)) {
				await fs.promises.mkdir(dir, { recursive: true });
			}

			await fs.promises.writeFile(args.filePath, args.content, "utf-8");
			return {
				success: true,
				filePath: args.filePath,
				bytesWritten: Buffer.byteLength(args.content, "utf-8"),
				message: `Файл успешно сохранен на рабочей станции: '${args.filePath}'`,
			};
		} catch (err) {
			return { success: false, error: `Не удалось записать файл: ${(err as Error).message}` };
		}
	},
};
