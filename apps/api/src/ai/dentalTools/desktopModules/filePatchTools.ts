/**
 * @file filePatchTools.ts
 * @description Точечный патчинг и редактирование файлов на ПК врача с проверкой уникальности.
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
	isExtensionSafe,
	isPathSafe,
} from "./desktopSecurity.js";

export const replaceFileContentSchema = z.object({
	targetFile: z.string().min(1, "Путь к файлу обязателен").describe("Путь к файлу на ПК для редактирования"),
	targetContent: z.string().min(1, "Искомый фрагмент обязателен").describe("Точный блок текста для замены"),
	replacementContent: z.string().describe("Новый текст для замены"),
	startLine: z.number().int().min(1).optional().describe("Начальная строка для поиска"),
	endLine: z.number().int().min(1).optional().describe("Конечная строка диапазона поиска"),
	allowMultiple: z.boolean().default(false).describe("Разрешить замену нескольких вхождений"),
});
export type ReplaceFileContentInput = z.input<typeof replaceFileContentSchema>;

function applyLineScopedReplace(raw: string, target: string, replacement: string, start: number, end: number, allowMult: boolean) {
	const lines = raw.split(/\r?\n/);
	if (start > end) return { error: `Некорректный диапазон строк: startLine (${start}) > endLine (${end}).` };
	const before = lines.slice(0, start - 1);
	const scope = lines.slice(start - 1, end).join("\n");
	const after = lines.slice(end);
	const count = scope.split(target).length - 1;
	if (count === 0) return { error: `Фрагмент не найден в строках ${start}-${end}.` };
	if (count > 1 && !allowMult) return { error: `Обнаружено ${count} вхождений в строках ${start}-${end}.` };
	const updated = allowMult ? scope.replaceAll(target, replacement) : scope.replace(target, replacement);
	return { content: [...before, updated, ...after].join("\n"), count };
}

export async function handleReplaceFileContent(args: ReplaceFileContentInput, context: DentalToolContext) {
	if (!checkIsLocalWorkstation(context)) return DESKTOP_DENIED_RESPONSE;
	const normalized = path.normalize(args.targetFile);
	if (!isPathSafe(normalized)) return { success: false, error: "Отказ безопасности: доступ к системным файлам заблокирован." };
	if (!isExtensionSafe(normalized)) return { success: false, error: "Отказ безопасности: модификация исполняемых файлов запрещена." };
	if (!fs.existsSync(normalized)) return { success: false, error: `Файл не найден: '${normalized}'` };
	try {
		const raw = await fs.promises.readFile(normalized, "utf8");
		if (args.startLine !== undefined || args.endLine !== undefined) {
			const res = applyLineScopedReplace(raw, args.targetContent, args.replacementContent, Math.max(1, args.startLine ?? 1), Math.min(raw.split(/\r?\n/).length, args.endLine ?? raw.split(/\r?\n/).length), args.allowMultiple ?? false);
			if (res.error) return { success: false, error: res.error };
			await fs.promises.writeFile(normalized, res.content!, "utf8");
			return { success: true, targetFile: normalized, replacementsCount: res.count, message: `Заменено ${res.count} вхождений.` };
		}
		const count = raw.split(args.targetContent).length - 1;
		if (count === 0) return { success: false, error: `Фрагмент не найден в файле '${normalized}'.` };
		if (count > 1 && !args.allowMultiple) return { success: false, error: `В файле обнаружено ${count} вхождений. Укажите строки или allowMultiple=true.` };
		const updated = args.allowMultiple ? raw.replaceAll(args.targetContent, args.replacementContent) : raw.replace(args.targetContent, args.replacementContent);
		await fs.promises.writeFile(normalized, updated, "utf8");
		return { success: true, targetFile: normalized, replacementsCount: count, message: `Файл '${normalized}' успешно обновлен (заменено ${count} вхождений).` };
	} catch (err) {
		return { success: false, error: `Сбой редактирования: ${(err as Error).message}` };
	}
}

export const replaceFileContentTool: DentalToolEntry<typeof replaceFileContentSchema> = {
	name: "replace_file_content",
	description: "Точечный патчинг и редактирование файлов на ПК врача: замена точного блока текста с проверкой уникальности (desktop_native).",
	schema: replaceFileContentSchema,
	supportedModes: ["desktop_native"],
	definition: createOpenAIToolDefinition("replace_file_content", "Точечное редактирование содержимого файла на ПК врача.", replaceFileContentSchema),
	handler: handleReplaceFileContent,
};
