/**
 * @file fileStudyTools.ts
 * @description Сканирование локальной дропзоны снимков пациента (КЛКТ, визиограф, фотопротокол).
 */

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
} from "./desktopSecurity.js";

export const listPatientStudyDirectorySchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента").describe("ID пациента"),
	patientName: z.string().optional().describe("ФИО пациента"),
	customSubfolder: z.string().optional().describe("Подпапка внутри дропзоны пациента"),
	recursive: z.boolean().default(false).describe("Рекурсивное сканирование"),
	filterExtension: z.string().optional().describe("Фильтр расширений (например, 'dcm', 'rvg')"),
	maxItems: z.number().int().min(1).max(500).default(100).describe("Максимум файлов"),
});
export type ListPatientStudyDirectoryInput = z.input<typeof listPatientStudyDirectorySchema>;

interface StudyFileInfo {
	name: string;
	absolutePath: string;
	sizeBytes: number;
	modifiedAtIso: string;
	extension: string;
	isDicom: boolean;
	detectedModality: "cbct" | "rvg" | "photo" | "report" | "unknown";
}

export async function handleListPatientStudyDirectory(args: ListPatientStudyDirectoryInput, context: DentalToolContext) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	const base = getTenantDropzonePath(context.organizationId, args.patientId);
	const targetFolder = args.customSubfolder ? path.join(base, args.customSubfolder) : base;

	if (!fs.existsSync(targetFolder)) {
		return {
			success: true, patientId: args.patientId, studyFolderPath: targetFolder,
			folderExists: false, totalFilesCount: 0, files: [],
			message: `Папка снимков пациента еще не создана: '${targetFolder}'`,
		};
	}

	const filesFound: StudyFileInfo[] = [];
	async function scanDir(currentDir: string, depth = 0) {
		if (depth > 3 || filesFound.length >= (args.maxItems ?? 100)) return;
		const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
		for (const entry of entries) {
			if (filesFound.length >= (args.maxItems ?? 100)) break;
			const full = path.join(currentDir, entry.name);
			if (entry.isDirectory() && args.recursive) {
				await scanDir(full, depth + 1);
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase().replace(/^\./, "");
				if (args.filterExtension && ext !== args.filterExtension.toLowerCase().replace(/^\./, "")) continue;
				const stat = await fs.promises.stat(full);
				const isDicom = ext === "dcm" || entry.name.toLowerCase().includes("dicom");
				let modality: "cbct" | "rvg" | "photo" | "report" | "unknown" = "unknown";
				if (isDicom || full.toLowerCase().includes("ct") || stat.size > 15 * 1024 * 1024) {
					modality = "cbct";
				} else if (ext === "rvg" || full.toLowerCase().includes("sensor") || full.toLowerCase().includes("rvg")) {
					modality = "rvg";
				} else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
					modality = "photo";
				} else if (["xml", "json", "txt", "pdf"].includes(ext)) {
					modality = "report";
				}
				filesFound.push({
					name: entry.name, absolutePath: full, sizeBytes: stat.size,
					modifiedAtIso: stat.mtime.toISOString(), extension: ext, isDicom, detectedModality: modality,
				});
			}
		}
	}

	try {
		await scanDir(targetFolder);
		filesFound.sort((a, b) => new Date(b.modifiedAtIso).getTime() - new Date(a.modifiedAtIso).getTime());
		return {
			success: true, patientId: args.patientId, studyFolderPath: targetFolder, folderExists: true,
			totalFilesCount: filesFound.length, files: filesFound,
			message: `Найдено ${filesFound.length} клинических исследований/файлов в папке пациента.`,
		};
	} catch (err) {
		return { success: false, error: `Сбой сканирования папки снимков: ${(err as Error).message}` };
	}
}

export const listPatientStudyDirectoryTool: DentalToolEntry<typeof listPatientStudyDirectorySchema> = {
	name: "list_patient_study_directory",
	description: "Инспекция и листинг локальной папки снимков и исследований пациента (КЛКТ, визиограф, фото) (desktop_native).",
	schema: listPatientStudyDirectorySchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition("list_patient_study_directory", "Листинг папки снимков пациента.", listPatientStudyDirectorySchema),
	handler: handleListPatientStudyDirectory,
};
