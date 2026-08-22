/**
 * Clinical Implant Insertion Torque & Resonance Frequency Analysis (RFA) Presets
 * Standards for Osstell / Penguin ISQ (Implant Stability Quotient), Torque Bands, and Bone Density (Misch)
 */

export type TorqueBandCategory =
	| 'insufficient_stability' // < 20 Ncm
	| 'standard_stability'     // 20 - 35 Ncm
	| 'high_stability'         // 35 - 45 Ncm
	| 'excessive_torque_risk'; // > 50 Ncm

export type IsqStabilityLevel =
	| 'isq_low'      // < 60
	| 'isq_moderate' // 60 - 69
	| 'isq_high';    // >= 70

export type MischBoneDensity = 'D1' | 'D2' | 'D3' | 'D4';

export type LoadingProtocolRecommendation =
	| 'immediate_loading_safe'      // Immediate provisional loading (non-functional occlusal)
	| 'early_loading_6_weeks'       // Early loading at 6-8 weeks
	| 'delayed_loading_3_months'    // Conventional 2-stage loading at 3-4 months
	| 'extended_healing_gbr';       // Extended 4-6 months for bone grafts / sinus lift

export interface TorqueBandInfo {
	id: TorqueBandCategory;
	minTorqueNcm: number;
	maxTorqueNcm: number;
	nameRu: string;
	statusBadgeRu: string;
	clinicalImplicationRu: string;
	recommendedSurgicalActionRu: string;
	colorToken: string;
}

export interface IsqThresholdInfo {
	level: IsqStabilityLevel;
	minIsq: number;
	maxIsq: number;
	nameRu: string;
	clinicalDescriptionRu: string;
	loadingAllowed: boolean;
	colorToken: string;
}

export interface MischBoneDensityInfo {
	id: MischBoneDensity;
	nameRu: string;
	anatomicalLocationRu: string;
	tactileHounsfieldRu: string;
	expectedPrimaryTorqueNcm: string;
	recommendedDrillingProtocolRu: string;
}

// ---------------------------------------------------------------------------
// 1. Insertion Torque Standards (N·cm)
// ---------------------------------------------------------------------------

export const TORQUE_STANDARDS: Record<TorqueBandCategory, TorqueBandInfo> = {
	insufficient_stability: {
		id: 'insufficient_stability',
		minTorqueNcm: 0,
		maxTorqueNcm: 19.9,
		nameRu: 'Низкая первичная стабильность (< 20 Н·см)',
		statusBadgeRu: 'Двухэтапный протокол / Заглушка',
		clinicalImplicationRu: 'Высокий риск микроподвижности имплантата (> 150 мкм) и фиброинтеграции при ранней нагрузке.',
		recommendedSurgicalActionRu: 'Установка винта-заглушки (cover screw), глухое ушивание слизистой на 4–6 месяцев. Нагрузка строго запрещена.',
		colorToken: 'var(--warn, #f59e0b)'
	},
	standard_stability: {
		id: 'standard_stability',
		minTorqueNcm: 20,
		maxTorqueNcm: 34.9,
		nameRu: 'Стандартная стабильность (20–35 Н·см)',
		statusBadgeRu: 'Формирователь десны / 6–8 недель',
		clinicalImplicationRu: 'Адекватная фиксация в кортикальной кости. Микроподвижность в пределах физиологического окна адаптации.',
		recommendedSurgicalActionRu: 'Установка формирователя десны (healing abutment) или двухэтапный протокол. Ранняя нагрузка через 6–8 недель при контроле ISQ.',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	high_stability: {
		id: 'high_stability',
		minTorqueNcm: 35,
		maxTorqueNcm: 49.9,
		nameRu: 'Высокая стабильность (35–45 Н·см)',
		statusBadgeRu: 'Немедленная нагрузка разрешена',
		clinicalImplicationRu: 'Идеальная механическая фиксация. Допускает протокол All-on-4/6 или одиночную немедленную временную коронку вне прикуса.',
		recommendedSurgicalActionRu: 'Немедленная нагрузка провизорной коронкой с выведением из суперконтактов или установка формирователя.',
		colorToken: 'var(--ok, #10b981)'
	},
	excessive_torque_risk: {
		id: 'excessive_torque_risk',
		minTorqueNcm: 50,
		maxTorqueNcm: 100,
		nameRu: 'Избыточный торк (> 50 Н·см / Риск некроза)',
		statusBadgeRu: 'Опасность компрессионного некроза',
		clinicalImplicationRu: 'Критическое сдавливание капиллярного русла кортикальной кости. Риск ишемического асептического некроза и ранней резорбции кости.',
		recommendedSurgicalActionRu: 'Рекомендуется выкрутить имплантат на 1–2 оборота, пройти кортикальной фрезой (метчиком) или дорезать резьбу для снятия пикового напряжения.',
		colorToken: 'var(--bad, #ef4444)'
	}
};

// ---------------------------------------------------------------------------
// 2. Osstell / Penguin RFA Stability Quotient (ISQ Scale 1–100)
// ---------------------------------------------------------------------------

export const ISQ_THRESHOLDS: Record<IsqStabilityLevel, IsqThresholdInfo> = {
	isq_low: {
		level: 'isq_low',
		minIsq: 1,
		maxIsq: 59,
		nameRu: 'Низкая стабильность (ISQ < 60)',
		clinicalDescriptionRu: 'Недостаточная жесткость фиксации титанового штифта в костной ткани. Нагрузка противопоказана.',
		loadingAllowed: false,
		colorToken: 'var(--bad, #ef4444)'
	},
	isq_moderate: {
		level: 'isq_moderate',
		minIsq: 60,
		maxIsq: 69,
		nameRu: 'Средняя стабильность (ISQ 60–69)',
		clinicalDescriptionRu: 'Удовлетворительная остеоинтеграция. Разрешено протезирование в ранние сроки (6–8 недель) при отсутствии отрицательной динамики.',
		loadingAllowed: true,
		colorToken: 'var(--warn, #f59e0b)'
	},
	isq_high: {
		level: 'isq_high',
		minIsq: 70,
		maxIsq: 100,
		nameRu: 'Высокая стабильность (ISQ >= 70)',
		clinicalDescriptionRu: 'Превосходная жесткость остеоинтеграции (> 70 ISQ). Протокол немедленной нагрузки (Immediate Loading) полностью безопасен.',
		loadingAllowed: true,
		colorToken: 'var(--ok, #10b981)'
	}
};

// ---------------------------------------------------------------------------
// 3. Bone Density by Misch Classification
// ---------------------------------------------------------------------------

export const MISCH_BONE_DENSITIES: Record<MischBoneDensity, MischBoneDensityInfo> = {
	D1: {
		id: 'D1',
		nameRu: 'D1: Плотная кортикальная кость (> 1250 HU)',
		anatomicalLocationRu: 'Передний отдел атрофированной нижней челюсти (между ментальными отверстиями).',
		tactileHounsfieldRu: 'Ощущение сверления дуба / твердого дерева (> 1250 HU).',
		expectedPrimaryTorqueNcm: '45–60 Н·см (обязательно нарезание резьбы метчиком)',
		recommendedDrillingProtocolRu: 'Препарирование на полную глубину с обильным охлаждением, калибровка профильной кортикальной фрезой, нарезание резьбы.'
	},
	D2: {
		id: 'D2',
		nameRu: 'D2: Толстая кортикальная пластинка + плотная губчатая (850–1250 HU)',
		anatomicalLocationRu: 'Боковые отделы нижней челюсти, передний отдел верхней челюсти.',
		tactileHounsfieldRu: 'Ощущение сверления белой сосны (850–1250 HU).',
		expectedPrimaryTorqueNcm: '35–45 Н·см (оптимально для немедленной нагрузки)',
		recommendedDrillingProtocolRu: 'Стандартный протокол сверления по протоколу производителя системы.'
	},
	D3: {
		id: 'D3',
		nameRu: 'D3: Тонкая пористая кортикальная + рыхлая губчатая (350–850 HU)',
		anatomicalLocationRu: 'Боковые отделы верхней челюсти, передний отдел верхней челюсти после резорбции.',
		tactileHounsfieldRu: 'Ощущение сверления бальзового дерева (350–850 HU).',
		expectedPrimaryTorqueNcm: '20–35 Н·см',
		recommendedDrillingProtocolRu: 'Андердриллинг (недопрепарирование ложа на 0.5 мм по диаметру) для компрессионного остеоконденсирования.'
	},
	D4: {
		id: 'D4',
		nameRu: 'D4: Очень мягкая губчатая кость без выраженного кортикала (150–350 HU)',
		anatomicalLocationRu: 'Бугры верхней челюсти (tuber maxillae), область после синус-лифтинга.',
		tactileHounsfieldRu: 'Ощущение сверления пенопласта / полистирола (150–350 HU).',
		expectedPrimaryTorqueNcm: '10–20 Н·см (высокий риск потери стабильности)',
		recommendedDrillingProtocolRu: 'Применение остеотомов (компрессионная техника) вместо фрез, имплантаты с агрессивной конической резьбой (BLX, NobelActive).'
	}
};

export function classifyTorqueBand(torqueNcm: number): TorqueBandInfo {
	if (torqueNcm < 20) return TORQUE_STANDARDS.insufficient_stability;
	if (torqueNcm < 35) return TORQUE_STANDARDS.standard_stability;
	if (torqueNcm <= 50) return TORQUE_STANDARDS.high_stability;
	return TORQUE_STANDARDS.excessive_torque_risk;
}

export function classifyIsqLevel(meanIsq: number): IsqThresholdInfo {
	if (meanIsq < 60) return ISQ_THRESHOLDS.isq_low;
	if (meanIsq < 70) return ISQ_THRESHOLDS.isq_moderate;
	return ISQ_THRESHOLDS.isq_high;
}
