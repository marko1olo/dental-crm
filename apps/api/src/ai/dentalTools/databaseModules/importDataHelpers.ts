/**
 * importDataHelpers.ts — Хелперы обработки и вставки записей прейскуранта и пациентов.
 * Мандаты: 8b (<= 120 строк), 8n (соло-врач), 8x (живой клинический язык).
 */

import { patients, serviceCatalogItems, services } from "../../../db/schema.js";

type DbClient = any;

export async function importPricelistRows(activeDb: DbClient, orgId: string, records: Array<Record<string, unknown>>, dryRun: boolean) {
	let importedCount = 0;
	let skippedCount = 0;
	const errors: string[] = [];
	const sampleImported: Array<Record<string, unknown>> = [];

	for (let rIdx = 0; rIdx < records.length; rIdx++) {
		const row = records[rIdx];
		if (!row) continue;
		const code = String(row.code ?? row.код ?? row.код_услуги ?? row.артикул ?? `SERV-${rIdx + 1}`).trim();
		const title = String(row.title ?? row.наименование ?? row.название ?? row.услуга ?? row.процедура ?? "").trim();
		const rawPrice = String(row.price ?? row.цена ?? row.стоимость ?? row.price_rub ?? row.руб ?? "0").replace(/[^\d.,]/g, "").replace(",", ".");
		const priceNum = Number.parseFloat(rawPrice) || 0;
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

		if (!dryRun) {
			try {
				await activeDb.insert(serviceCatalogItems).values({ organizationId: orgId, code, title, category: validCategory, specialty: "universal", basePriceRub: priceNum, priceRub: priceNum, durationMinutes: 30, order804nCode: code.startsWith("A") || code.startsWith("B") ? code : null, isActive: true });
				await activeDb.insert(services).values({ organizationId: orgId, code, title, category: validCategory, specialty: "universal", basePriceRub: priceNum, durationMinutes: 30 });
			} catch (dbErr) {
				skippedCount++;
				errors.push(`Строка ${rIdx + 1} ('${title}'): ошибка записи: ${(dbErr as Error).message}`);
				continue;
			}
		}

		importedCount++;
		if (sampleImported.length < 5) sampleImported.push({ code, title, priceRub: priceNum, category: validCategory });
	}

	return { importedCount, skippedCount, errors, sampleImported };
}

export async function importPatientsRows(activeDb: DbClient, orgId: string, records: Array<Record<string, unknown>>, dryRun: boolean) {
	let importedCount = 0;
	let skippedCount = 0;
	const errors: string[] = [];
	const sampleImported: Array<Record<string, unknown>> = [];

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

		if (!dryRun) {
			try {
				await activeDb.insert(patients).values({ organizationId: orgId, fullName, phone: phone || null, birthDate: birthDate || null, email: email || null, notes: notes || null, status: "active" });
			} catch (dbErr) {
				skippedCount++;
				errors.push(`Строка ${rIdx + 1} ('${fullName}'): ошибка сохранения: ${(dbErr as Error).message}`);
				continue;
			}
		}

		importedCount++;
		if (sampleImported.length < 5) sampleImported.push({ fullName, phone, birthDate });
	}

	return { importedCount, skippedCount, errors, sampleImported };
}
