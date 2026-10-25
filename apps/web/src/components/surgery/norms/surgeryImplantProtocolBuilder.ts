/**
 * surgeryImplantProtocolBuilder.ts — Генерация канонического протокола дентальной имплантации (Мандаты 8e, 8k, 8x).
 */

export interface StandardImplantationParams {
	readonly toothFdi?: number;
	readonly brand?: string;
	readonly model?: string;
	readonly diameterMm?: number;
	readonly lengthMm?: number;
	readonly torqueNcm?: number;
	readonly isq?: number;
	readonly boneDensity?: string;
	readonly lotNumber?: string;
	readonly serialNumber?: string;
	readonly capType?: "fdm" | "plug";
	readonly sutureMaterial?: string;
	readonly postOpXray?: boolean;
}

export function buildStandardImplantationProtocolText(
	params: StandardImplantationParams = {},
): string {
	const toothStr = params.toothFdi ? `зуба FDI #${params.toothFdi}` : "имплантации";
	const brand = params.brand || "Dentium";
	const model = params.model ? ` ${params.model}` : "";
	const dia = params.diameterMm ?? 4.0;
	const len = params.lengthMm ?? 10.0;
	const torque = params.torqueNcm ?? 35;
	const isq = params.isq ?? 72;
	const densityStr = params.boneDensity ? ` Плотность кости по Misch: ${params.boneDensity}.` : "";
	const lotSnStr =
		params.lotNumber || params.serialNumber
			? ` LOT: ${params.lotNumber || "—"}, SN: ${params.serialNumber || "—"}.`
			: "";
	const capStr =
		params.capType === "plug"
			? "Установлен винт-заглушка (двухэтапный протокол с ушиванием наглухо)."
			: "Установлен формирователь десны (ФДМ).";
	const suture = params.sutureMaterial || "Prolene 4-0";
	const xrayStr =
		params.postOpXray !== false
			? " Выполнен контрольный прицельный радиовизиографический снимок: положение имплантата правильное, субкрестально 0.5 мм, без повреждения смежных анатомических структур."
			: "";

	return (
		`Инфильтрационная анестезия Артикаин 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка в области ${toothStr}, отслоен слизисто-надкостничный лоскут. ` +
		`Препарирование ложа фрезами по хирургическому протоколу ${brand} с обильным охлаждением стерильным 0.9% NaCl (800 об/мин). ` +
		`Установлен дентальный имплантат ${brand}${model} Ø ${dia} × ${len} мм.${densityStr}${lotSnStr} ` +
		`Первичная торк-стабильность ${torque} Н·см, RFA стабильность ISQ ${isq} (высокая первичная фиксация). ` +
		`${capStr} ` +
		`Мобилизация лоскута, наложены узловые швы ${suture} без натяжения. Гемостаз полный.${xrayStr} ` +
		`Назначена антибактериальная и противовоспалительная терапия, рекомендации выданы.`
	);
}
