import {
  dentalPricelistAnalysisResponseSchema,
  dentalPricelistItemSchema,
  type DentalMaterialKind,
  type DentalPricelistAnalysisRequest,
  type DentalPricelistAnalysisResponse,
  type DentalPricelistCategorySummary,
  type DentalPricelistItem,
  type DentalRestorationType,
  type DentalSpecialty,
  type PricelistParserMode,
  type ServiceCatalogItem,
  type ServiceCategory
} from "@dental/shared";
import { serviceCatalog } from "../sampleData.js";
import {
  fetchWithProviderTimeout,
  getProviderKeyPoolSummary,
  keyRetryLimit,
  providerHttpError,
  recordProviderKeyFailure,
  recordProviderKeySuccess,
  sanitizeProviderErrorMessage,
  selectProviderKey,
  shouldTryNextProviderKey
} from "../speech/keyPool.js";

type KeywordRule<T extends string> = {
  value: T;
  label?: string;
  patterns: RegExp[];
};

type Classification = {
  category: ServiceCategory;
  specialty: DentalSpecialty;
  treatmentKind: string;
};

type MaterialClassification = {
  materialKind: DentalMaterialKind;
  restorationType: DentalRestorationType;
  crownType: string | null;
  brand: string | null;
  unit: string;
  toothScope: string | null;
};

type GroqChatPayload = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const groqPromptVersion = "pricelist-json-v1";
const maxGroqImagesPerRequest = 1;
const groqProviderId = "groq_whisper" as const;

const categoryRules: Array<KeywordRule<ServiceCategory> & { specialty: DentalSpecialty; treatmentKind: string }> = [
  {
    value: "consultation",
    specialty: "universal",
    treatmentKind: "consultation",
    patterns: [/консульт/i, /осмотр/i, /план\s+леч/i, /прием/i]
  },
  {
    value: "imaging",
    specialty: "radiologist",
    treatmentKind: "imaging",
    patterns: [/кт\b/i, /cbct/i, /оптг/i, /ортопан/i, /трг/i, /rvg/i, /рентген/i, /сним/i, /фото\s*протокол/i, /скан/i, /3shape/i, /medit/i, /sirona/i]
  },
  {
    value: "hygiene",
    specialty: "hygienist",
    treatmentKind: "hygiene",
    patterns: [/гигиен/i, /air\s*flow/i, /airflow/i, /ems\b/i, /ультразв/i, /скейл/i, /налет/i, /камн/i, /фтор/i, /реминерал/i, /отбел/i, /zoom/i, /beyond/i, /opalescence/i, /white/i]
  },
  {
    value: "orthodontics",
    specialty: "orthodontist",
    treatmentKind: "orthodontics",
    patterns: [/брекет/i, /элайнер/i, /капп/i, /ретейн/i, /ортодонт/i, /damon/i, /ormco/i, /invisalign/i]
  },
  {
    value: "periodontology",
    specialty: "periodontist",
    treatmentKind: "periodontology",
    patterns: [/пародонт/i, /кюрет/i, /шинир/i, /лоскут/i, /пародонтальн/i, /гингив/i]
  },
  {
    value: "surgery",
    specialty: "implantologist",
    treatmentKind: "implantology",
    patterns: [/имплант/i, /аба[тд]мент/i, /формировател/i, /синус/i, /костн/i, /мембран/i, /straumann/i, /nobel/i, /osstem/i, /dentium/i, /megagen/i]
  },
  {
    value: "surgery",
    specialty: "surgeon",
    treatmentKind: "surgery",
    patterns: [/удален/i, /экстракц/i, /восьмер/i, /резекц/i, /цист/i, /уздеч/i, /шв/i, /prf/i]
  },
  {
    value: "prosthetics",
    specialty: "orthopedist",
    treatmentKind: "prosthetics",
    patterns: [/корон/i, /винир/i, /вкладк/i, /накладк/i, /мост/i, /протез/i, /керамик/i, /циркон/i, /zircon/i, /e\.?\s*max/i]
  },
  {
    value: "therapy",
    specialty: "pediatric",
    treatmentKind: "pediatric",
    patterns: [/детск/i, /молочн/i, /герметизац/i, /фиссур/i, /sealant/i, /пульпотом/i, /серебрен/i]
  },
  {
    value: "therapy",
    specialty: "therapist",
    treatmentKind: "therapy",
    patterns: [/кариес/i, /пульпит/i, /периодонт/i, /канал/i, /эндод/i, /пломб/i, /реставрац/i, /герметизац/i, /фиссур/i, /коффер/i, /анестез/i]
  },
  {
    value: "documents",
    specialty: "universal",
    treatmentKind: "document",
    patterns: [/справк/i, /договор/i, /акт\b/i, /вычет/i, /соглас/i]
  }
];

const materialRules: Array<KeywordRule<DentalMaterialKind>> = [
  { value: "zirconia", label: "zirconia", patterns: [/циркон/i, /zircon/i, /zro/i, /multi\s*layer/i, /katana/i, /prettau/i, /bruxzir/i, /aidite/i, /cercon/i, /zircad/i, /lava/i] },
  { value: "lithium_disilicate", label: "e.max", patterns: [/e\.?\s*max/i, /emax/i, /lithium/i, /disilicate/i, /дисиликат/i] },
  { value: "metal_ceramic", label: "metal ceramic", patterns: [/металлокерами/i, /металл[о-]?\s*керами/i, /pfm\b/i] },
  { value: "ceramic", label: "ceramic", patterns: [/керамик/i, /фарфор/i, /noritake/i, /vita/i, /ivoclar/i] },
  { value: "pmma", label: "pmma", patterns: [/pmma/i, /времен/i, /пластмасс/i, /акрил/i] },
  { value: "glass_ionomer", label: "glass ionomer", patterns: [/стеклоиономер/i, /\bсиц\b/i, /glass\s*ionomer/i, /fuji/i, /ketac/i] },
  { value: "sealant", label: "sealant", patterns: [/герметизац/i, /фиссур/i, /sealant/i] },
  { value: "whitening", label: "whitening", patterns: [/отбел/i, /zoom/i, /beyond/i, /opalescence/i, /amazing\s*white/i] },
  { value: "other", label: "hygiene system", patterns: [/air\s*flow/i, /airflow/i, /ems\b/i, /ультразв/i, /скейл/i] },
  { value: "composite", label: "composite", patterns: [/композит/i, /фотополимер/i, /светов/i, /filtek/i, /estelite/i, /gradia/i, /sdr\b/i, /tokuyama/i, /omnichroma/i, /charisma/i, /tetric/i, /venus/i, /esthet[-\s]?x/i, /dentsply/i, /kerr/i, /voco/i, /kulzer/i] },
  { value: "implant_system", label: "implant", patterns: [/straumann/i, /nobel/i, /osstem/i, /dentium/i, /megagen/i, /anyridge/i, /astra/i, /biohorizons/i, /mis\b/i, /alpha[-\s]?bio/i, /neodent/i, /ankylos/i, /zimmer/i, /biomet/i, /bredent/i, /impro/i, /sgs\b/i, /имплант/i] },
  { value: "abutment", label: "abutment", patterns: [/аба[тд]мент/i, /abutment/i, /формировател/i] },
  { value: "bone_graft", label: "bone graft", patterns: [/костн/i, /остео/i, /bone/i, /графт/i, /bio[-\s]?oss/i, /cerabone/i, /geistlich/i, /botiss/i, /osteo\s*biol/i, /symbios/i] },
  { value: "membrane", label: "membrane", patterns: [/мембран/i, /membrane/i, /bio[-\s]?gide/i, /jason/i, /collagen/i, /collprotect/i] },
  { value: "aligner", label: "aligner", patterns: [/элайнер/i, /aligner/i, /invisalign/i, /star\s*smile/i, /flexi/i] },
  { value: "bracket", label: "bracket", patterns: [/брекет/i, /damon/i, /ormco/i, /3m\b/i, /сапфир/i, /керамическ.*брек/i, /металл.*брек/i] },
  { value: "fluoride", label: "fluoride", patterns: [/фтор/i, /fluor/i, /реминерал/i] },
  { value: "anesthetic", label: "anesthetic", patterns: [/анестез/i, /артикаин/i, /ультракаин/i, /убистезин/i, /septanest/i, /ultracain/i, /ubistesin/i] },
  { value: "imaging", label: "imaging", patterns: [/кт\b/i, /cbct/i, /оптг/i, /rvg/i, /трг/i, /рентген/i, /vatech/i, /carestream/i, /planmeca/i] },
  { value: "lab", label: "lab", patterns: [/лаборатор/i, /техник/i, /слепок/i, /оттиск/i, /скан/i, /3shape/i, /medit/i, /sirona/i, /exocad/i] },
  { value: "metal", label: "metal", patterns: [/кобальт/i, /хром/i, /cobalt/i, /chrome/i, /co[-\s]?cr/i, /бюгель/i] },
  { value: "titanium", label: "titanium", patterns: [/титан/i, /titan/i] }
];

const restorationRules: Array<KeywordRule<DentalRestorationType>> = [
  { value: "surgical_guide", patterns: [/хирургическ.*шаблон/i, /surgical\s*guide/i, /навигац.*шаблон/i] },
  { value: "implant", patterns: [/имплантац/i, /установк.*имплан/i, /implant\s*placement/i] },
  { value: "implant_crown", patterns: [/корон.*имплан/i, /implant.*crown/i] },
  { value: "temporary_crown", patterns: [/времен.*корон/i, /temporary.*crown/i] },
  { value: "crown", patterns: [/корон/i, /crown/i] },
  { value: "bridge", patterns: [/мост/i, /bridge/i] },
  { value: "veneer", patterns: [/винир/i, /veneer/i] },
  { value: "inlay", patterns: [/вкладк/i, /inlay/i] },
  { value: "onlay", patterns: [/накладк/i, /onlay/i] },
  { value: "overlay", patterns: [/overlay/i] },
  { value: "post_core", patterns: [/культев/i, /штифт/i, /post/i, /core/i] },
  { value: "denture", patterns: [/протез/i, /denture/i] },
  { value: "ortho_appliance", patterns: [/брекет/i, /элайнер/i, /ретейн/i, /капп/i] },
  { value: "sealant", patterns: [/герметизац/i, /фиссур/i, /sealant/i] },
  { value: "whitening", patterns: [/отбел/i, /zoom/i, /beyond/i, /opalescence/i] },
  { value: "direct_restoration", patterns: [/реставрац/i] },
  { value: "filling", patterns: [/пломб/i, /filling/i] }
];

const brandRules = [
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
  "W&H"
];

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

function matchesAny(line: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(line));
}

function classifyLine(line: string, preferredSpecialty: DentalSpecialty): Classification {
  const rule = categoryRules.find((candidate) => matchesAny(line, candidate.patterns));
  if (rule) {
    return {
      category: rule.value,
      specialty: preferredSpecialty !== "universal" && rule.value !== "imaging" ? preferredSpecialty : rule.specialty,
      treatmentKind: rule.treatmentKind
    };
  }

  return {
    category: "other",
    specialty: preferredSpecialty,
    treatmentKind: "unclassified"
  };
}

function firstRuleValue<T extends string>(line: string, rules: Array<KeywordRule<T>>, fallback: T): T {
  return rules.find((candidate) => matchesAny(line, candidate.patterns))?.value ?? fallback;
}

function detectBrand(line: string): string | null {
  const normalized = normalizeKey(line);
  return brandRules.find((brand) => normalized.includes(normalizeKey(brand))) ?? null;
}

function detectCrownType(line: string, materialKind: DentalMaterialKind): string | null {
  if (!/корон|crown/i.test(line)) return null;
  if (/multi\s*layer|мульти/i.test(line)) return "zirconia multilayer";
  if (materialKind === "zirconia") return "zirconia";
  if (materialKind === "lithium_disilicate") return "lithium disilicate";
  if (materialKind === "metal_ceramic") return "metal ceramic";
  if (materialKind === "pmma") return "temporary PMMA";
  if (materialKind === "ceramic") return "ceramic";
  return "crown";
}

function detectUnit(line: string): string {
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

function detectToothScope(line: string): string | null {
  const allOn = line.match(/\ball[-\s]?on[-\s]?(4|6)\b/i);
  if (allOn) return `all-on-${allOn[1]}`;
  const toothRange = line.match(/\b([1-4][1-8])\s*[-,]\s*([1-4][1-8])\b/);
  if (toothRange) return `${toothRange[1]}-${toothRange[2]}`;
  const tooth = line.match(/\b(?:зуб\s*)?([1-4][1-8])\b/);
  return tooth?.[1] ?? null;
}

function classifyMaterial(line: string): MaterialClassification {
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
    toothScope: detectToothScope(line)
  };
}

function parseMoney(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/[^\d]/g, "");
  if (!normalized) return null;
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 300 && price <= 2_000_000 ? Math.round(price) : null;
}

function extractPrice(line: string): { priceRub: number | null; priceMaxRub: number | null } {
  const withoutServiceCodes = line.replace(/\b[A-ZА-Я]?\d{2}\.\d{2}\.\d{3}\b/giu, " ");
  const candidates: Array<{ priceRub: number; priceMaxRub: number | null; explicit: boolean }> = [];
  const priceRegex =
    /(?:от\s*)?(\d{1,3}(?:[\s.]\d{3})+|\d{3,7})(?:\s*(?:-|до)\s*(\d{1,3}(?:[\s.]\d{3})+|\d{3,7}))?\s*(₽|руб\.?|р\.?)?/giu;
  for (const match of withoutServiceCodes.matchAll(priceRegex)) {
    const priceRub = parseMoney(match[1]);
    const priceMaxRub = parseMoney(match[2]);
    if (priceRub !== null) {
      candidates.push({
        priceRub,
        priceMaxRub: priceMaxRub !== null && priceMaxRub >= priceRub ? priceMaxRub : null,
        explicit: Boolean(match[3] || match[2])
      });
    }
  }
  if (!candidates.length) return { priceRub: null, priceMaxRub: null };
  const explicit = candidates.filter((candidate) => candidate.explicit);
  const selected = (explicit.length ? explicit : candidates).at(-1);
  return { priceRub: selected?.priceRub ?? null, priceMaxRub: selected?.priceMaxRub ?? null };
}

function stripPriceFromTitle(line: string): string {
  return normalizeText(
    line
      .replace(/\b[A-ZА-Я]?\d{2}\.\d{2}\.\d{3}\b/giu, " ")
      .replace(/(?:от\s*)?\d{1,3}(?:[\s.]\d{3})+\s*(?:-|до)?\s*\d{0,3}(?:[\s.]\d{3})?\s*(?:₽|руб\.?|р\.?)?/giu, " ")
      .replace(/\b\d{3,7}\s*(?:₽|руб\.?|р\.?)\b/giu, " ")
      .replace(/[;|]+$/g, "")
  );
}

function durationFromLine(line: string): number | null {
  const match = line.match(/\b(\d{1,3})\s*(?:мин|minutes?)\b/i);
  if (!match) return null;
  const duration = Number(match[1]);
  return Number.isFinite(duration) && duration > 0 && duration <= 600 ? duration : null;
}

function titleTokens(value: string): Set<string> {
  return new Set(
    normalizeKey(value)
      .split(/\s+/)
      .filter((token) => token.length >= 4)
  );
}

function matchServiceId(item: Pick<DentalPricelistItem, "category" | "specialty" | "title">): string | null {
  const sourceTokens = titleTokens(item.title);
  let best: { service: ServiceCatalogItem; score: number } | null = null;
  for (const service of serviceCatalog) {
    let score = service.category === item.category ? 2 : 0;
    if (service.specialty === item.specialty || service.specialty === "universal") score += 1;
    for (const token of titleTokens(service.title)) {
      if (sourceTokens.has(token)) score += 1;
    }
    if (score > (best?.score ?? 0)) best = { service, score };
  }
  return best && best.score >= 3 ? best.service.id : null;
}

function buildWarnings(input: {
  title: string;
  category: ServiceCategory;
  materialKind: DentalMaterialKind;
  restorationType: DentalRestorationType;
  priceRub: number | null;
  sourceKind: DentalPricelistAnalysisRequest["sourceKind"];
}): string[] {
  const warnings: string[] = [];
  if (!input.priceRub) warnings.push("price_not_found");
  if (input.category === "other") warnings.push("category_uncertain");
  if (
    input.materialKind === "unknown" &&
    ["prosthetics", "orthodontics", "surgery", "therapy"].includes(input.category)
  ) {
    warnings.push("material_uncertain");
  }
  if (input.restorationType === "unknown") warnings.push("restoration_uncertain");
  if (input.title.length < 4) warnings.push("title_too_short");
  if (input.sourceKind === "photo_ocr") warnings.push("photo_ocr_requires_visual_review");
  return warnings;
}

function confidenceForItem(input: {
  title: string;
  category: ServiceCategory;
  materialKind: DentalMaterialKind;
  restorationType: DentalRestorationType;
  brand: string | null;
  priceRub: number | null;
}): number {
  let confidence = 0.35;
  if (input.priceRub !== null) confidence += 0.2;
  if (input.category !== "other") confidence += 0.18;
  if (input.materialKind !== "unknown") confidence += 0.1;
  if (input.restorationType !== "none" && input.restorationType !== "unknown") confidence += 0.08;
  if (input.brand) confidence += 0.05;
  if (input.title.length >= 8) confidence += 0.04;
  return Math.min(0.96, Number(confidence.toFixed(2)));
}

function splitPricelistLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => normalizeText(line.replace(/\t/g, " ; ")))
    .filter((line) => line.length > 0)
    .filter((line) => !/^(код|артикул|услуга|наименование|цена|стоимость)(\s|;|$)/i.test(line));
}

function buildItemFromLine(
  line: string,
  lineNumber: number,
  input: DentalPricelistAnalysisRequest
): DentalPricelistItem {
  const classification = classifyLine(line, input.preferredSpecialty);
  const material = classifyMaterial(line);
  const price = extractPrice(line);
  const title = stripPriceFromTitle(line) || line;
  const item: DentalPricelistItem = {
    id: `price-${lineNumber}`,
    sourceLine: lineNumber,
    sourceText: line,
    title,
    normalizedTitle: normalizeKey(title),
    category: classification.category,
    specialty: classification.specialty,
    treatmentKind: classification.treatmentKind,
    materialKind: material.materialKind,
    restorationType: material.restorationType,
    crownType: material.crownType,
    brand: material.brand,
    toothScope: material.toothScope,
    unit: material.unit,
    priceRub: price.priceRub,
    priceMaxRub: price.priceMaxRub,
    durationMinutes: durationFromLine(line),
    confidence: 0,
    warnings: [],
    matchedServiceId: null
  };
  item.warnings = buildWarnings({ ...item, sourceKind: input.sourceKind });
  item.confidence = confidenceForItem(item);
  item.matchedServiceId = matchServiceId(item);
  return dentalPricelistItemSchema.parse(item);
}

function summarize(items: DentalPricelistItem[]): DentalPricelistCategorySummary[] {
  const grouped = new Map<string, DentalPricelistItem[]>();
  for (const item of items) {
    const key = `${item.category}:${item.specialty}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return Array.from(grouped.values())
    .map((group) => {
      const prices = group.map((item) => item.priceRub).filter((price): price is number => price !== null);
      const materials = Array.from(new Set(group.map((item) => item.materialKind).filter((kind) => kind !== "unknown"))).sort();
      const brands = Array.from(new Set(group.map((item) => item.brand).filter((brand): brand is string => Boolean(brand)))).sort();
      return {
        category: group[0]?.category ?? "other",
        specialty: group[0]?.specialty ?? "universal",
        count: group.length,
        pricedCount: prices.length,
        minPriceRub: prices.length ? Math.min(...prices) : null,
        maxPriceRub: prices.length ? Math.max(...prices) : null,
        averagePriceRub: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null,
        materialKinds: materials,
        brands
      } satisfies DentalPricelistCategorySummary;
    })
    .sort((left, right) => right.count - left.count);
}

function createVisionStatus(used: boolean, reason: string, modelName: string | null) {
  const keyPool = getProviderKeyPoolSummary(groqProviderId);
  return {
    providerId: groqProviderId,
    configured: keyPool.configuredKeyCount > 0,
    used,
    modelName,
    maxImagesPerRequest: maxGroqImagesPerRequest,
    reason
  };
}

function decodeBase64ImagePayload(value: string): Buffer | null {
  const cleaned = value.trim().replace(/^data:[^,]+,/i, "").replace(/\s+/g, "");
  if (!cleaned || cleaned.length % 4 === 1 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) return null;
  const buffer = Buffer.from(cleaned, "base64");
  return buffer.length >= 12 ? buffer : null;
}

function isExpectedImagePayload(request: DentalPricelistAnalysisRequest): boolean {
  if (!request.imageBase64) return true;
  const buffer = decodeBase64ImagePayload(request.imageBase64);
  if (!buffer) return false;
  if (request.imageMimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (request.imageMimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (request.imageMimeType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

function groqPricelistModelName(): string {
  return (
    process.env.GROQ_PRICELIST_MODEL?.trim() ||
    process.env.DENTAL_PRICELIST_GROQ_MODEL?.trim() ||
    "meta-llama/llama-4-scout-17b-16e-instruct"
  );
}

function responseFromItems(input: {
  request: DentalPricelistAnalysisRequest;
  items: DentalPricelistItem[];
  parserMode: PricelistParserMode;
  warnings: string[];
  aiUsed: boolean;
  aiReason: string;
  modelName: string | null;
}): DentalPricelistAnalysisResponse {
  return dentalPricelistAnalysisResponseSchema.parse({
    sourceName: input.request.sourceName,
    sourceKind: input.request.sourceKind,
    parserMode: input.parserMode,
    generatedAt: new Date().toISOString(),
    items: input.items,
    summary: summarize(input.items),
    warnings: input.warnings,
    aiVision: createVisionStatus(input.aiUsed, input.aiReason, input.modelName),
    groqJsonPromptVersion: groqPromptVersion
  });
}

function analyzePricelistDeterministic(
  request: DentalPricelistAnalysisRequest,
  parserMode: PricelistParserMode = "deterministic",
  extraWarnings: string[] = []
): DentalPricelistAnalysisResponse {
  const lines = splitPricelistLines(request.rawText);
  const items = lines
    .map((line, index) => buildItemFromLine(line, index + 1, request))
    .filter((item) => item.title.length > 0 && (item.priceRub !== null || item.category !== "other"));
  const warnings = [...extraWarnings];
  if (!items.length) warnings.push("no_pricelist_rows_detected");
  if (request.imageBase64 && !request.useServerAi) warnings.push("image_supplied_but_server_ai_disabled");
  return responseFromItems({
    request,
    items,
    parserMode,
    warnings,
    aiUsed: false,
    aiReason: request.useServerAi ? "Нейро-проверка не запускалась: локальный разбор уже дал безопасный черновик." : "Нейро-проверка выключена.",
    modelName: null
  });
}

function groqSystemPrompt(): string {
  return [
    "You extract dental clinic price lists into strict JSON.",
    "Do not invent services, materials, prices, brands, tooth numbers, durations, or clinical meaning.",
    "If a price is absent, use null. If a material/brand/crown type is uncertain, use unknown or null.",
    "Classify dental services for Russian dental clinics: therapy, prosthetics, surgery, implantology, orthodontics, periodontology, hygiene, imaging, documents, consultation.",
    "Return only JSON with keys items and warnings.",
    "Each item must contain: sourceLine, sourceText, title, normalizedTitle, category, specialty, treatmentKind, materialKind, restorationType, crownType, brand, toothScope, unit, priceRub, priceMaxRub, durationMinutes, confidence, warnings.",
    "Allowed category values: consultation, therapy, surgery, prosthetics, orthodontics, periodontology, hygiene, imaging, documents, other.",
    "Allowed specialty values: therapist, orthopedist, surgeon, orthodontist, periodontist, hygienist, pediatric, implantologist, radiologist, universal.",
    "Allowed materialKind values: composite, glass_ionomer, sealant, ceramic, zirconia, lithium_disilicate, metal_ceramic, pmma, metal, titanium, implant_system, abutment, bone_graft, membrane, aligner, bracket, fluoride, whitening, anesthetic, imaging, lab, other, unknown.",
    "Allowed restorationType values: filling, direct_restoration, inlay, onlay, overlay, veneer, crown, bridge, implant_crown, temporary_crown, post_core, denture, ortho_appliance, sealant, whitening, implant, surgical_guide, none, unknown."
  ].join(" ");
}

function groqUserPrompt(request: DentalPricelistAnalysisRequest): string {
  return [
    `Prompt version: ${groqPromptVersion}.`,
    `Source kind: ${request.sourceKind}. Preferred specialty: ${request.preferredSpecialty}.`,
    "Parse the price list text/OCR/photo. Preserve original visible wording in sourceText. Return JSON only.",
    request.rawText ? `Text:\n${request.rawText.slice(0, 60_000)}` : "No OCR text was supplied; use the attached image only."
  ].join("\n\n");
}

function contentToString(content: string | Array<{ type?: string; text?: string }> | undefined): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part: { type?: string; text?: string }) => (typeof part.text === "string" ? part.text : "")).join("\n");
  }
  return "";
}

function safeParseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!objectMatch) return {};
    return JSON.parse(objectMatch[0]) as Record<string, unknown>;
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function asWarnings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).slice(0, 8)
    : [];
}

function itemFromGroq(raw: unknown, index: number, request: DentalPricelistAnalysisRequest): DentalPricelistItem | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const sourceText = normalizeText(asString(record.sourceText, asString(record.title)));
  if (!sourceText) return null;

  const fallback = buildItemFromLine(sourceText, index + 1, request);
  const item: DentalPricelistItem = {
    ...fallback,
    id: `price-ai-${index + 1}`,
    sourceLine: Math.max(1, Math.round(Number(record.sourceLine) || index + 1)),
    sourceText,
    title: normalizeText(asString(record.title, fallback.title)) || fallback.title,
    normalizedTitle: normalizeKey(asString(record.normalizedTitle, asString(record.title, fallback.title))),
    category: asString(record.category, fallback.category) as ServiceCategory,
    specialty: asString(record.specialty, fallback.specialty) as DentalSpecialty,
    treatmentKind: asString(record.treatmentKind, fallback.treatmentKind),
    materialKind: asString(record.materialKind, fallback.materialKind) as DentalMaterialKind,
    restorationType: asString(record.restorationType, fallback.restorationType) as DentalRestorationType,
    crownType: record.crownType === null ? null : asString(record.crownType, fallback.crownType ?? "") || null,
    brand: record.brand === null ? null : asString(record.brand, fallback.brand ?? "") || null,
    toothScope: record.toothScope === null ? null : asString(record.toothScope, fallback.toothScope ?? "") || null,
    unit: asString(record.unit, fallback.unit),
    priceRub: asNumberOrNull(record.priceRub) ?? fallback.priceRub,
    priceMaxRub: asNumberOrNull(record.priceMaxRub) ?? fallback.priceMaxRub,
    durationMinutes: asNumberOrNull(record.durationMinutes) ?? fallback.durationMinutes,
    confidence: Math.min(0.98, Math.max(0.1, Number(record.confidence) || fallback.confidence)),
    warnings: Array.from(new Set([...fallback.warnings, ...asWarnings(record.warnings)])),
    matchedServiceId: null
  };
  item.matchedServiceId = matchServiceId(item);
  return dentalPricelistItemSchema.safeParse(item).success ? dentalPricelistItemSchema.parse(item) : fallback;
}

async function callGroqPricelist(request: DentalPricelistAnalysisRequest): Promise<DentalPricelistItem[]> {
  const modelName = groqPricelistModelName();
  const tried = new Set<string>();
  const maxAttempts = keyRetryLimit(groqProviderId);
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const key = selectProviderKey(groqProviderId, tried);
    if (!key) break;
    tried.add(key.fingerprint);
    try {
      const content: Array<Record<string, unknown>> = [{ type: "text", text: groqUserPrompt(request) }];
      if (request.imageBase64) {
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${request.imageMimeType};base64,${request.imageBase64}`
          }
        });
      }

      const response = await fetchWithProviderTimeout("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key.value}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: groqSystemPrompt() },
            { role: "user", content }
          ]
        })
      });
      const payload = (await response.json().catch(() => ({}))) as GroqChatPayload;
      if (!response.ok) {
        throw providerHttpError(response.status, response.statusText, payload.error?.message);
      }

      const contentText = contentToString(payload.choices?.[0]?.message?.content);
      const parsed = safeParseJsonObject(contentText);
      const rows = Array.isArray(parsed.items) ? parsed.items : [];
      const items = rows
        .map((row, index) => itemFromGroq(row, index, request))
        .filter((item): item is DentalPricelistItem => Boolean(item));
      if (!items.length) {
        throw new Error("Groq returned JSON without pricelist items.");
      }
      recordProviderKeySuccess(groqProviderId, key);
      return items;
    } catch (error) {
      lastError = error;
      recordProviderKeyFailure(groqProviderId, key, error);
      if (!shouldTryNextProviderKey(error)) break;
    }
  }

  throw new Error(sanitizeProviderErrorMessage(lastError instanceof Error ? lastError.message : "Groq pricelist extraction failed."));
}

export async function analyzePricelist(request: DentalPricelistAnalysisRequest): Promise<DentalPricelistAnalysisResponse> {
  const keyPool = getProviderKeyPoolSummary(groqProviderId);
  const modelName = groqPricelistModelName();

  if (!request.useServerAi) {
    return analyzePricelistDeterministic(request);
  }

  if (request.imageBase64 && !isExpectedImagePayload(request)) {
    return analyzePricelistDeterministic(request, "deterministic_groq_fallback", [
      "image_payload_invalid",
      "groq_skipped_invalid_image_payload"
    ]);
  }

  if (!keyPool.configuredKeyCount) {
    return analyzePricelistDeterministic(request, "deterministic_groq_fallback", ["groq_key_pool_empty"]);
  }

  try {
    const items = await callGroqPricelist(request);
    return responseFromItems({
      request,
      items,
      parserMode: "groq_json",
      warnings: request.imageBase64 ? ["photo_ocr_requires_visual_review"] : [],
      aiUsed: true,
      aiReason: "Серверная нейро-проверка разобрала текст или фото; результат проверен схемой перед показом.",
      modelName
    });
  } catch (error) {
    return analyzePricelistDeterministic(request, "deterministic_groq_fallback", [
      `groq_failed:${sanitizeProviderErrorMessage(error instanceof Error ? error.message : "unknown")}`
    ]);
  }
}
