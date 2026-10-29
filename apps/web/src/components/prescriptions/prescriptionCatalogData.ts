/**
 * prescriptionCatalogData.ts — Canonical SSOT Outpatient Dental Pharmacopeia & Fast Sets
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Sweet Spot 200–280 lines).
 * Zero decree numbers in domain identifiers. 12 Canonical Dental Medications & 5 Clinical Fast Sets.
 */

export interface DentalOutpatientDrug {
	readonly id: string;
	readonly tradeName: string;
	readonly activeSubstanceRu: string;
	readonly latinName: string;
	readonly category: "antibiotic" | "nsaid" | "antiseptic" | "mucosa" | "antihistamine" | "gastro" | string;
	readonly categoryLabelRu: string;
	readonly formRu: string;
	readonly dosageRu: string;
	readonly quantityLabel: string;
	readonly dispenseLatin: string;
	readonly signaRussian: string;
	readonly memoInstruction: string;
	readonly isSpecialControl?: boolean;
	readonly form?: string;
	readonly dosage?: string;
	readonly quantity?: string;
}

export interface DentalFastPrescriptionSet {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
	readonly drugIds: readonly string[];
}

/** 12 Canonical Dental Outpatient Medications (Pharmacopeia SSOT) */
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
		signaRussian: "По 1 таблетке 2 раза в день во время еды, курс 5–7 дней.",
		memoInstruction: "1 таб 2 раза в день во время еды (5–7 дней)",
		form: "таблетки диспергируемые",
		dosage: "875 мг + 125 мг",
		quantity: "N. 14",
	},
	{
		id: "cifran_st_500_600",
		tradeName: "Цифран СТ 500/600 мг",
		activeSubstanceRu: "Ципрофлоксацин + Тинидазол",
		latinName: "Rp.: Tab. «Cifran ST» (Ciprofloxacini 500 mg + Tinidazoli 600 mg) N. 10",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики",
		formRu: "таблетки п/о",
		dosageRu: "500 мг + 600 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRussian: "По 1 таблетке 2 раза в день после еды, запивая стаканом воды, 5 дней.",
		memoInstruction: "1 таб 2 раза в день после еды (5 дней, не разжевывая)",
		form: "таблетки п/о",
		dosage: "500 мг + 600 мг",
		quantity: "N. 10",
	},
	{
		id: "clarithromycin_500",
		tradeName: "Кларитромицин 500 мг",
		activeSubstanceRu: "Кларитромицин",
		latinName: "Rp.: Tab. Clarithromycini 500 mg N. 10",
		category: "antibiotic",
		categoryLabelRu: "Антибиотики (Резерв)",
		formRu: "таблетки п/о",
		dosageRu: "500 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRussian: "По 1 таблетке 2 раза в день во время еды, 5–7 дней (при аллергии на пенициллин).",
		memoInstruction: "1 таб 2 раза в день во время еды (5–7 дней)",
		form: "таблетки п/о",
		dosage: "500 мг",
		quantity: "N. 10",
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
		memoInstruction: "1 пакетик в 100 мл воды после еды при боли (до 2 раз в день)",
		form: "гранулы для суспензии",
		dosage: "100 мг",
		quantity: "N. 10",
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
		form: "таблетки п/о",
		dosage: "400 мг",
		quantity: "N. 20",
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
		signaRussian: "По 1 таблетке под язык при острой боли (не более 4 таб/сут, не дольше 5 дней).",
		memoInstruction: "1 таб под язык при острой боли (до 4 таб/сут, максимум 5 дней)",
		form: "таблетки диспергируемые",
		dosage: "10 мг",
		quantity: "N. 20",
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
		memoInstruction: "Ротовые ванночки 3 раза в день (подержать 1 мин, не полоскать активно!)",
		form: "раствор",
		dosage: "0.05% 100 мл",
		quantity: "флакон 100 мл",
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
		form: "раствор",
		dosage: "0.01% 150 мл",
		quantity: "флакон 150 мл",
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
		signaRussian: "Наносить на десны в области воспаления 2 раза в день (30 мин не есть и не пить).",
		memoInstruction: "Аппликации на десны 2 раза в день (после чистки зубов, 30 мин не есть)",
		form: "гель",
		dosage: "туба 20 г",
		quantity: "туба 20 г",
	},
	{
		id: "cholisal_gel",
		tradeName: "Холисал гель",
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
		form: "гель",
		dosage: "туба 10 г",
		quantity: "туба 10 г",
	},
	{
		id: "loratadine_10",
		tradeName: "Лоратадин 10 мг",
		activeSubstanceRu: "Лоратадин",
		latinName: "Rp.: Tab. Loratadini 10 mg N. 10",
		category: "antihistamine",
		categoryLabelRu: "Антигистаминные (Противоотечные)",
		formRu: "таблетки",
		dosageRu: "10 мг",
		quantityLabel: "N. 10",
		dispenseLatin: "D.t.d. N 10 in tab.",
		signaRussian: "По 1 таблетке 1 раз в день на ночь для снижения послеоперационного отёка (3–5 дней).",
		memoInstruction: "1 таб на ночь для уменьшения отёка (3–5 дней)",
		form: "таблетки",
		dosage: "10 мг",
		quantity: "N. 10",
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
		form: "суспензия",
		dosage: "100 мг / 5 мл",
		quantity: "флакон 100 мл",
	},
];

/** 5 Canonical Outpatient Dental Clinical Regimens */
export const CLINICAL_FAST_SETS: readonly DentalFastPrescriptionSet[] = [
	{
		id: "post_tooth_extraction",
		label: "После сложного удаления зуба",
		desc: "Нимесил 100 мг при болях + Хлоргексидин 0.05% ротовые ванночки + Лоратадин 10 мг от отёка",
		drugIds: ["nimesulide_100", "chlorhexidine_005", "loratadine_10"],
	},
	{
		id: "dental_implantation",
		label: "Дентальная имплантация и костная пластика",
		desc: "Амоксиклав 1000 мг 2 р/сут (7 дн.) + Нимесил 100 мг + Хлоргексидин 0.05% + Лоратадин 10 мг",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005", "loratadine_10"],
	},
	{
		id: "acute_periodontitis",
		label: "Острый периодонтит / абсцесс",
		desc: "Цифран СТ 500/600 мг 2 р/сут (5 дн.) + Нимесил 100 мг при болях + Хлоргексидин 0.05%",
		drugIds: ["cifran_st_500_600", "nimesulide_100", "chlorhexidine_005"],
	},
	{
		id: "alveolitis_dry_socket",
		label: "Альвеолит (воспаление лунки)",
		desc: "Амоксиклав 1000 мг + Нимесил 100 мг при болях + Холисал гель аппликации",
		drugIds: ["amoxiclav_875_125", "nimesulide_100", "cholisal_gel"],
	},
	{
		id: "periodontitis_mucosa",
		label: "Пародонтит и стоматит (слизистая)",
		desc: "Метрогил Дента гель 2 р/сут + Мирамистин 0.01% орошения + Холисал гель при болях",
		drugIds: ["metrogyl_denta", "miramistin_001", "cholisal_gel"],
	},
];

export const DENTAL_FAST_PRESCRIPTION_SETS = CLINICAL_FAST_SETS;

export function findDrugById(id: string): DentalOutpatientDrug | undefined {
	const direct = CANONICAL_DENTAL_DRUGS.find((d) => d.id === id);
	if (direct) return direct;
	if (id === "nimesil_100_sachet") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "nimesulide_100");
	if (id === "chlorhexidine_005_sol") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "chlorhexidine_005");
	if (id === "ibuprofen_400_tab") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "ibuprofen_400");
	if (id === "suprastin_25" || id === "suprastin_25_tab") return CANONICAL_DENTAL_DRUGS.find((d) => d.id === "loratadine_10");
	if (id === "omeprazole_20") {
		return {
			id: "omeprazole_20",
			tradeName: "Омепразол 20 мг",
			activeSubstanceRu: "Омепразол",
			latinName: "Rp.: Caps. Omeprazoli 20 mg N. 30",
			category: "gastro",
			categoryLabelRu: "Гастропротекция",
			formRu: "капсулы",
			dosageRu: "20 мг",
			quantityLabel: "N. 30",
			dispenseLatin: "D.t.d. N 30 in caps.",
			signaRussian: "По 1 капсуле утром за 30 мин до еды при приеме НПВС.",
			memoInstruction: "1 капсула утром за 30 мин до еды для защиты желудка",
			form: "капсулы",
			dosage: "20 мг",
			quantity: "N. 30",
		};
	}
	return undefined;
}

export function formatMessengerPatientMemo(params: {
	patientName: string;
	doctorName: string;
	clinicPhone?: string;
	drugs: readonly DentalOutpatientDrug[];
}): string {
	const firstName = params.patientName.split(" ")[1] || params.patientName;
	const lines = [`Здравствуйте, ${firstName}! Напоминаем рекомендации доктора после сегодняшнего приёма:`];
	params.drugs.forEach((d, idx) => lines.push(`${idx + 1}. ${d.tradeName} — ${d.memoInstruction}.`));
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
