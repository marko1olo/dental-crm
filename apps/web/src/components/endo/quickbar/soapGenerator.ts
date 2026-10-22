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
					? `временная паста ${c.sealer || "Ca(OH)2"}`
					: c.obturationType === "bioceramic"
						? `гуттаперча + биокерамический силер (${c.sealer || "BioRoot"})`
						: `гуттаперча + силер (${c.sealer || "AH Plus"}) методом латеральной компакции`;
			const len = c.workingLengthMm > 0 ? c.workingLengthMm.toFixed(1) : "21.0";
			return `• Канал ${c.name}: пройден, WL = ${len} мм (Apex 0.0), MAF = ${c.masterApicalFile}/${c.taper}, обтурация: ${obt}`;
		})
		.join("\n");

	const canalNamesRu = currentCanals.map((c) => c.name).join(", ");
	const diagnosisRu = toothState || (isTemp ? "Периодонтит / Пульпит" : isBio ? "Периодонтит" : "Пульпит");

	return [
		`[ПРОТОКОЛ ЭНДОДОНТИИ: ЗУБ #${activeTooth} (${toothAnatomicalName})]`,
		`S: Жалобы на боли от температурных раздражителей и дискомфорт при накусывании.`,
		`O: Проведена анестезия, изоляция операционного поля коффердамом. Препарирование кариозной полости, раскрытие полости зуба #${activeTooth}.`,
		`Каналы (${canalNamesRu}) пройдены, инструментально обработаны машинной системой NiTi:`,
		canalsReport,
		`Ирригация: 3% раствор гипохлорита натрия (NaOCl) и 17% EDTA с ультразвуковой активацией, высушены бумажными штифтами.`,
		`A: ${diagnosisRu} зуба #${activeTooth}.`,
		isTemp
			? `P: Каналы временно обтурированы пастой гидроксида кальция Ca(OH)2. Поставлена герметичная временная пломба. Назначен повторный приём через 10–14 дней.`
			: `P: Каналы обтурированы до физиологического верхушечного отверстия. Рентген-контроль (визиография): каналы обтурированы до физиологического апекса, гомогенно. Поставлена герметичная реставрация.`,
	].join("\n");
}
