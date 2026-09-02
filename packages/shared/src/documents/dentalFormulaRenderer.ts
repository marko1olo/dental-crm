/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GRAPHICAL DENTAL FORMULA (ODONTOGRAM) RENDERER — FDI TWO-DIGIT NOTATION
 * ISO 3950 / FDI: 11..48 (Permanent), 51..85 (Deciduous)
 * Renders high-precision vector SVG dental arches for Form 043/u and Treatment Plans.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface ToothStateData {
	toothNumber: number;
	status: string; // sound, caries, pulpitis, periodontitis, filled, crown, implant, missing, root, watch
	statusCode?: string | undefined; // H, C, P, Pt, П, К, И, 0, R, N
	surfaces?: string[] | undefined; // occlusal, mesial, distal, buccal, lingual
	diagnosisText?: string | undefined;
	mobilityGrade?: string | undefined;
	plannedAction?: string | undefined;
}

export interface GraphicalDentalFormulaOptions {
	clinicalToothRows?:
		| Array<{
				toothOrArea: string;
				status?: string | undefined;
				surfaces?: string[] | undefined;
				diagnosisOrFinding?: string | undefined;
				plannedAction?: string | undefined;
		  }>
		| readonly any[]
		| undefined;
	dentalFormula?: any | undefined;
	toothStateMap?: Record<string | number, ToothStateData> | undefined;
	title?: string | undefined;
	showDeciduous?: boolean | undefined;
	compact?: boolean | undefined;
}

const PERMANENT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11] as const;
const PERMANENT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const PERMANENT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41] as const;
const PERMANENT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38] as const;

const DECIDUOUS_UPPER_RIGHT = [55, 54, 53, 52, 51] as const;
const DECIDUOUS_UPPER_LEFT = [61, 62, 63, 64, 65] as const;
const DECIDUOUS_LOWER_RIGHT = [85, 84, 83, 82, 81] as const;
const DECIDUOUS_LOWER_LEFT = [71, 72, 73, 74, 75] as const;

/**
 * Нормализует клинический статус зуба к канонической палитре.
 */
function normalizeToothStatus(rawStatus?: string, rawStatusCode?: string): {
	category: "sound" | "caries" | "pulpitis" | "periodontitis" | "filled" | "crown" | "implant" | "missing" | "root" | "watch";
	code: string;
	label: string;
	color: string;
	badgeBg: string;
	badgeFg: string;
	svgFill: string;
	svgStroke: string;
} {
	const s = (rawStatus || "").toLowerCase();
	const c = (rawStatusCode || "").toUpperCase();

	// 1. Кариес (Caries)
	if (s.includes("caries") || s.includes("кариес") || c === "C" || c === "С") {
		return {
			category: "caries",
			code: "C",
			label: "Кариес",
			color: "#dc2626",
			badgeBg: "#fee2e2",
			badgeFg: "#991b1b",
			svgFill: "#f87171",
			svgStroke: "#b91c1c",
		};
	}

	// 2. Пульпит (Pulpitis)
	if (s.includes("pulp") || s.includes("пульпит") || c === "P") {
		return {
			category: "pulpitis",
			code: "P",
			label: "Пульпит",
			color: "#991b1b",
			badgeBg: "#ffe4e6",
			badgeFg: "#881337",
			svgFill: "#ef4444",
			svgStroke: "#7f1d1d",
		};
	}

	// 3. Периодонтит (Periodontitis)
	if (s.includes("periodont") || s.includes("периодонтит") || c === "PT") {
		return {
			category: "periodontitis",
			code: "Pt",
			label: "Периодонтит",
			color: "#7c3aed",
			badgeBg: "#f3e8ff",
			badgeFg: "#581c87",
			svgFill: "#a855f7",
			svgStroke: "#6b21a8",
		};
	}

	// 4. Пломба / Реставрация (Filled / Restoration)
	if (s.includes("fill") || s.includes("пломб") || s.includes("completed") || s.includes("реставрация") || c === "F" || c === "П") {
		return {
			category: "filled",
			code: "П",
			label: "Пломба",
			color: "#059669",
			badgeBg: "#d1fae5",
			badgeFg: "#065f46",
			svgFill: "#34d399",
			svgStroke: "#047857",
		};
	}

	// 5. Коронка / Ортопедия (Crown / Prosthetic)
	if (s.includes("crown") || s.includes("коронк") || s.includes("prosthetic") || s.includes("ортопед") || c === "K" || c === "К") {
		return {
			category: "crown",
			code: "К",
			label: "Коронка",
			color: "#2563eb",
			badgeBg: "#dbeafe",
			badgeFg: "#1e40af",
			svgFill: "#60a5fa",
			svgStroke: "#1d4ed8",
		};
	}

	// 6. Имплантат (Implant)
	if (s.includes("implant") || s.includes("имплант") || c === "I" || c === "И") {
		return {
			category: "implant",
			code: "И",
			label: "Имплантат",
			color: "#4f46e5",
			badgeBg: "#e0e7ff",
			badgeFg: "#3730a3",
			svgFill: "#818cf8",
			svgStroke: "#4338ca",
		};
	}

	// 7. Отсутствует / Удален (Missing / Extracted)
	if (s.includes("miss") || s.includes("удален") || s.includes("отсутств") || c === "0" || c === "X" || c === "О") {
		return {
			category: "missing",
			code: "0",
			label: "Отсутствует",
			color: "#94a3b8",
			badgeBg: "#f1f5f9",
			badgeFg: "#475569",
			svgFill: "#e2e8f0",
			svgStroke: "#94a3b8",
		};
	}

	// 8. Корень / Штифт (Root / Post)
	if (s.includes("root") || s.includes("корен") || c === "R" || c === "Ш") {
		return {
			category: "root",
			code: "R",
			label: "Корень",
			color: "#d97706",
			badgeBg: "#fef3c7",
			badgeFg: "#92400e",
			svgFill: "#fbbf24",
			svgStroke: "#b45309",
		};
	}

	// 9. Наблюдение (Watch / Suspicious)
	if (s.includes("watch") || s.includes("наблюден") || c === "N") {
		return {
			category: "watch",
			code: "N",
			label: "Наблюдение",
			color: "#ea580c",
			badgeBg: "#ffedd5",
			badgeFg: "#9a3412",
			svgFill: "#fdba74",
			svgStroke: "#c2410c",
		};
	}

	// По умолчанию: Здоровый (Sound / Intact)
	return {
		category: "sound",
		code: "H",
		label: "Здоровый",
		color: "#475569",
		badgeBg: "#f8fafc",
		badgeFg: "#334155",
		svgFill: "#ffffff",
		svgStroke: "#94a3b8",
	};
}

/**
 * Генерирует векторный SVG анатомической одонтограммы 5 поверхностей зуба.
 */
function renderToothSvg(num: number, statusInfo: ReturnType<typeof normalizeToothStatus>, isUpper: boolean): string {
	const w = 26;
	const h = 32;

	// Если зуб отсутствует — рисуем крест
	if (statusInfo.category === "missing") {
		return `
      <svg width="${w}" height="${h}" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
        <rect x="2" y="4" width="22" height="24" rx="3" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="2 2" fill="#f8fafc"/>
        <line x1="4" y1="6" x2="22" y2="26" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="22" y1="6" x2="4" y2="26" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
	}

	// Если имплантат — рисуем титановый винт / абатмент
	if (statusInfo.category === "implant") {
		return `
      <svg width="${w}" height="${h}" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
        <rect x="3" y="3" width="20" height="10" rx="2" fill="#818cf8" stroke="#4338ca" stroke-width="1.2"/>
        <path d="M7 13V27L13 30L19 27V13H7Z" fill="#e0e7ff" stroke="#4f46e5" stroke-width="1.2"/>
        <line x1="8" y1="17" x2="18" y2="17" stroke="#4338ca" stroke-width="1.2"/>
        <line x1="8" y1="21" x2="18" y2="21" stroke="#4338ca" stroke-width="1.2"/>
        <line x1="9" y1="25" x2="17" y2="25" stroke="#4338ca" stroke-width="1.2"/>
      </svg>
    `;
	}

	// Анатомическая схема коронки (5 поверхностей: Вестибулярная, Оральная, Мезиальная, Дистальная, Окклюзионная)
	const fill = statusInfo.svgFill;
	const stroke = statusInfo.svgStroke;

	return `
    <svg width="${w}" height="${h}" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
      <!-- Корневая часть (схематично) -->
      ${
				isUpper
					? `<path d="M7 10L13 2L19 10" stroke="${stroke}" stroke-width="1" stroke-dasharray="1.5 1.5" fill="none" opacity="0.6"/>`
					: `<path d="M7 22L13 30L19 22" stroke="${stroke}" stroke-width="1" stroke-dasharray="1.5 1.5" fill="none" opacity="0.6"/>`
			}
      <!-- Внешний контур коронки -->
      <rect x="3" y="${isUpper ? "10" : "2"}" width="20" height="20" rx="4" fill="#ffffff" stroke="${stroke}" stroke-width="1.2"/>
      
      <!-- Трапеции 4-х боковых поверхностей -->
      <polygon points="3,${isUpper ? "10" : "2"} 23,${isUpper ? "10" : "2"} 19,${isUpper ? "15" : "7"} 7,${isUpper ? "15" : "7"}" fill="${statusInfo.category !== "sound" ? fill : "#ffffff"}" opacity="${statusInfo.category !== "sound" ? "0.35" : "1"}"/>
      <polygon points="3,${isUpper ? "30" : "22"} 23,${isUpper ? "30" : "22"} 19,${isUpper ? "25" : "17"} 7,${isUpper ? "25" : "17"}" fill="${statusInfo.category !== "sound" ? fill : "#ffffff"}" opacity="${statusInfo.category !== "sound" ? "0.35" : "1"}"/>
      <polygon points="3,${isUpper ? "10" : "2"} 3,${isUpper ? "30" : "22"} 7,${isUpper ? "25" : "17"} 7,${isUpper ? "15" : "7"}" fill="${statusInfo.category !== "sound" ? fill : "#ffffff"}" opacity="${statusInfo.category !== "sound" ? "0.35" : "1"}"/>
      <polygon points="23,${isUpper ? "10" : "2"} 23,${isUpper ? "30" : "22"} 19,${isUpper ? "25" : "17"} 19,${isUpper ? "15" : "7"}" fill="${statusInfo.category !== "sound" ? fill : "#ffffff"}" opacity="${statusInfo.category !== "sound" ? "0.35" : "1"}"/>

      <!-- Центральная окклюзионная поверхность -->
      <rect x="7" y="${isUpper ? "15" : "7"}" width="12" height="10" rx="1.5" fill="${fill}" stroke="${stroke}" stroke-width="0.8"/>
      
      <!-- Если пульпит — рисуем нерв/канал -->
      ${
				statusInfo.category === "pulpitis"
					? `<circle cx="13" cy="${isUpper ? "20" : "12"}" r="2" fill="#7f1d1d"/>`
					: ""
			}
    </svg>
  `;
}

/**
 * Собирает объединенную карту состояний зубов из различных форматов входных данных.
 */
function buildConsolidatedTeethMap(options: GraphicalDentalFormulaOptions): Map<number, ToothStateData> {
	const map = new Map<number, ToothStateData>();

	// 1. Из toothStateMap
	if (options.toothStateMap) {
		for (const [key, val] of Object.entries(options.toothStateMap)) {
			const n = Number(key);
			if (n) map.set(n, val);
		}
	}

	// 2. Из dentalFormula
	if (options.dentalFormula) {
		const df = options.dentalFormula;
		if (Array.isArray(df.teeth)) {
			for (const t of df.teeth) {
				const n = Number(t.toothNumber);
				if (n) {
					map.set(n, {
						toothNumber: n,
						status: t.status || t.condition || "sound",
						statusCode: t.statusCode || t.code || "H",
						diagnosisText: t.diagnosis || t.diagnosisText,
						mobilityGrade: t.mobilityGrade || t.mobility,
					});
				}
			}
		} else if (typeof df === "object") {
			for (const [key, val] of Object.entries(df)) {
				const n = Number(key);
				if (n && typeof val === "object" && val !== null) {
					const tVal = val as any;
					map.set(n, {
						toothNumber: n,
						status: tVal.status || tVal.condition || "sound",
						statusCode: tVal.statusCode || tVal.code || "H",
						diagnosisText: tVal.diagnosisText || tVal.diagnosis,
					});
				}
			}
		}
	}

	// 3. Из clinicalToothRows
	if (Array.isArray(options.clinicalToothRows)) {
		for (const row of options.clinicalToothRows) {
			const n = Number(row.toothOrArea);
			if (n) {
				const existing = map.get(n);
				map.set(n, {
					toothNumber: n,
					status: row.status || existing?.status || "sound",
					statusCode: existing?.statusCode,
					surfaces: Array.isArray(row.surfaces) ? row.surfaces : existing?.surfaces,
					diagnosisText: row.diagnosisOrFinding || existing?.diagnosisText,
					plannedAction: row.plannedAction || existing?.plannedAction,
				});
			}
		}
	}

	return map;
}

/**
 * Рендерит отдельный квадрант зубного ряда (8 зубов) в HTML.
 */
function renderQuadrantHtml(
	teethNumbers: readonly number[],
	teethMap: Map<number, ToothStateData>,
	isUpper: boolean,
): string {
	const cells = teethNumbers.map((num) => {
		const toothData = teethMap.get(num);
		const statusInfo = normalizeToothStatus(toothData?.status, toothData?.statusCode);

		return `
      <div class="fdi-tooth-cell" style="
        flex: 1;
        min-width: 0;
        text-align: center;
        padding: 3px 1px;
        background: ${statusInfo.category !== "sound" ? statusInfo.badgeBg : "#ffffff"};
        border: 1px solid ${statusInfo.category !== "sound" ? statusInfo.color : "#e2e8f0"};
        border-radius: 4px;
        margin: 0 1px;
        box-sizing: border-box;
      ">
        <div style="font-size: 8pt; font-weight: 800; color: #0f172a; line-height: 1;">
          ${num}
        </div>
        <div style="margin: 2px 0;">
          ${renderToothSvg(num, statusInfo, isUpper)}
        </div>
        <div style="
          font-size: 7pt;
          font-weight: 700;
          color: ${statusInfo.color};
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${statusInfo.code}
        </div>
      </div>
    `;
	}).join("");

	return `
    <div style="display: flex; flex: 1; gap: 1px;">
      ${cells}
    </div>
  `;
}

/**
 * Рендерит полиграфическую векторную зубную формулу FDI (11..48 и 51..85)
 * в печатные бланки планов лечения и амбулаторной карты 043/у.
 */
export function renderGraphicalDentalFormulaHtml(options: GraphicalDentalFormulaOptions = {}): string {
	const teethMap = buildConsolidatedTeethMap(options);

	// Проверяем, есть ли хотя бы один молочный зуб (51..85)
	const hasDeciduousTeeth =
		options.showDeciduous ||
		Array.from(teethMap.keys()).some((num) => num >= 51 && num <= 85);

	// Подсчет статистики КПУ
	let cariesCount = 0;
	let pulpitisCount = 0;
	let filledCount = 0;
	let crownCount = 0;
	let implantCount = 0;
	let missingCount = 0;
	let soundCount = 0;

	for (const num of [...PERMANENT_UPPER_RIGHT, ...PERMANENT_UPPER_LEFT, ...PERMANENT_LOWER_RIGHT, ...PERMANENT_LOWER_LEFT]) {
		const t = teethMap.get(num);
		const norm = normalizeToothStatus(t?.status, t?.statusCode);
		switch (norm.category) {
			case "caries":
				cariesCount++;
				break;
			case "pulpitis":
			case "periodontitis":
				pulpitisCount++;
				break;
			case "filled":
				filledCount++;
				break;
			case "crown":
				crownCount++;
				break;
			case "implant":
				implantCount++;
				break;
			case "missing":
				missingCount++;
				break;
			default:
				soundCount++;
				break;
		}
	}

	const dmftTotal = cariesCount + pulpitisCount + filledCount + missingCount;

	const title = options.title || "Зубная формула пациента (FDI World Dental Federation)";

	return `
<!-- BEGIN_GRAPHICAL_DENTAL_FORMULA -->
<div class="dental-formula-container" style="
  box-sizing: border-box;
  margin: 10px 0 14px 0;
  padding: 10px 12px;
  background: #ffffff;
  border: 1.5px solid #0f172a;
  border-radius: 6px;
  font-family: 'PT Astra Sans', Arial, Helvetica, sans-serif;
  page-break-inside: avoid;
  break-inside: avoid;
">
  <!-- Заголовок схемы -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;">
    <div style="font-size: 9pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px;">
      ${title}
    </div>
    <div style="font-size: 8pt; color: #475569;">
      Индекс КПУ(з): <strong style="color: #0369a1; font-size: 9pt;">${dmftTotal}</strong> (К=${cariesCount + pulpitisCount}, П=${filledCount}, У=${missingCount})
    </div>
  </div>

  <!-- Верхняя челюсть -->
  <div style="margin-bottom: 6px;">
    <div style="display: flex; justify-content: space-between; font-size: 7pt; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 2px;">
      <span>Верхняя челюсть справа (18–11)</span>
      <span style="color: #0284c7;">Сагиттальная линия</span>
      <span>Верхняя челюсть слева (21–28)</span>
    </div>
    <div style="display: flex; gap: 4px; align-items: center;">
      ${renderQuadrantHtml(PERMANENT_UPPER_RIGHT, teethMap, true)}
      <div style="width: 2px; height: 50px; background: #0284c7; flex-shrink: 0;" title="Срединная линия"></div>
      ${renderQuadrantHtml(PERMANENT_UPPER_LEFT, teethMap, true)}
    </div>
  </div>

  ${
		hasDeciduousTeeth
			? `
  <!-- Молочный прикус (верхний ряд 55..51 и 61..65) -->
  <div style="margin: 4px 0; padding: 4px 8px; background: #f8fafc; border-radius: 4px;">
    <div style="text-align: center; font-size: 6.5pt; color: #64748b; margin-bottom: 2px; text-transform: uppercase; font-weight: 700;">
      Молочный прикус (55–51 | 61–65)
    </div>
    <div style="display: flex; gap: 4px; align-items: center; max-width: 70%; margin: 0 auto;">
      ${renderQuadrantHtml(DECIDUOUS_UPPER_RIGHT, teethMap, true)}
      <div style="width: 2px; height: 40px; background: #94a3b8; flex-shrink: 0;"></div>
      ${renderQuadrantHtml(DECIDUOUS_UPPER_LEFT, teethMap, true)}
    </div>
  </div>

  <!-- Молочный прикус (нижний ряд 85..81 и 71..75) -->
  <div style="margin: 4px 0; padding: 4px 8px; background: #f8fafc; border-radius: 4px;">
    <div style="display: flex; gap: 4px; align-items: center; max-width: 70%; margin: 0 auto;">
      ${renderQuadrantHtml(DECIDUOUS_LOWER_RIGHT, teethMap, false)}
      <div style="width: 2px; height: 40px; background: #94a3b8; flex-shrink: 0;"></div>
      ${renderQuadrantHtml(DECIDUOUS_LOWER_LEFT, teethMap, false)}
    </div>
    <div style="text-align: center; font-size: 6.5pt; color: #64748b; margin-top: 2px; text-transform: uppercase; font-weight: 700;">
      Молочный прикус (85–81 | 71–75)
    </div>
  </div>
  `
			: ""
	}

  <!-- Разделитель челюстей (Окклюзионная плоскость) -->
  <div style="display: flex; align-items: center; margin: 4px 0;">
    <div style="flex: 1; height: 1.5px; background: #0f172a;"></div>
    <span style="font-size: 7pt; font-weight: 800; color: #0f172a; padding: 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">
      Окклюзионная линия смыкания
    </span>
    <div style="flex: 1; height: 1.5px; background: #0f172a;"></div>
  </div>

  <!-- Нижняя челюсть -->
  <div style="margin-top: 6px;">
    <div style="display: flex; gap: 4px; align-items: center;">
      ${renderQuadrantHtml(PERMANENT_LOWER_RIGHT, teethMap, false)}
      <div style="width: 2px; height: 50px; background: #0284c7; flex-shrink: 0;" title="Срединная линия"></div>
      ${renderQuadrantHtml(PERMANENT_LOWER_LEFT, teethMap, false)}
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 7pt; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 2px;">
      <span>Нижняя челюсть справа (48–41)</span>
      <span style="color: #0284c7;">Сагиттальная линия</span>
      <span>Нижняя челюсть слева (31–38)</span>
    </div>
  </div>

  <!-- Легенда клинических обозначений -->
  <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; flex-wrap: wrap; gap: 8px; font-size: 7pt; line-height: 1.2;">
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 2px;"></span>
      <strong>H</strong> — Здоровый (${soundCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #f87171; border: 1px solid #dc2626; border-radius: 2px;"></span>
      <strong style="color: #dc2626;">C</strong> — Кариес (${cariesCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #ef4444; border: 1px solid #991b1b; border-radius: 2px;"></span>
      <strong style="color: #991b1b;">P/Pt</strong> — Пульпит/Периодонтит (${pulpitisCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #34d399; border: 1px solid #059669; border-radius: 2px;"></span>
      <strong style="color: #059669;">П</strong> — Пломба (${filledCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #60a5fa; border: 1px solid #2563eb; border-radius: 2px;"></span>
      <strong style="color: #2563eb;">К</strong> — Коронка (${crownCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #818cf8; border: 1px solid #4f46e5; border-radius: 2px;"></span>
      <strong style="color: #4f46e5;">И</strong> — Имплантат (${implantCount})
    </span>
    <span style="display: inline-flex; align-items: center; gap: 3px;">
      <span style="width: 8px; height: 8px; background: #e2e8f0; border: 1px solid #94a3b8; border-radius: 2px;"></span>
      <strong style="color: #64748b;">0</strong> — Отсутствует (${missingCount})
    </span>
  </div>
</div>
<!-- END_GRAPHICAL_DENTAL_FORMULA -->
  `;
}
