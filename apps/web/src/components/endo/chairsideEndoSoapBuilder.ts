/**
 * DENTE Dental CRM — Chairside Endodontic SOAP Protocol Builder
 * apps/web/src/components/endo/chairsideEndoSoapBuilder.ts
 *
 * Генерация клинического протокола эндодонтии для SOAP-дневника приёма (Мандаты 8e, 8x, 8ap).
 * Без советского канцелярита, без сырых регуляторных шифров, чистый медицинский язык врача.
 */

import {
	getAnatomicalWorkingLength,
	getChairsideDefaultCanals,
	type QuickCanalState,
} from "./endodonticsCatalogData";

export interface GenerateSoapEndoProtocolParams {
	readonly activeTooth?: number | undefined;
	readonly toothNumber?: number | undefined;
	readonly toothAnatomicalName?: string | undefined;
	readonly currentCanals?: readonly QuickCanalState[] | undefined;
	readonly toothState?: string | undefined;
}

/** Генерация чистого SOAP-протокола эндодонтии без сырого канцелярита (Мандат 8x) */
export function generateSoapEndoProtocol({
	activeTooth,
	toothNumber,
	toothAnatomicalName = "Моляр",
	currentCanals = [],
	toothState,
}: GenerateSoapEndoProtocolParams): string {
	const toothNum = activeTooth ?? toothNumber ?? 46;
	const canals = Array.isArray(currentCanals) && currentCanals.length > 0
		? currentCanals
		: getChairsideDefaultCanals(toothNum);

	const isTemp = canals.every((c) => c.obturationType === "temp_caoh2");
	const isBio = canals.some((c) => c.obturationType === "bioceramic");
	const isPulpitis = Boolean(toothState && /пульпит|pulpitis|k04\.0/i.test(toothState));
	const isPeriodontitis = !isPulpitis && Boolean(
		isBio || (toothState && /периодонтит|periodontitis|k04\.5|k04\.4|k04\.6|гранулем|кист/i.test(toothState)),
	);

	const isDeciduous = toothNum >= 51 && toothNum <= 85;
	const canalsReport = canals.map((c) => {
		if (c.isObliterated) {
			return `• Канал ${c.name}: Облитерирован / склерозирован (устье склерозировано, 0 мм)`;
		}
		const obt = isDeciduous
			? `обтурация резорбируемой пастой (гидроксид кальция / цинкоксидэвгенол)`
			: c.obturationType === "temp_caoh2"
				? `временная паста гидроксида кальция ${c.sealer || "Ca(OH)2"}`
				: c.obturationType === "bioceramic"
					? `постоянная обтурация гуттаперчей + биокерамический силер (${c.sealer || "биокерамика"})`
					: `обтурация гуттаперчей с ${c.sealer || "эпоксидным полимерным силером"} методом латеральной компакции`;
		const len = c.workingLengthMm > 0
			? c.workingLengthMm.toFixed(1)
			: getAnatomicalWorkingLength(toothNum, c.name).toFixed(1);
		return `• Канал ${c.name}: пройден, WL = ${len} мм (Apex: ${c.apexLocatorReading || "0.0 Apex"}), MAF = ${c.masterApicalFile}/${c.taper}, ${obt}`;
	}).join("\n");

	const canalNamesRu = canals.map((c) => c.name).join(", ");
	const diagnosisRu = toothState || (
		isPeriodontitis
			? "Хронический апикальный периодонтит (K04.5)"
			: "Острый очаговый пульпит (K04.0)"
	);

	if (isTemp || isDeciduous) {
		const stageTitle = isDeciduous
			? "ОБТУРАЦИЯ РЕЗОРБИРУЕМОЙ ПАСТОЙ (МОЛОЧНЫЙ ПРИКУС)"
			: (isPeriodontitis ? "ПЕРИОДОНТИТ 1-Й ВИЗИТ" : "ВРЕМЕННАЯ ОБТУРАЦИЯ Ca(OH)2");
		const pasteDescription = isDeciduous
			? "резорбируемой пастой для молочных зубов (защита зачатка постоянного зуба)"
			: "лечебной пастой гидроксида кальция Ca(OH)2";
		return `[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${toothNum} (${toothAnatomicalName}) — ${stageTitle}]\nS: Жалобы на боли при накусывании и чувство распирания в области зуба #${toothNum}.\nO: Проведена анестезия, изоляция операционного поля коффердамом. Раскрытие полости зуба #${toothNum}, эвакуация распада пульпы.\nМехобработка корневых каналов (${canalNamesRu}) машинной системой NiTi:\n${canalsReport}\nИрригация: медикаментозная обработка раствором 3% NaOCl с УЗ-активацией и 17% EDTA, высушивание бумажными штифтами.\nA: ${diagnosisRu} зуба #${toothNum}.\nP: Проведена обтурация корневых каналов ${pasteDescription}. Наложена герметичная повязка.`;
	}

	if (isPeriodontitis) {
		const sealerName = canals[0]?.sealer || (isBio ? "биокерамический силер" : "эпоксидный полимерный силер");
		const obturationMethodRu = isBio
			? `гуттаперча + биокерамический силер (${sealerName})`
			: `гуттаперча с эпоксидным полимерным силером ${sealerName} методом латеральной компакции`;
		return `[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${toothNum} (${toothAnatomicalName}) — ПЕРИОДОНТИТ 2-Й ВИЗИТ (ПОСТОЯННАЯ ОБТУРАЦИЯ)]\nS: Жалоб нет, герметичная повязка сохранена, перкуссия безболезненна.\nO: Изоляция операционного поля коффердамом. Удаление временной повязки и эвакуация лечебной пасты Ca(OH)2 из каналов.\nИнструментальная калибровка каналов (${canalNamesRu}):\n${canalsReport}\nИрригация: 3% раствор NaOCl с УЗ-активацией, 17% EDTA, окончательное высушивание бумажными штифтами.\nA: ${diagnosisRu} зуба #${toothNum}.\nP: Постоянная обтурация корневых каналов: ${obturationMethodRu} до физиологического апекса. Рентген-контроль (визиография): каналы гомогенно обтурированы до апекса. Поставлена герметичная реставрация.`;
	}

	return `[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${toothNum} (${toothAnatomicalName}) — ПУЛЬПИТ В 1 ВИЗИТ]\nS: Жалобы на острые температурные и самопроизвольные боли в зубе #${toothNum}.\nO: Проведена анестезия, изоляция операционного поля коффердамом. Раскрытие полости зуба #${toothNum}, экстирпация пульпы.\nМехобработка машинной системой NiTi:\n${canalsReport}\nМедикаментозная обработка: 3% раствор NaOCl с УЗ-активацией и 17% EDTA. Высушивание бумажными штифтами.\nA: ${diagnosisRu} зуба #${toothNum}.\nP: Обтурация гуттаперчей с эпоксидным полимерным силером методом латеральной компакции до физиологического апекса. Рентген-контроль (визиография): каналы обтурированы до верхушки, гомогенно. Поставлена герметичная повязка/реставрация.`;
}
