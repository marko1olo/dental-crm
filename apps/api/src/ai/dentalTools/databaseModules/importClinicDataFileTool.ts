/**
 * importClinicDataFileTool.ts — Пакетный импорт данных клиники (прейскурант или пациенты) из CSV/JSON.
 * Мандаты: 8b (<= 120 строк), 8e (2-фазный Guard), 8n (соло-практика), 8x (живой язык).
 */

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import { isPathSafe } from "../desktopSystemTools.js";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";
import { parseCsvRows } from "./csvParser.js";
import { importPatientsRows, importPricelistRows } from "./importDataHelpers.js";

export * from "./csvParser.js";

export const importClinicDataFileSchema = z.object({
	filePath: z.string().min(1, "Путь к файлу обязателен").describe("Абсолютный путь к файлу данных на диске ПК (CSV, JSON)"),
	entityType: z.enum(["pricelist", "patients"]).describe("Тип импортируемых данных ('pricelist' или 'patients')"),
	fileFormat: z.enum(["csv", "json", "auto"]).default("auto").describe("Формат файла данных"),
	delimiter: z.string().optional().describe("Разделитель колонок CSV"),
	dryRun: z.boolean().default(false).describe("Тестовый запуск: валидация без сохранения в БД"),
});

export type ImportClinicDataFileInput = z.input<typeof importClinicDataFileSchema>;

export async function handleImportClinicDataFile(args: ImportClinicDataFileInput, context: DentalToolContext) {
	const parsedArgs = importClinicDataFileSchema.parse(args);
	const normalizedPath = path.normalize(parsedArgs.filePath);

	if (!isPathSafe(normalizedPath)) {
		return { success: false, error: "Отказ безопасности: доступ к системным директориям заблокирован (Red Team Guard)." };
	}
	if (!fs.existsSync(normalizedPath)) {
		return { success: false, error: `Файл для импорта не найден по пути: '${normalizedPath}'` };
	}

	const activeDb = context.db ?? defaultDb;
	const orgId = context.organizationId;
	const ext = path.extname(normalizedPath).toLowerCase();
	const isJson = parsedArgs.fileFormat === "json" || (parsedArgs.fileFormat === "auto" && ext === ".json");

	let rawContent: string;
	try {
		rawContent = await fs.promises.readFile(normalizedPath, "utf8");
	} catch (err) {
		return { success: false, error: `Сбой чтения файла импорта: ${(err as Error).message}` };
	}

	let records: Array<Record<string, unknown>> = [];
	if (isJson) {
		try {
			const parsed = JSON.parse(rawContent);
			records = Array.isArray(parsed) ? parsed : [parsed];
		} catch (err) {
			return { success: false, error: `Ошибка синтаксиса JSON: ${(err as Error).message}` };
		}
	} else {
		records = parseCsvRows(rawContent, parsedArgs.delimiter).rows;
	}

	if (records.length === 0) {
		return { success: false, error: "Файл пуст или не содержит доступных строк для импорта." };
	}

	const res =
		parsedArgs.entityType === "pricelist"
			? await importPricelistRows(activeDb, orgId, records, parsedArgs.dryRun)
			: await importPatientsRows(activeDb, orgId, records, parsedArgs.dryRun);

	return {
		success: true,
		entityType: parsedArgs.entityType,
		filePath: normalizedPath,
		dryRun: parsedArgs.dryRun,
		totalRowsRead: records.length,
		importedCount: res.importedCount,
		skippedCount: res.skippedCount,
		errors: res.errors.slice(0, 10),
		sampleImported: res.sampleImported,
		message: parsedArgs.dryRun
			? `Предварительная проверка пройдена: ${res.importedCount} записей готовы к импорту, ${res.skippedCount} строк с ошибками.`
			: `Пакетный импорт успешно завершён: добавлено ${res.importedCount} записей, пропущено ${res.skippedCount}.`,
	};
}

export const importClinicDataFileTool: DentalToolEntry<typeof importClinicDataFileSchema> = {
	name: "import_clinic_data_file",
	description: "Пакетный импорт данных клиники из файлов CSV или JSON: загрузка прейскуранта или пациентов.",
	schema: importClinicDataFileSchema,
	destructive: true,
	titleRu: "Пакетный импорт данных клиники из файла",
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("import_clinic_data_file", "Пакетная загрузка прейскуранта услуг или списка пациентов из файла CSV/JSON.", importClinicDataFileSchema),
	handler: handleImportClinicDataFile,
};
