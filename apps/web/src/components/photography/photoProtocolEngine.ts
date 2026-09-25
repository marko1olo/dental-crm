/**
 * photoProtocolEngine.ts — Clinical Photo Protocol & Before/After Comparison Engine (@dental/web)
 *
 * Fully compliant with:
 * - Клинические рекомендации Стоматологической Ассоциации России (СтАР)
 * - Стандарты стоматологического фотопротокола в ортодонтии, эстетической ортопедии и реставрации
 * - Приказ Минздрава РФ № 834н (Медицинская карта стоматологического пациента)
 * - Мандат 8e (Doctor Autonomy): 0 disabled buttons, 1-click export
 * - Мандат 8d (UI Invariants): Zero cartoon emojis, crisp Lucide styling, single-tier modals
 *
 * Core Capabilities:
 * 1. Standard 8 Dental Photo Protocol Angles:
 *    - Лицо в покое (анфас)
 *    - Улыбка (анфас)
 *    - Профиль (справа/слева)
 *    - Окклюзия фронтальная с ретрактором
 *    - Окклюзия боковая правая с зеркалом
 *    - Окклюзия боковая левая с зеркалом
 *    - Верхний зубной ряд (окклюзионный вид с зеркалом)
 *    - Нижний зубной ряд (окклюзионный вид с зеркалом)
 * 2. Interactive Before/After Comparison Slider Engine:
 *    - Split wiper with polygon clip-path math
 *    - Mouse pointer capture, wheel delta, and keyboard navigation
 *    - Side-by-side & blend comparison modes
 *    - 2D similarity transform & alignment
 * 3. 1-Click Presentation & Export Engine:
 *    - High-resolution HTML5 Canvas rendering for PNG download
 *    - Self-contained printable HTML sheet generation for 1-click PDF export
 *    - Watermarks with clinic details, patient ID, doctor, and VITA shade transitions
 */

import type { CSSProperties } from 'react';
import {
	Point2D,
	Transform2D,
	calculateSplitClipPath,
	calculateSimilarityTransform,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
	calculateCollageDimensions,
	generateCollageWatermarkText,
	CollageFormatType,
	CollageDimensionConfig,
	clamp,
} from './photoProtocolMath';
import {
	PhotoProtocolSlotDefinition,
	PhotoSlotRecord,
	DENTAL_PHOTO_SLOTS,
	SILHOUETTE_PATHS,
} from './photoGridPresets';

// Re-export mathematical and format primitives for seamless consumer usage
export {
	calculateSplitClipPath,
	calculateSimilarityTransform,
	calculateWiperWheelDelta,
	calculateKeyboardWiperDelta,
	calculateCollageDimensions,
	generateCollageWatermarkText,
};
export type { Point2D, Transform2D, CollageFormatType, CollageDimensionConfig };

// ─────────────────────────────────────────────────────────────────────────────
// 1. STANDARD 8 DENTAL PHOTO PROTOCOL ANGLES
// ─────────────────────────────────────────────────────────────────────────────

export type Standard8AngleKey =
	| 'portrait_rest'
	| 'portrait_smile'
	| 'profile'
	| 'intraoral_frontal_occlusion'
	| 'intraoral_right_buccal'
	| 'intraoral_left_buccal'
	| 'intraoral_maxillary_occlusal'
	| 'intraoral_mandibular_occlusal';

export interface Standard8AngleDefinition {
	readonly key: Standard8AngleKey;
	readonly slotId: string;
	readonly sequenceNumber: number; // 1..8
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly category: 'extraoral' | 'intraoral';
	readonly descriptionRu: string;
	readonly guideInstructionsRu: string;
	readonly requiresRetractor: boolean;
	readonly requiresMirror: boolean;
	readonly retractorType: 'none' | 'double_ended' | 'vestibular_clear' | 'contraster';
	readonly recommendedAspectRatio: '3:2' | '4:3' | '1:1';
	readonly silhouetteSvgPath: string;
	readonly clinicalCheckpointsRu: readonly string[];
}

export const STANDARD_8_CLINICAL_ANGLES: readonly Standard8AngleDefinition[] = [
	{
		key: 'portrait_rest',
		slotId: 'portrait_rest',
		sequenceNumber: 1,
		titleRu: 'Лицо в покое (анфас)',
		shortLabelRu: 'Анфас покой',
		category: 'extraoral',
		descriptionRu: 'Оценка лицевой симметрии, пропорций третей лица, Франкфуртской горизонтали и тонуса губ в расслабленном состоянии.',
		guideInstructionsRu: 'Пациент сидит прямо, взгляд направлен вперед на уровне горизонта. Губы сомкнуты без напряжения. Волосы убраны за уши. Франкфуртская горизонталь строго параллельна полу.',
		requiresRetractor: false,
		requiresMirror: false,
		retractorType: 'none',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.portraitFace,
		clinicalCheckpointsRu: [
			'Межзрачковая линия строго горизонтальна',
			'Срединно-лицевая линия вертикальна',
			'Равномерное освещение обеих половин лица',
			'Межгубная щель в покое 1-3 мм',
		],
	},
	{
		key: 'portrait_smile',
		slotId: 'portrait_smile',
		sequenceNumber: 2,
		titleRu: 'Улыбка (анфас)',
		shortLabelRu: 'Анфас улыбка',
		category: 'extraoral',
		descriptionRu: 'Оценка экспозиции резцов в покое и при улыбке, кривизны линии улыбки, десневого контура и совпадения центральных линий.',
		guideInstructionsRu: 'Пациент улыбается естественной открытой улыбкой. Объектив на уровне смыкания губ. В кадре видны резцы, премоляры и десневой край.',
		requiresRetractor: false,
		requiresMirror: false,
		retractorType: 'none',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.portraitFace,
		clinicalCheckpointsRu: [
			'Экспозиция клинических коронок верхних резцов (75-100%)',
			'Экспозиция десны в норме (<= 2 мм)',
			'Консонантность линии улыбки нижнему контуру губы',
			'Симметрия уголков рта',
		],
	},
	{
		key: 'profile',
		slotId: 'profile_90_rest',
		sequenceNumber: 3,
		titleRu: 'Профиль (справа/слева)',
		shortLabelRu: 'Профиль',
		category: 'extraoral',
		descriptionRu: 'Оценка типа профиля (прямой / выпуклый / вогнутый), носогубного угла, подбородочно-губной борозды и эстетической линии Риккетса (E-Line).',
		guideInstructionsRu: 'Пациент поворачивается строго под углом 90° к объективу. Взгляд направлен вперед на горизонт. Франкфуртская горизонталь параллельна полу.',
		requiresRetractor: false,
		requiresMirror: false,
		retractorType: 'none',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.profileFace,
		clinicalCheckpointsRu: [
			'Носогубный угол (норма 90-110°)',
			'Эстетическая линия Риккетса (E-Line: верхняя губа -4 мм, нижняя -2 мм)',
			'Подбородочно-губная борозда (глубина 3-4 мм)',
			'Четкий контур края нижней челюсти',
		],
	},
	{
		key: 'intraoral_frontal_occlusion',
		slotId: 'intraoral_frontal_occlusion',
		sequenceNumber: 4,
		titleRu: 'Окклюзия фронтальная с ретрактором',
		shortLabelRu: 'Окклюзия фронт',
		category: 'intraoral',
		descriptionRu: 'Оценка совпадения центральных линий верхней и нижней челюсти, глубины резцового перекрытия (Overbite), формы десневого края и межзубных сосочков.',
		guideInstructionsRu: 'Установите двусторонние ретракторы губ и щек. Слюноотсос для удаления пены. Объектив строго перпендикулярен окклюзионной плоскости. Пациент плотно смыкает боковые зубы в привычную окклюзию.',
		requiresRetractor: true,
		requiresMirror: false,
		retractorType: 'vestibular_clear',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralFrontal,
		clinicalCheckpointsRu: [
			'Совпадение косметического центра с лицевой срединной линией',
			'Величина резцового перекрытия (норма 1/3 высоты коронки, 2-3 мм)',
			'Окклюзионная плоскость строго горизонтальна',
			'Отсутствие слюны и пузырьков на эмали',
		],
	},
	{
		key: 'intraoral_right_buccal',
		slotId: 'intraoral_right_buccal',
		sequenceNumber: 5,
		titleRu: 'Окклюзия боковая правая с зеркалом',
		shortLabelRu: 'Боковая правая',
		category: 'intraoral',
		descriptionRu: 'Определение класса окклюзии по Энглю справа (клыки и первые моляры), контакта бугров, сагиттальной щели и окклюзионных кривых (Шпее, Уилсона).',
		guideInstructionsRu: 'Пациент смыкает зубы. Правый ретрактор оттягивается латерально и дистально. Используется боковое зеркало под углом к зубному ряду. Объектив перпендикулярен щечной поверхности моляров.',
		requiresRetractor: true,
		requiresMirror: true,
		retractorType: 'double_ended',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralBuccal,
		clinicalCheckpointsRu: [
			'Соотношение первых моляров (I, II или III класс по Энглю)',
			'Клыковое смыкание (нейтральное, дистальное, мезиальное)',
			'Видимость зубного ряда от резца до второго моляра (11-17, 41-47)',
			'Отсутствие перекрытия мягкими тканями щеки',
		],
	},
	{
		key: 'intraoral_left_buccal',
		slotId: 'intraoral_left_buccal',
		sequenceNumber: 6,
		titleRu: 'Окклюзия боковая левая с зеркалом',
		shortLabelRu: 'Боковая левая',
		category: 'intraoral',
		descriptionRu: 'Определение класса смыкания по Энглю слева (клыки и первые моляры), трансверзальных соотношений (перекрестный прикус).',
		guideInstructionsRu: 'Пациент смыкает зубы. Левый ретрактор оттягивается максимально латерально и назад. Используется боковое зеркало. Камера строго перпендикулярна левым молярам.',
		requiresRetractor: true,
		requiresMirror: true,
		retractorType: 'double_ended',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralBuccal,
		clinicalCheckpointsRu: [
			'Соотношение моляров и клыков по Энглю слева (21-27, 31-37)',
			'Бугорково-фиссурные контакты премоляров',
			'Оценка кривой Шпее слева',
		],
	},
	{
		key: 'intraoral_maxillary_occlusal',
		slotId: 'intraoral_maxillary_occlusal',
		sequenceNumber: 7,
		titleRu: 'Верхний зубной ряд (окклюзионный вид с зеркалом)',
		shortLabelRu: 'Верхний ряд',
		category: 'intraoral',
		descriptionRu: 'Форма и симметрия зубной дуги верхней челюсти, торк и ротации резцов, свод неба, небный шов, дефекты твердых тканей и окклюзионные контакты.',
		guideInstructionsRu: 'Используйте широкое окклюзионное зеркало с теплым обдувом воздухом (предотвращение запотевания). Ретракторы оттягивают верхнюю губу вперед и вверх. В кадре видна вся дуга от 17 до 27 зуба.',
		requiresRetractor: true,
		requiresMirror: true,
		retractorType: 'contraster',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralOcclusal,
		clinicalCheckpointsRu: [
			'Полная визуализация зубного ряда от 17 до 27 зуба включительно',
			'Срединный небный шов совпадает с вертикальной осью кадра',
			'Отсутствие запотевания зеркала и отражения пальцев',
			'Четкий фокус на режущих краях и фиссурах',
		],
	},
	{
		key: 'intraoral_mandibular_occlusal',
		slotId: 'intraoral_mandibular_occlusal',
		sequenceNumber: 8,
		titleRu: 'Нижний зубной ряд (окклюзионный вид с зеркалом)',
		shortLabelRu: 'Нижний ряд',
		category: 'intraoral',
		descriptionRu: 'Форма и симметрия зубного ряда нижней челюсти, скученность фронтального отдела, ротации премоляров и положение языка.',
		guideInstructionsRu: 'Окклюзионное зеркало укладывается на нижнюю челюсть. Пациент поднимает язык к мягкому небу. Ретракторы оттягивают нижнюю губу вниз. Обдув зеркала теплым воздухом.',
		requiresRetractor: true,
		requiresMirror: true,
		retractorType: 'contraster',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralOcclusal,
		clinicalCheckpointsRu: [
			'Полный зубной ряд от 37 до 47 зуба',
			'Язык отведен назад и не перекрывает язычные поверхности моляров',
			'Симметрия параболической формы дуги',
			'Симметричное освещение без бликов на зеркале',
		],
	},
];

export const STANDARD_8_ANGLES_MAP: Record<string, Standard8AngleDefinition> = Object.fromEntries(
	STANDARD_8_CLINICAL_ANGLES.flatMap((a) => [
		[a.key, a],
		[a.slotId, a],
	])
);

/**
 * Returns definition for a standard 8-angle slot.
 */
export function getStandard8Angle(keyOrSlotId: string): Standard8AngleDefinition | undefined {
	return STANDARD_8_ANGLES_MAP[keyOrSlotId];
}

export interface ProtocolCompletenessResult {
	readonly totalRequired: number; // 8
	readonly uploadedCount: number;
	readonly completionPercentage: number;
	readonly isComplete: boolean;
	readonly missingAngles: readonly Standard8AngleDefinition[];
	readonly extraoralCount: number; // 0..3
	readonly intraoralCount: number; // 0..5
}

/**
 * Computes protocol completeness against the 8 standard angles.
 */
export function calculateProtocolCompleteness(
	slots: Record<string, PhotoSlotRecord | { imageUrl?: string } | undefined>
): ProtocolCompletenessResult {
	let uploadedCount = 0;
	let extraoralCount = 0;
	let intraoralCount = 0;
	const missingAngles: Standard8AngleDefinition[] = [];

	for (const angle of STANDARD_8_CLINICAL_ANGLES) {
		const rec = slots[angle.slotId] || slots[angle.key];
		const hasImage = Boolean(rec && rec.imageUrl && rec.imageUrl.trim().length > 0);
		if (hasImage) {
			uploadedCount += 1;
			if (angle.category === 'extraoral') extraoralCount += 1;
			if (angle.category === 'intraoral') intraoralCount += 1;
		} else {
			missingAngles.push(angle);
		}
	}

	const totalRequired = 8;
	const completionPercentage = Math.round((uploadedCount / totalRequired) * 100);
	const isComplete = uploadedCount === totalRequired;

	return {
		totalRequired,
		uploadedCount,
		completionPercentage,
		isComplete,
		missingAngles,
		extraoralCount,
		intraoralCount,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. INTERACTIVE BEFORE/AFTER SLIDER ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface SliderPointerOptions {
	readonly clientX: number;
	readonly clientY: number;
	readonly containerRect: {
		readonly left: number;
		readonly top: number;
		readonly width: number;
		readonly height: number;
	};
	readonly direction?: 'vertical' | 'horizontal';
}

/**
 * Calculates clamped wiper split percent (0..100) from pointer events.
 */
export function calculatePointerPercent(options: SliderPointerOptions): number {
	const { clientX, clientY, containerRect, direction = 'vertical' } = options;
	if (direction === 'vertical') {
		if (containerRect.width <= 0) return 50;
		const relativeX = clientX - containerRect.left;
		const pct = (relativeX / containerRect.width) * 100;
		return Math.round(clamp(pct, 0, 100));
	} else {
		if (containerRect.height <= 0) return 50;
		const relativeY = clientY - containerRect.top;
		const pct = (relativeY / containerRect.height) * 100;
		return Math.round(clamp(pct, 0, 100));
	}
}

export interface LayerTransformOptions {
	readonly zoom?: number;
	readonly rotationDegrees?: number;
	readonly panX?: number;
	readonly panY?: number;
	readonly flipHorizontal?: boolean;
	readonly flipVertical?: boolean;
}

/**
 * Builds CSS style object for interactive zoom/pan/rotation alignment of comparison photos.
 */
export function calculateImageTransformStyle(options: LayerTransformOptions): CSSProperties {
	const zoom = options.zoom ?? 1.0;
	const rot = options.rotationDegrees ?? 0;
	const px = options.panX ?? 0;
	const py = options.panY ?? 0;
	const scaleX = options.flipHorizontal ? -1 : 1;
	const scaleY = options.flipVertical ? -1 : 1;

	const transform = `scale(${zoom}) rotate(${rot}deg) translate(${px}px, ${py}px) scale(${scaleX}, ${scaleY})`;

	return {
		transform,
		transformOrigin: 'center center',
		transition: 'transform 0.05s linear',
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 1-CLICK EXPORT COLLAGE ENGINE (PNG & PRINTABLE PDF)
// ─────────────────────────────────────────────────────────────────────────────

export interface BeforeAfterCollagePayload {
	readonly clinicName: string;
	readonly patientName: string;
	readonly patientCardNumber: string;
	readonly doctorName: string;
	readonly beforeTitle: string;
	readonly afterTitle: string;
	readonly beforeImageUrl?: string | undefined;
	readonly afterImageUrl?: string | undefined;
	readonly beforeShade?: string | undefined;
	readonly afterShade?: string | undefined;
	readonly dateStr?: string | undefined;
	readonly format?: CollageFormatType;
}

/**
 * Generates an official, responsive, print-ready HTML document for 1-click PDF issuance to patients.
 * Free of cartoon emojis; utilizes strict typography and high-density medical styling.
 */
export function generateBeforeAfterPrintableHtml(payload: BeforeAfterCollagePayload): string {
	const {
		clinicName,
		patientName,
		patientCardNumber,
		doctorName,
		beforeTitle,
		afterTitle,
		beforeImageUrl,
		afterImageUrl,
		beforeShade,
		afterShade,
		dateStr = new Date().toLocaleDateString('ru-RU'),
	} = payload;

	const watermark = generateCollageWatermarkText(clinicName, patientName, patientCardNumber, doctorName, dateStr);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Фотопротокол До/После — ${escapeHtml(patientName)} (${escapeHtml(patientCardNumber)})</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 10mm;
		}
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background: #f8fafc;
			color: #0f172a;
			line-height: 1.4;
			padding: 16px;
		}
		.sheet-container {
			max-width: 1200px;
			margin: 0 auto;
			background: #ffffff;
			border: 1px solid #cbd5e1;
			border-radius: 12px;
			padding: 24px;
			box-shadow: 0 4px 16px rgba(0,0,0,0.06);
		}
		.sheet-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			border-bottom: 2px solid #0f172a;
			padding-bottom: 12px;
			margin-bottom: 20px;
		}
		.clinic-brand {
			font-size: 22px;
			font-weight: 800;
			color: #0f172a;
			letter-spacing: -0.02em;
		}
		.sheet-subtitle {
			font-size: 13px;
			color: #64748b;
			margin-top: 2px;
		}
		.patient-block {
			text-align: right;
			font-size: 12px;
			color: #334155;
		}
		.patient-name {
			font-size: 15px;
			font-weight: 700;
			color: #0f172a;
		}
		.photos-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 16px;
			margin-bottom: 20px;
		}
		.photo-box {
			background: #020617;
			border-radius: 10px;
			overflow: hidden;
			height: 380px;
			display: flex;
			flex-direction: column;
			position: relative;
		}
		.photo-tag {
			position: absolute;
			top: 12px;
			left: 12px;
			background: rgba(15, 23, 42, 0.85);
			backdrop-filter: blur(4px);
			border: 1px solid rgba(255,255,255,0.2);
			color: #ffffff;
			padding: 4px 12px;
			border-radius: 6px;
			font-size: 13px;
			font-weight: 700;
			z-index: 2;
		}
		.photo-tag.before { color: #38bdf8; }
		.photo-tag.after { color: #4ade80; }
		.photo-img {
			width: 100%;
			height: 100%;
			object-fit: contain;
			background: #020617;
		}
		.photo-empty {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100%;
			color: #64748b;
			font-size: 13px;
			font-weight: 600;
		}
		.shade-badge-bar {
			display: flex;
			justify-content: space-between;
			align-items: center;
			background: #f1f5f9;
			border: 1px solid #e2e8f0;
			border-radius: 8px;
			padding: 10px 16px;
			margin-bottom: 16px;
			font-size: 13px;
			font-weight: 600;
		}
		.sheet-footer {
			border-top: 1px solid #e2e8f0;
			padding-top: 12px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 11px;
			color: #64748b;
		}
		@media print {
			body { background: #fff; padding: 0; }
			.sheet-container { border: none; box-shadow: none; padding: 0; }
			.no-print { display: none !important; }
		}
	</style>
</head>
<body>
	<div class="sheet-container">
		<header class="sheet-header">
			<div>
				<div class="clinic-brand">${escapeHtml(clinicName)}</div>
				<div class="sheet-subtitle">Клинический фотопротокол До / После (Стоматологический стандарт СтАР)</div>
			</div>
			<div class="patient-block">
				<div class="patient-name">Пациент: ${escapeHtml(patientName)}</div>
				<div>Медицинская карта: <strong>${escapeHtml(patientCardNumber)}</strong> • Дата: ${escapeHtml(dateStr)}</div>
				<div>Лечащий врач: ${escapeHtml(doctorName)}</div>
			</div>
		</header>

		${
			beforeShade || afterShade
				? `<div class="shade-badge-bar">
						<span>Динамика эстетической реставрации (Шкала VITA):</span>
						<span><strong>ДО:</strong> ${escapeHtml(beforeShade || '—')} → <strong>ПОСЛЕ:</strong> ${escapeHtml(afterShade || '—')}</span>
				   </div>`
				: ''
		}

		<main class="photos-grid">
			<div class="photo-box">
				<div class="photo-tag before">ДО: ${escapeHtml(beforeTitle)}</div>
				${
					beforeImageUrl
						? `<img src="${beforeImageUrl}" alt="До" class="photo-img" />`
						: `<div class="photo-empty">Снимок «До» отсутствует</div>`
				}
			</div>
			<div class="photo-box">
				<div class="photo-tag after">ПОСЛЕ: ${escapeHtml(afterTitle)}</div>
				${
					afterImageUrl
						? `<img src="${afterImageUrl}" alt="После" class="photo-img" />`
						: `<div class="photo-empty">Снимок «После» отсутствует</div>`
				}
			</div>
		</main>

		<footer class="sheet-footer">
			<div>${escapeHtml(watermark)}</div>
			<div>Подпись врача: ____________________ / ${escapeHtml(doctorName)} /</div>
		</footer>
	</div>
	<script>
		window.onload = function() {
			window.focus();
		};
	</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Triggers 1-click printable PDF view in a browser popup/window.
 */
export function exportCollageAsPdf(payload: BeforeAfterCollagePayload): void {
	const html = generateBeforeAfterPrintableHtml(payload);
	const printWindow = window.open('', '_blank');
	if (printWindow) {
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
		}, 300);
	}
}

/**
 * Triggers 1-click high-resolution PNG download rendered on HTML5 canvas.
 */
export async function exportCollageAsPng(payload: BeforeAfterCollagePayload): Promise<string> {
	const format = payload.format || '16_9_hd';
	const dims = calculateCollageDimensions(format);

	const canvas = document.createElement('canvas');
	canvas.width = dims.widthPx;
	canvas.height = dims.heightPx;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Canvas 2D context is unavailable');
	}

	// Slate-900 clinical backdrop
	ctx.fillStyle = '#0f172a';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Header banner
	const headerHeight = Math.round(canvas.height * 0.12);
	ctx.fillStyle = '#1e293b';
	ctx.fillRect(0, 0, canvas.width, headerHeight);

	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 36px sans-serif';
	ctx.fillText(payload.clinicName, 40, 55);

	ctx.font = '20px sans-serif';
	ctx.fillStyle = '#94a3b8';
	ctx.fillText('Клинический фотопротокол До / После (Стоматологический стандарт СтАР)', 40, 92);

	// Top Right Patient Details
	ctx.textAlign = 'right';
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 20px sans-serif';
	ctx.fillText(`Пациент: ${payload.patientName} (${payload.patientCardNumber})`, canvas.width - 40, 50);

	ctx.font = '16px sans-serif';
	ctx.fillStyle = '#94a3b8';
	ctx.fillText(`Врач: ${payload.doctorName} • ${payload.dateStr || new Date().toLocaleDateString('ru-RU')}`, canvas.width - 40, 80);

	if (payload.beforeShade || payload.afterShade) {
		ctx.fillText(`VITA: ДО ${payload.beforeShade || '—'} → ПОСЛЕ ${payload.afterShade || '—'}`, canvas.width - 40, 108);
	}
	ctx.textAlign = 'left';

	// Draw Before and After images side-by-side
	const contentY = headerHeight + 24;
	const contentHeight = canvas.height - contentY - 48;
	const colWidth = (canvas.width - 72) / 2;

	const [imgBefore, imgAfter] = await Promise.all([
		loadImageSafe(payload.beforeImageUrl),
		loadImageSafe(payload.afterImageUrl),
	]);

	// Draw Before Column
	if (imgBefore) {
		ctx.drawImage(imgBefore, 24, contentY, colWidth, contentHeight);
	} else {
		ctx.fillStyle = '#1e293b';
		ctx.fillRect(24, contentY, colWidth, contentHeight);
		ctx.fillStyle = '#64748b';
		ctx.font = 'bold 20px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(`Кадр «До» не загружен (${payload.beforeTitle})`, 24 + colWidth / 2, contentY + contentHeight / 2);
		ctx.textAlign = 'left';
	}
	// Before Badge
	ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
	ctx.fillRect(36, contentY + 16, 260, 42);
	ctx.fillStyle = '#38bdf8';
	ctx.font = 'bold 20px sans-serif';
	ctx.fillText(`ДО: ${payload.beforeTitle}`, 48, contentY + 44);

	// Draw After Column
	const afterColX = 24 + colWidth + 24;
	if (imgAfter) {
		ctx.drawImage(imgAfter, afterColX, contentY, colWidth, contentHeight);
	} else {
		ctx.fillStyle = '#1e293b';
		ctx.fillRect(afterColX, contentY, colWidth, contentHeight);
		ctx.fillStyle = '#64748b';
		ctx.font = 'bold 20px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(`Кадр «После» не загружен (${payload.afterTitle})`, afterColX + colWidth / 2, contentY + contentHeight / 2);
		ctx.textAlign = 'left';
	}
	// After Badge
	ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
	ctx.fillRect(afterColX + 12, contentY + 16, 260, 42);
	ctx.fillStyle = '#4ade80';
	ctx.font = 'bold 20px sans-serif';
	ctx.fillText(`ПОСЛЕ: ${payload.afterTitle}`, afterColX + 24, contentY + 44);

	// Legal Watermark Bar
	const watermarkText = generateCollageWatermarkText(
		payload.clinicName,
		payload.patientName,
		payload.patientCardNumber,
		payload.doctorName,
		payload.dateStr
	);
	ctx.fillStyle = '#090d16';
	ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
	ctx.fillStyle = '#64748b';
	ctx.font = '14px sans-serif';
	ctx.fillText(watermarkText, 24, canvas.height - 13);

	const dataUrl = canvas.toDataURL('image/png');
	const filename = `PhotoProtocol_${payload.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;

	// Trigger browser download
	const downloadLink = document.createElement('a');
	downloadLink.download = filename;
	downloadLink.href = dataUrl;
	downloadLink.click();

	return dataUrl;
}

function loadImageSafe(url?: string): Promise<HTMLImageElement | null> {
	if (!url || typeof Image === 'undefined') return Promise.resolve(null);
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = () => resolve(null);
		img.src = url;
	});
}
