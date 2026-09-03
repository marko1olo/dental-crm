import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { loadAdditionalServerEnv } from "../../env/loadServerEnv.js";
import { pool, db } from "../client.js";
import {
	clinicalTeethCatalog,
	toothDefectsCatalog,
	mkbCategories,
	outpatientTemplateCategories,
	outpatientTemplates,
} from "../schema/outpatientCore.js";

loadAdditionalServerEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to resolve dump files across different cwd execution points
function resolveDumpPath(relativePath: string): string {
	const candidates = [
		path.resolve(process.cwd(), relativePath),
		path.resolve(__dirname, "../../../../../", relativePath),
		path.resolve(__dirname, "../../../../", relativePath),
		path.resolve("C:/Clinic_MVP/dental-crm", relativePath),
	];
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}
	throw new Error(`Dump file not found: ${relativePath}. Checked: ${candidates.join("; ")}`);
}

/**
 * 55 анатомических сущностей зубочелюстной системы
 */
const CLINICAL_TEETH_55: Array<{
	id: number;
	code: string;
	nameRu: string;
	type: "T" | "J";
	isChild: boolean;
	quoter: number;
	order: number;
}> = [
	// 1-й квадрант (постоянные 18-11)
	{ id: 1, code: "18", nameRu: "Верхний правый 3-й моляр (зуб мудрости)", type: "T", isChild: false, quoter: 1, order: 0 },
	{ id: 2, code: "17", nameRu: "Верхний правый 2-й моляр", type: "T", isChild: false, quoter: 1, order: 1 },
	{ id: 3, code: "16", nameRu: "Верхний правый 1-й моляр", type: "T", isChild: false, quoter: 1, order: 2 },
	{ id: 4, code: "15", nameRu: "Верхний правый 2-й премоляр", type: "T", isChild: false, quoter: 1, order: 3 },
	{ id: 5, code: "14", nameRu: "Верхний правый 1-й премоляр", type: "T", isChild: false, quoter: 1, order: 4 },
	{ id: 6, code: "13", nameRu: "Верхний правый клык", type: "T", isChild: false, quoter: 1, order: 5 },
	{ id: 7, code: "12", nameRu: "Верхний правый боковой резец", type: "T", isChild: false, quoter: 1, order: 6 },
	{ id: 8, code: "11", nameRu: "Верхний правый центральный резец", type: "T", isChild: false, quoter: 1, order: 7 },

	// 2-й квадрант (постоянные 21-28)
	{ id: 9, code: "21", nameRu: "Верхний левый центральный резец", type: "T", isChild: false, quoter: 2, order: 8 },
	{ id: 10, code: "22", nameRu: "Верхний левый боковой резец", type: "T", isChild: false, quoter: 2, order: 9 },
	{ id: 11, code: "23", nameRu: "Верхний левый клык", type: "T", isChild: false, quoter: 2, order: 10 },
	{ id: 12, code: "24", nameRu: "Верхний левый 1-й премоляр", type: "T", isChild: false, quoter: 2, order: 11 },
	{ id: 13, code: "25", nameRu: "Верхний левый 2-й премоляр", type: "T", isChild: false, quoter: 2, order: 12 },
	{ id: 14, code: "26", nameRu: "Верхний левый 1-й моляр", type: "T", isChild: false, quoter: 2, order: 13 },
	{ id: 15, code: "27", nameRu: "Верхний левый 2-й моляр", type: "T", isChild: false, quoter: 2, order: 14 },
	{ id: 16, code: "28", nameRu: "Верхний левый 3-й моляр (зуб мудрости)", type: "T", isChild: false, quoter: 2, order: 15 },

	// 3-й квадрант (постоянные 48-41 по каталогу StomX id 17..24)
	{ id: 17, code: "48", nameRu: "Нижний правый 3-й моляр (зуб мудрости)", type: "T", isChild: false, quoter: 3, order: 16 },
	{ id: 18, code: "47", nameRu: "Нижний правый 2-й моляр", type: "T", isChild: false, quoter: 3, order: 17 },
	{ id: 19, code: "46", nameRu: "Нижний правый 1-й моляр", type: "T", isChild: false, quoter: 3, order: 18 },
	{ id: 20, code: "45", nameRu: "Нижний правый 2-й премоляр", type: "T", isChild: false, quoter: 3, order: 19 },
	{ id: 21, code: "44", nameRu: "Нижний правый 1-й премоляр", type: "T", isChild: false, quoter: 3, order: 20 },
	{ id: 22, code: "43", nameRu: "Нижний правый клык", type: "T", isChild: false, quoter: 3, order: 21 },
	{ id: 23, code: "42", nameRu: "Нижний правый боковой резец", type: "T", isChild: false, quoter: 3, order: 22 },
	{ id: 24, code: "41", nameRu: "Нижний правый центральный резец", type: "T", isChild: false, quoter: 3, order: 23 },

	// 4-й квадрант (постоянные 31-38 по каталогу StomX id 25..32)
	{ id: 25, code: "31", nameRu: "Нижний левый центральный резец", type: "T", isChild: false, quoter: 4, order: 24 },
	{ id: 26, code: "32", nameRu: "Нижний левый боковой резец", type: "T", isChild: false, quoter: 4, order: 25 },
	{ id: 27, code: "33", nameRu: "Нижний левый клык", type: "T", isChild: false, quoter: 4, order: 26 },
	{ id: 28, code: "34", nameRu: "Нижний левый 1-й премоляр", type: "T", isChild: false, quoter: 4, order: 27 },
	{ id: 29, code: "35", nameRu: "Нижний левый 2-й премоляр", type: "T", isChild: false, quoter: 4, order: 28 },
	{ id: 30, code: "36", nameRu: "Нижний левый 1-й моляр", type: "T", isChild: false, quoter: 4, order: 29 },
	{ id: 31, code: "37", nameRu: "Нижний левый 2-й моляр", type: "T", isChild: false, quoter: 4, order: 30 },
	{ id: 32, code: "38", nameRu: "Нижний левый 3-й моляр (зуб мудрости)", type: "T", isChild: false, quoter: 4, order: 31 },

	// 5-й квадрант (молочные 55-51)
	{ id: 33, code: "55", nameRu: "Верхний правый 2-й моляр (молочный)", type: "T", isChild: true, quoter: 1, order: 32 },
	{ id: 34, code: "54", nameRu: "Верхний правый 1-й моляр (молочный)", type: "T", isChild: true, quoter: 1, order: 33 },
	{ id: 35, code: "53", nameRu: "Верхний правый клык (молочный)", type: "T", isChild: true, quoter: 1, order: 34 },
	{ id: 36, code: "52", nameRu: "Верхний правый боковой резец (молочный)", type: "T", isChild: true, quoter: 1, order: 35 },
	{ id: 37, code: "51", nameRu: "Верхний правый центральный резец (молочный)", type: "T", isChild: true, quoter: 1, order: 36 },

	// 6-й квадрант (молочные 61-65)
	{ id: 38, code: "61", nameRu: "Верхний левый центральный резец (молочный)", type: "T", isChild: true, quoter: 2, order: 37 },
	{ id: 39, code: "62", nameRu: "Верхний левый боковой резец (молочный)", type: "T", isChild: true, quoter: 2, order: 38 },
	{ id: 40, code: "63", nameRu: "Верхний левый клык (молочный)", type: "T", isChild: true, quoter: 2, order: 39 },
	{ id: 41, code: "64", nameRu: "Верхний левый 1-й моляр (молочный)", type: "T", isChild: true, quoter: 2, order: 40 },
	{ id: 42, code: "65", nameRu: "Верхний левый 2-й моляр (молочный)", type: "T", isChild: true, quoter: 2, order: 41 },

	// 7-й квадрант (молочные 85-81 по StomX)
	{ id: 43, code: "85", nameRu: "Нижний правый 2-й моляр (молочный)", type: "T", isChild: true, quoter: 3, order: 42 },
	{ id: 44, code: "84", nameRu: "Нижний правый 1-й моляр (молочный)", type: "T", isChild: true, quoter: 3, order: 43 },
	{ id: 45, code: "83", nameRu: "Нижний правый клык (молочный)", type: "T", isChild: true, quoter: 3, order: 44 },
	{ id: 46, code: "82", nameRu: "Нижний правый боковой резец (молочный)", type: "T", isChild: true, quoter: 3, order: 45 },
	{ id: 47, code: "81", nameRu: "Нижний правый центральный резец (молочный)", type: "T", isChild: true, quoter: 3, order: 46 },

	// 8-й квадрант (молочные 71-75 по StomX)
	{ id: 48, code: "71", nameRu: "Нижний левый центральный резец (молочный)", type: "T", isChild: true, quoter: 4, order: 47 },
	{ id: 49, code: "72", nameRu: "Нижний левый боковой резец (молочный)", type: "T", isChild: true, quoter: 4, order: 48 },
	{ id: 50, code: "73", nameRu: "Нижний левый клык (молочный)", type: "T", isChild: true, quoter: 4, order: 49 },
	{ id: 51, code: "74", nameRu: "Нижний левый 1-й моляр (молочный)", type: "T", isChild: true, quoter: 4, order: 50 },
	{ id: 52, code: "75", nameRu: "Нижний левый 2-й моляр (молочный)", type: "T", isChild: true, quoter: 4, order: 51 },

	// Челюсти и прикус (3 сущности)
	{ id: 53, code: "C", nameRu: "Центральное соотношение челюстей / Прикус", type: "J", isChild: false, quoter: 1, order: 52 },
	{ id: 54, code: "JU", nameRu: "Верхняя челюсть (Maxilla)", type: "J", isChild: false, quoter: 1, order: 53 },
	{ id: 55, code: "JL", nameRu: "Нижняя челюсть (Mandibula)", type: "J", isChild: false, quoter: 3, order: 54 },
];

export async function seedClinicalCore(): Promise<{
	teethCount: number;
	defectsCount: number;
	mkbCount: number;
	templateCategoriesCount: number;
	templatesCount: number;
}> {
	// 1. Сидинг 55 зубов/челюстей
	for (const tooth of CLINICAL_TEETH_55) {
		await db
			.insert(clinicalTeethCatalog)
			.values({
				id: tooth.id,
				code: tooth.code,
				nameRu: tooth.nameRu,
				type: tooth.type,
				isChild: tooth.isChild,
				quoter: tooth.quoter,
				order: tooth.order,
			})
			.onConflictDoUpdate({
				target: clinicalTeethCatalog.id,
				set: {
					code: tooth.code,
					nameRu: tooth.nameRu,
					type: tooth.type,
					isChild: tooth.isChild,
					quoter: tooth.quoter,
					order: tooth.order,
				},
			});
	}

	// 2. Сидинг 91 дефекта из tooth-defects.json
	const defectsFilePath = resolveDumpPath(
		"РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС/full_dump22/full_dump/api/api/catalogs/tooth-defects.json",
	);
	const rawDefects: Array<{
		id: number;
		name: string;
		alias: string;
		type: string;
		key: string | null;
		color: string | null;
		order: number;
	}> = JSON.parse(fs.readFileSync(defectsFilePath, "utf8"));

	for (const defect of rawDefects) {
		await db
			.insert(toothDefectsCatalog)
			.values({
				id: defect.id,
				name: defect.name,
				alias: defect.alias,
				type: defect.type,
				key: defect.key,
				color: defect.color,
				order: defect.order,
				canDelete: false,
				isActive: true,
			})
			.onConflictDoUpdate({
				target: toothDefectsCatalog.id,
				set: {
					name: defect.name,
					alias: defect.alias,
					type: defect.type,
					key: defect.key,
					color: defect.color,
					order: defect.order,
					isActive: true,
				},
			});
	}

	// 3. Сидинг МКБ-10 (1 841 категория)
	const mkbFilePath = resolveDumpPath(
		"РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС/full_dump22/full_dump/api/api/catalogs/mkb/categories.json",
	);
	const rawMkbJson = JSON.parse(fs.readFileSync(mkbFilePath, "utf8"));
	const rawMkb: Array<{
		id: string;
		parent_id: string | null;
		name: string;
		sort_order: number;
	}> = rawMkbJson.data || rawMkbJson;

	// Вставляем порциями по 100 записей для ускорения
	const BATCH_SIZE = 100;
	for (let i = 0; i < rawMkb.length; i += BATCH_SIZE) {
		const chunk = rawMkb.slice(i, i + BATCH_SIZE);
		const values = chunk.map((m) => {
			const isDental =
				m.id === "K00-K14" ||
				m.parent_id === "K00-K14" ||
				/^K0[0-9]|^K1[0-4]/i.test(m.id);
			return {
				id: m.id,
				parentId: m.parent_id,
				code: m.id,
				name: m.name,
				isDentalSpecialty: isDental,
				order: m.sort_order ?? 0,
			};
		});

		await db
			.insert(mkbCategories)
			.values(values)
			.onConflictDoUpdate({
				target: mkbCategories.id,
				set: {
					parentId: sql`excluded.parent_id`,
					code: sql`excluded.code`,
					name: sql`excluded.name`,
					isDentalSpecialty: sql`excluded.is_dental_specialty`,
					order: sql`excluded.order`,
				},
			});
	}

	// 4. Сидинг рубрик шаблонов амбулаторной карты (33 рубрики)
	const categoriesFilePath = resolveDumpPath(
		"РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС/full_dump22/full_dump/api/api/outpatient/templates-categories.json",
	);
	const rawCategoriesJson = JSON.parse(fs.readFileSync(categoriesFilePath, "utf8"));
	const rawCategories: Array<{
		id: number;
		name: string;
		parent_id: number | null;
	}> = rawCategoriesJson.data || rawCategoriesJson;

	const SPECIALTY_MAP: Record<number, string> = {
		2: "general", // Объективное обследование
		4: "general", // Жалобы
		6: "general", // Жалобы
		8: "general", // Жалобы
		9: "general", // Развитие заболевания
		10: "general",
		11: "general",
		13: "general", // Описание
		14: "general", // Заключение
		16: "therapy",
		17: "surgery",
		58: "therapy", // Восстановление после эндодонтии
		60: "therapy", // Кариес
		61: "therapy", // Некариозные
		62: "therapy", // Отбеливание
		63: "therapy", // Периодонтит
		64: "therapy", // Пульпит
		65: "therapy", // Травмы
		67: "orthopedics", // Виниры
		68: "orthopedics", // Вкладки
		69: "orthopedics", // Коронки
		70: "orthopedics", // Мостовидные протезы
		71: "orthopedics", // Протезы на имплантатах
		72: "orthopedics", // Съемные протезы на зубах
		73: "orthopedics", // Съемные протезы на имплантатах
		75: "surgery", // Имплантация
		76: "surgery", // Корневые кисты
		77: "periodontics", // Пародонтология
		78: "surgery", // Перикоронит
		79: "surgery", // Периостит
		80: "surgery", // Синус-лифтинг
		81: "surgery", // Удаление зубов
		82: "surgery", // Формирователь десны
	};

	for (const cat of rawCategories) {
		const specialty = SPECIALTY_MAP[cat.id] || "therapy";
		await db
			.insert(outpatientTemplateCategories)
			.values({
				id: cat.id,
				name: cat.name,
				parentId: cat.parent_id,
				specialty,
				order: cat.id,
			})
			.onConflictDoUpdate({
				target: outpatientTemplateCategories.id,
				set: {
					name: cat.name,
					parentId: cat.parent_id,
					specialty,
					order: cat.id,
				},
			});
	}

	// 5. Сидинг 448 клинических протоколов 043/у из outpatient_templates/list.json
	const templatesListPath = resolveDumpPath(
		"РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС/full_dump22/full_dump/outpatient_templates/list.json",
	);
	const rawTemplates: Array<{
		id: number;
		template_category_id: number;
		name: string;
		text: string;
		order: number;
		created_at?: string;
	}> = JSON.parse(fs.readFileSync(templatesListPath, "utf8"));

	// Сопоставление рубрик с каноническими МКБ-10 кодами
	const CATEGORY_MKB_DEFAULTS: Record<number, string> = {
		60: "K02", // Кариес
		61: "K03", // Некариозные
		62: "K03.7", // Отбеливание / изменение цвета
		63: "K04.7", // Периодонтит
		64: "K04.0", // Пульпит
		65: "S02.5", // Травмы зубов
		67: "K03.8", // Виниры
		68: "K02.1", // Вкладки
		69: "K02", // Коронки
		75: "K08.1", // Имплантация
		76: "K04.8", // Корневые кисты
		77: "K05.3", // Пародонтология
		78: "K05.2", // Перикоронит
		79: "K10.2", // Периостит
		80: "K08.8", // Синус-лифтинг
		81: "K08.1", // Удаление зубов
		82: "K08.1", // Формирователь десны
	};

	for (let i = 0; i < rawTemplates.length; i += BATCH_SIZE) {
		const chunk = rawTemplates.slice(i, i + BATCH_SIZE);
		const values = chunk.map((tpl) => {
			const mkbCode =
				CATEGORY_MKB_DEFAULTS[tpl.template_category_id] ||
				(tpl.name.includes("Кариес")
					? "K02"
					: tpl.name.includes("Пульпит")
						? "K04"
						: tpl.name.includes("Периодонтит")
							? "K04.7"
							: tpl.name.includes("Удаление")
								? "K08.1"
								: null);

			return {
				id: tpl.id,
				categoryId: tpl.template_category_id,
				name: tpl.name,
				contentJson: {
					id: tpl.id,
					name: tpl.name,
					text: tpl.text,
					categoryId: tpl.template_category_id,
					order: tpl.order,
					createdAt: tpl.created_at,
				},
				mkbCode,
				order: tpl.order ?? 0,
			};
		});

		await db
			.insert(outpatientTemplates)
			.values(values)
			.onConflictDoUpdate({
				target: outpatientTemplates.id,
				set: {
					categoryId: sql`excluded.category_id`,
					name: sql`excluded.name`,
					contentJson: sql`excluded.content_json`,
					mkbCode: sql`excluded.mkb_code`,
					order: sql`excluded.order`,
				},
			});
	}

	return {
		teethCount: CLINICAL_TEETH_55.length,
		defectsCount: rawDefects.length,
		mkbCount: rawMkb.length,
		templateCategoriesCount: rawCategories.length,
		templatesCount: rawTemplates.length,
	};
}

// Прямой запуск скрипта
if (process.argv[1] && process.argv[1].includes("seed_clinical_core")) {
	seedClinicalCore()
		.then((result) => {
			console.log("[SEED SUCCESS] Клинический контур успешно засеян в PostgreSQL:");
			console.log(` - Зубов/челюстей: ${result.teethCount}`);
			console.log(` - Дефектов зубного ряда: ${result.defectsCount}`);
			console.log(` - Категорий МКБ-10: ${result.mkbCount}`);
			console.log(` - Рубрик шаблонов 043/у: ${result.templateCategoriesCount}`);
			console.log(` - Клинических шаблонов 043/у: ${result.templatesCount}`);
			return pool.end();
		})
		.then(() => process.exit(0))
		.catch((err) => {
			console.error("[SEED ERROR] Ошибка сидинга клинического контура:", err);
			process.exit(1);
		});
}
