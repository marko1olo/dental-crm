import type { DiaryState } from "./protocolTypes.js";

/** Запись измерения рабочей длины и параметров обтурации корневого канала */
export interface EndoWorkingLengthEntry {
	readonly id?: string | undefined;
	readonly canalName: string;
	readonly referencePoint?: string | undefined;
	readonly workingLengthMm: number | string;
	readonly masterApicalFile?: string | undefined;
	readonly taper?: string | undefined;
	readonly obturationTechnique?: string | undefined;
	readonly sealer?: string | undefined;
	readonly notes?: string | undefined;
}

export interface EndoSealerOption {
	readonly id: string;
	readonly name: string;
	readonly brand: string;
	readonly category: "epoxy" | "bioceramic" | "calcium_hydroxide" | "zinc_oxide";
	readonly description: string;
}

export const ENDO_SEALER_OPTIONS: readonly EndoSealerOption[] = [
	{
		id: "ah_plus",
		name: "AH Plus (Dentsply)",
		brand: "AH Plus",
		category: "epoxy",
		description: "Эпоксидный гидрофобный силер, эталон герметичности",
	},
	{
		id: "bioroot_rcs",
		name: "BioRoot RCS (Septodont)",
		brand: "BioRoot RCS",
		category: "bioceramic",
		description: "Биоактивный трикальцийсиликатный биокерамический силер",
	},
	{
		id: "total_fill",
		name: "TotalFill BC Sealer (FKG)",
		brand: "TotalFill BC",
		category: "bioceramic",
		description: "Премиальный нанобиокерамический инжектируемый силер",
	},
	{
		id: "calcium_hydroxide",
		name: "Каласепт / Metapex (Ca(OH)2)",
		brand: "Каласепт",
		category: "calcium_hydroxide",
		description: "Временная антисептическая паста гидроксида кальция pH 12.5",
	},
];

export interface EndoObturationMethodOption {
	readonly id: string;
	readonly name: string;
	readonly shortLabel: string;
	readonly description: string;
}

export const ENDO_OBTURATION_METHOD_OPTIONS: readonly EndoObturationMethodOption[] = [
	{
		id: "lateral_compaction",
		name: "Латеральная компакция холодной гуттаперчи",
		shortLabel: "Латеральная компакция",
		description: "Классический метод холодной латеральной конденсации",
	},
	{
		id: "vertical_condensation",
		name: "Вертикальная конденсация разогретой гуттаперчи",
		shortLabel: "Вертикальная конденсация",
		description: "Трёхмерная обтурация разогретой термопластифицированной гуттаперчей",
	},
	{
		id: "single_cone_bioceramic",
		name: "Метод одного калиброванного штифта + биокерамика (BioRoot RCS)",
		shortLabel: "Моноштифт + Биокерамика",
		description: "Гидравлическая обтурация биокерамическим силером",
	},
	{
		id: "continuous_wave",
		name: "Метод непрерывной волны (System B / Elements)",
		shortLabel: "Непрерывная волна",
		description: "Горячая вертикальная конденсация непрерывной волной",
	},
	{
		id: "temporary_caoh2",
		name: "Временное пломбирование гидроксидом кальция",
		shortLabel: "Временная Ca(OH)2",
		description: "Межсеансовое антисептическое лечение деструктивных периодонтитов",
	},
];

/** Генерация таблицы учета рабочей длины корневых каналов для Формы 043/у */
export function generateEndoWorkingLengthTable(
	canals: readonly EndoWorkingLengthEntry[],
): string {
	const header = [
		"ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ КОРНЕВЫХ КАНАЛОВ (Форма 043/у):",
		"┌──────────────┬─────────────────────────────┬─────────────┬─────────────┬──────────────────────────────────────────┐",
		"│ Канал        │ Реперный ориентир           │ Длина (WL)  │ Мастер-файл │ Метод обтурации / Силер                  │",
		"├──────────────┼─────────────────────────────┼─────────────┼─────────────┼──────────────────────────────────────────┤",
	];

	const rows = canals.map((c) => {
		const mafMatch = String(c.masterApicalFile ?? "").match(/(?:ISO\s*\d+|#\d+|\d+)/i);
		const mafClean = mafMatch ? mafMatch[0] : (c.masterApicalFile ?? "ISO 25");
		const taperMatch = String(c.taper ?? "").match(/\.\d+/);
		const taperClean = taperMatch ? taperMatch[0] : (c.taper ?? ".06");
		const mafFormatted = `${mafClean}/${taperClean}`.trim();
		let lengthStr = "—";
		if (c.workingLengthMm !== undefined && c.workingLengthMm !== null && c.workingLengthMm !== "") {
			const num = typeof c.workingLengthMm === "number" ? c.workingLengthMm : parseFloat(String(c.workingLengthMm));
			lengthStr = !isNaN(num) ? `${num.toFixed(1)} мм` : `${c.workingLengthMm} мм`;
		}
		const obt = c.obturationTechnique
			? `${c.obturationTechnique}${c.sealer ? ` + ${c.sealer}` : ""}`
			: "Гуттаперча + AH Plus";

		const colCanal = (c.canalName || "—").padEnd(12);
		const colRef = (c.referencePoint || "Щечный бугор").slice(0, 27).padEnd(27);
		const colWl = lengthStr.padEnd(11);
		const colMaf = mafFormatted.padEnd(11);
		const colObt = obt.slice(0, 40).padEnd(40);

		return `│ ${colCanal} │ ${colRef} │ ${colWl} │ ${colMaf} │ ${colObt} │`;
	});

	const footer = "└──────────────┴─────────────────────────────┴─────────────┴─────────────┴──────────────────────────────────────────┘";
	return [...header, ...rows, footer].join("\n");
}

/** Форматирование эндодонтического протокола с рабочей длиной каналов, апекслокатором и обтурацией */
export function formatEndoProtocolQuickSnippet(params: {
	readonly toothNumber?: number | string | undefined;
	readonly canals: readonly EndoWorkingLengthEntry[];
	readonly sealer?: string | undefined;
	readonly obturationTechnique?: string | undefined;
	readonly irrigation?: string | undefined;
	readonly radiology?: string | undefined;
}): string {
	const toothStr = params.toothNumber ? `Зуб ${params.toothNumber}` : "Эндодонтический протокол";
	const irrigation = params.irrigation || "3% NaOCl + 17% EDTA (ультразвуковая активация)";
	const radiology = params.radiology || "Визиография: каналы обтурированы плотно до апекса";
	const table = generateEndoWorkingLengthTable(params.canals);

	const canalSummaries = params.canals.map((c) => {
		let len = "—";
		if (c.workingLengthMm !== undefined && c.workingLengthMm !== null && c.workingLengthMm !== "") {
			const num = typeof c.workingLengthMm === "number" ? c.workingLengthMm : parseFloat(String(c.workingLengthMm));
			len = !isNaN(num) ? `${num.toFixed(1)} мм` : `${c.workingLengthMm} мм`;
		}
		const maf = c.masterApicalFile || "#25";
		const taper = c.taper || ".06";
		const ref = c.referencePoint ? ` (репер: ${c.referencePoint})` : "";
		return `• ${c.canalName}${ref}: WL=${len}, MAF=${maf}/${taper}`;
	}).join("\n");

	return [
		`ЭНДОДОНТИЧЕСКИЙ ПРОТОКОЛ (${toothStr}):`,
		"Коффердам. Доступ к устьям, NiTi инструментальная обработка, апекслокация (Apex 0.0).",
		canalSummaries,
		"",
		table,
		"",
		`Ирригация: ${irrigation}.`,
		`Обтурация: ${params.obturationTechnique || "Гуттаперча"} + ${params.sealer || "AH Plus"}.`,
		`Рентген-контроль: ${radiology}.`,
	].join("\n");
}

/** Добавление эндодонтического протокола в поле лечения */
export function appendEndoProtocolToSoap(
	diary: DiaryState,
	endoSnippet: string,
): DiaryState {
	const cur = (diary.treatmentDescription ?? "").trim();
	const endoTrim = (endoSnippet ?? "").trim();
	if (!endoTrim) return diary;
	if (cur.includes(endoTrim)) return diary;

	const nextTreatment = cur ? `${cur}\n\n${endoTrim}` : endoTrim;
	return {
		...diary,
		treatmentDescription: nextTreatment,
	};
}
