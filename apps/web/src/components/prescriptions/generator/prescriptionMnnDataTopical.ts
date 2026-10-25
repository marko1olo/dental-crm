/**
 * prescriptionMnnDataTopical.ts — Topical Dental MNN Definitions
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import type { DentalMnnDefinition } from "./prescriptionMnnTypes";

export const MNN_TOPICAL: readonly DentalMnnDefinition[] = [
	{
		id: "chlorhexidine",
		mnnRu: "Хлоргексидин",
		mnnLatin: "Chlorhexidinum",
		aliasesRu: ["хлоргексидин", "хлоргексидина биглюконат", "chlorhexidine"],
		category: "antiseptic",
		categoryLabelRu: "Антисептик катионный местный",
		standardDosages: ["0.05%", "0.12%", "0.2%"],
		maxSingleDoseRu: "10–15 мл (1 столовая ложка)",
		maxDailyDoseRu: "Местно, до 3–4 раз в день (курс не более 10–14 дней)",
		pediatricNotesRu: "Детям старше 6 лет под присмотром взрослых (не глотать).",
		standardSignaLatinPrefix: "Rp.: Sol. Chlorhexidini bigluconatis 0.05%",
		standardSignaRussianTemplate: "Ротовые ванночки по 1 минуте 3 раза в день после еды, 7 дней (не полоскать активно!).",
	},
	{
		id: "cholisal",
		mnnRu: "Холина салицилат + Цеталкония хлорид",
		mnnLatin: "Cholini salicylas + Cetalkonii chloridum",
		aliasesRu: ["холисал", "холина салицилат", "cholisal", "холисал гель"],
		category: "dental_gel",
		categoryLabelRu: "Стоматологический гель противовоспалительный/анальгезирующий",
		standardDosages: ["10 г", "15 г"],
		maxSingleDoseRu: "Полоска 1 см геля",
		maxDailyDoseRu: "Местно 2–3 раза в сутки",
		pediatricNotesRu: "Детям старше 1 года с осторожностью (полоска 0.5 см).",
		standardSignaLatinPrefix: "Rp.: Gel. 'Cholisal' 10.0",
		standardSignaRussianTemplate: "Наносить на десну чистым пальцем полоской 1 см 2–3 раза в день за 15 минут до еды.",
	},
	{
		id: "solcoseryl",
		mnnRu: "Депротеинизированный диализат из крови телят + Полидоканол",
		mnnLatin: "Solcoseryl pasta dentalis adhesiva",
		aliasesRu: ["солкосерил", "солкосерил дентальная", "солкосерил паста", "solcoseryl"],
		category: "dental_gel",
		categoryLabelRu: "Стоматологическая адгезивная регенерирующая паста",
		standardDosages: ["5 г"],
		maxSingleDoseRu: "Полоска пасты около 0.5 см",
		maxDailyDoseRu: "Местно 3–5 раз в сутки после еды",
		pediatricNotesRu: "Применять по назначению врача без строгих возрастных ограничений.",
		standardSignaLatinPrefix: "Rp.: Pastae Solcoseryl dentalis adhesivae 5.0",
		standardSignaRussianTemplate: "Наносить на высушенный дефект слизистой оболочки рта тонким слоем 3–5 раз в сутки после еды и перед сном.",
	},
];
