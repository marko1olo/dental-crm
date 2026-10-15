import type { DentalNeedleInfo, NeedleGaugeType } from './anesthesiaCatalogTypes';

export const DENTAL_NEEDLES: Record<NeedleGaugeType, DentalNeedleInfo> = {
	g27_long_35mm: {
		id: 'g27_long_35mm',
		gauge: '27G',
		diameterMm: 0.4,
		lengthMm: 35,
		colorCode: '#eab308', // Yellow
		nameRu: 'Игла 27G длинная (0.4 x 35 мм)',
		recommendedTechniques: ['mandibular_torus', 'tuberal'],
	},
	g30_short_21mm: {
		id: 'g30_short_21mm',
		gauge: '30G',
		diameterMm: 0.3,
		lengthMm: 21,
		colorCode: '#3b82f6', // Blue
		nameRu: 'Игла 30G короткая (0.3 x 21 мм)',
		recommendedTechniques: ['infiltration', 'mental_incisive', 'palatal_greater', 'incisive_canal'],
	},
	g30_ultrashort_12mm: {
		id: 'g30_ultrashort_12mm',
		gauge: '30G',
		diameterMm: 0.3,
		lengthMm: 12,
		colorCode: '#10b981', // Green
		nameRu: 'Игла 30G ультракороткая (0.3 x 12 мм)',
		recommendedTechniques: ['intraligamentary_sta', 'intraseptal'],
	},
	g30_extrashort_8mm: {
		id: 'g30_extrashort_8mm',
		gauge: '30G',
		diameterMm: 0.3,
		lengthMm: 8,
		colorCode: '#a855f7', // Purple
		nameRu: 'Игла 30G экстракороткая (0.3 x 8 мм)',
		recommendedTechniques: ['intraligamentary_sta'],
	},
};
