/**
 * Osseointegration Dynamics & Loading Protocol Engine (RFA ISQ / Torque Analysis)
 * Multi-directional probe aggregation, timeline remodeling tracking, clinical recommendations, Form 043/u diary.
 */

import {
	TorqueBandCategory,
	IsqStabilityLevel,
	MischBoneDensity,
	LoadingProtocolRecommendation,
	classifyTorqueBand,
	classifyIsqLevel,
	TORQUE_STANDARDS,
	ISQ_THRESHOLDS,
	MISCH_BONE_DENSITIES
} from './implantIsqPresets';

export interface DirectionalIsqReadings {
	vestibularBuccal: number;
	lingualPalatal: number;
	mesial: number;
	distal: number;
}

export interface IsqMeasurementStage {
	stageId: 'day_0_insertion' | 'week_2_remodeling' | 'week_6_early' | 'week_12_mature';
	labelRu: string;
	daysPostOp: number;
	readings: DirectionalIsqReadings;
	meanIsq: number;
	insertionTorqueNcm?: number;
	timestampIso: string;
}

export interface ImplantIsqAssessmentInput {
	implantSystemName: string;
	fixtureArticle?: string;
	diameterMm: number;
	lengthMm: number;
	toothNumberFdi: number | string;
	insertionTorqueNcm: number;
	boneDensity: MischBoneDensity;
	isqReadings?: DirectionalIsqReadings | undefined;
	isIsqMeasured?: boolean | undefined;
	isGbrOrSinusLift: boolean;
	isImmediateExtractionSocket: boolean;
	previousStages?: IsqMeasurementStage[];
	surgeonName: string;
}

export interface ImplantIsqAssessmentResult {
	implantSystemName: string;
	toothNumberFdi: number | string;
	insertionTorqueNcm: number;
	torqueCategory: TorqueBandCategory;
	torqueStatusRu: string;
	directionalIsq: DirectionalIsqReadings;
	meanIsq: number;
	minIsq: number;
	maxIsq: number;
	anisotropyDeltaIsq: number;
	isqLevel: IsqStabilityLevel;
	isqStatusRu: string;
	isIsqMeasured: boolean;
	boneDensity: MischBoneDensity;
	loadingRecommendation: LoadingProtocolRecommendation;
	loadingRecommendationTitleRu: string;
	clinicalRationaleRu: string;
	warnings: string[];
	deltaFromBaselineIsq: number | null;
	osseointegrationVelocityRu: string;
	diaryEntryRu: string;
	implantPassportSnippetRu: string;
}

// ---------------------------------------------------------------------------
// 1. ISQ Directional Statistics
// ---------------------------------------------------------------------------

export function calculateIsqDirectionalStats(readings: DirectionalIsqReadings): {
	meanIsq: number;
	minIsq: number;
	maxIsq: number;
	anisotropyDelta: number;
} {
	const values = [
		Math.max(1, Math.min(100, readings.vestibularBuccal)),
		Math.max(1, Math.min(100, readings.lingualPalatal)),
		Math.max(1, Math.min(100, readings.mesial)),
		Math.max(1, Math.min(100, readings.distal)),
	];

	const sum = values.reduce((acc, v) => acc + v, 0);
	const meanIsq = Number((sum / values.length).toFixed(1));
	const minIsq = Math.min(...values);
	const maxIsq = Math.max(...values);
	const anisotropyDelta = maxIsq - minIsq;

	return { meanIsq, minIsq, maxIsq, anisotropyDelta };
}

// ---------------------------------------------------------------------------
// 2. Osseointegration Timeline & Recommendation Algorithm
// ---------------------------------------------------------------------------

export function evaluateImplantIsqStability(input: ImplantIsqAssessmentInput): ImplantIsqAssessmentResult {
	const torqueInfo = classifyTorqueBand(input.insertionTorqueNcm);
	const isIsqMeasured = input.isIsqMeasured ?? (input.isqReadings !== undefined);
	const defaultReadings: DirectionalIsqReadings = {
		vestibularBuccal: 70,
		lingualPalatal: 70,
		mesial: 70,
		distal: 70,
	};
	const readings = input.isqReadings ?? defaultReadings;
	const stats = calculateIsqDirectionalStats(readings);
	const isqInfo = classifyIsqLevel(stats.meanIsq);

	const warnings: string[] = [];

	if (input.insertionTorqueNcm >= 50) {
		warnings.push(
			'ВНИМАНИЕ: Пиковый торк >= 50 Н·см. Риск ишемического сдавливания сосудистого русла кортикала. Контролируйте уровень маргинальной кости.'
		);
	}

	if (isIsqMeasured && stats.anisotropyDelta >= 15) {
		warnings.push(
			`Выраженная анизотропия фиксации (ΔISQ = ${stats.anisotropyDelta}). Возможен локальный костный дефект или тонкая вестибулярная кортикальная пластинка.`
		);
	}

	if (input.isGbrOrSinusLift) {
		warnings.push('Проведена костная пластика / синус-лифтинг. Протокол требует пролонгированного периода покоя (4–6 месяцев).');
	}

	// Loading protocol recommendation
	let loadingRecommendation: LoadingProtocolRecommendation = 'delayed_loading_3_months';
	let loadingRecommendationTitleRu = 'Двухэтапный протокол (отсроченная нагрузка через 3-4 месяца)';
	let clinicalRationaleRu = 'Показан классический период заживления без ранней нагрузки.';

	if (input.isGbrOrSinusLift) {
		loadingRecommendation = 'extended_healing_gbr';
		loadingRecommendationTitleRu = 'Пролонгированная интеграция с НКР (4–6 месяцев)';
		clinicalRationaleRu = 'Сайт после костной аугментации / синус-лифтинга требует полной васкуляризации костного графта до приложения жевательных сил.';
	} else if (isIsqMeasured) {
		if (input.insertionTorqueNcm >= 35 && stats.meanIsq >= 70 && !input.isImmediateExtractionSocket) {
			loadingRecommendation = 'immediate_loading_safe';
			loadingRecommendationTitleRu = 'Протокол немедленной нагрузки (Immediate Loading)';
			clinicalRationaleRu = `Высокий торк (${input.insertionTorqueNcm} Н·см) и высокий показатель RFA (${stats.meanIsq} ISQ) гарантируют микроподвижность < 50-100 мкм. Разрешена установка провизорной коронки вне окклюзии.`;
		} else if (input.insertionTorqueNcm >= 20 && stats.meanIsq >= 60) {
			loadingRecommendation = 'early_loading_6_weeks';
			loadingRecommendationTitleRu = 'Ранняя нагрузка через 6–8 недель (Early Loading)';
			clinicalRationaleRu = `Стабильность в пределах нормы (${input.insertionTorqueNcm} Н·см, ${stats.meanIsq} ISQ). Рекомендована установка формирователя десны и контрольное измерение ISQ через 6 недель.`;
		} else {
			loadingRecommendation = 'delayed_loading_3_months';
			loadingRecommendationTitleRu = 'Отсроченная нагрузка (Conventional 3–4 месяца)';
			clinicalRationaleRu = `Низкая первичная стабильность (${input.insertionTorqueNcm} Н·см / ${stats.meanIsq} ISQ). Установка заглушки, ушивание наглухо для предотвращения фиброинтеграции.`;
		}
	} else {
		// Pure torque-based evaluation (without Osstell ISQ machine)
		if (input.insertionTorqueNcm >= 35 && !input.isImmediateExtractionSocket) {
			loadingRecommendation = 'immediate_loading_safe';
			loadingRecommendationTitleRu = 'Протокол немедленной нагрузки (Immediate Loading)';
			clinicalRationaleRu = `Высокий первичный торк (${input.insertionTorqueNcm} Н·см) по динамометрическому ключу гарантирует жесткую фиксацию (микроподвижность < 50-100 мкм). Разрешена установка формирователя десны или провизорной коронки вне окклюзии.`;
		} else if (input.insertionTorqueNcm >= 20) {
			loadingRecommendation = 'early_loading_6_weeks';
			loadingRecommendationTitleRu = 'Ранняя нагрузка через 6–8 недель (Early Loading)';
			clinicalRationaleRu = `Стандартная первичная стабильность по ключу (${input.insertionTorqueNcm} Н·см). Рекомендована установка формирователя десны или двухэтапный протокол.`;
		} else {
			loadingRecommendation = 'delayed_loading_3_months';
			loadingRecommendationTitleRu = 'Отсроченная нагрузка (Conventional 3–4 месяца)';
			clinicalRationaleRu = `Низкий первичный торк (< 20 Н·см). Показана установка винта-заглушки и глухое ушивание слизистой на 3-4 месяца для предотвращения фиброинтеграции.`;
		}
	}

	// Baseline comparison
	let deltaFromBaselineIsq: number | null = null;
	let osseointegrationVelocityRu = isIsqMeasured ? 'Первичная оценка (Day 0)' : 'Контроль по торку (Day 0)';

	if (isIsqMeasured && input.previousStages && input.previousStages.length > 0) {
		const baseline = input.previousStages[0]!;
		deltaFromBaselineIsq = Number((stats.meanIsq - baseline.meanIsq).toFixed(1));

		if (deltaFromBaselineIsq >= 5) {
			osseointegrationVelocityRu = `Высокая динамика остеоинтеграции (+${deltaFromBaselineIsq} ISQ, вторичная стабильность сформирована)`;
		} else if (deltaFromBaselineIsq >= -4) {
			osseointegrationVelocityRu = `Физиологическая перестройка (${deltaFromBaselineIsq > 0 ? '+' : ''}${deltaFromBaselineIsq} ISQ, фаза моделирования кости)`;
		} else {
			osseointegrationVelocityRu = `Отрицательная динамика (${deltaFromBaselineIsq} ISQ, риск фиброинтеграции/перегрузки)`;
			warnings.push('ВНИМАНИЕ: Падение показателя ISQ > 5 единиц указывает на резорбцию кости или потерю стабильности!');
		}
	}

	// Diary & Passport Generation
	const diaryEntryRu = generateImplantSurgeryDiaryEntry({
		toothNumberFdi: input.toothNumberFdi,
		implantSystemName: input.implantSystemName,
		diameterMm: input.diameterMm,
		lengthMm: input.lengthMm,
		insertionTorqueNcm: input.insertionTorqueNcm,
		boneDensity: input.boneDensity,
		stats,
		isIsqMeasured,
		loadingRecommendationTitleRu,
		surgeonName: input.surgeonName
	});

	const implantPassportSnippetRu = generateImplantPassportRecord({
		toothNumberFdi: input.toothNumberFdi,
		implantSystemName: input.implantSystemName,
		diameterMm: input.diameterMm,
		lengthMm: input.lengthMm,
		insertionTorqueNcm: input.insertionTorqueNcm,
		meanIsq: stats.meanIsq,
		isIsqMeasured,
		surgeonName: input.surgeonName
	});

	return {
		implantSystemName: input.implantSystemName,
		toothNumberFdi: input.toothNumberFdi,
		insertionTorqueNcm: input.insertionTorqueNcm,
		torqueCategory: torqueInfo.id,
		torqueStatusRu: torqueInfo.statusBadgeRu,
		directionalIsq: readings,
		meanIsq: stats.meanIsq,
		minIsq: stats.minIsq,
		maxIsq: stats.maxIsq,
		anisotropyDeltaIsq: stats.anisotropyDelta,
		isqLevel: isqInfo.level,
		isqStatusRu: isIsqMeasured ? isqInfo.nameRu : 'Контроль по торку (без аппарата ISQ)',
		isIsqMeasured,
		boneDensity: input.boneDensity,
		loadingRecommendation,
		loadingRecommendationTitleRu,
		clinicalRationaleRu,
		warnings,
		deltaFromBaselineIsq,
		osseointegrationVelocityRu,
		diaryEntryRu,
		implantPassportSnippetRu
	};
}

// ---------------------------------------------------------------------------
// 3. Clinical Diary & Implant Passport Generators
// ---------------------------------------------------------------------------

export function generateImplantSurgeryDiaryEntry(params: {
	toothNumberFdi: number | string;
	implantSystemName: string;
	diameterMm: number;
	lengthMm: number;
	insertionTorqueNcm: number;
	boneDensity: MischBoneDensity;
	stats: { meanIsq: number; minIsq: number; maxIsq: number };
	isIsqMeasured?: boolean;
	loadingRecommendationTitleRu: string;
	surgeonName: string;
}): string {
	const isqMeasured = params.isIsqMeasured ?? (params.stats.meanIsq > 0);
	const stabilityPart = isqMeasured
		? `Резонансно-частотный анализ стабильности (RFA Osstell/Penguin): ISQ средний = ${params.stats.meanIsq} (диапазон ${params.stats.minIsq}..${params.stats.maxIsq} ISQ). `
		: `Контроль стабильности: по торку динамометрического ключа (${params.insertionTorqueNcm} Н·см, без аппарата ISQ). `;

	return `Протокол дентальной имплантации (Форма № 043/у): В области отсутствующего зуба ${params.toothNumberFdi} сформировано костное ложе в кости типа ${params.boneDensity}. Установлен дентальный имплантат ${params.implantSystemName} Ø${params.diameterMm} x ${params.lengthMm} мм. Первичный торк фиксации: ${params.insertionTorqueNcm} Н·см. ${stabilityPart}Клиническое решение: ${params.loadingRecommendationTitleRu}. Хирург: ${params.surgeonName}.`;
}

export function generateImplantPassportRecord(params: {
	toothNumberFdi: number | string;
	implantSystemName: string;
	diameterMm: number;
	lengthMm: number;
	insertionTorqueNcm: number;
	meanIsq: number;
	isIsqMeasured?: boolean;
	surgeonName: string;
}): string {
	const now = new Date().toLocaleDateString('ru-RU');
	const isqMeasured = params.isIsqMeasured ?? (params.meanIsq > 0);
	const isqPart = isqMeasured ? ` • ISQ: ${params.meanIsq}` : ` • Контроль по торку (без ISQ)`;
	return `ПАСПОРТ ИМПЛАНТАТА • Зуб ${params.toothNumberFdi} • ${params.implantSystemName} Ø${params.diameterMm}x${params.lengthMm}мм • Дата: ${now} • Торк: ${params.insertionTorqueNcm} Н·см${isqPart} • Врач: ${params.surgeonName}`;
}
