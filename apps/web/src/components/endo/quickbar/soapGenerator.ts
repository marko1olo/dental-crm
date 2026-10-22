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
	const isRetreatment = currentCanals.some((c) => c.isRetreatment);

	const canalsReport = currentCanals
		.map((c) => {
			if (c.isObliterated) {
				return `• Канал ${c.name}: ОБЛИТЕРИРОВАН / склерозирован (устье склерозировано, 0 мм)`;
			}
			const obt =
				c.obturationType === "temp_caoh2"
					? `временная паста ${c.sealer || "Ca(OH)2 (Каласепт)"}`
					: c.obturationType === "bioceramic"
						? `гуттаперча + биокерамический силер (${c.sealer || "BioRoot"})`
						: `гуттаперча + силер (${c.sealer || "AH Plus"}) методом латеральной компакции`;
			const len = c.workingLengthMm > 0 ? c.workingLengthMm.toFixed(1) : "21.0";
			const retreatPrefix = c.isRetreatment ? "распломбирован машинным файлом Retreatment, " : "";
			return `• Канал ${c.name}: пройден, ${retreatPrefix}WL = ${len} мм (Apex 0.0), MAF = ${c.masterApicalFile}/${c.taper}, обтурация: ${obt}`;
		})
		.join("\n");

	const canalNamesRu = currentCanals.map((c) => c.name).join(", ");
	const diagnosisRu = toothState || (isRetreatment ? "Хронический апикальный периодонтит (ранее леченый зуб)" : isTemp ? "Периодонтит / Пульпит" : isBio ? "Периодонтит" : "Пульпит");

	if (isRetreatment) {
		return [
			`[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName}) — РАСПЛОМБИРОВКА И ПЕРЕЛЕЧИВАНИЕ]`,
			`S: Пациент обратился для перелечивания ранее леченого зуба #${activeTooth}. Дискомфорт при накусывании.`,
			`O: Проведена анестезия, изоляция операционного поля коффердамом. Снятие старой пломбы/реставрации.`,
			`Ревизия устьев (${canalNamesRu}). Распломбировка ранее леченых каналов (резорцин-формалин / фосфат-цемент) эндодонтическими инструментами Retreatment/NiTi:`,
			canalsReport,
			`Ирригация: 3% раствор гипохлорита натрия (NaOCl) и 17% EDTA с ультразвуковой активацией, лаваж физиологическим раствором, высушены бумажными штифтами.`,
			`A: ${diagnosisRu} зуба #${activeTooth}.`,
			`P: Каналы временно обтурированы пастой гидроксида кальция Ca(OH)2 (Каласепт). Поставлена герметичная временная повязка (Септопак). Назначен повторный приём через 10–14 дней.`,
		].join("\n");
	}

	return [
		`[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName})]`,
		`S: Жалобы на боли от температурных раздражителей и дискомфорт при накусывании.`,
		`O: Проведена анестезия, изоляция операционного поля коффердамом. Препарирование кариозной полости, раскрытие полости зуба #${activeTooth}.`,
		`Каналы (${canalNamesRu}) пройдены, инструментально обработаны машинной системой NiTi:`,
		canalsReport,
		`Ирригация: 3% раствор гипохлорита натрия (NaOCl) и 17% EDTA с ультразвуковой активацией, высушены бумажными штифтами.`,
		`A: ${diagnosisRu} зуба #${activeTooth}.`,
		isTemp
			? `P: Каналы временно обтурированы лечебной пастой гидроксида кальция Ca(OH)2 (Каласепт). Поставлена герметичная временная повязка (Септопак). Назначен повторный приём через 10–14 дней.`
			: `P: Каналы обтурированы до физиологического верхушечного отверстия (гуттаперча + силер AH Plus). Рентген-контроль (визиография): каналы обтурированы до физиологического апекса, гомогенно. Поставлена герметичная реставрация.`,
	].join("\n");
}
