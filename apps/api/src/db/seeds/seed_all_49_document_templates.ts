import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	ALL_DOCUMENT_TEMPLATE_VARIABLES,
	getDefaultTemplateContentHtml,
} from "@dental/shared";
import { sql } from "drizzle-orm";
import { db } from "../client.js";
import { withSuperuserBypass } from "../rls.js";
import {
	documentTemplateCategories,
	documentTemplates,
	documentTemplateVariables,
} from "../schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Определение пути к каталогу с дампом шаблонов (возвращает null, если внешние дампы удалены)
 */
function resolveStomxTemplatesDir(): string | null {
	const candidates = [
		path.resolve(process.cwd(), "РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС/StomX_templates_full"),
		path.resolve(__dirname, "../../../../../РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС/StomX_templates_full"),
		path.resolve(__dirname, "../../../../РЕВЕРС ИНЖИНИРИНГ СТОМ-ИКС/StomX_templates_full"),
	];

	for (const candidate of candidates) {
		if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "categories.json"))) {
			return candidate;
		}
	}

	return null;
}

const FALLBACK_DOCUMENT_CATEGORIES: ReadonlyArray<{ id: number; name: string; order: number }> = [
	{ id: 1, name: "Общие документы и договоры", order: 1 },
	{ id: 2, name: "Терапевтическая стоматология", order: 2 },
	{ id: 3, name: "Ортопедическая стоматология", order: 3 },
	{ id: 4, name: "Хирургическая стоматология", order: 4 },
	{ id: 5, name: "Имплантология", order: 5 },
	{ id: 6, name: "Ортодонтия", order: 6 },
	{ id: 7, name: "Пародонтология", order: 7 },
	{ id: 8, name: "Детская стоматология", order: 8 },
	{ id: 9, name: "Профессиональная гигиена и профилактика", order: 9 },
];

/**
 * Клиническое сопоставление 49 шаблонов по 10 профильным рубрикам Минздрава РФ
 */
const CLINICAL_CATEGORY_BY_ALIAS: Record<string, number> = {
	// Категория 2: Терапия
	ids_terapiya: 2,
	ids_na_lechenie_poverkhnostnogo_i_srednego_kariesa: 2,
	ids_glubokij_karies: 2,
	ids_pulpit: 2,
	ids_endodonticheskoe_lechenie: 2,

	// Категория 3: Ортопедия
	ids_ortopediya: 3,
	ids_viniry: 3,
	ids_nesemnye_ortopedicheskie_konstrukcii: 3,
	ids_semnye_ortopedicheskie_konstrukcii: 3,
	"dental-work-order": 3,

	// Категория 4: Хирургия
	ids_khirurgiya: 4,
	ids_udalenie_zuba: 4,
	ids_anesteziya: 4,
	ids_sedaciya: 4,

	// Категория 5: Имплантология
	ids_implant: 5,
	ids_sinus_lifting: 5,

	// Категория 6: Ортодонтия
	ids_ortodontiya_obshchee: 6,
	"orthodontic-card": 6,
	"orthodontic-card-epicrisis": 6,
	"orthodontic-card-observation": 6,

	// Категория 7: Пародонтология
	ids_parodontologiya: 7,

	// Категория 8: Детская
	dogovor_na_okazanie_med_uslug_nesovershennoletnego: 8,
	ids_obshchee_dlya_nesovershennoletnikh: 8,

	// Категория 9: Гигиена
	ids_prof_gigiena: 9,
	ids_otbelivanie: 9,

	// Категория 1: Общее (по умолчанию для остальных)
	dogovor_na_okazanie_med_uslug: 1,
	soglasie_na_obrabku_pd: 1,
	ids_na_medicinskoe_vmeshatelstvo: 1,
	ids_fotoprotokol: 1,
	ids_rentgen: 1,
	"x-ray-protocol": 1,
	"x-ray-dose-load": 1,
	"invoice-act": 1,
	"invoice-xray-act": 1,
	"dms-act": 1,
	medplan: 1,
	"medplan-agg": 1,
	"medplan-agg-tooth": 1,
	"outpatient-card": 1,
	"fns-payment-certificate": 1,
	loan: 1,
	"doctor-schedule": 1,
	"stock-remains": 1,
	"director-ai-report": 1,
	anketa_obshchego_sostoyaniya_zdorovya: 1,
	garantijnyj_pasport: 1,
	polozhenie_o_garantiyakh: 1,
	otkaz_v_peredache_dannykh_v_egisz: 1,
	otkaz_ot_lecheniya: 1,
};

function deriveDomainFromToken(token: string): string {
	if (token.startsWith("Пациент.")) return "patient";
	if (token.startsWith("Представитель.")) return "representative";
	if (token.startsWith("Полномочный.")) return "authorizedPerson";
	if (token.startsWith("АктивныйВрач.") || token.startsWith("ПоследнийПриём.Врач."))
		return "doctor";
	if (token.startsWith("Администратор.")) return "administrator";
	if (token.startsWith("Клиника.")) return "clinic";
	if (token.startsWith("Прием.")) return "appointment";
	if (token.startsWith("Склад.")) return "warehouse";
	if (token.startsWith("Документ.")) return "document";
	if (token.startsWith("Текущая")) return "date";
	return "custom";
}

/**
 * Главная функция сидирования 10 категорий, 74+ токенов и 49 бланков документов
 */
export async function seedAll49DocumentTemplates(): Promise<{
	categoriesCount: number;
	variablesCount: number;
	templatesCount: number;
}> {
	return withSuperuserBypass(async (tx) => {
		const stomxDir = resolveStomxTemplatesDir();

		// ─── 1. СИДИРОВАНИЕ 10 КАТЕГОРИЙ ──────────────────────────────────────────
		const rawCategories: ReadonlyArray<{ id: number; name: string; order: number }> = stomxDir
			? (JSON.parse(
					fs.readFileSync(path.join(stomxDir, "categories.json"), "utf8"),
				) as Array<{ id: number; name: string; order: number }>)
			: FALLBACK_DOCUMENT_CATEGORIES;

		let categoriesCount = 0;
		for (const cat of rawCategories) {
			await tx
				.insert(documentTemplateCategories)
			.values({
				id: cat.id,
				name: cat.name,
				order: cat.order,
			})
			.onConflictDoUpdate({
				target: documentTemplateCategories.id,
				set: {
					name: cat.name,
					order: cat.order,
					updatedAt: sql`now()`,
				},
			});
		categoriesCount++;
	}

	// ─── 2. СИДИРОВАНИЕ 74+ ПЕРЕМЕННЫХ ШАБЛОНИЗАТОРА ─────────────────────────
	const variablesPath = stomxDir ? path.join(stomxDir, "template_variables.json") : null;
	const rawVariables =
		variablesPath && fs.existsSync(variablesPath)
			? (JSON.parse(fs.readFileSync(variablesPath, "utf8")) as Array<{
					name: string;
					example?: unknown;
				}>)
			: [];

	const variableSpecsMap = new Map(
		ALL_DOCUMENT_TEMPLATE_VARIABLES.map((v) => [v.token, v]),
	);

	const allTokensMap = new Map<string, { example?: unknown }>();
	for (const v of rawVariables) {
		const token = v.name.trim();
		if (token) allTokensMap.set(token, { example: v.example });
	}
	for (const v of ALL_DOCUMENT_TEMPLATE_VARIABLES) {
		if (!allTokensMap.has(v.token)) {
			allTokensMap.set(v.token, { example: v.exampleValue });
		}
	}

	let variablesCount = 0;
	for (const [token, meta] of allTokensMap.entries()) {
		const spec = variableSpecsMap.get(token);
		const domain = spec?.domain ?? deriveDomainFromToken(token);
		const description = spec?.description ?? token;
		const exampleValue =
			meta.example !== undefined && meta.example !== null
				? String(meta.example)
				: (spec?.exampleValue ?? "");
		const resolverPath = spec?.resolverPath ?? "";

		await tx
			.insert(documentTemplateVariables)
			.values({
				token,
				domain,
				name: spec?.name ?? token,
				description,
				exampleValue,
				resolverPath,
			})
			.onConflictDoUpdate({
				target: documentTemplateVariables.token,
				set: {
					domain,
					description,
					exampleValue,
					resolverPath,
					updatedAt: sql`now()`,
				},
			});
		variablesCount++;
	}

	// ─── 3. СИДИРОВАНИЕ ВСЕХ 49 БЛАНКОВ ДОКУМЕНТОВ ────────────────────────────
	const rawTemplateItems: Array<{
		id: number;
		name: string;
		system_alias: string;
		type?: string;
		is_block?: number;
		category_id?: number;
		is_egisz?: number;
		esia_required?: number;
		is_xray_ids?: number;
	}> = [];

	if (stomxDir) {
		const jsonDir = path.join(stomxDir, "json");
		const jsonFiles = fs.existsSync(jsonDir) ? fs.readdirSync(jsonDir) : [];
		const templateFiles = jsonFiles.filter((f) => f.endsWith(".json") && /^\d{3}_/.test(f));
		const filesToProcess = templateFiles.length > 0 ? templateFiles : jsonFiles.filter((f) => f.endsWith(".json"));
		for (const fileName of filesToProcess) {
			const filePath = path.join(jsonDir, fileName);
			const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as (typeof rawTemplateItems)[number];
			rawTemplateItems.push(parsed);
		}
	} else {
		let fallbackId = 1;
		for (const [alias, categoryId] of Object.entries(CLINICAL_CATEGORY_BY_ALIAS)) {
			rawTemplateItems.push({
				id: fallbackId++,
				name: alias.replace(/[_-]+/g, " "),
				system_alias: alias,
				type: alias.startsWith("ids_") ? "consent" : "common",
				category_id: categoryId,
				is_egisz: alias === "otkaz_v_peredache_dannykh_v_egisz" ? 1 : 0,
				esia_required: 0,
				is_xray_ids: alias.includes("xray") || alias.includes("rentgen") ? 1 : 0,
				is_block: 0,
			});
		}
	}

	const processedIds = new Set<number>();
	let templatesCount = 0;

	for (const item of rawTemplateItems) {
		if (!item.id || processedIds.has(item.id)) continue;
		processedIds.add(item.id);

		const assignedCategoryId =
			CLINICAL_CATEGORY_BY_ALIAS[item.system_alias] ?? item.category_id ?? 1;

		const contentHtml = getDefaultTemplateContentHtml(
			item.id,
			item.system_alias,
			item.name,
		);

		await tx
			.insert(documentTemplates)
			.values({
				externalTemplateId: item.id,
				categoryId: assignedCategoryId,
				name: item.name,
				systemAlias: item.system_alias,
				type: item.type ?? "common",
				contentHtml,
				isEgisz: Boolean(item.is_egisz),
				esiaRequired: Boolean(item.esia_required),
				isXrayIds: Boolean(item.is_xray_ids),
				isBlock: Boolean(item.is_block),
				printConfig: {
					orientation: "portrait",
					margins: { top: 15, right: 12, bottom: 15, left: 12 },
					fontSize: "11pt",
				},
			})
			.onConflictDoUpdate({
				target: documentTemplates.externalTemplateId,
				set: {
					categoryId: assignedCategoryId,
					name: item.name,
					systemAlias: item.system_alias,
					type: item.type ?? "common",
					contentHtml,
					isEgisz: Boolean(item.is_egisz),
					esiaRequired: Boolean(item.esia_required),
					isXrayIds: Boolean(item.is_xray_ids),
					isBlock: Boolean(item.is_block),
					updatedAt: sql`now()`,
				},
			});
		templatesCount++;
	}

		return {
			categoriesCount,
			variablesCount,
			templatesCount,
		};
	});
}

// Запуск напрямую через CLI (node / tsx)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	seedAll49DocumentTemplates()
		.then((res) => {
			process.stdout.write(
				`УСПЕХ: Сидировано категорий: ${res.categoriesCount}, переменных: ${res.variablesCount}, бланков: ${res.templatesCount}\n`,
			);
			process.exit(0);
		})
		.catch((err) => {
			process.stderr.write(
				`ОШИБКА сидирования шаблонов: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
			);
			process.exit(1);
		});
}
