/**
 * importDataHelpers.ts — Хелперы обработки и вставки записей прейскуранта и пациентов.
 * Мандаты: 8b (<= 120 строк), 8n (соло-врач), 8x (живой клинический язык).
 */

import { patients, serviceCatalogItems } from "../../../db/schema.js";
import { rubToKopecks, type ToolDbClient } from "./dbTypes.js";

type DbClient = ToolDbClient;

export async function importPricelistRows(activeDb: DbClient, orgId: string, records: Array<Record<string, unknown>>, dryRun: boolean) {
	let importedCount = 0;
	let skippedCount = 0;
	const errors: string[] = [];
	const sampleImported: Array<Record<string, unknown>> = [];
	const validItems: Array<{
		rowIndex: number;
		title: string;
		values: typeof serviceCatalogItems.$inferInsert;
		sample: Record<string, unknown>;
	}> = [];

	for (let rIdx = 0; rIdx < records.length; rIdx++) {
		const row = records[rIdx];
		if (!row) continue;
		const code = String(row.code ?? row.код ?? row.код_услуги ?? row.артикул ?? `SERV-${rIdx + 1}`).trim();
		const title = String(row.title ?? row.наименование ?? row.название ?? row.услуга ?? row.процедура ?? "").trim();
		const rawPrice = String(row.price ?? row.цена ?? row.стоимость ?? row.price_rub ?? row.руб ?? "0").replace(/[^\d.,]/g, "").replace(",", ".");
		const priceNum = Number.parseFloat(rawPrice) || 0;
		const priceKopecks = rubToKopecks(priceNum);
		const categoryStr = String(row.category ?? row.категория ?? row.раздел ?? "therapy").toLowerCase();

		let validCategory: "therapy" | "surgery" | "prosthetics" | "orthodontics" | "hygiene" | "consultation" | "other" = "therapy";
		if (categoryStr.includes("хирург") || categoryStr.includes("surg")) validCategory = "surgery";
		else if (categoryStr.includes("ортопед") || categoryStr.includes("протез") || categoryStr.includes("prosthet")) validCategory = "prosthetics";
		else if (categoryStr.includes("ортодонт") || categoryStr.includes("ortho")) validCategory = "orthodontics";
		else if (categoryStr.includes("гигиен") || categoryStr.includes("чистк") || categoryStr.includes("hygiene")) validCategory = "hygiene";
		else if (categoryStr.includes("консульт") || categoryStr.includes("осмотр")) validCategory = "consultation";

		if (!title) {
			skippedCount++;
			errors.push(`Строка ${rIdx + 1}: пропущена (отсутствует название услуги).`);
			continue;
		}

		validItems.push({
			rowIndex: rIdx,
			title,
			values: {
				organizationId: orgId,
				code,
				title,
				category: validCategory,
				specialty: "universal",
				basePriceRub: priceNum,
				priceRub: priceNum,
				basePriceKopecks: priceKopecks,
				priceKopecks,
				durationMinutes: 30,
				order804nCode: code.startsWith("A") || code.startsWith("B") ? code : null,
				isActive: true,
			},
			sample: { code, title, priceRub: priceNum, priceKopecks: Number(priceKopecks), category: validCategory },
		});
	}

	if (dryRun) {
		for (const item of validItems) {
			importedCount++;
			if (sampleImported.length < 5) sampleImported.push(item.sample);
		}
		return { importedCount, skippedCount, errors, sampleImported };
	}

	if (validItems.length > 0) {
		try {
			await activeDb.insert(serviceCatalogItems).values(validItems.map((item) => item.values));
			for (const item of validItems) {
				importedCount++;
				if (sampleImported.length < 5) sampleImported.push(item.sample);
			}
		} catch (batchErr) {
			for (const item of validItems) {
				try {
					await activeDb.insert(serviceCatalogItems).values(item.values);
					importedCount++;
					if (sampleImported.length < 5) sampleImported.push(item.sample);
				} catch (dbErr) {
					skippedCount++;
					const msg = dbErr instanceof Error ? dbErr.message : String(batchErr);
					errors.push(`Строка ${item.rowIndex + 1} ('${item.title}'): ошибка записи: ${msg}`);
				}
			}
		}
	}

	return { importedCount, skippedCount, errors, sampleImported };
}

export async function importPatientsRows(activeDb: DbClient, orgId: string, records: Array<Record<string, unknown>>, dryRun: boolean) {
	let importedCount = 0;
	let skippedCount = 0;
	const errors: string[] = [];
	const sampleImported: Array<Record<string, unknown>> = [];
	const validItems: Array<{
		rowIndex: number;
		fullName: string;
		values: typeof patients.$inferInsert;
		sample: Record<string, unknown>;
	}> = [];

	for (let rIdx = 0; rIdx < records.length; rIdx++) {
		const row = records[rIdx];
		if (!row) continue;
		const fullName = String(row.fullname ?? row.full_name ?? row.фио ?? row.пациент ?? row.имя ?? "").trim();
		const phone = String(row.phone ?? row.телефон ?? row.тел ?? row.номер ?? "").trim();
		const birthDate = String(row.birthdate ?? row.birth_date ?? row.дата_рождения ?? row.др ?? "").trim();
		const email = String(row.email ?? row.почта ?? row.электронная_почта ?? "").trim();
		const notes = String(row.notes ?? row.комментарий ?? row.заметки ?? row.примечание ?? "").trim();

		if (!fullName || fullName.length < 2) {
			skippedCount++;
			errors.push(`Строка ${rIdx + 1}: пропущена (не указано корректное ФИО пациента).`);
			continue;
		}

		validItems.push({
			rowIndex: rIdx,
			fullName,
			values: {
				organizationId: orgId,
				fullName,
				phone: phone || null,
				birthDate: birthDate || null,
				email: email || null,
				notes: notes || null,
				status: "active",
			},
			sample: { fullName, phone, birthDate },
		});
	}

	if (dryRun) {
		for (const item of validItems) {
			importedCount++;
			if (sampleImported.length < 5) sampleImported.push(item.sample);
		}
		return { importedCount, skippedCount, errors, sampleImported };
	}

	if (validItems.length > 0) {
		try {
			await activeDb.insert(patients).values(validItems.map((item) => item.values));
			for (const item of validItems) {
				importedCount++;
				if (sampleImported.length < 5) sampleImported.push(item.sample);
			}
		} catch (batchErr) {
			for (const item of validItems) {
				try {
					await activeDb.insert(patients).values(item.values);
					importedCount++;
					if (sampleImported.length < 5) sampleImported.push(item.sample);
				} catch (dbErr) {
					skippedCount++;
					const msg = dbErr instanceof Error ? dbErr.message : String(batchErr);
					errors.push(`Строка ${item.rowIndex + 1} ('${item.fullName}'): ошибка сохранения: ${msg}`);
				}
			}
		}
	}

	return { importedCount, skippedCount, errors, sampleImported };
}
