import type {
  DentalMaterialKind,
  DentalPricelistAnalysisResponse,
  DentalRestorationType,
  PricelistSourceKind
} from "@dental/shared";

export const pricelistSourceKindLabels: Record<PricelistSourceKind, string> = {
  text: "Текст",
  ocr_text: "OCR",
  photo_ocr: "Фото",
  spreadsheet_copy: "Таблица",
  manual: "Вручную"
};

export const dentalMaterialKindLabels: Record<DentalMaterialKind, string> = {
  composite: "Композит",
  glass_ionomer: "СИЦ",
  sealant: "Герметик",
  ceramic: "Керамика",
  zirconia: "Цирконий",
  lithium_disilicate: "E.max / дисиликат",
  metal_ceramic: "Металлокерамика",
  pmma: "PMMA / временные",
  metal: "Металл",
  titanium: "Титан",
  implant_system: "Имплант-система",
  abutment: "Абатмент",
  bone_graft: "Костный материал",
  membrane: "Мембрана",
  aligner: "Элайнеры",
  bracket: "Брекеты",
  fluoride: "Фтор / реминерализация",
  whitening: "Отбеливание",
  anesthetic: "Анестетик",
  imaging: "Снимки",
  lab: "Лаборатория / скан",
  other: "Другое",
  unknown: "Не распознано"
};

export const dentalRestorationTypeLabels: Record<DentalRestorationType, string> = {
  filling: "Пломба",
  direct_restoration: "Прямая реставрация",
  inlay: "Вкладка",
  onlay: "Накладка",
  overlay: "Оверлей",
  veneer: "Винир",
  crown: "Коронка",
  bridge: "Мостовидный протез",
  implant_crown: "Коронка на импланте",
  temporary_crown: "Временная коронка",
  post_core: "Культевая вкладка",
  denture: "Протез",
  ortho_appliance: "Ортодонтический аппарат",
  sealant: "Герметизация",
  whitening: "Отбеливание",
  implant: "Имплантация",
  surgical_guide: "Хирургический шаблон",
  none: "Без реставрации",
  unknown: "Не распознано"
};

const pricelistCrownTypeLabels: Record<string, string> = {
  "zirconia multilayer": "Цирконий MultiLayer",
  zirconia: "Цирконий",
  "lithium disilicate": "E.max / дисиликат лития",
  "metal ceramic": "Металлокерамика",
  "temporary PMMA": "Временная PMMA",
  ceramic: "Керамика",
  crown: "Коронка"
};

function pricelistCrownTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return pricelistCrownTypeLabels[value] ?? value;
}

function pricelistMaterialKindLabel(kind: DentalMaterialKind): string {
  return dentalMaterialKindLabels[kind] ?? kind;
}

function pricelistRestorationTypeLabel(type: DentalRestorationType): string | null {
  if (type === "none" || type === "unknown") return null;
  return dentalRestorationTypeLabels[type] ?? type;
}

export function pricelistMaterialSummaryText(summary: DentalPricelistAnalysisResponse["summary"][number]): string {
  const labels = [
    ...summary.materialKinds.map(pricelistMaterialKindLabel),
    ...summary.brands
  ].filter(Boolean).slice(0, 4);
  return labels.join(", ") || "без материала";
}

export function pricelistItemMaterialText(item: DentalPricelistAnalysisResponse["items"][number]): string {
  const labels = [
    item.brand,
    pricelistCrownTypeLabel(item.crownType),
    item.materialKind === "unknown" ? null : pricelistMaterialKindLabel(item.materialKind),
    pricelistRestorationTypeLabel(item.restorationType)
  ].filter((value): value is string => Boolean(value));
  return labels.join(" · ") || "материал не распознан";
}

const pricelistWarningLabels: Record<string, string> = {
  price_not_found: "Цена не найдена",
  category_uncertain: "Категория требует проверки",
  material_uncertain: "Материал требует проверки",
  restoration_uncertain: "Тип работы требует проверки",
  title_too_short: "Название слишком короткое",
  photo_ocr_requires_visual_review: "Фото прайса требует ручной проверки",
  no_pricelist_rows_detected: "В прайсе не найдены строки услуг",
  image_supplied_but_server_ai_disabled: "Фото добавлено, но нейро-проверка выключена",
  image_payload_invalid: "Фото прайса не прочитано",
  groq_skipped_invalid_image_payload: "Нейро-проверка фото пропущена",
  groq_key_pool_empty: "Нейро-проверка прайса не настроена"
};

const technicalPricelistWarningPattern = /\b(groq|openai|deepgram|provider|api|payload|schema|json|http|timeout|token|key|authorization|failed|error|invalid)\b/i;

function pricelistWarningText(warning: string): string {
  const normalized = warning.trim();
  if (!normalized) return "Требуется проверка";
  if (normalized.startsWith("groq_failed:")) return "Нейро-проверка прайса недоступна";
  if (technicalPricelistWarningPattern.test(normalized)) return "Требуется ручная проверка прайса";
  return pricelistWarningLabels[normalized] ?? normalized.replace(/[_-]+/g, " ");
}

export function pricelistWarningsText(warnings: string[]): string {
  return warnings.map(pricelistWarningText).filter(Boolean).join(", ");
}

export const pricelistRecognitionServiceGroups = [
  {
    title: "Осмотры и диагностика",
    items: ["консультация", "план лечения", "фотопротокол", "сканирование", "ОПТГ", "КЛКТ", "ТРГ", "RVG"]
  },
  {
    title: "Терапия",
    items: ["кариес", "пульпит", "периодонтит", "эндодонтия", "коффердам", "канал", "пломба", "реставрация"]
  },
  {
    title: "Ортопедия",
    items: ["коронка", "винир", "мост", "вкладка", "накладка", "культевая", "протез", "перебазировка"]
  },
  {
    title: "Хирургия и имплантация",
    items: ["удаление", "ретинированный", "имплант", "абатмент", "формирователь", "синус-лифтинг", "НКР", "шаблон"]
  },
  {
    title: "Ортодонтия",
    items: ["брекеты", "элайнеры", "ретейнер", "капа", "дуга", "активация", "снятие", "аппарат"]
  },
  {
    title: "Пародонтология и профилактика",
    items: ["гигиена", "Air Flow", "ультразвук", "кюретаж", "пародонтальная карта", "шинирование", "фтор", "отбеливание"]
  },
  {
    title: "Детский прием",
    items: ["адаптация", "молочный зуб", "герметизация", "фторирование", "пульпотомия", "серебрение", "удерживатель"]
  },
  {
    title: "Документы и админ",
    items: ["договор", "акт", "справка для вычета", "рассрочка", "гарантия", "ДМС", "сертификат"]
  }
] as const;

export const pricelistRecognitionBrandGroups = [
  {
    title: "Импланты",
    items: ["Straumann", "Nobel", "Osstem", "Dentium", "Megagen", "Astra", "BioHorizons", "MIS", "Alpha-Bio", "Neodent"]
  },
  {
    title: "Кость и мембраны",
    items: ["Geistlich", "Bio-Oss", "Bio-Gide", "Cerabone", "botiss", "OsteoBiol", "Jason", "Symbios"]
  },
  {
    title: "Композиты и СИЦ",
    items: ["Filtek", "Estelite", "Omnichroma", "Gradia", "Fuji", "Ketac", "Charisma", "Tetric", "Venus", "Voco"]
  },
  {
    title: "Керамика и цирконий",
    items: ["IPS e.max", "Ivoclar", "Katana", "Prettau", "BruxZir", "Aidite", "Cercon", "ZirCAD", "Lava", "Vita"]
  },
  {
    title: "Ортодонтия",
    items: ["Damon", "Ormco", "3M", "American Orthodontics", "Forestadent", "Invisalign", "Star Smile", "FlexiLigner"]
  },
  {
    title: "Гигиена и отбеливание",
    items: ["EMS", "Air Flow", "Vector", "Zoom", "Beyond", "Opalescence", "Amazing White", "Philips"]
  },
  {
    title: "Анестезия и оборудование",
    items: ["Ultracain", "Ubistesin", "Septanest", "3Shape", "Medit", "Sirona", "Planmeca", "Vatech", "Carestream"]
  }
] as const;
