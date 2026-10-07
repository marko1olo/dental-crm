import type { DiaryState } from "../../useVisitDiaryLogic";
import type {
	DoctorAutopilotPreset,
	Apply1ClickAutopilotOptions,
	Apply1ClickAutopilotResult,
} from "../clinicalSoapTypes";

import {
	AUTOPILOT_CARIES_K021,
	AUTOPILOT_PULPITIS_K040,
	AUTOPILOT_PERIODONTITIS_K045,
	AUTOPILOT_HYGIENE_K051,
	AUTOPILOT_EXTRACTION_K011,
	AUTOPILOT_EXTRACTION_K045,
	AUTOPILOT_NORM_HEALTHY,
	DOCTOR_AUTOPILOT_PRESETS_MAP,
} from "./autopilotPresetsData";

export * from "./autopilotPresetsData";

// =========================================================================
// ПОСТРОИТЕЛИ И ПРИМЕНЕНИЕ КЛИНИЧЕСКИХ АВТОПИЛОТОВ (МАНДАТЫ 8e, 8n)
// Приказы Минздрава РФ № 804н, № 1051н (ИДС), Форма 043/у и рекомендации СтАР
// =========================================================================

/**
 * Построитель протокола лечения кариеса (K02.1).
 * Поддерживает кастомные поверхности (O, MOD, MO, DO, B, L) и зуб FDI.
 */
export function build1ClickCariesPreset(
	toothNumber?: number | null,
	surfaces?: string,
): DoctorAutopilotPreset {
	const tooth = toothNumber ?? 16;
	const trimmed = (surfaces ?? "").trim();
	const hasSurfaces =
		trimmed.length > 0 &&
		trimmed.toLowerCase() !== "undefined" &&
		trimmed.toLowerCase() !== "null";
	const toothPrefix = `Зуб ${tooth}: `;

	const statusLocalis = hasSurfaces
		? `${toothPrefix}На поверхностях ${trimmed} кариозная полость средней глубины в пределах дентина. Зондирование по эмалево-дентинной границе слабо чувствительно, дно и стенки плотные, пигментированные. Перкуссия безболезненна. Холодовая проба кратковременно положительна, быстропроходящая. ЭОД 6–8 мкА.`
		: `${toothPrefix}Кариозная полость средней глубины в пределах дентина. Зондирование по эмалево-дентинной границе слабо чувствительно, дно и стенки плотные, пигментированные. Перкуссия безболезненна. Холодовая проба кратковременно положительна, быстропроходящая. ЭОД 6–8 мкА.`;

	const serviceTitle = hasSurfaces
		? `Восстановление зуба пломбой с нарушением контактного пункта зуба II, III класса по Блэку с использованием фотополимерных материалов (поверхности ${trimmed}) (Зуб ${tooth})`
		: `Восстановление зуба пломбой светового отверждения (лечение кариеса дентина) (Зуб ${tooth})`;

	return {
		...AUTOPILOT_CARIES_K021,
		defaultTooth: tooth,
		surfaces: hasSurfaces ? trimmed : undefined,
		statusLocalis,
		service804n: {
			code804n: "A16.07.002.010",
			title: serviceTitle,
			basePriceRub: 4800,
			category: "therapy",
		},
	};
}

/**
 * Построитель протокола эндодонтии / пульпита (K04.0).
 */
export function build1ClickPulpitisPreset(
	toothNumber?: number | null,
): DoctorAutopilotPreset {
	const tooth = toothNumber ?? 46;
	const toothPrefix = `Зуб ${tooth}: `;

	return {
		...AUTOPILOT_PULPITIS_K040,
		defaultTooth: tooth,
		statusLocalis: `${toothPrefix}${AUTOPILOT_PULPITIS_K040.statusLocalis}`,
		service804n: {
			...AUTOPILOT_PULPITIS_K040.service804n!,
			title: `${AUTOPILOT_PULPITIS_K040.service804n!.title} (Зуб ${tooth})`,
		},
	};
}

/**
 * Построитель протокола периодонтита (K04.5).
 */
export function build1ClickPeriodontitisPreset(
	toothNumber?: number | null,
): DoctorAutopilotPreset {
	const tooth = toothNumber ?? 46;
	const toothPrefix = `Зуб ${tooth}: `;

	return {
		...AUTOPILOT_PERIODONTITIS_K045,
		defaultTooth: tooth,
		statusLocalis: `${toothPrefix}${AUTOPILOT_PERIODONTITIS_K045.statusLocalis}`,
		service804n: {
			...AUTOPILOT_PERIODONTITIS_K045.service804n!,
			title: `${AUTOPILOT_PERIODONTITIS_K045.service804n!.title} (Зуб ${tooth})`,
		},
	};
}

/**
 * Построитель протокола комплексной профгигиены Air-Flow (K05.1).
 */
export function build1ClickHygienePreset(
	toothNumber?: number | null,
): DoctorAutopilotPreset {
	const preset = { ...AUTOPILOT_HYGIENE_K051 };
	if (toothNumber) {
		preset.defaultTooth = toothNumber;
		preset.title = `${AUTOPILOT_HYGIENE_K051.title} (Зуб ${toothNumber})`;
	}
	return preset;
}

/**
 * Построитель протокола удаления зуба (K01.1 / K04.5).
 */
export function build1ClickExtractionPreset(
	toothNumber?: number | null,
	icd10: "K01.1" | "K04.5" = "K01.1",
): DoctorAutopilotPreset {
	const tooth = toothNumber ?? 48;
	const toothPrefix = `Зуб ${tooth}: `;
	const base =
		icd10 === "K04.5" ? AUTOPILOT_EXTRACTION_K045 : AUTOPILOT_EXTRACTION_K011;

	return {
		...base,
		defaultTooth: tooth,
		statusLocalis: `${toothPrefix}${base.statusLocalis}`,
		service804n: {
			...base.service804n!,
			title: `${base.service804n!.title} (Зуб ${tooth})`,
		},
	};
}

/**
 * Построитель протокола физиологической нормы (Z01.2).
 */
export function build1ClickNormPreset(): DoctorAutopilotPreset {
	return { ...AUTOPILOT_NORM_HEALTHY };
}

/**
 * Чистая функция применения клинического автопилота.
 * Вычисляет результирующий дневник SOAP (Форма 043/у), списание со склада и услуги 804н.
 */
export function apply1ClickClinicalAutopilot(
	presetId: string,
	options: Apply1ClickAutopilotOptions = {},
): Apply1ClickAutopilotResult {
	const mode = options.mode ?? "clean_replace";
	const tooth = options.toothNumber ?? null;

	let targetPreset: DoctorAutopilotPreset;
	switch (presetId) {
		case "autopilot_caries_k021":
		case "caries_k021":
		case "caries_medium":
		case "caries":
			targetPreset = build1ClickCariesPreset(tooth, options.surfaces);
			break;
		case "autopilot_pulpitis_k040":
		case "pulpitis_k040":
		case "pulpitis_acute":
		case "pulpitis":
			targetPreset = build1ClickPulpitisPreset(tooth);
			break;
		case "autopilot_periodontitis_k045":
		case "periodontitis_k045":
		case "periodontitis_destructive":
		case "periodontitis_chronic":
		case "periodontitis":
			targetPreset = build1ClickPeriodontitisPreset(tooth);
			break;
		case "autopilot_hygiene_k051":
		case "hygiene_k051":
		case "hygiene":
			targetPreset = build1ClickHygienePreset(tooth);
			break;
		case "autopilot_hygiene_airflow":
		case "hygiene_airflow":
		case "hygiene_complex":
			targetPreset = build1ClickHygienePreset(tooth);
			break;
		case "autopilot_extraction_k011":
		case "extraction_k011":
		case "extraction":
			targetPreset = build1ClickExtractionPreset(tooth, "K01.1");
			break;
		case "autopilot_extraction_k045":
		case "extraction_k045":
		case "surgery_extraction_simple":
			targetPreset = build1ClickExtractionPreset(tooth, "K04.5");
			break;
		case "autopilot_norm_healthy":
		case "norm_healthy":
		case "norm":
			targetPreset = build1ClickNormPreset();
			break;
		default: {
			const found = DOCTOR_AUTOPILOT_PRESETS_MAP[presetId];
			targetPreset = found || build1ClickCariesPreset(tooth, options.surfaces);
			break;
		}
	}

	const toothSuffix =
		targetPreset.category !== "hygiene" && tooth ? ` (Зуб ${tooth})` : "";

	const anesText = targetPreset.anesthetic
		? `Инфильтрационная/проводниковая анестезия: ${targetPreset.anesthetic.drugName} — ${targetPreset.anesthetic.volumeMl} мл.`
		: "";

	const billLines: string[] = [];
	if (targetPreset.service804n) {
		billLines.push(
			`Выполнено: [${targetPreset.service804n.code804n}] ${targetPreset.service804n.title} — ${targetPreset.service804n.basePriceRub.toLocaleString("ru-RU")} ₽`,
		);
	}
	if (targetPreset.additionalServices804n) {
		for (const s of targetPreset.additionalServices804n) {
			billLines.push(
				`Дополнительно: [${s.code804n}] ${s.title} — ${s.basePriceRub.toLocaleString("ru-RU")} ₽`,
			);
		}
	}

	const materialsSummary = (targetPreset.materialsToDeduct ?? [])
		.map((m) => `${m.name} (${m.quantity} ${m.unit})`)
		.join("; ");
	const materialsLine = materialsSummary
		? `Списание со склада (Норма расхода): ${materialsSummary}`
		: "";

	const planBlocks = [
		targetPreset.informedConsent ? `[ИДС]: ${targetPreset.informedConsent}` : "",
		anesText,
		targetPreset.treatmentDescription,
		billLines.join("\n"),
		materialsLine,
		targetPreset.recommendations
			? `[Рекомендации]: ${targetPreset.recommendations}`
			: "",
	].filter(Boolean);

	const fullPlanText = planBlocks.join("\n\n");

	const prev = options.currentDiary ?? {};
	let diary: DiaryState;

	if (mode === "clean_replace") {
		diary = {
			anamnesis: [targetPreset.complaint, targetPreset.anamnesis]
				.filter(Boolean)
				.join("\n"),
			statusLocalis: targetPreset.statusLocalis,
			diagnosisIcd10: targetPreset.icd10,
			diagnosisTooth: tooth ? String(tooth) : "",
			treatmentDescription: fullPlanText,
			complications: prev.complications || "",
			comorbidities: prev.comorbidities || "",
		};
	} else {
		// smart append
		const appendText = (current?: string, add?: string, sep = "\n\n") => {
			if (!current || !current.trim()) return add || "";
			if (!add || !add.trim()) return current;
			return `${current}${sep}${add}`;
		};
		diary = {
			anamnesis: appendText(
				prev.anamnesis,
				[targetPreset.complaint, targetPreset.anamnesis]
					.filter(Boolean)
					.join("\n"),
				"\n",
			),
			statusLocalis: appendText(
				prev.statusLocalis,
				targetPreset.statusLocalis,
				"\n",
			),
			diagnosisIcd10: prev.diagnosisIcd10 || targetPreset.icd10,
			diagnosisTooth: prev.diagnosisTooth || (tooth ? String(tooth) : ""),
			treatmentDescription: appendText(
				prev.treatmentDescription,
				fullPlanText,
				"\n\n",
			),
			complications: prev.complications || "",
			comorbidities: prev.comorbidities || "",
		};
	}

	return {
		diary,
		preset: targetPreset,
		service804n: targetPreset.service804n,
		additionalServices804n: targetPreset.additionalServices804n,
		materials: targetPreset.materialsToDeduct ?? [],
		recommendations: targetPreset.recommendations ?? "",
		informedConsent: targetPreset.informedConsent,
		postOpMemo: targetPreset.postOpMemo,
		toothNumber: tooth ?? targetPreset.defaultTooth,
		odontogramState: targetPreset.toothState,
	};
}

/**
 * Алиас для автопилота врача (обратная совместимость и краткость).
 */
export const apply1ClickDoctorAutopilot = apply1ClickClinicalAutopilot;
