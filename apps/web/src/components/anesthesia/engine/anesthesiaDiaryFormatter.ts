import {
	type AnestheticDrugInfo,
	INJECTION_TECHNIQUES,
	type InjectionTechniqueId,
	type NeedleGaugeType,
} from "../anesthesiaCatalog.js";

export interface AnesthesiaDiaryParams {
	drug: AnestheticDrugInfo;
	carpulesCount: number;
	injectedVolumeMl: number;
	injectedActiveMg?: number | undefined;
	injectedEpinephrineMg?: number | undefined;
	techniqueId: InjectionTechniqueId;
	needleType?: NeedleGaugeType | undefined;
	targetToothNumberFdi?: number | string | undefined;
	aspirationNegativeConfirmed?: boolean | undefined;
	carpuleBatch?: { seriesNumber: string; batchNumber: string; expirationDate: string } | undefined;
	nurseFullName?: string | undefined;
	bpSystolic?: number | undefined;
	bpDiastolic?: number | undefined;
	heartRateBpm?: number | undefined;
	spo2Percent?: number | undefined;
	overrideReason?: string | undefined;
	isOverdose?: boolean | undefined;
	isEpinephrineOverdose?: boolean | undefined;
}

function formatClinicalCarpulesText(count: number): string {
	if (count === 1) return "1 карпула";
	if (count === 0.5) return "0.5 карпулы";
	if (count === 1.5) return "1.5 карпулы";
	if (count === 2) return "2 карпулы";
	if (count === 3) return "3 карпулы";
	if (count === 4) return "4 карпулы";
	return `${count} карпул`;
}

function resolveLatinDrugFormula(drug: AnestheticDrugInfo): string {
	switch (drug.id) {
		case "articaine_1_200k":
			return "Sol. Articaini 4% cum Epinephrini 1:200 000";
		case "articaine_1_100k":
			return "Sol. Articaini 4% cum Epinephrini 1:100 000";
		case "mepivacaine_plain":
			return "Sol. Mepivacaini 3% (sine Epinephrini)";
		case "septanest_1_100k":
			return "Sol. Septanest 4% cum Epinephrini 1:100 000";
		case "lidocaine_1_100k":
			return "Sol. Lidocaini 2% cum Epinephrini 1:100 000";
		case "bupivacaine_05":
			return "Sol. Bupivacaini 0.5%";
		default:
			return `Sol. ${drug.activeSubstanceRu}`;
	}
}

export function generateAnesthesiaDiaryEntry(params: AnesthesiaDiaryParams): string {
	const tech = INJECTION_TECHNIQUES[params.techniqueId] || INJECTION_TECHNIQUES.infiltration;
	const techNameRu = tech.nameRu.includes("Инфильтрационная")
		? "инфильтрационная"
		: tech.nameRu.includes("Проводниковая") || tech.nameRu.includes("Торусальная")
			? "проводниковая"
			: tech.nameRu.includes("Интралигаментарная")
				? "интралигаментарная"
				: tech.nameRu.toLowerCase().split(" ")[0] || "местная";

	const toothPart = params.targetToothNumberFdi ? ` в области зуба ${params.targetToothNumberFdi}` : "";
	const drugFormula = resolveLatinDrugFormula(params.drug);
	const carpulesText = formatClinicalCarpulesText(params.carpulesCount);
	const overrideNote = params.overrideReason ? ` [Клиническое решение врача: ${params.overrideReason}]` : "";

	return `Проведена ${techNameRu} анестезия${toothPart} ${drugFormula} — ${params.injectedVolumeMl} мл (${carpulesText}). Анестезия наступила через 3 минуты, без осложнений. Осложнений нет.${overrideNote}`;
}

export interface AnesthesiaPatientMemoParams {
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly drugTradeName: string;
	readonly carpulesCount: number;
	readonly targetArea: string | number;
	readonly expectedDurationHours?: string | undefined;
	readonly date?: string | undefined;
}

export function formatAnesthesiaPatientMemo(params: AnesthesiaPatientMemoParams): string {
	const clinicName = params.clinicName.trim() || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone ? params.clinicPhone.trim() : "";
	const patientName = params.patientName.trim() || "Пациент";
	const doctorName = params.doctorName.trim() || "Лечащий врач-стоматолог";
	const date = params.date || new Date().toLocaleDateString("ru-RU");
	const duration = params.expectedDurationHours || "2–3 часа";

	return [
		`Памятка пациенту после проведения местной анестезии (клиника «${clinicName}»):`,
		`Пациент: ${patientName}`,
		`Лечащий врач: ${doctorName}`,
		`Дата процедуры: ${date}`,
		`Применённый препарат: ${params.drugTradeName} (введено ${params.carpulesCount} карп.)`,
		`Область анестезии: ${params.targetArea}`,
		`Ожидаемая длительность онемения: ${duration}`,
		`Правила безопасности после анестезии:`,
		`1. Не принимайте горячую пищу и напитки до полного восстановления чувствительности (риск незаметного термического ожога слизистой).`,
		`2. Не прикусывайте онемевшую губу, щёку или язык.`,
		`3. Не массируйте и не согревайте место инъекции.`,
		`4. При сохранении выраженного онемения более 6 часов или аллергических реакциях немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.`,
	].join("\n");
}
