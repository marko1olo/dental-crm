import type { QuickCanalState } from "./types";

export function generateSoapEndoProtocol({
	activeTooth,
	toothAnatomicalName,
	currentCanals,
	toothState,
}: {
	activeTooth: number;
	toothAnatomicalName: string;
	currentCanals: QuickCanalState[];
	toothState?: string | undefined;
}): string {
	const isTemp = currentCanals.every((c) => c.obturationType === "temp_caoh2");
	const isBio = currentCanals.some((c) => c.obturationType === "bioceramic");
	const canalsReport = currentCanals
		.map((c) => {
			if (c.isObliterated) {
				return `• Канал ${c.name}: ОБЛИТЕРИРОВАН / склерозирован (устье склерозировано, 0 мм)`;
			}
			const obt =
				c.obturationType === "temp_caoh2"
					? `временная паста гидроксида кальция ${c.sealer || "Ca(OH)2 (Каласепт/Метапекс)"}`
					: c.obturationType === "bioceramic"
						? `постоянная обтурация гуттаперчей + биокерамика (${c.sealer || "BioRoot"})`
						: `обтурация гуттаперчей с AH Plus методом латеральной компакции`;
			const len = c.workingLengthMm > 0 ? c.workingLengthMm.toFixed(1) : "21.0";
			return `• Канал ${c.name}: пройден, WL = ${len} мм (Apex 0.0), MAF = ${c.masterApicalFile}/${c.taper}, ${obt}`;
		})
		.join("\n");

	const canalNamesRu = currentCanals.map((c) => c.name).join(", ");
	const diagnosisRu = toothState || (isTemp ? "Хронический периодонтит" : isBio ? "Хронический периодонтит" : "Острый пульпит");

	if (isTemp) {
		return [
			`[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName}) — ПЕРИОДОНТИТ 1-Й ВИЗИТ]`,
			`S: Жалобы на боли при накусывании и чувство распирания в области зуба #${activeTooth}.`,
			`O: Проведена анестезия, изоляция операционного поля коффердамом. Раскрытие полости зуба #${activeTooth}, эвакуация распада пульпы.`,
			`Мехобработка корневых каналов (${canalNamesRu}) машинной системой NiTi:`,
			canalsReport,
			`Ирригация: медикаментозная обработка раствором 3% NaOCl с УЗ-активацией и 17% EDTA, высушивание бумажными штифтами.`,
			`A: ${diagnosisRu} зуба #${activeTooth}.`,
			`P: Проведена временная обтурация корневых каналов лечебной пастой гидроксида кальция Ca(OH)2 (Каласепт/Метапекс). Наложена герметичная повязка. Назначен 2-й визит через 10–14 дней.`,
		].join("\n");
	}

	if (isBio) {
		return [
			`[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName}) — ПЕРИОДОНТИТ 2-Й ВИЗИТ]`,
			`S: Жалоб нет, герметичная повязка сохранена, перкуссия безболезненна.`,
			`O: Изоляция операционного поля коффердамом. Удаление временной повязки и лечебной пасты Ca(OH)2 из каналов.`,
			`Инструментальная калибровка каналов (${canalNamesRu}):`,
			canalsReport,
			`Ирригация: 3% раствор NaOCl с УЗ-активацией, окончательное высушивание бумажными штифтами.`,
			`A: ${diagnosisRu} зуба #${activeTooth}.`,
			`P: Постоянная обтурация корневых каналов: гуттаперча + биокерамика (${currentCanals[0]?.sealer || "BioRoot"}) до физиологического апекса. Рентген-контроль (визиография): каналы гомогенно обтурированы до апекса. Поставлена герметичная реставрация.`,
		].join("\n");
	}

	return [
		`[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName}) — ПУЛЬПИТ В 1 ВИЗИТ]`,
		`S: Жалобы на острые температурные и самопроизвольные боли в зубе #${activeTooth}.`,
		`O: Проведена анестезия, изоляция операционного поля коффердамом. Раскрытие полости зуба #${activeTooth}, экстирпация пульпы.`,
		`Мехобработка машинной системой NiTi (ProTaper/WaveOne до F2):`,
		canalsReport,
		`Медикаментозная обработка: 3% раствор NaOCl с УЗ-активацией и 17% EDTA. Высушивание бумажными штифтами.`,
		`A: ${diagnosisRu} зуба #${activeTooth}.`,
		`P: Обтурация гуттаперчей с AH Plus методом латеральной компакции до физиологического апекса. Рентген-контроль (визиография): каналы обтурированы до верхушки, гомогенно. Поставлена герметичная повязка/реставрация.`,
	].join("\n");
}
