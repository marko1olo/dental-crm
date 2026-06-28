import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const analyzerPath = path.resolve("apps/api/dist/pricelist/analyzer.js");
if (!existsSync(analyzerPath)) {
  throw new Error("Build the API first: npm run build");
}

const appSource = readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");
const settingsViewSource = readFileSync(path.resolve("apps/web/src/SettingsView.tsx"), "utf8");
const pricelistUiMetaSource = readFileSync(path.resolve("apps/web/src/pricelistUiMeta.ts"), "utf8");
const useAppLogicSource = readFileSync(path.resolve("apps/web/src/useAppLogic.tsx"), "utf8");
const uiSource = `${appSource}\n${settingsViewSource}\n${pricelistUiMetaSource}\n${useAppLogicSource}`;
const requiredUiSnippets = [
  "pricelistCrownTypeLabels",
  "pricelistMaterialSummaryText",
  "pricelistItemMaterialText",
  "pricelistWarningsText",
  "pricelistMaterialKindLabel",
  "pricelistRestorationTypeLabel",
  "technicalPricelistWarningPattern",
  "Нейро-проверка прайса недоступна",
  "Требуется ручная проверка прайса",
  "QR-код скачан",
  "Скачать QR",
  "Нейро-проверка {typedPricelistAnalysis.aiVision.used ?"
];
const forbiddenUiSnippets = [
  "[...item.materialKinds, ...item.brands].slice(0, 4).join(\", \")",
  "[item.brand, item.crownType, item.materialKind, item.restorationType].filter(Boolean).join(\" · \")",
  "item.warnings.join(\", \")",
  "QR SVG скачан",
  "> QR SVG",
  "Groq {typedPricelistAnalysis.aiVision"
];

for (const snippet of requiredUiSnippets) {
  if (!uiSource.includes(snippet)) throw new Error(`Missing pricelist/QR UI localization snippet: ${snippet}`);
}

for (const snippet of forbiddenUiSnippets) {
  if (uiSource.includes(snippet)) throw new Error(`Raw internal pricelist/QR UI text leaked: ${snippet}`);
}

if (
  settingsViewSource.includes(`typedPricelistAnalysis.warnings.map((warning) => (
                      <span key={warning}>{warning}</span>`)
) {
  throw new Error("Raw internal pricelist warning code leaked in Settings price-list result.");
}

process.env.GROQ_API_KEY = "";
process.env.GROQ_API_KEYS = "";

const { analyzePricelist } = await import(pathToFileURL(analyzerPath).href);

const rawText = [
  "Коронка циркониевая MultiLayer 35 000 руб",
  "Коронка IPS e.max 32 000 руб",
  "Винир керамический E.max 38 000 руб",
  "Реставрация композитная Filtek 9 500 руб",
  "Лечение канала 1 канал 6 800 руб",
  "Имплантация Straumann BLX 85 000 руб",
  "Абадмент индивидуальный циркониевый 28 000 руб",
  "Мембрана Bio-Gide 19 000 руб",
  "Профессиональная гигиена Air Flow EMS 6 000 руб",
  "Элайнеры Star Smile 160 000 руб",
  "ОПТГ 2 500 руб"
].join("\n");

const deterministic = await analyzePricelist({
  sourceName: "synthetic-pricelist",
  sourceKind: "spreadsheet_copy",
  rawText,
  preferredSpecialty: "universal",
  useServerAi: false
});

function findByTitlePart(part) {
  const item = deterministic.items.find((candidate) => candidate.title.toLowerCase().includes(part.toLowerCase()));
  if (!item) throw new Error(`Expected pricelist row containing "${part}"`);
  return item;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

const zirconia = findByTitlePart("циркониевая");
assertEqual(zirconia.category, "prosthetics", "zirconia category");
assertEqual(zirconia.materialKind, "zirconia", "zirconia material");
assertEqual(zirconia.restorationType, "crown", "zirconia restoration");
assertEqual(zirconia.priceRub, 35000, "zirconia price");

const emax = findByTitlePart("IPS e.max");
assertEqual(emax.materialKind, "lithium_disilicate", "emax material");
assertEqual(emax.brand, "IPS e.max", "emax brand");

const restoration = findByTitlePart("Filtek");
assertEqual(restoration.category, "therapy", "restoration category");
assertEqual(restoration.materialKind, "composite", "restoration material");
assertEqual(restoration.brand, "Filtek", "restoration brand");

const implant = findByTitlePart("Straumann");
assertEqual(implant.category, "surgery", "implant category");
assertEqual(implant.specialty, "implantologist", "implant specialty");
assertEqual(implant.materialKind, "implant_system", "implant material");
assertEqual(implant.brand, "Straumann", "implant brand");

const abutment = findByTitlePart("Абадмент");
assertEqual(abutment.materialKind, "abutment", "abutment misspelling material");
assertEqual(abutment.unit, "abutment", "abutment unit");

const membrane = findByTitlePart("Bio-Gide");
assertEqual(membrane.materialKind, "membrane", "membrane material");
assertEqual(membrane.brand, "Bio-Gide", "membrane brand");

const hygiene = findByTitlePart("Air Flow");
assertEqual(hygiene.category, "hygiene", "hygiene category");
assertEqual(hygiene.brand, "EMS", "hygiene brand");

const aligner = findByTitlePart("Star Smile");
assertEqual(aligner.category, "orthodontics", "aligner category");
assertEqual(aligner.materialKind, "aligner", "aligner material");

const imaging = findByTitlePart("ОПТГ");
assertEqual(imaging.category, "imaging", "imaging category");
assertEqual(imaging.materialKind, "imaging", "imaging material");

const invalidImage = await analyzePricelist({
  sourceName: "invalid-image",
  sourceKind: "photo_ocr",
  rawText: "",
  imageBase64: Buffer.from("not a real image").toString("base64"),
  imageMimeType: "image/jpeg",
  preferredSpecialty: "universal",
  useServerAi: true
});

if (invalidImage.aiVision.used) throw new Error("Groq should not be used for invalid image payload.");
if (invalidImage.aiVision.reason.includes("Groq")) {
  throw new Error("Pricelist UI-facing AI reason must not expose provider branding.");
}
if (!invalidImage.warnings.includes("image_payload_invalid")) throw new Error("Missing invalid image warning.");
if (!invalidImage.warnings.includes("groq_skipped_invalid_image_payload")) {
  throw new Error("Missing Groq skip warning for invalid image payload.");
}

console.log(
  JSON.stringify({
    rows: deterministic.items.length,
    parserMode: deterministic.parserMode,
    categories: [...new Set(deterministic.items.map((item) => item.category))].sort(),
    materialChecks: {
      zirconia: zirconia.materialKind,
      emax: emax.brand,
      abutment: abutment.materialKind,
      membrane: membrane.brand,
      aligner: aligner.materialKind
    },
    uiSourceLocalized: true,
    invalidImageWarnings: invalidImage.warnings
  })
);
