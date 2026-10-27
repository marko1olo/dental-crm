/**
 * @file fileSearchTools.ts
 * @description Инструмент search_workstation_files для глубокого поиска медицинских файлов на дисках ПК.
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
	isPathSafe,
} from "./desktopSecurity.js";
import type { FoundWorkstationFile } from "./desktopTypes.js";
import {
	detectFileModalityAndCategory,
	isDirectorySearchable,
} from "./fileSearchHelper.js";
import { buildQueryRegex, resolveSearchRoots } from "./fileSearchRoots.js";

export const searchWorkstationFilesSchema = z.object({
	query: z.string().optional().describe("Поисковый запрос или маска имени файла"),
	searchRoots: z.array(z.string()).optional().describe("Список директорий для поиска"),
	extensions: z.array(z.string()).optional().describe("Фильтр расширений файлов без точки"),
	category: z
		.enum(["all", "xray_study", "pricelist", "patient_database", "clinical_report", "general"])
		.default("all")
		.describe("Категория файлов клиники"),
	modifiedAfter: z.string().optional().describe("Файлы, измененные после даты (ISO 8601)"),
	modifiedBefore: z.string().optional().describe("Файлы, измененные до даты (ISO 8601)"),
	maxDepth: z.number().int().min(0).max(6).default(4).describe("Максимальная глубина обхода"),
	maxResults: z.number().int().min(1).max(100).default(50).describe("Максимум результатов"),
	timeoutMs: z.number().int().min(500).max(30000).default(10000).describe("Таймаут поиска (мс)"),
});
export type SearchWorkstationFilesInput = z.input<typeof searchWorkstationFilesSchema>;

export async function handleSearchWorkstationFiles(args: SearchWorkstationFilesInput, context: DentalToolContext) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	const startTime = Date.now();
	const maxLimit = args.maxResults ?? 50;
	const timeoutLimit = args.timeoutMs ?? 10000;
	const maxDepthLimit = args.maxDepth ?? 4;
	const roots = resolveSearchRoots(context.organizationId, args.searchRoots);
	const queryRegex = buildQueryRegex(args.query);
	const extFilter = args.extensions?.map((e) => e.toLowerCase().replace(/^\./, ""));
	const modAfter = args.modifiedAfter ? new Date(args.modifiedAfter) : undefined;
	const modBefore = args.modifiedBefore ? new Date(args.modifiedBefore) : undefined;

	const results: FoundWorkstationFile[] = [];
	let timedOut = false;
	const visited = new Set<string>();

	async function walk(dir: string, depth: number) {
		if (results.length >= maxLimit || depth > maxDepthLimit || Date.now() - startTime >= timeoutLimit) {
			if (Date.now() - startTime >= timeoutLimit) timedOut = true;
			return;
		}
		const norm = path.resolve(dir);
		if (visited.has(norm) || !isDirectorySearchable(norm)) return;
		visited.add(norm);
		let entries: fs.Dirent[];
		try { entries = await fs.promises.readdir(norm, { withFileTypes: true }); } catch { return; }
		for (const entry of entries) {
			if (results.length >= maxLimit || Date.now() - startTime >= timeoutLimit) {
				if (Date.now() - startTime >= timeoutLimit) timedOut = true;
				break;
			}
			const full = path.join(norm, entry.name);
			if (entry.isDirectory() && !entry.isSymbolicLink() && isDirectorySearchable(full)) {
				await walk(full, depth + 1);
			} else if (entry.isFile() && isPathSafe(full)) {
				const ext = path.extname(entry.name).toLowerCase().replace(/^\./, "");
				if (extFilter?.length && !extFilter.includes(ext)) continue;
				if (queryRegex && !queryRegex.test(entry.name)) continue;
				let stat: fs.Stats;
				try { stat = await fs.promises.stat(full); } catch { continue; }
				if (modAfter && stat.mtime < modAfter) continue;
				if (modBefore && stat.mtime > modBefore) continue;
				const { modality, category } = detectFileModalityAndCategory(entry.name, stat.size);
				if (args.category && args.category !== "all" && category !== args.category) continue;
				results.push({
					filePath: full, fileName: entry.name, sizeBytes: stat.size,
					modifiedAtIso: stat.mtime.toISOString(), extension: ext, detectedModality: modality, category,
				});
			}
		}
	}

	for (const root of roots) {
		if (results.length >= maxLimit || timedOut) break;
		await walk(root, 0);
	}
	results.sort((a, b) => new Date(b.modifiedAtIso).getTime() - new Date(a.modifiedAtIso).getTime());
	const elapsed = Date.now() - startTime;
	return {
		success: true, totalFound: results.length, searchedRoots: roots, timedOut,
		durationMs: elapsed, files: results, message: `Найдено ${results.length} файлов на дисках ПК за ${elapsed} мс.`,
	};
}

export const searchWorkstationFilesTool: DentalToolEntry<typeof searchWorkstationFilesSchema> = {
	name: "search_workstation_files",
	description: "Глубокий поиск файлов на дисках ПК врача (DICOM/RVG, прайс-листы, протоколы) (desktop_native).",
	schema: searchWorkstationFilesSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition("search_workstation_files", "Рекурсивный поиск клинических файлов на рабочей станции.", searchWorkstationFilesSchema),
	handler: handleSearchWorkstationFiles,
};
