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
	injectedActiveMg: number;
	injectedEpinephrineMg: number;
	techniqueId: InjectionTechniqueId;
	needleType: NeedleGaugeType;
	targetToothNumberFdi?: number | string | undefined;
	aspirationNegativeConfirmed: boolean;
	carpuleBatch?:
		| {
				seriesNumber: string;
				batchNumber: string;
				expirationDate: string;
		  }
		| undefined;
	nurseFullName?: string | undefined;
	bpSystolic?: number | undefined;
	bpDiastolic?: number | undefined;
	heartRateBpm?: number | undefined;
	spo2Percent?: number | undefined;
	overrideReason?: string | undefined;
	isOverdose?: boolean | undefined;
	isEpinephrineOverdose?: boolean | undefined;
}

export function generateAnesthesiaDiaryEntry(
	params: AnesthesiaDiaryParams,
): string {
	const tech =
		INJECTION_TECHNIQUES[params.techniqueId] ||
		INJECTION_TECHNIQUES.infiltration;
	const needleNameRu = params.techniqueId?.includes("mandibular")
		? "Игла 27G длинная (0.4 x 35 мм)"
		: "Игла карпульная 30G (0.3 x 21 мм)";

	const toothPart = params.targetToothNumberFdi
		? ` в области зуба ${params.targetToothNumberFdi}`
		: "";
	const aspText = params.aspirationNegativeConfirmed
		? "Аспирационная проба отрицательна (кровь в карпуле отсутствует)."
		: "Аспирационная проба: без особенностей.";

	const epiText = !params.drug.isAdrenalineFree
		? `, вазоконстриктор ${params.drug.vasoconstrictorNameRu} (${params.injectedEpinephrineMg.toFixed(3)} мг)`
		: ", без вазоконстриктора";

	const batchText = params.carpuleBatch?.seriesNumber
		? ` [Серия: ${params.carpuleBatch.seriesNumber}, Партия: ${params.carpuleBatch.batchNumber}, Годен до: ${params.carpuleBatch.expirationDate}]`
		: "";
	const nurseText = params.nurseFullName
		? ` Медсестра/ассистент: ${params.nurseFullName}.`
		: "";
	const vitalsText =
		typeof params.bpSystolic === "number" &&
		typeof params.heartRateBpm === "number"
			? ` Исходные показатели гемодинамики: АД ${params.bpSystolic}/${params.bpDiastolic ?? 80} мм рт. ст., ЧСС ${params.heartRateBpm} уд/мин${typeof params.spo2Percent === "number" ? `, SpO2 ${params.spo2Percent}%` : ""}.`
			: "";

	let autonomyLegalNote = "";
	if (params.overrideReason) {
		autonomyLegalNote = ` [Клиническое решение врача: ${params.overrideReason}].`;
	} else if (params.isOverdose || params.isEpinephrineOverdose) {
		autonomyLegalNote =
			" [Введено по неотложному клиническому решению врача, гемодинамика под контролем].";
	}

	return `Проведена местная ${tech.nameRu.toLowerCase()} анестезия${toothPart}. Препарат: ${params.drug.tradeNamesRu[0]} (${params.drug.activeSubstanceRu})${batchText}, объем ${params.injectedVolumeMl} мл (${params.carpulesCount} карп., ${params.injectedActiveMg} мг действующего вещества${epiText}).${vitalsText} Игла: ${needleNameRu}. ${aspText} Анестезия наступила через ${params.drug.onsetMinutes} мин, глубина достаточная, соматических реакций нет.${nurseText}${autonomyLegalNote}`;
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

export function formatAnesthesiaPatientMemo(
	params: AnesthesiaPatientMemoParams,
): string {
	const clinicName =
		params.clinicName.trim() || "Стоматологическая клиника DENTE";
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
