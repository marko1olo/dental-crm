import type { DentalNeedleInfo, NeedleGaugeType } from './anesthesiaCatalogTypes.js';

/**
 * dentalNeedlesData.ts — Standard Dental Carpule Needles
 * Clean clinical defaults without academic bevel/color-code bloat.
 */
export const DENTAL_NEEDLES: Record<NeedleGaugeType, DentalNeedleInfo> = {
	g30_short_21mm: {
		id: 'g30_short_21mm',
		gauge: '30G',
		diameterMm: 0.3,
		lengthMm: 21,
		colorCode: 'var(--teal, #0d9488)',
		nameRu: 'Игла карпульная 30G (0.3 x 21 мм)',
		recommendedTechniques: ['infiltration', 'mental_incisive', 'palatal_greater'],
	},
	g27_long_35mm: {
		id: 'g27_long_35mm',
		gauge: '27G',
		diameterMm: 0.4,
		lengthMm: 35,
		colorCode: 'var(--ink-muted, #64748b)',
		nameRu: 'Игла 27G длинная (0.4 x 35 мм)',
		recommendedTechniques: ['mandibular_torus', 'tuberal'],
	},
	g30_ultrashort_12mm: {
		id: 'g30_ultrashort_12mm',
		gauge: '30G',
		diameterMm: 0.3,
		lengthMm: 12,
		colorCode: 'var(--emerald, #10b981)',
		nameRu: 'Игла карпульная 30G короткая (0.3 x 12 мм)',
		recommendedTechniques: ['intraligamentary_sta'],
	},
	g30_extrashort_8mm: {
		id: 'g30_extrashort_8mm',
		gauge: '30G',
		diameterMm: 0.3,
		lengthMm: 8,
		colorCode: 'var(--muted, #94a3b8)',
		nameRu: 'Игла карпульная 30G ультракороткая (0.3 x 8 мм)',
		recommendedTechniques: ['intraligamentary_sta'],
	},
};
