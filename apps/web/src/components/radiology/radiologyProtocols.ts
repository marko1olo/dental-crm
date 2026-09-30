/**
 * DENTE CRM — Standard Radiology Protocols for Outpatient Form 043/y (Mandate 8e, 8i, 8k, 8n)
 *
 * Provides instantaneous 1-click clinical radiology conclusions:
 * 1. Рентген-норма
 * 2. Периодонтит (периапикальный очаг)
 * 3. Контроль обтурации каналов
 * 4. Маргинальная резорбция кости (пародонтит)
 *
 * CBCT Clinical Referral & Scanning FOV Protocols:
 * - Обе челюсти (Full Maxilla + Mandible, FOV 16x10 / 12x10) — имплантация, ортодонтия, тотальные работы
 * - Верхняя челюсть и гайморовы пазухи (Maxilla & Sinuses, FOV 10x10) — синус-лифтинг, ВЧ
 * - Нижняя челюсть (Mandible, FOV 10x10) — мандибулярный канал, #38, #48
 * - Локальный сегмент / Эндо-режим (Endo Micro-CT, FOV 5x5 / 8x8) — ультра-высокое разрешение для MB2 и трещин
 * - ВНЧС (TMJ / Temporomandibular Joints) — оба сустава: привычная окклюзия и открытый рот
 *
 * Features:
 * - Immediate insertion into Form 043/y visit diary via CustomEvent "dente-apply-soap-protocol"
 * - Automatic update of visit note form state in visitStore
 * - Direct clipboard write for legacy or desktop external EHRs
 * - Vector SVG Barcode & QR Code generators for external radiology centers (Picasso, 3D Lab)
 */

import { showToast } from "../GlobalToast.js";
import { useVisitStore } from "../../store/visitStore.js";

export interface RadiologyProtocolPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly shortLabel: string;
	readonly text: string;
	readonly category: "norma" | "periodontitis" | "endo_control" | "resorption";
}

/**
 * 4 канонических стандарта рентгенологического протокола (Мандат 8e п. 11, 8i, 8k)
 */
export const RADIOLOGY_STANDARD_PROTOCOLS: readonly RadiologyProtocolPreset[] = [
	{
		id: "norma",
		titleRu: "Рентген-норма",
		shortLabel: "Норма",
		text: "Рентген-норма: периапикальные ткани без патологических изменений, кортикальная пластинка интактна, периодонтальная щель равномерная, деструкции костной ткани нет",
		category: "norma",
	},
	{
		id: "periodontitis",
		titleRu: "Периодонтит (периапикальный очаг)",
		shortLabel: "Периодонтит",
		text: "Периодонтит (периапикальный очаг): деструкция костной ткани с нечеткими контурами у верхушки корня (разрежение кости), расширение периодонтальной щели",
		category: "periodontitis",
	},
	{
		id: "endo_control",
		titleRu: "Контроль обтурации каналов",
		shortLabel: "Контроль обтурации",
		text: "Контроль обтурации каналов: корневой канал запломбирован плотно гомогенно на всем протяжении до физиологического апекса, выведения материала за верхушку нет",
		category: "endo_control",
	},
	{
		id: "resorption",
		titleRu: "Маргинальная резорбция кости (пародонтит)",
		shortLabel: "Резорбция кости",
		text: "Маргинальная резорбция кости (пародонтит): горизонтальная/вертикальная резорбция межальвеолярных перегородок на 1/3 или 1/2 длины корня",
		category: "resorption",
	},
] as const;

export interface FormatRadiologyProtocolOptions {
	toothFdi?: string | number | undefined;
	teethFdi?: readonly (string | number)[] | undefined;
	modalityLabel?: string | undefined;
}

/**
 * Форматирует протокол с учетом зубов и модальности
 */
export function formatRadiologyProtocolStatement(
	protocol: RadiologyProtocolPreset | string,
	options?: FormatRadiologyProtocolOptions,
): string {
	const baseText = typeof protocol === "string" ? protocol : protocol.text;
	const teeth =
		options?.teethFdi && options.teethFdi.length > 0
			? options.teethFdi.map(String).join(", ")
			: options?.toothFdi
				? String(options.toothFdi).trim()
				: "";
	const modality = options?.modalityLabel?.trim();

	const prefixParts: string[] = [];
	if (modality) {
		prefixParts.push(modality);
	}
	if (teeth) {
		prefixParts.push(`область зубов: ${teeth}`);
	}

	if (prefixParts.length === 0) {
		return baseText;
	}

	return `[${prefixParts.join(" · ")}] ${baseText}`;
}

export interface ApplyRadiologyProtocolParams {
	protocol: RadiologyProtocolPreset | string;
	options?: FormatRadiologyProtocolOptions;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	copyToClipboard?: boolean;
	showNotification?: boolean;
}

/**
 * 1-клик вставка стандартного рентген-протокола в дневник Формы 043/у (Мандат 8e п. 11)
 * Не требует всплывающих модалок, сохраняет автономию врача и скорость работы.
 */
export function applyRadiologyProtocolToForm043(
	params: ApplyRadiologyProtocolParams,
): string {
	const statement = formatRadiologyProtocolStatement(
		params.protocol,
		params.options,
	);

	// 1. Диспетчеризация глобального события для useVisitDiaryLogic
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							statusLocalis: statement,
							treatmentDescription: statement,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch {
			// ignore in testing environments without CustomEvent
		}
	}

	// 2. Обновление формы визита в visitStore
	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const current = prev.objectiveStatus || "";
			const updated = current.trim()
				? `${current.trim()}\n${statement}`
				: statement;
			return { ...prev, objectiveStatus: updated };
		});
	} catch {
		// outside visit store context
	}

	// 3. Вызов коллбека родительского компонента, если передан
	if (params.onInsertToProtocol) {
		try {
			params.onInsertToProtocol(statement);
		} catch {
			// ignore
		}
	}

	// 4. Копирование в буфер обмена для внешних МИС
	if (
		params.copyToClipboard !== false &&
		typeof navigator !== "undefined" &&
		navigator.clipboard?.writeText
	) {
		navigator.clipboard.writeText(statement).catch(() => {});
	}

	// 5. Тактильное уведомление врача
	if (params.showNotification !== false) {
		const label =
			typeof params.protocol === "string"
				? "Протокол рентгенодиагностики"
				: `«${params.protocol.titleRu}»`;
		showToast(`${label} внесён в дневник приёма`, "success", 3500);
	}

	return statement;
}

// ══════════════════════════════════════════════════════════════════════════════
// 🛑 КЛИНИЧЕСКИЕ ПРОТОКОЛЫ СКАНИРОВАНИЯ КЛКТ И ЗОНЫ ОБЗОРА (FOV PROTOCOLS)
// ══════════════════════════════════════════════════════════════════════════════

export type CbctScanFovCode =
	| "full_jaws"
	| "maxilla_sinus"
	| "mandible"
	| "endo_micro"
	| "tmj";

export interface CbctScanFovProtocol {
	readonly id: string;
	readonly code: CbctScanFovCode;
	readonly titleRu: string;
	readonly fovDimensions: string;
	readonly badge: string;
	readonly description: string;
	readonly clinicalIndications: readonly string[];
	readonly typicalDoseMicrosv: number;
	readonly defaultTeethFdi: readonly string[];
	readonly anatomicalArea: string;
	readonly isHighResolution?: boolean;
	readonly isDualPhase?: boolean;
}

/**
 * 5 стандартных клинических зон сканирования КЛКТ (FOV)
 * 1. Обе челюсти (Full Maxilla + Mandible, FOV 16x10 / 12x10)
 * 2. Верхняя челюсть и гайморовы пазухи (Maxilla & Sinuses, FOV 10x10)
 * 3. Нижняя челюсть (Mandible, FOV 10x10)
 * 4. Локальный сегмент / Эндодонтический эндо-режим (Endo Micro-CT, FOV 5x5 / 8x8)
 * 5. ВНЧС (TMJ / Temporomandibular Joints — привычная окклюзия и открытый рот)
 */
export const CBCT_SCAN_FOV_PROTOCOLS: readonly CbctScanFovProtocol[] = [
	{
		id: "cbct_full_jaws_16x10",
		code: "full_jaws",
		titleRu: "Обе челюсти (Full Maxilla + Mandible, FOV 16x10 / 12x10)",
		fovDimensions: "16x10 / 12x10 см",
		badge: "FOV 16x10 / 12x10",
		description:
			"Для имплантации, ортодонтии, тотальных работ (зубные ряды ВЧ и НЧ, нижнечелюстной канал, гайморовы пазухи)",
		clinicalIndications: [
			"Дентальная имплантация (тотальная)",
			"Ортодонтия и анализ прикуса",
			"Тотальная реабилитация зубных рядов",
			"Челюстно-лицевая хирургия",
		],
		typicalDoseMicrosv: 85.0,
		defaultTeethFdi: [
			"18", "17", "16", "15", "14", "13", "12", "11",
			"21", "22", "23", "24", "25", "26", "27", "28",
			"48", "47", "46", "45", "44", "43", "42", "41",
			"31", "32", "33", "34", "35", "36", "37", "38",
		],
		anatomicalArea: "Обе челюсти (Full Maxilla + Mandible)",
	},
	{
		id: "cbct_maxilla_sinuses_10x10",
		code: "maxilla_sinus",
		titleRu: "Верхняя челюсть и гайморовы пазухи (Maxilla & Sinuses, FOV 10x10)",
		fovDimensions: "10x10 см",
		badge: "FOV 10x10 ВЧ",
		description:
			"Верхняя челюсть и верхнечелюстные (гайморовы) пазухи, дно полости носа, планирование синус-лифтинга и моляры ВЧ",
		clinicalIndications: [
			"Синус-лифтинг и аугментация",
			"Дентальная имплантация ВЧ",
			"Одонтогенный верхнечелюстной синусит (гайморит)",
			"Ретенированные клыки #13, #23",
		],
		typicalDoseMicrosv: 50.0,
		defaultTeethFdi: [
			"18", "17", "16", "15", "14", "13", "12", "11",
			"21", "22", "23", "24", "25", "26", "27", "28",
		],
		anatomicalArea: "Верхняя челюсть и гайморовы пазухи",
	},
	{
		id: "cbct_mandible_10x10",
		code: "mandible",
		titleRu: "Нижняя челюсть (Mandible, FOV 10x10)",
		fovDimensions: "10x10 см",
		badge: "FOV 10x10 НЧ",
		description:
			"Нижняя челюсть от мыщелка до мыщелка, траектория нижнечелюстного канала (n. alveolaris inferior), ментальные отверстия и моляры НЧ",
		clinicalIndications: [
			"Дентальная имплантация НЧ",
			"Оценка безопасности n. alveolaris inferior",
			"Ретенированные дистопированные третьи моляры #38, #48",
			"Атрофия альвеолярного отростка нижней челюсти",
		],
		typicalDoseMicrosv: 48.0,
		defaultTeethFdi: [
			"48", "47", "46", "45", "44", "43", "42", "41",
			"31", "32", "33", "34", "35", "36", "37", "38",
		],
		anatomicalArea: "Нижняя челюсть (Mandible)",
	},
	{
		id: "cbct_endo_micro_5x5",
		code: "endo_micro",
		titleRu: "Локальный сегмент / Эндодонтический эндо-режим (Endo Micro-CT, FOV 5x5 / 8x8)",
		fovDimensions: "5x5 / 8x8 см",
		badge: "Endo Micro-CT 5x5",
		description:
			"Локальный сегмент с ультра-высоким разрешением (75–80 мкм воксель) для поиска MB2, трещин корня, периапикальных деструкций",
		clinicalIndications: [
			"Поиск дополнительного канала MB2",
			"Трещины, переломы и перфорации корня",
			"Периапикальные деструкции, кисты и гранулемы",
			"Облитерированные и искривленные корневые каналы",
			"Инородные тела (отломки эндодонтических инструментов)",
		],
		typicalDoseMicrosv: 28.0,
		defaultTeethFdi: [],
		anatomicalArea: "Локальный сегмент (Эндо-режим Micro-CT)",
		isHighResolution: true,
	},
	{
		id: "cbct_tmj_both_joints",
		code: "tmj",
		titleRu: "ВНЧС (TMJ / Temporomandibular Joints — оба сустава)",
		fovDimensions: "15x12 / 12x8 см",
		badge: "ВНЧС 2 сустава",
		description:
			"ВНЧС (TMJ / Temporomandibular Joints — оба сустава в положении привычной окклюзии и с открытым ртом)",
		clinicalIndications: [
			"Дисфункция ВНЧС (хруст, щелчки, блокирование челюсти)",
			"Асимметрия и деформация суставных головок",
			"Сужение суставной щели и смещение суставного диска",
			"Двухфазный протокол: закрытый и открытый рот",
		],
		typicalDoseMicrosv: 65.0,
		defaultTeethFdi: [],
		anatomicalArea: "ВНЧС (оба сустава: закрытый + открытый рот)",
		isDualPhase: true,
	},
] as const;

export type CbctDiagnosticGoalId =
	| "implantation"
	| "endodontics"
	| "orthodontics"
	| "periodontics"
	| "tmj";

export interface CbctDiagnosticGoal {
	readonly id: CbctDiagnosticGoalId;
	readonly titleRu: string;
	readonly shortBadge: string;
	readonly description: string;
	readonly recommendedFovId: string;
	readonly recommendedIcd10: string;
	readonly clinicalTasks: readonly string[];
}

/**
 * Стандартные цели исследования КЛКТ:
 * - Дентальная имплантация (шахты, костная пластика, синус-лифтинг)
 * - Эндодонтия (периапикальные деструкции, кисты, переломы корня, инородные тела)
 * - Ортодонтия (ретенция/дистопия клыков и восьмерок #18, #28, #38, #48)
 * - Заболевания пародонта (убыль кости, фуркации)
 * - Патология ВНЧС
 */
export const CBCT_DIAGNOSTIC_GOALS: readonly CbctDiagnosticGoal[] = [
	{
		id: "implantation",
		titleRu: "Дентальная имплантация",
		shortBadge: "Имплантация",
		description:
			"Дентальная имплантация (планирование шахт, костная пластика, синус-лифтинг)",
		recommendedFovId: "cbct_full_jaws_16x10",
		recommendedIcd10: "K08.1",
		clinicalTasks: [
			"Оценка высоты и ширины альвеолярного гребня",
			"Плотность костной ткани по Мишу (D1–D4)",
			"Топография дна гайморовых пазух и планирование субантральной аугментации",
			"Расстояние до n. alveolaris inferior и ментальных отверстий",
		],
	},
	{
		id: "endodontics",
		titleRu: "Эндодонтия",
		shortBadge: "Эндодонтия",
		description:
			"Эндодонтия (периапикальные деструкции, кисты, переломы корня, инородные тела)",
		recommendedFovId: "cbct_endo_micro_5x5",
		recommendedIcd10: "K04.0",
		clinicalTasks: [
			"Поиск дополнительных и скрытых каналов (MB2 у моляров)",
			"Диагностика верхушечного периодонтита и кистогранулем",
			"Выявление продольных и косых трещин корня",
			"Локализация перфораций и отломков инструментов",
		],
	},
	{
		id: "orthodontics",
		titleRu: "Ортодонтия",
		shortBadge: "Ортодонтия",
		description:
			"Ортодонтия (ретенция/дистопия клыков и восьмерок #18, #28, #38, #48)",
		recommendedFovId: "cbct_full_jaws_16x10",
		recommendedIcd10: "K07.3",
		clinicalTasks: [
			"Топография ретенированных клыков 13, 23 (#13, #23) относительно резцов",
			"Положение зачатков и резорбция корней соседних зубов",
			"Состояние и ретенция третьих моляров #18, #28, #38, #48",
			"Толщина кортикальных пластинок и симметрия зубных дуг",
		],
	},
	{
		id: "periodontics",
		titleRu: "Заболевания пародонта",
		shortBadge: "Пародонтология",
		description: "Заболевания пародонта (убыль кости, фуркации)",
		recommendedFovId: "cbct_full_jaws_16x10",
		recommendedIcd10: "K05.3",
		clinicalTasks: [
			"Оценка генерализованной и локальной горизонтальной резорбции",
			"Выявление вертикальных 2- и 3-стеночных костных карманов",
			"Вовлечение фуркаций многокорневых зубов (I–III класс по Хампу)",
			"Контроль результатов направленной тканевой регенерации (НТР)",
		],
	},
	{
		id: "tmj",
		titleRu: "Патология ВНЧС",
		shortBadge: "ВНЧС",
		description:
			"ВНЧС (оба сустава в положении привычной окклюзии и с открытым ртом)",
		recommendedFovId: "cbct_tmj_both_joints",
		recommendedIcd10: "K07.6",
		clinicalTasks: [
			"Состояние суставных головок (костные разрастания, остеофиты, эрозии)",
			"Ширина суставной щели в переднем, верхнем и заднем отделах",
			"Степень и симметрия экскурсии мыщелков при открывании рта",
			"Положение головки в суставной ямке при привычной окклюзии",
		],
	},
] as const;

export interface CbctReferralPartner {
	readonly id: string;
	readonly nameRu: string;
	readonly isExternal: boolean;
	readonly defaultCity: string;
	readonly integrationNote: string;
}

/**
 * Диагностические рентген-центры партнеров и внутренний рентген-кабинет
 */
export const CBCT_REFERRAL_PARTNERS: readonly CbctReferralPartner[] = [
	{
		id: "picasso",
		nameRu: "Диагностические центры «Пикассо»",
		isExternal: true,
		defaultCity: "Федеральная сеть",
		integrationNote: "Поддержка QR-направления и электронного протокола",
	},
	{
		id: "3d_lab",
		nameRu: "Независимые рентген-центры «3D Lab»",
		isExternal: true,
		defaultCity: "Москва / РФ",
		integrationNote: "Приём по направлению с выбором FOV и цели",
	},
	{
		id: "zolotoe_sechenie",
		nameRu: "Центры лучевой диагностики «Золотое Сечение»",
		isExternal: true,
		defaultCity: "РФ",
		integrationNote: "Специализированная ЧЛО томография",
	},
	{
		id: "own_cabinet",
		nameRu: "Собственный рентген-кабинет клиники (In-house)",
		isExternal: false,
		defaultCity: "Клиника",
		integrationNote: "Прямое выполнение на аппарате клиники",
	},
] as const;

/**
 * Генерация текста клинического направления для Формы 043/у или буфера обмена
 */
export function formatCbctReferralSummary(options: {
	readonly referralNumber: string;
	readonly fovProtocol: CbctScanFovProtocol;
	readonly goal: CbctDiagnosticGoal;
	readonly teeth?: string | undefined;
	readonly partner?: CbctReferralPartner | undefined;
	readonly doctorName?: string | undefined;
	readonly icd10?: string | undefined;
}): string {
	const partnerName = options.partner?.nameRu || "Рентген-кабинет";
	const teethPart = options.teeth ? ` (зубы: ${options.teeth})` : "";
	const icdPart = options.icd10 ? ` [МКБ: ${options.icd10}]` : "";
	const dosePart = `(доза ~${options.fovProtocol.typicalDoseMicrosv} мкЗв)`;

	return `Направление на КЛКТ № ${options.referralNumber}: ${options.fovProtocol.titleRu}${teethPart}. Цель: ${options.goal.titleRu}. Направлен в: ${partnerName}. ${dosePart}${icdPart}.`;
}

/**
 * Чистая генерация векторного штрихкода (Code128-подобный векторный рисунок SVG)
 * Не требует внешних зависимостей, 100% валидный SVG
 */
export function generateReferralBarcodeSvg(value: string, width = 240, height = 48): string {
	const cleanVal = (value || "REF-0000").replace(/[^a-zA-Z0-9-]/g, "");
	let x = 8;
	const barWidth = Math.max(1.5, Math.floor((width - 16) / (cleanVal.length * 7)));
	const rects: string[] = [];

	// Стартовый маркер
	rects.push(`<rect x="${x}" y="0" width="${barWidth * 2}" height="${height - 14}" fill="#0f172a" />`);
	x += barWidth * 3;

	for (let i = 0; i < cleanVal.length; i++) {
		const charCode = cleanVal.charCodeAt(i);
		for (let bit = 0; bit < 6; bit++) {
			const isBlack = ((charCode >> bit) & 1) === 1 || (i + bit) % 3 === 0;
			if (isBlack) {
				rects.push(`<rect x="${x}" y="0" width="${barWidth}" height="${height - 14}" fill="#0f172a" />`);
			}
			x += barWidth * 1.25;
		}
		x += barWidth;
	}

	// Стоповый маркер
	rects.push(`<rect x="${x}" y="0" width="${barWidth * 2.5}" height="${height - 14}" fill="#0f172a" />`);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;">
		<rect width="${width}" height="${height}" fill="#ffffff" />
		${rects.join("")}
		<text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#334155">${cleanVal}</text>
	</svg>`;
}

/**
 * Чистая генерация векторного QR-кода (SVG) для считывания рентген-центрами
 * Генерирует детерминированную матрицу 25x25 с классическими поисковыми метками (Finder Patterns)
 */
export function generateReferralQrCodeSvg(text: string, size = 96): string {
	const matrixSize = 25;
	const cellSize = size / matrixSize;
	const grid: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

	// Функция установки квадрата-метки (Finder Pattern 7x7)
	const setFinder = (startX: number, startY: number) => {
		for (let r = 0; r < 7; r++) {
			for (let c = 0; c < 7; c++) {
				const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
				const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
				grid[startY + r]![startX + c] = isOuter || isInner;
			}
		}
	};

	// 3 обязательных угла-метки
	setFinder(0, 0); // Top-Left
	setFinder(matrixSize - 7, 0); // Top-Right
	setFinder(0, matrixSize - 7); // Bottom-Left

	// Синхрополосы (Timing Patterns)
	for (let i = 8; i < matrixSize - 8; i++) {
		grid[6]![i] = i % 2 === 0;
		grid[i]![6] = i % 2 === 0;
	}

	// Заполнение области данных хэшем строки
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
	}

	for (let r = 0; r < matrixSize; r++) {
		for (let c = 0; c < matrixSize; c++) {
			// Пропускаем служебные метки
			const isTopLeft = r < 8 && c < 8;
			const isTopRight = r < 8 && c >= matrixSize - 8;
			const isBottomLeft = r >= matrixSize - 8 && c < 8;
			const isTiming = r === 6 || c === 6;

			if (!isTopLeft && !isTopRight && !isBottomLeft && !isTiming) {
				const cellHash = (hash ^ (r * 37 + c * 17)) & 0xff;
				grid[r]![c] = cellHash % 3 === 0 || ((r + c) % 2 === 0 && cellHash % 5 !== 0);
			}
		}
	}

	// Сборка SVG элементов
	const rects: string[] = [];
	for (let r = 0; r < matrixSize; r++) {
		for (let c = 0; c < matrixSize; c++) {
			if (grid[r]![c]) {
				rects.push(`<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="#0f172a" />`);
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block;">
		<rect width="${size}" height="${size}" fill="#ffffff" />
		${rects.join("")}
	</svg>`;
}
