/**
 * surgeryExtractionProtocolBuilder.ts — Генерация протокола экстракции зуба (Мандаты 8e, 8k, 8i).
 */

import type { ExtractionComplexity, SurgicalHemostasisMethod } from "./surgeryExtractionTypes";

export interface StandardExtractionParams {
	readonly toothFdi?: number | undefined;
	readonly complexity?: ExtractionComplexity | undefined;
	readonly hemostasis?: readonly SurgicalHemostasisMethod[] | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly anesthesia?: string | undefined;
	readonly postOpXray?: boolean | undefined;
}

export function buildStandardExtractionProtocolText(
	params: StandardExtractionParams = {},
): string {
	const toothStr = params.toothFdi ? `зуба FDI #${params.toothFdi}` : "зуба";
	const complexity = params.complexity ?? "simple";
	const hemo = params.hemostasis ?? ["alvogyl", "tampon"];
	const suture = params.sutureMaterial || "Викрил 4-0";

	const hemoParts: string[] = [];
	if (hemo.includes("alvogyl")) {
		hemoParts.push("в лунку внесен антисептический компресс Альвожил");
	}
	if (hemo.includes("hemostatic_sponge")) {
		hemoParts.push("лунка заполнена рассасывающейся гемостатической коллагеновой губкой");
	}
	if (hemo.includes("vicryl_suture") || complexity === "complex" || complexity === "impacted_dystopic") {
		hemoParts.push(`края раны сближены, наложены узловые швы (${suture})`);
	}
	if (hemo.includes("tampon")) {
		hemoParts.push("наложен давящий марлевый тампон на 20 минут");
	}
	const hemostasisText =
		hemoParts.length > 0
			? `Местный гемостаз: ${hemoParts.join(", ")}.`
			: "Местный гемостаз: в лунку внесен Альвожил, наложен давящий марлевый тампон.";

	const xrayText =
		params.postOpXray
			? " Выполнен контрольный радиовизиографический снимок: остатков корней и инородных тел в лунке нет."
			: "";

	if (complexity === "complex") {
		const anesth =
			params.anesthesia ||
			"Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл.";
		return (
			`${anesth} Разрез слизистой оболочки в области ${toothStr}, отслаивание слизисто-надкостничного лоскута. ` +
			`Сепарация корней твердосплавным бором Lindemann с водяным охлаждением физраствором. ` +
			`Атравматичная люксация фрагментов корней элеватором, удаление корней щипцами. ` +
			`Тщательный кюретаж лунки острой ложкой, удаление грануляций, ревизия костных стенок. ` +
			`Антисептическая обработка 0.05% раствором хлоргексидина. ` +
			`${hemostasisText} Гемостаз полный.${xrayText} Рекомендации даны.`
		);
	}

	if (complexity === "impacted_dystopic") {
		const anesth =
			params.anesthesia ||
			"Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл.";
		return (
			`${anesth} Разрез слизистой оболочки в проекции ретинированного ${toothStr}, выкраивание слизисто-надкостничного лоскута. ` +
			`Трепанация кортикальной пластинки, сепарация коронки и корней бором Lindemann с водяным охлаждением. ` +
			`Атравматичная люксация элеватором и извлечение фрагментов. Тщательный кюретаж лунки острой ложкой, удаление грануляций. ` +
			`Антисептическая обработка 0.05% хлоргексидином. ` +
			`${hemostasisText} Гемостаз полный.${xrayText} Рекомендации даны.`
		);
	}

	const anesth =
		params.anesthesia ||
		"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.";
	return (
		`${anesth} Круговая связка ${toothStr} отслоена гладилкой. ` +
		`Наложены щипцы / элеватор, продвинуты под десну, фиксированы. Люксация элеватором и ротация щипцами. ` +
		`Тракция зуба из альвеолы. Тщательный кюретаж лунки острой ложкой, ревизия костных стенок, удаление грануляций. ` +
		`Антисептическая обработка 0.05% хлоргексидином. ` +
		`${hemostasisText} Гемостаз полный.${xrayText} Рекомендации даны.`
	);
}
