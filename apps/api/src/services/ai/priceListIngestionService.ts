/**
 * DENTE Dental CRM — Intelligent Legacy Price List Ingestion & AI Parser Service
 *
 * Provides:
 * 1. Multi-format ingestion: unstructured text, CSV, Word doc/table extracts, PDF extracts, OCR scan text.
 * 2. Kopeck-exact price extraction (e.g. 1 500,50 ₽, 1500-00, от 2500 руб) and noise stripping.
 * 3. Commercial title cleanup (stripping numbers, bullets, OCR debris, and trailing symbols).
 * 4. Statutory Minzdrav Order 804n nomenclature semantic matching:
 *    - Therapy (A16.07.002, A16.07.008, A16.07.030, A16.07.031, A16.07.091)
 *    - Surgery (A16.07.001, A16.07.001.001..003, A16.07.024, A16.07.017, A16.07.097)
 *    - Implantology (A16.07.054, A16.07.054.005, A16.07.055, A16.07.041)
 *    - Orthopedics (A16.07.004, A16.07.004.002, A16.07.005, A16.07.006, A02.07.010)
 *    - Hygiene (A16.07.051, A16.07.020, A11.07.012, A16.07.050)
 *    - Diagnostics (A06.07.007, A06.07.010, A06.07.013, B01.065.001)
 *    - Anesthesia (B01.003.004.005, B01.003.004.004, B01.003.004.001)
 *    - Orthodontics (A16.07.048)
 * 5. Cross-referencing with existing clinic catalog for diff actions (create_new, update_existing, link_existing, identical).
 */

import { z } from "zod";
import type { ServiceCatalogItem } from "@dental/shared";

// =============================================================================
// 1. SCHEMAS & DATA CONTRACTS
// =============================================================================

export const priceListIngestSourceTypeSchema = z.enum([
	"text",
	"csv",
	"word_extracted",
	"pdf_extracted",
	"ocr_scan",
]);
export type PriceListIngestSourceType = z.infer<typeof priceListIngestSourceTypeSchema>;

export const priceListConfidenceKindSchema = z.enum([
	"exact_code",
	"high_keyword",
	"medium_keyword",
	"low_keyword",
	"fallback",
]);
export type PriceListConfidenceKind = z.infer<typeof priceListConfidenceKindSchema>;

export const priceListSuggestedActionSchema = z.enum([
	"create_new",
	"update_existing",
	"link_existing",
	"identical",
]);
export type PriceListSuggestedAction = z.infer<typeof priceListSuggestedActionSchema>;

export const ingestedPriceProposalSchema = z.object({
	id: z.string(),
	sourceLineNumber: z.number().int().positive(),
	rawLine: z.string(),
	cleanedTitle: z.string(),
	code804n: z.string(),
	statutoryTitle804n: z.string(),
	category: z.string(),
	specialty: z.string(),
	priceRub: z.number().nonnegative(),
	priceKopecks: z.number().int().nonnegative(),
	confidence: z.number().min(0).max(1),
	confidenceKind: priceListConfidenceKindSchema,
	matchedExistingServiceId: z.string().nullable().optional(),
	matchedExistingTitle: z.string().nullable().optional(),
	matchedExistingPriceRub: z.number().nullable().optional(),
	suggestedAction: priceListSuggestedActionSchema,
	isApproved: z.boolean().default(true),
});
export type IngestedPriceProposal = z.infer<typeof ingestedPriceProposalSchema>;

export const priceListIngestionRequestSchema = z.object({
	rawContent: z.string().min(1, "Передайте текст или содержимое файла прейскуранта"),
	sourceType: priceListIngestSourceTypeSchema.default("text"),
	filename: z.string().optional(),
	commit: z.boolean().default(false),
	approvedItems: z.array(ingestedPriceProposalSchema).optional(),
});
export type PriceListIngestionRequest = z.infer<typeof priceListIngestionRequestSchema>;

export const priceListIngestionStatsSchema = z.object({
	totalLines: z.number().int().nonnegative(),
	recognizedCount: z.number().int().nonnegative(),
	exactCodesCount: z.number().int().nonnegative(),
	newServicesCount: z.number().int().nonnegative(),
	updateServicesCount: z.number().int().nonnegative(),
	identicalCount: z.number().int().nonnegative(),
	averageConfidence: z.number().min(0).max(1),
});
export type PriceListIngestionStats = z.infer<typeof priceListIngestionStatsSchema>;

export const priceListIngestionResponseSchema = z.object({
	success: z.boolean(),
	proposals: z.array(ingestedPriceProposalSchema),
	stats: priceListIngestionStatsSchema,
	warnings: z.array(z.string()),
	committedCount: z.number().int().nonnegative().optional(),
});
export type PriceListIngestionResponse = z.infer<typeof priceListIngestionResponseSchema>;

// =============================================================================
// 2. ORDER 804N NOMENCLATURE KNOWLEDGE BASE
// =============================================================================

export interface StatutoryNomenclatureEntry {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly specialty: string;
	readonly primaryKeywords: readonly RegExp[];
	readonly secondaryKeywords: readonly RegExp[];
	readonly defaultPriceRub?: number;
}

export const ORDER_804N_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	// ─── Терапевтическая стоматология (A16.07.002, A16.07.008, A16.07.030, etc.)
	{
		code: "A16.07.002",
		title: "Восстановление зуба пломбой",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/кариес/i,
			/пломб/i,
			/реставрац/i,
			/светоотвержд/i,
			/фотополимер/i,
			/эмаль/i,
			/герметизац/i,
			/композит/i,
			/клиновидн/i,
			/эстетическ.*реставрац/i,
		],
		secondaryKeywords: [/дентин/i, /изолирующ.*прокладк/i, /лечебн.*прокладк/i],
		defaultPriceRub: 4500,
	},
	{
		code: "A16.07.008",
		title: "Пломбирование корневого канала зуба",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/пульпит/i,
			/периодонтит/i,
			/корнев.*канал/i,
			/эндодонт/i,
			/депульпир/i,
			/обтурац/i,
			/гуттаперч/i,
			/пломбирование.*канал/i,
			/латеральн.*конденсац/i,
		],
		secondaryKeywords: [/апекслокац/i, /лечение.*канал/i, /биокерамик/i],
		defaultPriceRub: 5500,
	},
	{
		code: "A16.07.030",
		title: "Инструментальная и медикаментозная обработка корневого канала",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/механическ.*обработк.*канал/i,
			/инструментальн.*обработк.*канал/i,
			/медикаментозн.*обработк.*канал/i,
			/расширение.*канал/i,
			/прохождение.*канал/i,
		],
		secondaryKeywords: [/эндомотор/i, /протейпер/i, /хлоргекисидин/i],
		defaultPriceRub: 3500,
	},
	{
		code: "A16.07.031",
		title: "Препарирование твердых тканей зуба при лечении кариеса",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/препарирован/i,
			/некрэктоми/i,
			/раскрытие.*полост/i,
		],
		secondaryKeywords: [/формирование.*полост/i],
		defaultPriceRub: 1200,
	},
	{
		code: "A16.07.091",
		title: "Временное пломбирование лекарственным препаратом корневого канала",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/временн.*пломбирован.*канал/i,
			/каласепт/i,
			/метапекс/i,
			/кальци/i,
			/гидроокис.*кальци/i,
			/лечебн.*повязк.*канал/i,
		],
		secondaryKeywords: [/паста.*канал/i],
		defaultPriceRub: 2000,
	},
	{
		code: "A16.07.082",
		title: "Распломбирование корневого канала",
		category: "therapy",
		specialty: "therapist",
		primaryKeywords: [
			/распломбиров/i,
			/перелечиван.*канал/i,
			/извлечение.*штифт/i,
			/извлечение.*вкладк/i,
		],
		secondaryKeywords: [/резорцин/i, /фосфат.*цемент/i],
		defaultPriceRub: 2500,
	},

	// ─── Хирургическая стоматология (A16.07.001, A16.07.024, A16.07.017, etc.)
	{
		code: "A16.07.001",
		title: "Удаление зуба",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/удалени.*зуб/i,
			/экстракц.*зуб/i,
			/удаление.*постоянн.*зуб/i,
			/удаление.*корн/i,
			/удаление.*сложн/i,
			/простое.*удаление/i,
		],
		secondaryKeywords: [/щипцы/i, /элеватор/i, /люксатор/i, /альвеол/i],
		defaultPriceRub: 3500,
	},
	{
		code: "A16.07.024",
		title: "Удаление ретинированного, дистопированного или сверхкомплектного зуба",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/ретинирован/i,
			/дистопирован/i,
			/зуб.*мудрост/i,
			/восьмерк/i,
			/полуретинирован/i,
			/сверхкомплектн/i,
			/атипичн.*удален/i,
		],
		secondaryKeywords: [/выпиливание/i, /разъединение.*корней/i],
		defaultPriceRub: 8500,
	},
	{
		code: "A16.07.017",
		title: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/периостотоми/i,
			/вскрытие.*абсцесс/i,
			/дренирован.*очаг/i,
			/дренаж/i,
			/разрез.*по.*переходн/i,
		],
		secondaryKeywords: [/флюс/i, /гнойник/i],
		defaultPriceRub: 3000,
	},
	{
		code: "A16.07.016",
		title: "Цистотомия или цистэктомия в области челюсти",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/цистэктоми/i,
			/цистотоми/i,
			/кист.*челюст/i,
			/удаление.*кист/i,
		],
		secondaryKeywords: [/оболочк.*кист/i],
		defaultPriceRub: 7500,
	},
	{
		code: "A16.07.007",
		title: "Резекция верхушки корня",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/резекци.*верхушк/i,
			/апикоэктоми/i,
			/ретроградн.*пломбирован/i,
		],
		secondaryKeywords: [/апикальн/i],
		defaultPriceRub: 8000,
	},
	{
		code: "A16.07.097",
		title: "Наложение шва на слизистую оболочку рта",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/наложение.*шв/i,
			/шов/i,
			/ушивание/i,
			/викрил/i,
			/пролен/i,
			/кетгут/i,
		],
		secondaryKeywords: [/снятие.*шв/i],
		defaultPriceRub: 1500,
	},

	// ─── Дентальная имплантация (A16.07.054, A16.07.055, A16.07.041)
	{
		code: "A16.07.054",
		title: "Внутрикостная дентальная имплантация",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/имплант/i,
			/имплантат/i,
			/установк.*имплант/i,
			/дентальн.*имплантац/i,
			/straumann/i,
			/nobel/i,
			/osstem/i,
			/dentium/i,
			/astra.*tech/i,
			/anyridge/i,
			/neodent/i,
			/mis\b/i,
			/sgs\b/i,
			/hi-tec/i,
			/ankylos/i,
		],
		secondaryKeywords: [/хирургическ.*этап/i, /навигационн.*шаблон/i, /титан.*имплант/i],
		defaultPriceRub: 35000,
	},
	{
		code: "A16.07.054.005",
		title: "Установка формирователя десны",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/формировател.*десн/i,
			/установк.*фдм/i,
			/\bфдм\b/i,
			/десневой.*формировател/i,
		],
		secondaryKeywords: [/второй.*этап.*имплант/i],
		defaultPriceRub: 4500,
	},
	{
		code: "A16.07.055",
		title: "Синус-лифтинг",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/синус[-\s]?лифтинг/i,
			/субантральн.*аугментац/i,
			/поднятие.*дна.*гайморов/i,
			/открыт.*синус/i,
			/закрыт.*синус/i,
		],
		secondaryKeywords: [/гайморов.*пазух/i, /мембран.*шнайдер/i],
		defaultPriceRub: 30000,
	},
	{
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области",
		category: "surgery",
		specialty: "surgeon",
		primaryKeywords: [
			/костн.*пластик/i,
			/аугментац.*кост/i,
			/остеопластик/i,
			/направленн.*костн.*регенерирац/i,
			/нкр/i,
			/bio[-\s]?oss/i,
			/костн.*материал/i,
			/мембран.*коллаген/i,
		],
		secondaryKeywords: [/костн.*стружк/i, /титанов.*сетк/i],
		defaultPriceRub: 25000,
	},

	// ─── Ортопедическая стоматология (A16.07.004, A16.07.005, A16.07.006, etc.)
	{
		code: "A16.07.004",
		title: "Восстановление зуба коронкой постоянной",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/коронк/i,
			/металлокерамик/i,
			/диоксид.*циркони/i,
			/циркони/i,
			/e[-\s]?max/i,
			/цельнокерамическ/i,
			/цельнолит/i,
			/\bмк\b/i,
			/мостовидн.*протез/i,
		],
		secondaryKeywords: [/колпачок/i, /эмаль.*глазурь/i, /культев.*вкладк/i],
		defaultPriceRub: 18000,
	},
	{
		code: "A16.07.004.002",
		title: "Изготовление и фиксация временной провизорной коронки",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/временн.*коронк/i,
			/провизорн.*коронк/i,
			/коронк.*pmma/i,
			/пластмассов.*коронк/i,
		],
		secondaryKeywords: [/luxatemp/i, /прямой.*метод/i],
		defaultPriceRub: 2500,
	},
	{
		code: "A16.07.005",
		title: "Восстановление зуба виниром, полукоронкой",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/винир/i,
			/люминир/i,
			/керамическ.*накладк/i,
			/полукоронк/i,
			/вкладк.*overlay/i,
			/вкладк.*inlay/i,
		],
		secondaryKeywords: [/полевошпат/i, /рефрактор/i],
		defaultPriceRub: 22000,
	},
	{
		code: "A16.07.006",
		title: "Протезирование съемными бюгельными протезами",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/бюгельн.*протез/i,
			/бюгел/i,
			/кламмерн.*фиксац/i,
			/замков.*бюгел/i,
			/аттачмен/i,
		],
		secondaryKeywords: [/дуга.*протез/i],
		defaultPriceRub: 42000,
	},
	{
		code: "A16.07.023",
		title: "Протезирование зубов полными съемными пластиночными протезами",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/полн.*съемн/i,
			/частичн.*съемн.*протез/i,
			/пластиночн.*протез/i,
			/акри-фри/i,
			/acry[-\s]?free/i,
			/нейлонов.*протез/i,
			/акрилов.*протез/i,
		],
		secondaryKeywords: [/базис.*протез/i, /искусственн.*зубы/i],
		defaultPriceRub: 28000,
	},
	{
		code: "A02.07.010",
		title: "Снятие оттиска с одной челюсти",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/оттиск/i,
			/слепок/i,
			/альгинат/i,
			/силикон/i,
			/а[-\s]?силикон/i,
			/с[-\s]?силикон/i,
			/интраоральн.*сканирован/i,
		],
		secondaryKeywords: [/ложка.*слепочн/i],
		defaultPriceRub: 1500,
	},
	{
		code: "A16.07.049",
		title: "Фиксация на постоянный цемент несъемных ортопедических конструкций",
		category: "orthopedics",
		specialty: "orthopedist",
		primaryKeywords: [
			/фиксаци.*коронк/i,
			/постоянн.*цемент/i,
			/fuji/i,
			/цементировк/i,
			/фиксация.*протез/i,
		],
		secondaryKeywords: [/стеклоиономерн.*цемент/i],
		defaultPriceRub: 1800,
	},

	// ─── Профессиональная гигиена и пародонтология (A16.07.051, A16.07.020, etc.)
	{
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и зубов",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/профессиональн.*гигиен/i,
			/профгигиен/i,
			/комплексн.*чистк/i,
			/чистк.*зуб/i,
			/снятие.*налет/i,
			/гигиеническ.*чистк/i,
		],
		secondaryKeywords: [/пациент.*гигиен/i, /мотивация/i],
		defaultPriceRub: 4500,
	},
	{
		code: "A16.07.020",
		title: "Удаление наддесневых и поддесневых зубных отложений ультразвуком",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/ультразвук/i,
			/скейлинг/i,
			/удаление.*камн/i,
			/зубн.*камен/i,
			/наддеснев.*отложен/i,
			/поддеснев.*отложен/i,
		],
		secondaryKeywords: [/пьезо/i, /кюрет/i],
		defaultPriceRub: 2500,
	},
	{
		code: "A16.07.051.001",
		title: "Воздушно-абразивная обработка зубов (AirFlow)",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/air[-\s]?flow/i,
			/аир[-\s]?флоу/i,
			/воздушно[-\s]?абразивн/i,
			/порошк.*чистк/i,
		],
		secondaryKeywords: [/глицин/i, /сода/i],
		defaultPriceRub: 2500,
	},
	{
		code: "A11.07.012",
		title: "Глубокое фторирование эмали зуба",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/фторирован/i,
			/фторлак/i,
			/реминерализац/i,
			/эмаль[-\s]?герметизирующ/i,
			/глубок.*фторир/i,
		],
		secondaryKeywords: [/бифлюорид/i, /аппликация.*фтор/i],
		defaultPriceRub: 1200,
	},
	{
		code: "A16.07.050",
		title: "Профессиональное отбеливание зубов",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/отбеливан/i,
			/zoom/i,
			/amazing.*white/i,
			/flash\b/i,
			/клиническ.*отбеливан/i,
			/капп.*для.*отбеливан/i,
		],
		secondaryKeywords: [/пероксид/i, /коффердам/i],
		defaultPriceRub: 25000,
	},
	{
		code: "A16.07.019",
		title: "Временное шинирование при заболеваниях пародонта",
		category: "hygiene",
		specialty: "hygienist",
		primaryKeywords: [
			/шинирован/i,
			/гласспан/i,
			/ribbond/i,
			/стекловолоконн.*шин/i,
			/подвижност.*зуб/i,
		],
		secondaryKeywords: [/пародонтит/i],
		defaultPriceRub: 2200,
	},

	// ─── Диагностика и консультации (A06.07.007, A06.07.010, A06.07.013, B01.065.001)
	{
		code: "A06.07.007",
		title: "Внутриротовая рентгенография (прицельный снимок / визиограф)",
		category: "diagnostics",
		specialty: "radiologist",
		primaryKeywords: [
			/прицельн.*снимок/i,
			/визиограф/i,
			/\brvg\b/i,
			/радиовизиограф/i,
			/внутриротов.*рентген/i,
			/дентальн.*снимок/i,
		],
		secondaryKeywords: [/рентген.*зуб/i],
		defaultPriceRub: 600,
	},
	{
		code: "A06.07.010",
		title: "Панорамная рентгенография челюстей (ОПТГ)",
		category: "diagnostics",
		specialty: "radiologist",
		primaryKeywords: [
			/\bоптг\b/i,
			/панорамн.*снимок/i,
			/ортопантомограмм/i,
			/обзорн.*снимок/i,
		],
		secondaryKeywords: [/челюст/i],
		defaultPriceRub: 1500,
	},
	{
		code: "A06.07.013",
		title: "Компьютерная томография челюстно-лицевой области (КЛКТ / КТ)",
		category: "diagnostics",
		specialty: "radiologist",
		primaryKeywords: [
			/\bклкт\b/i,
			/\bкт\b.*челюст/i,
			/компьютерн.*томограф/i,
			/3d[-\s]?снимок/i,
			/томографи.*чло/i,
		],
		secondaryKeywords: [/dicom/i, /сегмент/i],
		defaultPriceRub: 3500,
	},
	{
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "consultation",
		specialty: "therapist",
		primaryKeywords: [
			/первичн.*консультац/i,
			/осмотр.*стоматолог/i,
			/консультаци.*врач/i,
			/первичный.*прием/i,
			/план.*лечени/i,
		],
		secondaryKeywords: [/анкета/i, /составление.*план/i],
		defaultPriceRub: 1000,
	},
	{
		code: "B01.065.002",
		title: "Прием (осмотр, консультация) врача-стоматолога повторный",
		category: "consultation",
		specialty: "therapist",
		primaryKeywords: [
			/повторн.*консультац/i,
			/повторн.*осмотр/i,
			/повторный.*прием/i,
		],
		secondaryKeywords: [/контрольн.*осмотр/i],
		defaultPriceRub: 500,
	},

	// ─── Анестезиология (B01.003.004.005, B01.003.004.004, B01.003.004.001)
	{
		code: "B01.003.004.005",
		title: "Инфильтрационная анестезия",
		category: "anesthesia",
		specialty: "anesthesiologist",
		primaryKeywords: [
			/инфильтрационн.*анестези/i,
			/ультракаин/i,
			/септанест/i,
			/убистезин/i,
			/артикаин/i,
			/карпул/i,
		],
		secondaryKeywords: [/обезболиван/i],
		defaultPriceRub: 800,
	},
	{
		code: "B01.003.004.004",
		title: "Проводниковая анестезия",
		category: "anesthesia",
		specialty: "anesthesiologist",
		primaryKeywords: [
			/проводников.*анестези/i,
			/торусальн.*анестези/i,
			/мандибулярн.*анестези/i,
			/мандибулярк/i,
		],
		secondaryKeywords: [/блокад/i],
		defaultPriceRub: 950,
	},
	{
		code: "B01.003.004.001",
		title: "Аппликационная анестезия",
		category: "anesthesia",
		specialty: "anesthesiologist",
		primaryKeywords: [
			/аппликационн.*анестези/i,
			/гель.*обезболив/i,
			/лидокаин.*спрей/i,
			/дисилан/i,
		],
		secondaryKeywords: [/смазывание/i],
		defaultPriceRub: 400,
	},

	// ─── Ортодонтия (A16.07.048)
	{
		code: "A16.07.048",
		title: "Ортодонтическая коррекция с применением брекет-систем",
		category: "orthodontics",
		specialty: "orthodontist",
		primaryKeywords: [
			/брекет/i,
			/элайнер/i,
			/ортодонтическ.*пластинк/i,
			/активаци.*дуг/i,
			/фиксаци.*брекет/i,
			/снятие.*брекет/i,
			/ретейнер/i,
			/ортодонт/i,
		],
		secondaryKeywords: [/каппа.*исправлен/i, /трейнер/i],
		defaultPriceRub: 35000,
	},

	// ─── Детская стоматология (A16.07.002.009)
	{
		code: "A16.07.002.009",
		title: "Лечение кариеса временного (молочного) зуба",
		category: "pediatric",
		specialty: "pediatric",
		primaryKeywords: [
			/детск.*стоматолог/i,
			/молочн.*зуб/i,
			/временн.*зуб.*пломб/i,
			/лечение.*кариес.*дет/i,
			/серебрение/i,
			/цветн.*пломб/i,
		],
		secondaryKeywords: [/адаптационный.*прием/i],
		defaultPriceRub: 3000,
	},
];

// =============================================================================
// 3. MULTI-FORMAT LINE & TOKEN EXTRACTOR
// =============================================================================

/**
 * Normalizes input text across Word copies, PDF text extractions, CSVs, and OCR.
 */
export function extractLinesFromPriceList(rawContent: string, sourceType?: PriceListIngestSourceType): string[] {
	if (!rawContent || typeof rawContent !== "string") return [];

	// 1. Unify newlines and strip zero-width spaces, BOM, control characters
	const cleanedContent = rawContent
		.replace(/^\uFEFF/, "")
		.replace(/[\u200B-\u200D\uFEFF]/g, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n");

	// 2. Format specific preprocessing
	let lines: string[] = [];

	if (sourceType === "csv" || (cleanedContent.includes(";") && cleanedContent.split("\n").some((l) => l.includes(";")))) {
		// CSV handling: split by newline, handle delimited columns
		const rawLines = cleanedContent.split("\n");
		for (const rawLine of rawLines) {
			const line = rawLine.trim();
			if (!line) continue;
			// Replace semicolon or tab delimiters with space, while preserving column order
			const parts = line.split(/[;\t]/).map((p) => p.replace(/^"|"$/g, "").trim()).filter(Boolean);
			if (parts.length > 0) {
				lines.push(parts.join("  "));
			}
		}
	} else {
		// Standard / Word / OCR / PDF text: split by lines
		lines = cleanedContent.split("\n");
	}

	// 3. Filter out obvious headers, clinic metadata, and page footers
	const filteredLines: string[] = [];
	const headerFooterRegex = /^(?:прейскурант|прайс[-\s]?лист|стоматологическ|ооо|зао|пао|ип\s+[а-я]|лицензи|утв\.|утвержд|генеральн|главн.*врач|страниц|стр\.\s*\d+|действует\s+с|раздел|глава|номенклатур|код\s+услуг|наименование\s+услуг|цена\s*,?\s*руб|стоимость\s*,?\s*руб)/i;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length < 3) continue;

		// Skip separator decoration lines: "====", "-------", "******"
		if (/^[-=_*~#\s|+]{4,}$/.test(trimmed)) continue;

		// Skip pure header lines without prices (ignoring year 19xx/20xx)
		const trimmedWithoutYears = trimmed.replace(/\b(?:19\d\d|20\d\d)\s*(?:г\.?|года)?\b/gi, "");
		if (headerFooterRegex.test(trimmed) && !/\d{2,}/.test(trimmedWithoutYears)) continue;

		filteredLines.push(trimmed);
	}

	return filteredLines;
}

// =============================================================================
// 4. ROBUST PRICE EXTRACTION WITH KOPECKS
// =============================================================================

export interface ExtractedPriceInfo {
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly rawPriceString: string;
	readonly cleanTitleWithoutPrice: string;
}

/**
 * Extracts exact price (with kopecks) from messy price list lines,
 * cleanly separating the price segment from the commercial title.
 */
export function extractPriceAndTitleFromLine(rawLine: string): ExtractedPriceInfo {
	let line = rawLine.trim();

	// Replace OCR artifacts: "|", double colons, trailing dashes
	line = line.replace(/^[|•*▪\-\—\–\s]+/, "").trim();

	let priceRub = 0;
	let priceKopecks = 0;
	let rawPriceString = "";
	let cleanTitle = line;

	// Regex 1: Explicit Rubles + Kopecks format at end of line:
	// "4 500,50 руб", "1500.50 ₽", "1 500-00", "1500 руб. 00 коп."
	const endCurrencyKopecksRegex = /(?:от\s*)?(\d{1,3}(?:[\s\.]\d{3})*(?:[,\.]\d{2})|\d+(?:[,\.]\d{2}))\s*(?:руб(?:л[ейя]|ь|\.)?|р\b|₽|руб\.?\s*(\d{1,2})\s*коп\.?|-00)?\s*$/i;

	// Regex 2: Standard number with currency at end of line:
	// "... 4 500 руб", "... 4500 ₽", "... 12500 р."
	const endCurrencyIntegerRegex = /(?:от\s*)?(\d{1,3}(?:[\s\.]\d{3})*|\d+)\s*(?:руб(?:л[ейя]|ь|\.)?|р\b|₽)\s*$/i;

	// Regex 3: Plain digits at end of line preceded by spaces/tabs:
	// "Лечение кариеса    4500" or "Коронка 18000"
	const endPlainNumberRegex = /(?:\s+|\t|;|\|)(\d{1,3}(?:[\s\.]\d{3})*(?:[,\.]\d{2})?|\d{2,7})\s*$/;

	// Try Regex 1 (highest precision)
	const match1 = line.match(endCurrencyKopecksRegex);
	if (match1 && match1[1]) {
		const rawDigits = match1[1].replace(/[\s\.]/g, "").replace(",", ".");
		const parsed = parseFloat(rawDigits);
		if (Number.isFinite(parsed) && parsed > 0 && parsed <= 10_000_000) {
			priceRub = Math.round(parsed * 100) / 100;
			priceKopecks = Math.round(priceRub * 100);
			rawPriceString = match1[0].trim();
			cleanTitle = line.slice(0, match1.index).trim();
		}
	}

	// Try Regex 2 if Regex 1 did not extract valid price
	if (priceRub === 0) {
		const match2 = line.match(endCurrencyIntegerRegex);
		if (match2 && match2[1]) {
			const rawDigits = match2[1].replace(/[\s\.]/g, "");
			const parsed = parseInt(rawDigits, 10);
			if (Number.isFinite(parsed) && parsed >= 50 && parsed <= 10_000_000) {
				priceRub = parsed;
				priceKopecks = parsed * 100;
				rawPriceString = match2[0].trim();
				cleanTitle = line.slice(0, match2.index).trim();
			}
		}
	}

	// Try Regex 3 if still not found (tabulated numbers without currency)
	if (priceRub === 0) {
		const match3 = line.match(endPlainNumberRegex);
		if (match3 && match3[1]) {
			const rawDigits = match3[1].replace(/[\s\.]/g, "").replace(",", ".");
			const parsed = parseFloat(rawDigits);
			if (Number.isFinite(parsed) && parsed >= 50 && parsed <= 10_000_000) {
				priceRub = Math.round(parsed * 100) / 100;
				priceKopecks = Math.round(priceRub * 100);
				rawPriceString = match3[1].trim();
				cleanTitle = line.slice(0, match3.index).trim();
			}
		}
	}

	// Clean remaining commercial title
	cleanTitle = cleanTitle
		.replace(/^[\d\.\)\-\—\–\s]+/, "") // Leading row numbering: "1.", "1.2.3", "12)"
		.replace(/[\-–—:=|]+$/, "")        // Trailing separator dashes/colons
		.replace(/\s{2,}/g, " ")           // Excess whitespace
		.trim();

	return {
		priceRub,
		priceKopecks,
		rawPriceString,
		cleanTitleWithoutPrice: cleanTitle,
	};
}

// =============================================================================
// 5. STATUTORY ORDER 804N CLASSIFIER & MATCHER
// =============================================================================

export interface NomenclatureMatchResult {
	readonly code804n: string;
	readonly statutoryTitle804n: string;
	readonly category: string;
	readonly specialty: string;
	readonly confidence: number;
	readonly confidenceKind: PriceListConfidenceKind;
	readonly cleanedTitle: string;
}

/**
 * Matches a commercial title / line to statutory Minzdrav Order 804n nomenclature.
 */
export function matchOrder804nNomenclature(
	rawLine: string,
	cleanedTitle: string,
): NomenclatureMatchResult {
	const combinedText = `${rawLine} ${cleanedTitle}`;

	// 1. Check for explicit 804n code in text (Latin or Cyrillic A/B: A16.07.002 or А16.07.002)
	const explicitCodeRegex = /\b([A-ZА-Я]\d{2}\.\d{2}\.\d{3}(?:\.\d{3})?)\b/i;
	const explicitMatch = combinedText.match(explicitCodeRegex);

	if (explicitMatch && explicitMatch[1]) {
		const rawCode = explicitMatch[1].toUpperCase();
		// Normalize Cyrillic 'А' / 'В' to Latin 'A' / 'B'
		const normalizedCode = rawCode.replace(/^А/, "A").replace(/^В/, "B");

		// Find in statutory registry
		const entry = ORDER_804N_STATUTORY_REGISTRY.find(
			(e) => e.code === normalizedCode || normalizedCode.startsWith(e.code),
		);

		// Strip detected code from title
		let title = cleanedTitle.replace(new RegExp(explicitMatch[1], "i"), "").trim();
		title = title.replace(/^[\s\-–—:=.]+/, "").trim();

		if (entry) {
			return {
				code804n: normalizedCode,
				statutoryTitle804n: entry.title,
				category: entry.category,
				specialty: entry.specialty,
				confidence: 0.98,
				confidenceKind: "exact_code",
				cleanedTitle: title || entry.title,
			};
		}

		// Unknown explicit code but valid format
		return {
			code804n: normalizedCode,
			statutoryTitle804n: title || `Медицинская услуга по номенклатуре ${normalizedCode}`,
			category: "therapy",
			specialty: "therapist",
			confidence: 0.92,
			confidenceKind: "exact_code",
			cleanedTitle: title,
		};
	}

	// 2. High-precision keyword matching against statutory entries
	let bestEntry: StatutoryNomenclatureEntry | null = null;
	let highestScore = 0;
	let matchedKind: PriceListConfidenceKind = "fallback";

	for (const entry of ORDER_804N_STATUTORY_REGISTRY) {
		let score = 0;

		// Primary keywords give major weight
		for (const pkw of entry.primaryKeywords) {
			if (pkw.test(cleanedTitle)) {
				score += 50;
			}
		}

		// Secondary keywords give minor weight
		for (const skw of entry.secondaryKeywords) {
			if (skw.test(cleanedTitle)) {
				score += 15;
			}
		}

		if (score > highestScore) {
			highestScore = score;
			bestEntry = entry;
		}
	}

	if (bestEntry && highestScore >= 50) {
		const confidence = Math.min(0.95, 0.75 + (highestScore / 200));
		matchedKind = confidence >= 0.85 ? "high_keyword" : "medium_keyword";

		return {
			code804n: bestEntry.code,
			statutoryTitle804n: bestEntry.title,
			category: bestEntry.category,
			specialty: bestEntry.specialty,
			confidence,
			confidenceKind: matchedKind,
			cleanedTitle,
		};
	}

	if (bestEntry && highestScore > 0) {
		return {
			code804n: bestEntry.code,
			statutoryTitle804n: bestEntry.title,
			category: bestEntry.category,
			specialty: bestEntry.specialty,
			confidence: 0.65,
			confidenceKind: "low_keyword",
			cleanedTitle,
		};
	}

	// 3. Fallback to general therapy / consultation
	return {
		code804n: "A16.07.000",
		statutoryTitle804n: "Стоматологическая услуга (прочее)",
		category: "other",
		specialty: "therapist",
		confidence: 0.40,
		confidenceKind: "fallback",
		cleanedTitle,
	};
}

// =============================================================================
// 6. CLINIC CATALOG CROSS-REFERENCING ENGINE
// =============================================================================

/**
 * Cross-references an ingested item against the existing clinic database services.
 */
export function crossReferenceWithExistingCatalog(
	proposalCode: string,
	proposalTitle: string,
	proposalPriceRub: number,
	existingItems: readonly ServiceCatalogItem[],
): {
	matchedExistingServiceId?: string | null;
	matchedExistingTitle?: string | null;
	matchedExistingPriceRub?: number | null;
	suggestedAction: PriceListSuggestedAction;
} {
	if (!existingItems || existingItems.length === 0) {
		return {
			matchedExistingServiceId: null,
			matchedExistingTitle: null,
			matchedExistingPriceRub: null,
			suggestedAction: "create_new",
		};
	}

	const normTitle = proposalTitle.toLowerCase().trim();

	// 1. Exact title or code match
	const exactMatch = existingItems.find(
		(it) => it.title.toLowerCase().trim() === normTitle || (it.code && it.code === proposalCode && proposalCode !== "A16.07.000"),
	);

	if (exactMatch) {
		const existingPrice = exactMatch.basePriceRub ?? 0;
		const priceMatches = Math.abs(existingPrice - proposalPriceRub) < 0.01;

		return {
			matchedExistingServiceId: exactMatch.id,
			matchedExistingTitle: exactMatch.title,
			matchedExistingPriceRub: existingPrice,
			suggestedAction: priceMatches ? "identical" : "update_existing",
		};
	}

	// 2. Fuzzy substring match (high similarity)
	const fuzzyMatch = existingItems.find((it) => {
		const existingNorm = it.title.toLowerCase().trim();
		return (
			existingNorm.includes(normTitle) ||
			normTitle.includes(existingNorm) ||
			(existingNorm.length > 8 && normTitle.slice(0, 8) === existingNorm.slice(0, 8))
		);
	});

	if (fuzzyMatch) {
		return {
			matchedExistingServiceId: fuzzyMatch.id,
			matchedExistingTitle: fuzzyMatch.title,
			matchedExistingPriceRub: fuzzyMatch.basePriceRub,
			suggestedAction: "link_existing",
		};
	}

	return {
		matchedExistingServiceId: null,
		matchedExistingTitle: null,
		matchedExistingPriceRub: null,
		suggestedAction: "create_new",
	};
}

// =============================================================================
// 7. CORE INGESTION SERVICE PIPELINE
// =============================================================================

/**
 * Main ingestion entrypoint: takes raw price list content, parses lines,
 * extracts prices with kopecks, maps Order 804n nomenclature, cross-references
 * with existing clinic catalog, and produces the verified proposals list.
 */
export async function ingestPriceList(
	request: PriceListIngestionRequest,
	existingCatalog: readonly ServiceCatalogItem[] = [],
): Promise<PriceListIngestionResponse> {
	const rawLines = extractLinesFromPriceList(request.rawContent, request.sourceType);
	const proposals: IngestedPriceProposal[] = [];
	const warnings: string[] = [];

	let exactCodesCount = 0;
	let newServicesCount = 0;
	let updateServicesCount = 0;
	let identicalCount = 0;
	let totalConfidence = 0;

	let lineNumber = 0;
	for (const rawLine of rawLines) {
		lineNumber++;

		// 1. Extract price & title
		const priceInfo = extractPriceAndTitleFromLine(rawLine);
		const cleanedTitle = priceInfo.cleanTitleWithoutPrice;

		if (!cleanedTitle || cleanedTitle.length < 2) {
			continue;
		}

		// 2. Semantic matching with 804n
		const match = matchOrder804nNomenclature(rawLine, cleanedTitle);

		// 3. Cross-reference with existing clinic catalog
		const catalogRef = crossReferenceWithExistingCatalog(
			match.code804n,
			cleanedTitle,
			priceInfo.priceRub,
			existingCatalog,
		);

		if (match.confidenceKind === "exact_code") exactCodesCount++;
		if (catalogRef.suggestedAction === "create_new") newServicesCount++;
		if (catalogRef.suggestedAction === "update_existing") updateServicesCount++;
		if (catalogRef.suggestedAction === "identical") identicalCount++;

		totalConfidence += match.confidence;

		const proposal: IngestedPriceProposal = {
			id: `ingest-item-${lineNumber}-${Date.now().toString(36)}`,
			sourceLineNumber: lineNumber,
			rawLine,
			cleanedTitle: match.cleanedTitle,
			code804n: match.code804n,
			statutoryTitle804n: match.statutoryTitle804n,
			category: match.category,
			specialty: match.specialty,
			priceRub: priceInfo.priceRub,
			priceKopecks: priceInfo.priceKopecks,
			confidence: Math.round(match.confidence * 100) / 100,
			confidenceKind: match.confidenceKind,
			matchedExistingServiceId: catalogRef.matchedExistingServiceId,
			matchedExistingTitle: catalogRef.matchedExistingTitle,
			matchedExistingPriceRub: catalogRef.matchedExistingPriceRub,
			suggestedAction: catalogRef.suggestedAction,
			isApproved: true,
		};

		proposals.push(proposal);
	}

	if (proposals.length === 0) {
		warnings.push("Не удалось распознать ни одной строки прейскуранта с услугами и ценами.");
	}

	const recognizedCount = proposals.length;
	const averageConfidence = recognizedCount > 0 ? Math.round((totalConfidence / recognizedCount) * 100) / 100 : 0;

	const stats: PriceListIngestionStats = {
		totalLines: rawLines.length,
		recognizedCount,
		exactCodesCount,
		newServicesCount,
		updateServicesCount,
		identicalCount,
		averageConfidence,
	};

	return {
		success: proposals.length > 0,
		proposals,
		stats,
		warnings,
	};
}
