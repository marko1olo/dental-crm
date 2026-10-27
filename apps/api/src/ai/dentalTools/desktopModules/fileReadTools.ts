/**
 * @file fileReadTools.ts
 * @description Безопасное чтение клинических файлов с поддержкой срезов строк и детекцией DICOM.
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

export const readClinicalFileSchema = z.object({
	filePath: z.string().min(1, "Путь к файлу обязателен").describe("Абсолютный путь к файлу на ПК"),
	startLine: z.number().int().min(1).optional().describe("Начальная строка для чтения (1-индексация)"),
	endLine: z.number().int().min(1).optional().describe("Конечная строка для чтения включительно"),
	contentOffset: z.number().int().min(0).optional().describe("Байтовое смещение от начала файла"),
	maxBytes: z.number().int().min(100).max(10000000).default(200000).describe("Максимум байт"),
	asBinaryBase64: z.boolean().optional().describe("Возвращать содержимое в виде base64"),
});

export type ReadClinicalFileInput = z.input<typeof readClinicalFileSchema>;

async function checkDicom(filePath: string, size: number) {
	if (size < 132) return { isDicom: false, dicomMeta: undefined };
	const checkBuf = Buffer.alloc(132);
	const fd = await fs.promises.open(filePath, "r");
	await fd.read(checkBuf, 0, 132, 0);
	await fd.close();
	if (checkBuf.toString("ascii", 128, 132) === "DICM") {
		return {
			isDicom: true,
			dicomMeta: {
				signature: "DICM",
				detectedModality: filePath.toLowerCase().includes("ct") ? "CBCT" : "RVG",
				preambleBytes: 128,
			},
		};
	}
	return { isDicom: false, dicomMeta: undefined };
}

export async function handleReadClinicalFile(args: ReadClinicalFileInput, context: DentalToolContext) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	const normalized = path.normalize(args.filePath);
	if (!isPathSafe(normalized)) {
		return { success: false, error: "Отказ безопасности: доступ к защищенным системным файлам заблокирован." };
	}
	if (!fs.existsSync(normalized)) {
		return { success: false, error: `Файл не найден по пути: '${normalized}'` };
	}
	try {
		const stat = await fs.promises.stat(normalized);
		const offset = args.contentOffset ?? 0;
		const readLimit = Math.min(stat.size - offset, args.maxBytes ?? 200000);
		if (readLimit <= 0) {
			return { success: true, filePath: normalized, fileSizeBytes: stat.size, bytesRead: 0, isTruncated: false, content: "" };
		}
		const fd = await fs.promises.open(normalized, "r");
		const buffer = Buffer.alloc(readLimit);
		await fd.read(buffer, 0, readLimit, offset);
		await fd.close();
		const { isDicom, dicomMeta } = await checkDicom(normalized, stat.size);
		if (args.asBinaryBase64) {
			return {
				success: true, filePath: normalized, fileSizeBytes: stat.size, bytesRead: readLimit,
				isTruncated: stat.size > offset + readLimit, isDicom, dicomMeta, isBinaryBase64: true,
				content: buffer.toString("base64"),
			};
		}
		const textContent = buffer.toString("utf8");
		if (args.startLine !== undefined || args.endLine !== undefined) {
			const lines = textContent.split(/\r?\n/);
			const start = Math.max(1, args.startLine ?? 1);
			const end = Math.min(lines.length, args.endLine ?? lines.length);
			if (start > end) {
				return { success: false, error: `Некорректный диапазон строк: startLine (${start}) > endLine (${end}).` };
			}
			return {
				success: true, filePath: normalized, fileSizeBytes: stat.size, bytesRead: readLimit,
				totalLines: lines.length, startLine: start, endLine: end,
				isTruncated: stat.size > offset + readLimit || end < lines.length, isDicom, dicomMeta,
				content: lines.slice(start - 1, end).join("\n"),
			};
		}
		return {
			success: true, filePath: normalized, fileSizeBytes: stat.size, bytesRead: readLimit,
			isTruncated: stat.size > offset + readLimit, isDicom, dicomMeta, content: textContent,
		};
	} catch (err) {
		return { success: false, error: `Ошибка чтения файла: ${(err as Error).message}` };
	}
}

export const readClinicalFileTool: DentalToolEntry<typeof readClinicalFileSchema> = {
	name: "read_clinical_file",
	description: "Безопасное чтение клинических файлов с поддержкой срезов строк и детекцией DICOM (desktop_native).",
	schema: readClinicalFileSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition("read_clinical_file", "Чтение локального клинического файла.", readClinicalFileSchema),
	handler: handleReadClinicalFile,
};

export const readLocalClinicalFileSchema = readClinicalFileSchema;
export const handleReadLocalClinicalFile = handleReadClinicalFile;
export const readLocalClinicalFileTool: DentalToolEntry<typeof readLocalClinicalFileSchema> = {
	...readClinicalFileTool,
	name: "read_local_clinical_file",
	definition: createOpenAIToolDefinition("read_local_clinical_file", "Чтение файла на диске станции врача.", readLocalClinicalFileSchema),
};
