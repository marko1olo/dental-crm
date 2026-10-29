/**
 * prescriptionCatalogData.ts — Canonical SSOT Outpatient Dental Pharmacopeia & Fast Sets
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Sweet Spot 200–300 lines).
 * Zero decree numbers in domain identifiers.
 */

export interface DentalOutpatientDrug {
	readonly id: string;
	readonly tradeName: string;
	readonly activeSubstanceRu: string;
	readonly latinName: string;
	readonly category: "antibiotic" | "nsaid" | "antiseptic" | "mucosa" | "antihistamine" | "gastro" | "probiotic";
	readonly categoryLabelRu: string;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly quantityLabel: string;
	readonly dispenseLatin: string;
	readonly signaRussian: string;
	readonly memoInstruction: string;
	readonly isSpecialControl?: boolean;
}

export interface DentalFastPrescriptionSet {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
}

export const CANONICAL_DENTAL_DRUGS: readonly DentalOutpatientDrug[] = [
	{
		id: "amoxiclav_875_125",
		tradeName: "Амоксиклав 1000 мг",
		activeSubstanceRu: "Амоксициллин + Клавулановая кислота",
		latinName: "Rp.: Tab. Amoxicillini et Acidi clavulanici 875/125 mg N. 14",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики",
		formRu: "таблетки диспергируемые",
		dosageRu: "875 мг + 125 мг",
		quantityLabel: "N. 14",
		dispenseLatin: "D.t.d. N 14 in tab.",
		signaRussian: "По 1 таблетке 2 раза в день во время еды, 5–7 дней.",
		memoInstruction: "1 таб 2 раза в день во время еды (5–7 дней)",
	},
	{
		id: "clarithromycin_500",
		tradeName: "Кларитромицин 500 мг",
		activeSubstanceRu: "Кларитромицин",
		latinName: "Rp.: Tab. Clarithromycini 500 mg N. 10",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики (Макролиды)",
		formRu: "таблетки п/о",
		dosageRu: "500 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRussian: "По 1 таблетке 2 раза в день во время еды, 5–7 дней.",
		memoInstruction: "1 таб 2 раза в день во время еды (5–7 дней)",
	},
	{
		id: "azithromycin_500",
		tradeName: "Азитромицин 500 мг",
		activeSubstanceRu: "Азитромицин",
		latinName: "Rp.: Tab. Azithromycini 500 mg N. 3",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики (Макролиды)",
		formRu: "капсулы / таблетки",
		dosageRu: "500 мг",
		quantityLabel: "N. 3",
		dispenseLatin: "D.t.d. N 3 in tab.",
		signaRussian: "По 1 таблетке 1 раз в день за 1 час до еды, курс 3 дня.",
		memoInstruction: "1 таб 1 раз в день за час до еды (3 дня)",
	},
	{
		id: "nimesulide_100",
		tradeName: "Нимесил 100 мг",
		activeSubstanceRu: "Нимесулид",
		latinName: "Rp.: Gran. Nimesulidi 100 mg N. 10",
		category: "nsaid",
		categoryLabelRu: "Обезболивающие и НПВС",
		formRu: "гранулы для суспензии",
		dosageRu: "100 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in sachet",
		signaRussian: "По 1 пакетику растворить в 100 мл воды, принимать 2 раза в день после еды при болях.",
		memoInstruction: "1 пакетик растворить в воде при боли (после еды, до 2 раз в день)",
	},
	{
		id: "ibuprofen_400",
		tradeName: "Ибупрофен 400 мг",
		activeSubstanceRu: "Ибупрофен",
		latinName: "Rp.: Tab. Ibuprofeni 400 mg N. 20",
		category: "nsaid",
		categoryLabelRu: "Обезболивающие и НПВС",
		formRu: "таблетки п/о",
		dosageRu: "400 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRussian: "По 1 таблетке 2–3 раза в день после еды при болях.",
		memoInstruction: "1 таб 2–3 раза в день после еды при боли",
	},
	{
		id: "ketorolac_10",
		tradeName: "Кеторол Экспресс 10 мг",
		activeSubstanceRu: "Кеторолак",
		latinName: "Rp.: Tab. Ketorolaci 10 mg N. 20",
		category: "nsaid",
		categoryLabelRu: "Обезболивающие и НПВС",
		formRu: "таблетки диспергируемые",
		dosageRu: "10 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRussian: "По 1 таблетке под язык при сильной боли (не более 4 таб/сут, не дольше 5 дней).",
		memoInstruction: "1 таб под язык при острой боли (до 4 таб/сут, не более 5 дней)",
	},
	{
		id: "dexketoprofen_25",
		tradeName: "Декскетопрофен (Дексалгин) 25 мг",
		activeSubstanceRu: "Декскетопрофен",
		latinName: "Rp.: Tab. Dexketoprofeni 25 mg N. 10",
		category: "nsaid",
		categoryLabelRu: "Обезболивающие и НПВС",
		formRu: "таблетки п/о",
		dosageRu: "25 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRussian: "По 1 таблетке каждые 8 часов при боли после еды.",
		memoInstruction: "1 таб каждые 8 часов после еды при боли",
	},
	{
		id: "chlorhexidine_005",
		tradeName: "Хлоргексидин 0.05%",
		activeSubstanceRu: "Хлоргексидина биглюконат",
		latinName: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% 100 ml",
		category: "antiseptic",
		categoryLabelRu: "Антисептики",
		formRu: "раствор для местного применения",
		dosageRu: "0.05% 100 мл",
		quantityLabel: "флакон 100 мл",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRussian: "Ротовые ванночки по 1 минуте 3 раза в день после еды (не полоскать активно!).",
		memoInstruction: "Ротовые ванночки 3 раза в день (набрать в рот, подержать 1 мин, не полоскать активно!)",
	},
	{
		id: "miramistin_001",
		tradeName: "Мирамистин 0.01%",
		activeSubstanceRu: "Бензилдиметил-миристоиламино-пропиламмоний",
		latinName: "Rp.: Sol. Miramistini 0.01% 150 ml",
		category: "antiseptic",
		categoryLabelRu: "Антисептики",
		formRu: "раствор с распылителем",
		dosageRu: "0.01% 150 мл",
		quantityLabel: "флакон 150 мл",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRussian: "Орошать полость рта 3–4 раза в день после еды.",
		memoInstruction: "Орошение полости рта 3–4 раза в день после еды",
	},
	{
		id: "metrogyl_denta",
		tradeName: "Метрогил Дента гель",
		activeSubstanceRu: "Метронидазол + Хлоргексидин",
		latinName: "Rp.: Gel dentale «Metrogyl Denta» 20.0",
		category: "mucosa",
		categoryLabelRu: "Слизистая и пародонт",
		formRu: "стоматологический гель",
		dosageRu: "туба 20 г",
		quantityLabel: "туба 20 г",
		dispenseLatin: "D.t.d. N 1 in tuba",
		signaRussian: "Наносить на десны в области воспаления 2 раза в день (не пить и не есть 30 мин).",
		memoInstruction: "Аппликации геля на десны 2 раза в день (после чистки зубов, 30 мин не есть)",
	},
	{
		id: "cholisal_gel",
		tradeName: "Холисал стоматологический гель",
		activeSubstanceRu: "Холина салицилат + Цеталкония хлорид",
		latinName: "Rp.: Gel dentale «Cholisal» 10.0",
		category: "mucosa",
		categoryLabelRu: "Слизистая и пародонт",
		formRu: "стоматологический гель",
		dosageRu: "туба 10 г",
		quantityLabel: "туба 10 г",
		dispenseLatin: "D.t.d. N 1 in tuba",
		signaRussian: "Полоску геля 1 см наносить на пораженные участки слизистой 2–3 раза в день.",
		memoInstruction: "Наносить на болезненные участки слизистой 2–3 раза в день",
	},
	{
		id: "omeprazole_20",
		tradeName: "Омепразол 20 мг",
		activeSubstanceRu: "Омепразол",
		latinName: "Rp.: Caps. Omeprazoli 20 mg N. 30",
		category: "gastro",
		categoryLabelRu: "Гастропротекция",
		formRu: "капсулы кишечнорастворимые",
		dosageRu: "20 мг",
		quantityLabel: "N. 30",
		dispenseLatin: "D.t.d. N 30 in caps.",
		signaRussian: "По 1 капсуле утром за 30 минут до еды на весь период приема НПВС.",
		memoInstruction: "1 капсула утром за 30 мин до еды (защита желудка при приеме обезболивающих)",
	},
	{
		id: "suprastin_25",
		tradeName: "Супрастин 25 мг",
		activeSubstanceRu: "Хлоропирамин",
		latinName: "Rp.: Tab. Suprastini 25 mg N. 20",
		category: "antihistamine",
		categoryLabelRu: "Антигистаминные",
		formRu: "таблетки",
		dosageRu: "25 мг",
		quantityLabel: "N. 20",
		dispenseLatin: "D.t.d. N 20 in tab.",
		signaRussian: "По 1 таблетке на ночь при отеке, 3–5 дней.",
		memoInstruction: "1 таб на ночь при выраженном отеке (3–5 дней)",
	},
	{
		id: "ibuprofen_suspension_100_5ml",
		tradeName: "Ибупрофен суспензия 100 мг/5 мл",
		activeSubstanceRu: "Ибупрофен",
		latinName: "Rp.: Susp. Ibuprofeni 100 mg/5 ml 100 ml",
		category: "nsaid",
		categoryLabelRu: "Детский прием",
		formRu: "суспензия для приема внутрь",
		dosageRu: "100 мг / 5 мл",
		quantityLabel: "флакон 100 мл",
		dispenseLatin: "D.t.d. N 1 in flac.",
		signaRussian: "Детям по 10 мг/кг до 3 раз в день при болях и температуре.",
		memoInstruction: "Суспензия по весу ребенка (10 мг/кг) до 3 раз в день при боли",
	},
];

/**
 * Canonical 4 Clinical Fast Sets per Master Directive
 */
export const CLINICAL_FAST_SETS: readonly DentalFastPrescriptionSet[] = [
	{
		id: "post_extraction_implant",
		label: "После удаления зуба / имплантации (Стандарт)",
		desc: "Амоксиклав 1000 мг 2 р/сут (5–7 дн.) + Нимесил 100 мг при болях + Хлоргексидин 0.05% ванночки",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
	},
	{
		id: "penicillin_allergy",
		label: "При аллергии на пенициллины (Кларитромицин / Азитромицин)",
		desc: "Кларитромицин 500 мг 2 р/сут (или Азитромицин 500 мг 1 р/сут) + Ибупрофен 400 мг",
		drugIds: ["clarithromycin_500", "ibuprofen_400", "chlorhexidine_005"],
	},
	{
		id: "acute_pulpitis_pain",
		label: "Острый пульпит / периодонтит (Купирование боли)",
		desc: "Кеторол Экспресс 10 мг под язык при острой боли или Дексалгин 25 мг",
		drugIds: ["ketorolac_10", "chlorhexidine_005"],
	},
	{
		id: "periodontal_mucosa",
		label: "Пародонтология и слизистая (Метрогил + Мирамистин)",
		desc: "Метрогил Дента гель аппликации 2 р/сут (7 дн.) + Мирамистин 0.01% полоскания",
		drugIds: ["metrogyl_denta", "miramistin_001", "cholisal_gel"],
	},
	{
		id: "pediatric_dental",
		label: "Детский прием (Ибупрофен суспензия)",
		desc: "Ибупрофен суспензия 100 мг/5 мл с расчетом по весу (10 мг/кг)",
		drugIds: ["ibuprofen_suspension_100_5ml"],
	},
];

// Backwards compatibility aliases
export const DENTAL_FAST_PRESCRIPTION_SETS = CLINICAL_FAST_SETS;

export function findDrugById(id: string): DentalOutpatientDrug | undefined {
	const direct = CANONICAL_DENTAL_DRUGS.find((d) => d.id === id);
	if (direct) return direct;
	// Handle common aliases
	if (id === "nimesil_100_sachet") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "nimesulide_100");
	if (id === "chlorhexidine_005_sol") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "chlorhexidine_005");
	if (id === "ibuprofen_400_tab") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "ibuprofen_400");
	if (id === "suprastin_25_tab") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "suprastin_25");
	return undefined;
}

export function formatMessengerPatientMemo(params: {
	patientName: string;
	doctorName: string;
	clinicPhone?: string;
	drugs: readonly DentalOutpatientDrug[];
}): string {
	const firstName = params.patientName.split(" ")[1] || params.patientName;
	const lines: string[] = [
		`Здравствуйте, ${firstName}! Напоминаем рекомендации доктора после сегодняшнего приёма:`,
	];
	params.drugs.forEach((d, idx) => {
		lines.push(`${idx + 1}. ${d.tradeName} — ${d.memoInstruction}.`);
	});
	lines.push("Не греть щёку, не посещать баню/сауну 3 дня.");
	const phone = params.clinicPhone || "+7 (495) 000-00-00";
	lines.push(`При усилении отёка сразу звоните нам: ${phone}`);
	return lines.join("\n");
}

export function formatSoapPrescriptionText(drugs: readonly DentalOutpatientDrug[]): string {
	if (drugs.length === 0) return "";
	const lines = ["Назначения (Rx):"];
	for (const d of drugs) {
		lines.push(`${d.latinName}\n${d.dispenseLatin}\n${d.signaRussian}`);
	}
	return lines.join("\n\n");
}
