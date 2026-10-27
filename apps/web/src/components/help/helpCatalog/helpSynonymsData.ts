/**
 * DENTE CRM — Clinical Search Synonyms & Morphological Mapping
 * Authority: Mandate 8b (<= 120 lines)
 */

import type { ClinicalGuideTab } from "./helpTypes";

interface SynonymCluster {
	readonly words: readonly string[];
	readonly targets: readonly ClinicalGuideTab[];
}

const CLUSTERS: readonly SynonymCluster[] = [
	{ words: ["счет", "счета", "счетами", "счету", "оплата", "оплаты"], targets: ["cashier", "treatment_plans"] },
	{ words: ["оплатить", "оплате", "чек", "чеки", "чеком", "чеков", "касса", "кассы", "ккт", "нал", "наличные", "безнал", "терминал", "сбп"], targets: ["cashier"] },
	{ words: ["деньги"], targets: ["cashier", "analytics"] },
	{ words: ["qr"], targets: ["cashier", "lan_mesh"] },
	{ words: ["зуб", "зубы", "зубов", "зубам", "зубами"], targets: ["odontogram", "dental_lab"] },
	{ words: ["детский", "детские", "детского", "дети", "молочные", "молочный", "прикус", "эмаль", "кариес", "пульпит", "пломба", "пломбы", "пародонт"], targets: ["odontogram"] },
	{ words: ["снимок", "снимки", "снимка", "снимков", "рентген", "рентгена", "кт", "клкт", "томография", "томограмма", "визиограф", "панорама", "оптг", "mpr", "dicom"], targets: ["imaging"] },
	{ words: ["смета", "сметы", "план", "планы", "прайс", "прейскурант", "рассрочка"], targets: ["treatment_plans"] },
	{ words: ["стоимость"], targets: ["treatment_plans", "cashier"] },
	{ words: ["расчет", "расчёт"], targets: ["treatment_plans", "cashier", "analytics"] },
	{ words: ["лаба", "лаборатория", "наряд", "наряды", "техник", "технику", "vita", "вита", "винир", "виниры", "слепок", "слепки"], targets: ["dental_lab"] },
	{ words: ["коронка", "коронки"], targets: ["dental_lab", "odontogram"] },
	{ words: ["склад", "материал", "материалы", "овердрафт", "списание", "автосписание", "остатки", "карпула", "карпулы", "fefo"], targets: ["inventory"] },
	{ words: ["анестетик"], targets: ["inventory", "medical_record"] },
	{ words: ["стерилизация", "автоклав", "автоклавирование", "крафт", "пакет", "пакеты", "азопирам", "проба", "пробы", "дезинфекция", "чистота", "санпин"], targets: ["sanpin"] },
	{ words: ["звонок", "звонки", "звонка", "телефон", "атс", "лид", "лиды", "воронка", "канбан", "заявка", "заявки"], targets: ["leads"] },
	{ words: ["планшет", "планшеты", "вайфай", "wifi", "сеть", "mesh", "офлайн", "сопряжение", "пин", "pin"], targets: ["lan_mesh"] },
	{ words: ["аналитика", "отчет", "отчеты", "отчёт", "отчёты", "выручка", "доход", "зарплата", "зарплаты", "кпи", "kpi"], targets: ["analytics"] },
	{ words: ["расписание", "кресло", "смена", "окно"], targets: ["schedule"] },
	{ words: ["запись"], targets: ["schedule", "leads"] },
	{ words: ["прием", "приём", "визит"], targets: ["schedule", "medical_record"] },
	{ words: ["карта", "медкарта", "дневник", "анамнез", "жалобы", "согласие", "идс", "диктовка"], targets: ["medical_record"] },
];

function buildSynonymMap(): Record<string, readonly ClinicalGuideTab[]> {
	const map: Record<string, ClinicalGuideTab[]> = {};
	for (const cluster of CLUSTERS) {
		for (const word of cluster.words) {
			const existing = map[word] ?? [];
			for (const target of cluster.targets) {
				if (!existing.includes(target)) {
					existing.push(target);
				}
			}
			map[word] = existing;
		}
	}
	return map;
}

export const CLINICAL_SYNONYM_MAP: Record<string, readonly ClinicalGuideTab[]> = buildSynonymMap();
