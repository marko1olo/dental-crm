/**
 * DENTE CRM — Patient-Friendly 2D Odontogram Engine & Health Index
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Clinical types, tooth names, formulas, and sanitation metrics for ordinary patients:
 * - Color-coded status helpers: healthy, in treatment, needs attention, missing/implant.
 * - Dynamic 32-tooth state computation from treatment plan stages & active warranties.
 * - Dental Health & Sanitation Index calculation.
 * - Strict <= 800 lines ceiling.
 */

export type PatientToothStatus = "healthy" | "in_treatment" | "needs_treatment" | "missing_or_implant";

export interface PatientToothInfo {
	readonly fdiCode: string;
	readonly status: PatientToothStatus;
	readonly humanNameRu: string;
	readonly clinicalStateRu: string;
	readonly procedureDescriptionRu?: string | undefined;
	readonly plannedStageTitleRu?: string | undefined;
	readonly warrantyActive?: boolean | undefined;
}

export interface DentalHealthIndexResult {
	readonly totalTeeth: number;
	readonly healthyCount: number;
	readonly inTreatmentCount: number;
	readonly needsTreatmentCount: number;
	readonly missingOrImplantCount: number;
	readonly sanitationPercent: number; // 0..100%
	readonly formattedIndexRu: string; // "Индекс санации: 78% • Вылечено 22 зуба • Требуют внимания 2 зуба"
	readonly badgeStatus: "excellent" | "good" | "needs_attention";
	readonly statusLabelRu: string;
	readonly encouragingNoteRu: string;
}

export const HUMAN_TOOTH_NAMES: Record<string, string> = {
	// Upper Right (18..11)
	"18": "Восьмерка сверху справа №18 (зуб мудрости)",
	"17": "Семерка сверху справа №17 (2-й жевательный зуб)",
	"16": "Шестерка сверху справа №16 (1-й жевательный зуб)",
	"15": "Пятерка сверху справа №15 (2-й малый жевательный зуб)",
	"14": "Четверка сверху справа №14 (1-й малый жевательный зуб)",
	"13": "Тройка сверху справа №13 (клык)",
	"12": "Двойка сверху справа №12 (боковой резец)",
	"11": "Единичка сверху справа №11 (передний центральный резец)",

	// Upper Left (21..28)
	"21": "Единичка сверху слева №21 (передний центральный резец)",
	"22": "Двойка сверху слева №22 (боковой резец)",
	"23": "Тройка сверху слева №23 (клык)",
	"24": "Четверка сверху слева №24 (1-й малый жевательный зуб)",
	"25": "Пятерка сверху слева №25 (2-й малый жевательный зуб)",
	"26": "Шестерка сверху слева №26 (1-й жевательный зуб)",
	"27": "Семерка сверху слева №27 (2-й жевательный зуб)",
	"28": "Восьмерка сверху слева №28 (зуб мудрости)",

	// Lower Left (31..38)
	"31": "Единичка снизу слева №31 (передний центральный резец)",
	"32": "Двойка снизу слева №32 (боковой резец)",
	"33": "Тройка снизу слева №33 (клык)",
	"34": "Четверка снизу слева №34 (1-й малый жевательный зуб)",
	"35": "Пятерка снизу слева №35 (2-й малый жевательный зуб)",
	"36": "Шестерка снизу слева №36 (1-й жевательный зуб)",
	"37": "Семерка снизу слева №37 (2-й жевательный зуб)",
	"38": "Восьмерка снизу слева №38 (зуб мудрости)",

	// Lower Right (48..41)
	"48": "Восьмерка снизу справа №48 (зуб мудрости)",
	"47": "Семерка снизу справа №47 (2-й жевательный зуб)",
	"46": "Шестерка снизу справа №46 (1-й жевательный зуб)",
	"45": "Пятерка снизу справа №45 (2-й малый жевательный зуб)",
	"44": "Четверка снизу справа №44 (1-й малый жевательный зуб)",
	"43": "Тройка снизу справа №43 (клык)",
	"42": "Двойка снизу справа №42 (боковой резец)",
	"41": "Единичка снизу справа №41 (передний центральный резец)",
};

export const ALL_ADULT_FDI_TEETH: readonly string[] = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
];

export interface TreatmentPlanStageLike {
	readonly id?: string | undefined;
	readonly titleRu: string;
	readonly status: "completed" | "in_progress" | "planned";
	readonly teethFdi: readonly string[];
	readonly procedures?: readonly string[] | undefined;
	readonly categoryRu?: string | undefined;
}

export interface WarrantyItemLike {
	readonly toothFdi: string;
	readonly workTitleRu: string;
}

export interface WarrantyCardLike {
	readonly items: readonly WarrantyItemLike[];
	readonly status?: string | undefined;
}

/**
 * Dynamically computes patient's 32 teeth statuses from current treatment plan stages and active warranties.
 * Eliminates hardcoded dummy mouth per Mandates 8c, 8e, 8i.
 */
export function computePatientTeethFromStages(
	stages: readonly TreatmentPlanStageLike[] = [],
	warranties?: readonly WarrantyCardLike[] | undefined,
): readonly PatientToothInfo[] {
	const normalizeTooth = (raw: string) => raw.replace(/[^0-9]/g, "");

	return ALL_ADULT_FDI_TEETH.map((fdiCode) => {
		const humanNameRu = HUMAN_TOOTH_NAMES[fdiCode] || `Зуб №${fdiCode}`;

		// Find stages that specifically target this tooth
		const directStages = stages.filter((stage) => {
			if (!stage.teethFdi || stage.teethFdi.length === 0) return false;
			return stage.teethFdi.some((raw) => {
				const norm = normalizeTooth(raw);
				if (norm === fdiCode) return true;
				if (raw.includes("-") && !raw.includes("1.1-4.8") && !raw.includes("11-48")) {
					const parts = raw.split("-").map(normalizeTooth);
					if (parts.length === 2) {
						const start = parseInt(parts[0] || "", 10);
						const end = parseInt(parts[1] || "", 10);
						const current = parseInt(fdiCode, 10);
						if (!isNaN(start) && !isNaN(end) && !isNaN(current)) {
							const min = Math.min(start, end);
							const max = Math.max(start, end);
							if (current >= min && current <= max) {
								return true;
							}
						}
					}
				}
				return false;
			});
		});

		if (directStages.length > 0) {
			const inProgress = directStages.find((s) => s.status === "in_progress");
			if (inProgress) {
				return {
					fdiCode,
					status: "in_treatment",
					humanNameRu,
					clinicalStateRu: `В процессе лечения: ${inProgress.titleRu}`,
					plannedStageTitleRu: inProgress.titleRu,
				};
			}

			const planned = directStages.find((s) => s.status === "planned");
			if (planned) {
				return {
					fdiCode,
					status: "needs_treatment",
					humanNameRu,
					clinicalStateRu: `Требует лечения: ${planned.titleRu}`,
					plannedStageTitleRu: planned.titleRu,
				};
			}

			// All direct stages completed
			const completed = directStages[0];
			const isImplant = directStages.some(
				(s) =>
					s.titleRu.toLowerCase().includes("имплант") ||
					(s.categoryRu && s.categoryRu.toLowerCase().includes("имплант")),
			);
			const isExtraction = directStages.some((s) => s.titleRu.toLowerCase().includes("удален"));

			if (isImplant) {
				return {
					fdiCode,
					status: "missing_or_implant",
					humanNameRu,
					clinicalStateRu: `Установлен имплантат: ${completed?.titleRu || "Имплантация"}`,
					warrantyActive: true,
				};
			}
			if (isExtraction) {
				return {
					fdiCode,
					status: "missing_or_implant",
					humanNameRu,
					clinicalStateRu: `Удален: ${completed?.titleRu || "Удаление"}`,
				};
			}
			return {
				fdiCode,
				status: "healthy",
				humanNameRu,
				clinicalStateRu: `Вылечен: ${completed?.titleRu || "Лечение завершено"}`,
				warrantyActive: true,
			};
		}

		// Check active warranties
		const activeWarranty = warranties?.find((w) =>
			w.items?.some((i) => normalizeTooth(i.toothFdi) === fdiCode),
		);
		if (activeWarranty) {
			const item = activeWarranty.items.find((i) => normalizeTooth(i.toothFdi) === fdiCode);
			return {
				fdiCode,
				status: "healthy",
				humanNameRu,
				clinicalStateRu: `Вылечен: ${item?.workTitleRu || "Комплексная реставрация"}`,
				warrantyActive: true,
			};
		}

		// Default healthy tooth
		return {
			fdiCode,
			status: "healthy",
			humanNameRu,
			clinicalStateRu: "Здоров, патологий не выявлено",
		};
	});
}

export const DEFAULT_PATIENT_TEETH: readonly PatientToothInfo[] = [
	{ fdiCode: "18", status: "healthy", humanNameRu: "Верхний правый зуб мудрости", clinicalStateRu: "Здоров, прорезался правильно" },
	{ fdiCode: "17", status: "healthy", humanNameRu: "Верхний правый 2-й жевательный зуб", clinicalStateRu: "Здоров, пломб нет" },
	{ fdiCode: "16", status: "healthy", humanNameRu: "Верхний правый 1-й жевательный зуб (шестерка)", clinicalStateRu: "Вылечен: установлена коронка из диоксида циркония", warrantyActive: true },
	{ fdiCode: "15", status: "healthy", humanNameRu: "Верхний правый 2-й малый жевательный зуб", clinicalStateRu: "Световая пломба Estelite, краевое прилегание идеальное" },
	{ fdiCode: "14", status: "healthy", humanNameRu: "Верхний правый 1-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "13", status: "healthy", humanNameRu: "Верхний правый клык", clinicalStateRu: "Здоров" },
	{ fdiCode: "12", status: "healthy", humanNameRu: "Верхний правый боковой резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "11", status: "healthy", humanNameRu: "Верхний правый передний центральный резец", clinicalStateRu: "Здоров" },

	{ fdiCode: "21", status: "healthy", humanNameRu: "Верхний левый передний центральный резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "22", status: "healthy", humanNameRu: "Верхний левый боковой резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "23", status: "healthy", humanNameRu: "Верхний левый клык", clinicalStateRu: "Здоров" },
	{ fdiCode: "24", status: "healthy", humanNameRu: "Верхний левый 1-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "25", status: "in_treatment", humanNameRu: "Верхний левый 2-й малый жевательный зуб", clinicalStateRu: "В процессе: временная пломба, обработка каналов", plannedStageTitleRu: "Терапевтический этап (пломбирование каналов)" },
	{ fdiCode: "26", status: "needs_treatment", humanNameRu: "Верхний левый 1-й жевательный зуб", clinicalStateRu: "Требует внимания: апроксимальный кариес", plannedStageTitleRu: "Этап 2: Лечение кариеса" },
	{ fdiCode: "27", status: "healthy", humanNameRu: "Верхний левый 2-й жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "28", status: "missing_or_implant", humanNameRu: "Верхний левый зуб мудрости", clinicalStateRu: "Удален ранее по ортодонтическим показаниям" },

	// Lower Arch
	{ fdiCode: "48", status: "missing_or_implant", humanNameRu: "Нижний правый зуб мудрости", clinicalStateRu: "Удален" },
	{ fdiCode: "47", status: "healthy", humanNameRu: "Нижний правый 2-й жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "46", status: "missing_or_implant", humanNameRu: "Нижний правый 1-й жевательный зуб", clinicalStateRu: "Установлен имплантат Dentium SuperLine с циркониевой коронкой", warrantyActive: true },
	{ fdiCode: "45", status: "healthy", humanNameRu: "Нижний правый 2-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "44", status: "healthy", humanNameRu: "Нижний правый 1-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "43", status: "healthy", humanNameRu: "Нижний правый клык", clinicalStateRu: "Здоров" },
	{ fdiCode: "42", status: "healthy", humanNameRu: "Нижний правый боковой резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "41", status: "healthy", humanNameRu: "Нижний правый передний центральный резец", clinicalStateRu: "Здоров" },

	{ fdiCode: "31", status: "healthy", humanNameRu: "Нижний левый передний центральный резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "32", status: "healthy", humanNameRu: "Нижний левый боковой резец", clinicalStateRu: "Здоров" },
	{ fdiCode: "33", status: "healthy", humanNameRu: "Нижний левый клык", clinicalStateRu: "Здоров" },
	{ fdiCode: "34", status: "healthy", humanNameRu: "Нижний левый 1-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "35", status: "healthy", humanNameRu: "Нижний левый 2-й малый жевательный зуб", clinicalStateRu: "Здоров" },
	{ fdiCode: "36", status: "in_treatment", humanNameRu: "Нижний левый 1-й жевательный зуб", clinicalStateRu: "Подготовка под коронку: культевая вкладка", plannedStageTitleRu: "Ортопедический этап" },
	{ fdiCode: "37", status: "needs_treatment", humanNameRu: "Нижний левый 2-й жевательный зуб", clinicalStateRu: "Кариес фиссур", plannedStageTitleRu: "Этап 1: Гигиена и лечение кариеса" },
	{ fdiCode: "38", status: "healthy", humanNameRu: "Нижний левый зуб мудрости", clinicalStateRu: "Здоров" },
];

/**
 * Calculates the patient's Dental Health & Sanitation Index.
 * Formula: % of healthy, cured and restored teeth vs total teeth in chart.
 */
export function calculateDentalHealthIndex(
	teeth: readonly PatientToothInfo[] = DEFAULT_PATIENT_TEETH,
): DentalHealthIndexResult {
	const totalTeeth = teeth.length || 32;
	const healthyCount = teeth.filter((t) => t.status === "healthy").length;
	const inTreatmentCount = teeth.filter((t) => t.status === "in_treatment").length;
	const needsTreatmentCount = teeth.filter((t) => t.status === "needs_treatment").length;
	const missingOrImplantCount = teeth.filter((t) => t.status === "missing_or_implant").length;

	// Санированные зубы = здоровые/вылеченные + качественно замещенные имплантами
	const sanitatedTeeth = healthyCount + missingOrImplantCount;
	const sanitationPercent = Math.min(100, Math.max(0, Math.round((sanitatedTeeth / totalTeeth) * 100)));

	let badgeStatus: "excellent" | "good" | "needs_attention" = "good";
	let statusLabelRu = "Хороший уровень санации";
	let encouragingNoteRu = "Лечение идет по плану! После завершения текущего плана индекс достигнет 100%.";

	if (sanitationPercent >= 90) {
		badgeStatus = "excellent";
		statusLabelRu = "Отличный уровень санации";
		encouragingNoteRu = "Полость рта практически полностью санирована! Соблюдайте профгигиену 1 раз в 6 месяцев для сохранения гарантии.";
	} else if (sanitationPercent < 70) {
		badgeStatus = "needs_attention";
		statusLabelRu = "Требуется плановая санация";
		encouragingNoteRu = "Не переживайте! Все процедуры проводятся 100% безболезненно под контролем дентального микроскопа.";
	}

	return {
		totalTeeth,
		healthyCount,
		inTreatmentCount,
		needsTreatmentCount,
		missingOrImplantCount,
		sanitationPercent,
		formattedIndexRu: `Индекс санации: ${sanitationPercent}% • Вылечено ${healthyCount} зубов • Требуют внимания ${needsTreatmentCount} зубов`,
		badgeStatus,
		statusLabelRu,
		encouragingNoteRu,
	};
}

export function getPatientToothStatusColor(status: PatientToothStatus) {
	switch (status) {
		case "healthy":
			return {
				bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
				light: "rgba(16, 185, 129, 0.2)",
				glow: "0 0 14px rgba(16, 185, 129, 0.3), 0 2px 4px rgba(0, 0, 0, 0.25)",
				text: "#ffffff",
				border: "#10b981",
				badgeText: "Здоров / Санирован",
			};
		case "in_treatment":
			return {
				bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
				light: "rgba(245, 158, 11, 0.2)",
				glow: "0 0 14px rgba(245, 158, 11, 0.3), 0 2px 4px rgba(0, 0, 0, 0.25)",
				text: "#ffffff",
				border: "#f59e0b",
				badgeText: "В процессе лечения",
			};
		case "needs_treatment":
			return {
				bg: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
				light: "rgba(244, 63, 94, 0.2)",
				glow: "0 0 14px rgba(244, 63, 94, 0.35), 0 2px 4px rgba(0, 0, 0, 0.25)",
				text: "#ffffff",
				border: "#f43f5e",
				badgeText: "Требует внимания",
			};
		case "missing_or_implant":
			return {
				bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
				light: "rgba(100, 116, 139, 0.2)",
				glow: "0 0 10px rgba(100, 116, 139, 0.25), 0 2px 4px rgba(0, 0, 0, 0.25)",
				text: "#ffffff",
				border: "#64748b",
				badgeText: "Имплантат / Замещен",
			};
	}
}
