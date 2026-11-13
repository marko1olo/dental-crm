/**
 * @dental/web/components/orthodontics/orthodonticPatientMemo.ts
 *
 * DENTE Dental CRM — Форматирование клинической памятки ортодонтического пациента (Мандаты 8b, 8e, 8x).
 * Автоматическая выгрузка рекомендаций по ношению брекетов, элайнеров и тяг.
 */

export interface OrthodonticPatientMemoParams {
	clinicName: string;
	clinicPhone?: string | undefined;
	doctorName: string;
	patientName: string;
	visitDate?: string | undefined;
	bracketSystem: string;
	archwireMaterial?: string | undefined;
	archwireSection?: string | undefined;
	targetArch?: string | undefined;
	elasticScheme?: string | undefined;
	elasticSize?: string | undefined;
	elasticWear?: string | undefined;
	isAligners?: boolean | undefined;
	isPlate?: boolean | undefined;
	currentAligner?: number | undefined;
	totalAligners?: number | undefined;
	currentAlignerUpper?: number | undefined;
	currentAlignerLower?: number | undefined;
	totalAlignersUpper?: number | undefined;
	totalAlignersLower?: number | undefined;
	notes?: string | undefined;
}

export function formatOrthodonticPatientMemo(params: OrthodonticPatientMemoParams): string {
	const clinicName = params.clinicName || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone || "";
	const doctorName = params.doctorName || "Лечащий врач-ортодонт";
	const patientName = params.patientName || "Пациент";
	const visitDate = params.visitDate || new Date().toLocaleDateString("ru-RU");

	const isPlate = Boolean(
		params.isPlate ||
		params.bracketSystem === "plate" ||
		params.bracketSystem?.toLowerCase().includes("пластинк") ||
		params.bracketSystem?.toLowerCase().includes("марко роса") ||
		params.bracketSystem?.toLowerCase().includes("бертони"),
	);
	const isAligners = !isPlate && Boolean(params.isAligners || params.bracketSystem === "aligners");
	const systemName = isPlate
		? params.bracketSystem || "Ортодонтическая пластинка с расширяющим винтом"
		: isAligners
			? "Элайнеры"
			: params.bracketSystem || "Металлическая самолигирующая брекет-система";

	let apparatusDetails = "";
	if (isPlate) {
		apparatusDetails = `Режим ношения: пластиночный аппарат носится 20–22 часа в сутки, снимается только во время еды и гигиены.\nАктивация расширяющего винта: строго по графику ключом (1/4 оборота = 0.25 мм).\n`;
	} else if (isAligners) {
		if (params.currentAlignerUpper && params.currentAlignerLower) {
			const curU = params.currentAlignerUpper;
			const totalU = params.totalAlignersUpper || params.totalAligners || "—";
			const curL = params.currentAlignerLower;
			const totalL = params.totalAlignersLower || params.totalAligners || "—";
			apparatusDetails = `Текущий этап: ВЧ Каппа №${curU} из ${totalU}, НЧ Каппа №${curL} из ${totalL}\nРежим: ношение 22 часа/сутки, смена через 10-14 дней.\n`;
		} else {
			const cur = params.currentAligner || 1;
			const total = params.totalAligners || "—";
			apparatusDetails = `Текущий этап: Каппа №${cur} из ${total}\nРежим: ношение 22 часа/сутки, смена через 10-14 дней.\n`;
		}
	} else {
		const arch =
			params.targetArch === "upper"
				? "верхняя челюсть"
				: params.targetArch === "lower"
					? "нижняя челюсть"
					: "обе челюсти";
		const mat = params.archwireMaterial || "CuNiTi";
		const sec = params.archwireSection || ".016";
		apparatusDetails = `Установленная дуга: ${mat} ${sec} (${arch})\n`;
	}

	let elasticsBlock = "";
	if (params.elasticScheme && params.elasticScheme !== "none") {
		const schemeLabel = params.elasticScheme;
		const sizeLabel = params.elasticSize || '3/16" Medium';
		const wearMode = params.elasticWear || "22 часа/сутки";
		elasticsBlock = `Схема межчелюстных эластиков (тяг):\n- Направление: ${schemeLabel}\n- Размер/сила: ${sizeLabel}\n- Режим ношения: ${wearMode} (смена на свежие 2 раза в день)\n`;
	}

	const memoRules = isPlate
		? `1. Активация расширяющего винта пластинки выполняется ключом строго по назначению врача (1/4 оборота, 0.25 мм).
2. Снимать аппарат только на время еды и чистки зубов. Хранить строго в специальном контейнере с вентиляцией.
3. Промывать пластинку прохладной водой с мылом и мягкой зубной щеткой. Запрещено мыть в кипятке (деформация пластмассы).
4. При затруднении фиксации или поломке кламмера немедленно обратиться к лечащему врачу${clinicPhone ? `: ${clinicPhone}` : ""}.`
		: `1. Первые 2-3 дня возможна умеренная чувствительность зубов при накусывании (физиологическая норма перемещения зубов).
2. Эластики снимаются только во время еды и чистки зубов. При обрыве эластика надеть новый из упаковки.
3. При натирании щеки или губы нанесите защитный ортодонтический воск на выступающий элемент.
4. При отклейке брекета, утере кнопки или дискомфорте от дуги немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.`;

	return `Ортодонтические рекомендации после приёма (клиника «${clinicName}»):
Пациент: ${patientName}
Лечащий врач: ${doctorName}
Дата приёма: ${visitDate}
Аппаратура: ${systemName}
${apparatusDetails}${elasticsBlock}Памятка пациенту:
${memoRules}
Следующий контрольный визит: через 4–6 недель.`;
}
