import {
	type DentalMaterialKind,
	type DentalRestorationType,
	type DentalSpecialty,
	type ServiceCategory,
} from "@dental/shared";

import { matchesAny, normalizeKey } from "./textNormalizers.js";
import {
	type Classification,
	type KeywordRule,
	type MaterialClassification,
} from "./types.js";

export const categoryRules: Array<
	KeywordRule<ServiceCategory> & {
		specialty: DentalSpecialty;
		treatmentKind: string;
	}
> = [
	{
		value: "consultation",
		specialty: "universal",
		treatmentKind: "consultation",
		patterns: [/консульт/i, /осмотр/i, /план\s+леч/i, /прием/i],
	},
	{
		value: "imaging",
		specialty: "radiologist",
		treatmentKind: "imaging",
		patterns: [
			/кт\b/i,
			/cbct/i,
			/оптг/i,
			/ортопан/i,
			/трг/i,
			/rvg/i,
			/рентген/i,
			/сним/i,
			/фото\s*протокол/i,
			/скан/i,
			/3shape/i,
			/medit/i,
			/sirona/i,
		],
	},
	{
		value: "hygiene",
		specialty: "hygienist",
		treatmentKind: "hygiene",
		patterns: [
			/гигиен/i,
			/air\s*flow/i,
			/airflow/i,
			/ems\b/i,
			/ультразв/i,
			/скейл/i,
			/налет/i,
			/камн/i,
			/фтор/i,
			/реминерал/i,
			/отбел/i,
			/zoom/i,
			/beyond/i,
			/opalescence/i,
			/white/i,
		],
	},
	{
		value: "orthodontics",
		specialty: "orthodontist",
		treatmentKind: "orthodontics",
		patterns: [
			/брекет/i,
			/элайнер/i,
			/капп/i,
			/ретейн/i,
			/ортодонт/i,
			/damon/i,
			/ormco/i,
			/invisalign/i,
		],
	},
	{
		value: "periodontology",
		specialty: "periodontist",
		treatmentKind: "periodontology",
		patterns: [
			/пародонт/i,
			/кюрет/i,
			/шинир/i,
			/лоскут/i,
			/пародонтальн/i,
			/гингив/i,
		],
	},
	{
		value: "surgery",
		specialty: "implantologist",
		treatmentKind: "implantology",
		patterns: [
			/имплант/i,
			/аба[тд]мент/i,
			/формировател/i,
			/синус/i,
			/костн/i,
			/мембран/i,
			/straumann/i,
			/nobel/i,
			/osstem/i,
			/dentium/i,
			/megagen/i,
		],
	},
	{
		value: "surgery",
		specialty: "surgeon",
		treatmentKind: "surgery",
		patterns: [
			/удален/i,
			/экстракц/i,
			/восьмер/i,
			/резекц/i,
			/цист/i,
			/уздеч/i,
			/шв/i,
			/prf/i,
		],
	},
	{
		value: "prosthetics",
		specialty: "orthopedist",
		treatmentKind: "prosthetics",
		patterns: [
			/корон/i,
			/винир/i,
			/вкладк/i,
			/накладк/i,
			/мост/i,
			/протез/i,
			/керамик/i,
			/циркон/i,
			/zircon/i,
			/e\.?\s*max/i,
		],
	},
	{
		value: "therapy",
		specialty: "pediatric",
		treatmentKind: "pediatric",
		patterns: [
			/детск/i,
			/молочн/i,
			/герметизац/i,
			/фиссур/i,
			/sealant/i,
			/пульпотом/i,
			/серебрен/i,
		],
	},
	{
		value: "therapy",
		specialty: "therapist",
		treatmentKind: "therapy",
		patterns: [
			/кариес/i,
			/пульпит/i,
			/периодонт/i,
			/канал/i,
			/эндод/i,
			/пломб/i,
			/реставрац/i,
			/герметизац/i,
			/фиссур/i,
			/коффер/i,
			/анестез/i,
		],
	},
	{
		value: "documents",
		specialty: "universal",
		treatmentKind: "document",
		patterns: [/справк/i, /договор/i, /акт\b/i, /вычет/i, /соглас/i],
	},
];

export const materialRules: Array<KeywordRule<DentalMaterialKind>> = [
	{
		value: "zirconia",
		label: "zirconia",
		patterns: [
			/циркон/i,
			/zircon/i,
			/zro/i,
			/multi\s*layer/i,
			/katana/i,
			/prettau/i,
			/bruxzir/i,
			/aidite/i,
			/cercon/i,
			/zircad/i,
			/lava/i,
		],
	},
	{
		value: "lithium_disilicate",
		label: "e.max",
		patterns: [/e\.?\s*max/i, /emax/i, /lithium/i, /disilicate/i, /дисиликат/i],
	},
	{
		value: "metal_ceramic",
		label: "metal ceramic",
		patterns: [/металлокерами/i, /металл[о-]?\s*керами/i, /pfm\b/i],
	},
	{
		value: "ceramic",
		label: "ceramic",
		patterns: [/керамик/i, /фарфор/i, /noritake/i, /vita/i, /ivoclar/i],
	},
	{
		value: "pmma",
		label: "pmma",
		patterns: [/pmma/i, /времен/i, /пластмасс/i, /акрил/i],
	},
	{
		value: "glass_ionomer",
		label: "glass ionomer",
		patterns: [
			/стеклоиономер/i,
			/\bсиц\b/i,
			/glass\s*ionomer/i,
			/fuji/i,
			/ketac/i,
		],
	},
	{
		value: "sealant",
		label: "sealant",
		patterns: [/герметизац/i, /фиссур/i, /sealant/i],
	},
	{
		value: "whitening",
		label: "whitening",
		patterns: [
			/отбел/i,
			/zoom/i,
			/beyond/i,
			/opalescence/i,
			/amazing\s*white/i,
		],
	},
	{
		value: "other",
		label: "hygiene system",
		patterns: [/air\s*flow/i, /airflow/i, /ems\b/i, /ультразв/i, /скейл/i],
	},
	{
		value: "composite",
		label: "composite",
		patterns: [
			/композит/i,
			/фотополимер/i,
			/светов/i,
			/filtek/i,
			/estelite/i,
			/gradia/i,
			/sdr\b/i,
			/tokuyama/i,
			/omnichroma/i,
			/charisma/i,
			/tetric/i,
			/venus/i,
			/esthet[-\s]?x/i,
			/dentsply/i,
			/kerr/i,
			/voco/i,
			/kulzer/i,
		],
	},
	{
		value: "implant_system",
		label: "implant",
		patterns: [
			/straumann/i,
			/nobel/i,
			/osstem/i,
			/dentium/i,
			/megagen/i,
			/anyridge/i,
			/astra/i,
			/biohorizons/i,
			/mis\b/i,
			/alpha[-\s]?bio/i,
			/neodent/i,
			/ankylos/i,
			/zimmer/i,
			/biomet/i,
			/bredent/i,
			/impro/i,
			/sgs\b/i,
			/имплант/i,
		],
	},
	{
		value: "abutment",
		label: "abutment",
		patterns: [/аба[тд]мент/i, /abutment/i, /формировател/i],
	},
	{
		value: "bone_graft",
		label: "bone graft",
		patterns: [
			/костн/i,
			/остео/i,
			/bone/i,
			/графт/i,
			/bio[-\s]?oss/i,
			/cerabone/i,
			/geistlich/i,
			/botiss/i,
			/osteo\s*biol/i,
			/symbios/i,
		],
	},
	{
		value: "membrane",
		label: "membrane",
		patterns: [
			/мембран/i,
			/membrane/i,
			/bio[-\s]?gide/i,
			/jason/i,
			/collagen/i,
			/collprotect/i,
		],
	},
	{
		value: "aligner",
		label: "aligner",
		patterns: [
			/элайнер/i,
			/aligner/i,
			/invisalign/i,
			/star\s*smile/i,
			/flexi/i,
		],
	},
	{
		value: "bracket",
		label: "bracket",
		patterns: [
			/брекет/i,
			/damon/i,
			/ormco/i,
			/3m\b/i,
			/сапфир/i,
			/керамическ.*брек/i,
			/металл.*брек/i,
		],
	},
	{
		value: "fluoride",
		label: "fluoride",
		patterns: [/фтор/i, /fluor/i, /реминерал/i],
	},
	{
		value: "anesthetic",
		label: "anesthetic",
		patterns: [
			/анестез/i,
			/артикаин/i,
			/ультракаин/i,
			/убистезин/i,
			/septanest/i,
			/ultracain/i,
			/ubistesin/i,
		],
	},
	{
		value: "imaging",
		label: "imaging",
		patterns: [
			/кт\b/i,
			/cbct/i,
			/оптг/i,
			/rvg/i,
			/трг/i,
			/рентген/i,
			/vatech/i,
			/carestream/i,
			/planmeca/i,
		],
	},
	{
		value: "lab",
		label: "lab",
		patterns: [
			/лаборатор/i,
			/техник/i,
			/слепок/i,
			/оттиск/i,
			/скан/i,
			/3shape/i,
			/medit/i,
			/sirona/i,
			/exocad/i,
		],
	},
	{
		value: "metal",
		label: "metal",
		patterns: [
			/кобальт/i,
			/хром/i,
			/cobalt/i,
			/chrome/i,
			/co[-\s]?cr/i,
			/бюгель/i,
		],
	},
	{ value: "titanium", label: "titanium", patterns: [/титан/i, /titan/i] },
];

export const restorationRules: Array<KeywordRule<DentalRestorationType>> = [
	{
		value: "surgical_guide",
		patterns: [/хирургическ.*шаблон/i, /surgical\s*guide/i, /навигац.*шаблон/i],
	},
	{
		value: "implant",
		patterns: [/имплантац/i, /установк.*имплан/i, /implant\s*placement/i],
	},
	{ value: "implant_crown", patterns: [/корон.*имплан/i, /implant.*crown/i] },
	{
		value: "temporary_crown",
		patterns: [/времен.*корон/i, /temporary.*crown/i],
	},
	{ value: "crown", patterns: [/корон/i, /crown/i] },
	{ value: "bridge", patterns: [/мост/i, /bridge/i] },
	{ value: "veneer", patterns: [/винир/i, /veneer/i] },
	{ value: "inlay", patterns: [/вкладк/i, /inlay/i] },
	{ value: "onlay", patterns: [/накладк/i, /onlay/i] },
	{ value: "overlay", patterns: [/overlay/i] },
	{ value: "post_core", patterns: [/культев/i, /штифт/i, /post/i, /core/i] },
	{ value: "denture", patterns: [/протез/i, /denture/i] },
	{
		value: "ortho_appliance",
		patterns: [/брекет/i, /элайнер/i, /ретейн/i, /капп/i],
	},
	{ value: "sealant", patterns: [/герметизац/i, /фиссур/i, /sealant/i] },
	{
		value: "whitening",
		patterns: [/отбел/i, /zoom/i, /beyond/i, /opalescence/i],
	},
	{ value: "direct_restoration", patterns: [/реставрац/i] },
	{ value: "filling", patterns: [/пломб/i, /filling/i] },
];

export const brandRules = [
	"Straumann",
	"Nobel",
	"Osstem",
	"Dentium",
	"Megagen",
	"AnyRidge",
	"Astra",
	"BioHorizons",
	"MIS",
	"Alpha-Bio",
	"Neodent",
	"Ankylos",
	"Zimmer Biomet",
	"Bredent",
	"Impro",
	"SGS",
	"Geistlich",
	"Bio-Oss",
	"Bio-Gide",
	"Cerabone",
	"botiss",
	"OsteoBiol",
	"Jason",
	"Symbios",
	"Damon",
	"Ormco",
	"3M",
	"American Orthodontics",
	"Forestadent",
	"Invisalign",
	"Star Smile",
	"FlexiLigner",
	"Filtek",
	"Estelite",
	"Tokuyama",
	"Omnichroma",
	"Gradia",
	"Fuji",
	"Ketac",
	"Charisma",
	"Tetric",
	"Venus",
	"Esthet-X",
	"Dentsply",
	"Kerr",
	"Voco",
	"Kulzer",
	"IPS e.max",
	"E.max",
	"Ivoclar",
	"Katana",
	"Prettau",
	"BruxZir",
	"Aidite",
	"Cercon",
	"ZirCAD",
	"Lava",
	"Noritake",
	"Vita",
	"Zoom",
	"Beyond",
	"Opalescence",
	"Amazing White",
	"Philips",
	"EMS",
	"Air Flow",
	"Vector",
	"Ultracain",
	"Ubistesin",
	"Septanest",
	"3Shape",
	"Medit",
	"Sirona",
	"Planmeca",
	"Vatech",
	"Carestream",
	"KaVo",
	"NSK",
	"W&H",
];

export function classifyLine(
	line: string,
	preferredSpecialty: DentalSpecialty,
): Classification {
	const rule = categoryRules.find((candidate) =>
		matchesAny(line, candidate.patterns),
	);
	if (rule) {
		return {
			category: rule.value,
			specialty:
				preferredSpecialty !== "universal" && rule.value !== "imaging"
					? preferredSpecialty
					: rule.specialty,
			treatmentKind: rule.treatmentKind,
		};
	}

	return {
		category: "other",
		specialty: preferredSpecialty,
		treatmentKind: "unclassified",
	};
}

export function firstRuleValue<T extends string>(
	line: string,
	rules: Array<KeywordRule<T>>,
	fallback: T,
): T {
	return (
		rules.find((candidate) => matchesAny(line, candidate.patterns))?.value ??
		fallback
	);
}

export function detectBrand(line: string): string | null {
	const normalized = normalizeKey(line);
	return (
		brandRules.find((brand) => normalized.includes(normalizeKey(brand))) ?? null
	);
}

/*
 * ТИП КОРОНКИ. «Многослойный цирконий» ТРЕБУЕТ, ЧТОБЫ МАТЕРИАЛ И БЫЛ ЦИРКОНИЕМ.
 *
 * БЫЛО: `if (/multi\s*layer|мульти/i.test(line)) return "zirconia multilayer";`
 * стояло ПЕРВЫМ, до всякой проверки материала. «Мульти» — слишком широкий корень:
 * «мультиюнит» (Multi-Unit) это тип АБАТМЕНТА у Straumann и Nobel, а не материал
 * коронки. Замер ведущего (находка ревьюера волны OO):
 *
 *   «Коронка на мультиюнит абатменте 30000 руб»   материал abutment
 *                                                 → crownType «zirconia multilayer»
 *
 * То есть разборщик объявлял ЦИРКОНИЙ в строке, где цирконий не назван ни словом,
 * и материал сам определился как «абатмент». Это выдумывание МАТЕРИАЛА — родня
 * выдумыванию цены, и уезжает оно тем же путём: в каталог, в план лечения, в
 * документ, который подписывает пациент. Материал в подписанном документе — это
 * обещание пациенту, чем ему поставят коронку.
 *
 * ПОЧИНКА СТРУКТУРНАЯ, А НЕ СПИСКОМ СЛОВ. Запрещать «мультиюнит» по имени значило
 * бы ждать следующего слова с тем же корнем. «Многослойный цирконий» по
 * определению цирконий, поэтому заявка требует материала `zirconia` — и тогда ни
 * одно слово с корнем «мульти» не может назначить материал само.
 *
 * ЦЕНА ОШИБКИ В ДРУГУЮ СТОРОНУ МЕНЬШЕ: строка «Коронка multilayer» без названного
 * материала теперь даёт «crown» вместо «zirconia multilayer». Это отказ от
 * уточнения, а не выдумка, и он согласован со стоячим законом файла — не можешь
 * определить, не угадывай.
 */
export function detectCrownType(
	line: string,
	materialKind: DentalMaterialKind,
): string | null {
	if (!/корон|crown/i.test(line)) return null;
	if (materialKind === "zirconia" && /multi\s*layer|мульти/i.test(line))
		return "zirconia multilayer";
	if (materialKind === "zirconia") return "zirconia";
	if (materialKind === "lithium_disilicate") return "lithium disilicate";
	if (materialKind === "metal_ceramic") return "metal ceramic";
	if (materialKind === "pmma") return "temporary PMMA";
	if (materialKind === "ceramic") return "ceramic";
	return "crown";
}

export function detectUnit(line: string): string {
	if (/челюст|jaw/i.test(line)) return "jaw";
	if (/канал/i.test(line)) return "canal";
	if (/сегмент/i.test(line)) return "segment";
	if (/этап/i.test(line)) return "stage";
	if (/зуб|tooth/i.test(line)) return "tooth";
	if (/имплант/i.test(line)) return "implant";
	if (/аба[тд]мент|abutment/i.test(line)) return "abutment";
	if (/прием|визит/i.test(line)) return "visit";
	return "service";
}

export function detectToothScope(line: string): string | null {
	const allOn = line.match(/\ball[-\s]?on[-\s]?(4|6)\b/i);
	if (allOn) return `all-on-${allOn[1]}`;
	const toothRange = line.match(/\b([1-4][1-8])\s*[-,]\s*([1-4][1-8])\b/);
	if (toothRange) return `${toothRange[1]}-${toothRange[2]}`;
	const tooth = line.match(/\b(?:зуб\s*)?([1-4][1-8])\b/);
	return tooth?.[1] ?? null;
}

export function classifyMaterial(line: string): MaterialClassification {
	const materialKind = /аба[тд]мент|abutment|формировател/i.test(line)
		? "abutment"
		: firstRuleValue(line, materialRules, "unknown");
	const restorationType = firstRuleValue(line, restorationRules, "none");
	return {
		materialKind,
		restorationType,
		crownType: detectCrownType(line, materialKind),
		brand: detectBrand(line),
		unit: detectUnit(line),
		toothScope: detectToothScope(line),
	};
}
