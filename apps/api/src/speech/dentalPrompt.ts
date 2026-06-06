import type {
  DentalSpecialty,
  SpeechProviderKind,
  SpeechSttPromptPolicy,
  SpeechTranscriptionSource
} from "@dental/shared";
import { numberFromEnv } from "./keyPool.js";

const promptVersion = "dental-stt-prompt-v10-2026-06-06";
const promptProviders: SpeechProviderKind[] = ["groq_whisper", "openai_transcribe"];

const baseTerms = [
  "FDI 11-48",
  "зуб 11",
  "зуб 36",
  "зуб 46",
  "один один = 11",
  "три шесть = 36",
  "тридцать шестого = 36",
  "зуб 3.6 = зуб 36",
  "четыре шесть = 46",
  "сорок шестого = 46",
  "верхняя правая шестерка = зуб 16",
  "верхняя левая шестерка = зуб 26",
  "нижняя левая шестерка = зуб 36",
  "нижняя правая шестерка = зуб 46",
  "RVG",
  "РВГ",
  "OPG",
  "ОПТГ",
  "CBCT",
  "КЛКТ",
  "КТ",
  "TRG",
  "ТРГ",
  "жалобы",
  "без жалоб",
  "жалобы отрицает",
  "анамнез",
  "аллергологический анамнез",
  "аллергию отрицает",
  "соматически здоров",
  "препараты не принимает",
  "объективно",
  "status praesens",
  "status localis",
  "диагноз",
  "DS",
  "Dx",
  "D/S",
  "МКБ-10",
  "K02.1",
  "K04.0",
  "K04.5",
  "план лечения",
  "проведена",
  "выполнена",
  "назначены",
  "рекомендованы",
  "боль при накусывании",
  "самопроизвольная боль",
  "ночная боль",
  "пульсирующая боль",
  "реакция на холодное",
  "реакция на горячее",
  "реакция на сладкое",
  "застревание пищи",
  "иррадиация боли",
  "холодовая проба",
  "термопроба",
  "перкуссия",
  "зондирование",
  "пальпация",
  "слизистая",
  "кариозная полость",
  "ИРОПЗ",
  "КПУ",
  "фиссура",
  "герметизация фиссур",
  "окклюзионная поверхность",
  "МОД",
  "МО",
  "ОД",
  "мезиально-окклюзиально-дистальная поверхность",
  "мезиально-окклюзиальная поверхность",
  "дистально-окклюзиальная поверхность",
  "II класс по Блэку",
  "мезиальная поверхность",
  "дистальная поверхность",
  "вестибулярная поверхность",
  "оральная поверхность",
  "пришеечная область",
  "апроксимальная поверхность",
  "контактный пункт",
  "периапикальный очаг",
  "прицельный снимок",
  "визиография",
  "пародонтальный карман",
  "подвижность зуба",
  "кровоточивость",
  "зубной налет",
  "зубной камень",
  "cofferdam",
  "коффердам",
  "раббердам",
  "анестезия",
  "инфильтрационная анестезия",
  "проводниковая анестезия",
  "аппликационная анестезия",
  "карпула",
  "ультракаин",
  "септанест",
  "убистезин",
  "адгезивный протокол",
  "матрица",
  "клин",
  "финирование",
  "полировка",
  "шлифовка",
  "артикуляционная бумага",
  "коррекция окклюзии",
  "композитная реставрация",
  "стеклоиономерный цемент",
  "СИЦ",
  "MTA",
  "эндодонтическое лечение",
  "рабочая длина",
  "апекслокатор",
  "гуттаперча",
  "силер",
  "временная пломба",
  "ирригация каналов",
  "пломбирование каналов",
  "Air Flow",
  "E.max",
  "диоксид циркония",
  "zirconia",
  "metal-ceramic",
  "металлокерамика",
  "PMMA",
  "veneer",
  "винир",
  "inlay",
  "onlay",
  "overlay",
  "endocrown",
  "abutment",
  "sinus-lift",
  "bone grafting",
  "membrane",
  "surgical guide",
  "iTero",
  "Medit",
  "3Shape"
];

const specialtyTerms: Record<DentalSpecialty, string[]> = {
  therapist: [
    "кариес",
    "кариес дентина",
    "пульпит",
    "периодонтит",
    "канал",
    "устье канала",
    "рабочая длина",
    "апекслокатор",
    "мастер-штифт",
    "гуттаперча",
    "силер",
    "латеральная конденсация",
    "вертикальная конденсация",
    "временная пломба",
    "матрица",
    "клин",
    "финирование",
    "полировка",
    "контактный пункт",
    "МОД",
    "МО",
    "ОД",
    "II класс по Блэку",
    "шлифовка",
    "коррекция окклюзии",
    "реставрация",
    "композит",
    "коффердам",
    "caries",
    "pulpitis",
    "periodontitis"
  ],
  orthopedist: [
    "коронка",
    "мостовидный протез",
    "винир",
    "вкладка",
    "накладка",
    "культевая вкладка",
    "временная коронка",
    "прикус",
    "окклюзия",
    "lithium disilicate",
    "zirconia"
  ],
  surgeon: [
    "удаление",
    "разрез",
    "кюретаж",
    "шов",
    "гемостаз",
    "альвеолит",
    "периостит",
    "абсцесс",
    "ретинированный зуб",
    "дистопированный зуб",
    "PRF"
  ],
  orthodontist: [
    "брекеты",
    "элайнеры",
    "ретейнер",
    "окклюзия",
    "скученность",
    "диастема",
    "трема",
    "класс Энгля",
    "Damon",
    "Invisalign"
  ],
  periodontist: [
    "пародонтальный карман",
    "кюретаж",
    "шинирование",
    "рецессия",
    "фуркация",
    "гингива",
    "пародонтит",
    "мукозит"
  ],
  hygienist: [
    "скейлинг",
    "полировка",
    "фторирование",
    "реминерализация",
    "биопленка",
    "индекс гигиены",
    "пигментированный налет"
  ],
  pediatric: [
    "молочный зуб",
    "пульпотомия",
    "герметизация фиссур",
    "адаптация",
    "серебрение",
    "аппликационная анестезия"
  ],
  implantologist: [
    "имплантат",
    "абатмент",
    "формирователь десны",
    "синус-лифтинг",
    "костная пластика",
    "навигационная хирургия",
    "хирургический шаблон"
  ],
  radiologist: [
    "периапикальный очаг",
    "bitewing",
    "ОПТГ",
    "КЛКТ",
    "MPR",
    "панорамная реконструкция",
    "резорбция",
    "киста",
    "гранулема"
  ],
  universal: ["осмотр", "жалобы", "анамнез", "объективный статус", "диагноз со слов врача", "план лечения"]
};

function promptEnabled(): boolean {
  const value = (process.env.DENTAL_STT_DENTAL_PROMPT ?? "on").trim().toLowerCase();
  return !["0", "off", "false", "no"].includes(value);
}

function maxPromptChars(): number {
  return Math.max(220, Math.min(numberFromEnv("DENTAL_STT_PROMPT_MAX_CHARS", 1100), 1800));
}

function customTerms(): string[] {
  return (process.env.DENTAL_STT_CUSTOM_TERMS ?? "")
    .split(/[,\n;]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function uniqueTerms(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function promptTermsForSpecialty(specialty: DentalSpecialty): string[] {
  const criticalBaseTerms = baseTerms.slice(0, 40);
  const specialtyList = specialtyTerms[specialty] ?? specialtyTerms.universal;
  return uniqueTerms([...criticalBaseTerms, ...specialtyList, ...customTerms(), ...baseTerms.slice(40)]).slice(0, 72);
}

function sourceHint(source: SpeechTranscriptionSource): string {
  if (source === "visit") return "Диктовка приема у кресла.";
  if (source === "import") return "Административная диктовка для импорта.";
  if (source === "document") return "Диктовка для черновика документа.";
  return "Тестовая диктовка в настройках.";
}

function trimPrompt(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  const clipped = value.slice(0, maxChars);
  return clipped.slice(0, Math.max(0, clipped.lastIndexOf(","))).trimEnd() + ".";
}

export function buildDentalSttPrompt(input: {
  providerId: SpeechProviderKind;
  specialty?: DentalSpecialty | null;
  source?: SpeechTranscriptionSource | null;
}): string | null {
  if (!promptEnabled() || !promptProviders.includes(input.providerId)) return null;
  const specialty = input.specialty ?? "universal";
  const terms = promptTermsForSpecialty(specialty);
  const prompt = [
    `${sourceHint(input.source ?? "visit")} Стоматологический контекст распознавания речи.`,
    "Расшифруй дословно на русском, если врач говорит по-русски. Не суммируй, не ставь диагноз, не достраивай и не добавляй факты.",
    "Если слышна стоматологическая фраза, выбирай более вероятный стоматологический термин: коффердам, перкуссия, зондирование, кариес, пульпит, периодонтит, RVG, ОПТГ, КЛКТ.",
    "Сохраняй клинические заголовки и сокращения: Жалобы, Анамнез, Объективно, Status praesens, DS, Dx, D/S, Проведено, Проведена, Выполнено, Назначены, Рекомендации.",
    "Сохраняй номера зубов FDI 11-48. Если врач говорит 'три шесть', 'сорок шестой', 'один один' или 'нижняя левая шестерка', записывай номер зуба как 36, 46, 11 или 36.",
    "Сохраняй неопределенность, бренды, материалы, латинские названия и сокращения.",
    `Термины: ${terms.join(", ")}.`
  ].join(" ");
  return trimPrompt(prompt, maxPromptChars());
}

export function getDentalSttPromptPolicy(): SpeechSttPromptPolicy {
  const terms = uniqueTerms([...baseTerms, ...customTerms()]);
  const promptPreview =
    buildDentalSttPrompt({ providerId: "groq_whisper", specialty: "universal", source: "visit" }) ??
    "Стоматологический словарь распознавания выключен.";
  const warnings: string[] = [];
  if (!promptEnabled()) warnings.push("Стоматологический словарь распознавания выключен в серверных настройках.");
  if (customTerms().length) warnings.push("К стандартному словарю распознавания добавлены термины клиники из серверных настроек.");

  return {
    enabled: promptEnabled(),
    version: promptVersion,
    appliesTo: promptProviders,
    maxChars: maxPromptChars(),
    termCount: terms.length,
    promptPreview,
    warnings
  };
}
