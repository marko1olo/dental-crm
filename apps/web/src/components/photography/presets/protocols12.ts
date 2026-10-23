/**
 * 12-Slot Clinical Photography Protocols
 */

import { PhotoProtocolPreset } from './types';
import {
	portrait_rest,
	portrait_smile,
	portrait_smile_wide,
	profile_90_rest,
	profile_90_smile,
	portrait_45_smile,
} from './extraoralSlots';
import {
	intraoral_frontal_occlusion,
	intraoral_right_buccal,
	intraoral_left_buccal,
	intraoral_frontal_disclusion,
	intraoral_enamel_macro,
} from './intraoralFrontalSlots';
import {
	intraoral_maxillary_occlusal,
	intraoral_mandibular_occlusal,
	intraoral_overjet,
} from './intraoralOcclusalSlots';

export const AACD_DSD_12_SLOT_PROTOCOL: PhotoProtocolPreset = {
	id: 'aacd_dsd_12_aesthetic',
	nameRu: 'Клинический фотопротокол AACD / DSD (12 стандартных ракурсов)',
	shortNameRu: 'AACD / DSD 12 ракурсов',
	descriptionRu: 'Международный стандарт AACD и DSD: 4 портретных + 8 внутриротовых снимков.',
	slots: [
		portrait_rest,
		portrait_smile_wide,
		profile_90_rest,
		portrait_45_smile,
		intraoral_frontal_occlusion,
		intraoral_frontal_disclusion,
		intraoral_right_buccal,
		intraoral_left_buccal,
		intraoral_maxillary_occlusal,
		intraoral_mandibular_occlusal,
		intraoral_overjet,
		intraoral_enamel_macro,
	],
	totalSlots: 12,
	categoryCount: { extraoral: 4, intraoral: 8 },
};

export const AACD_12_SLOT_PROTOCOL = AACD_DSD_12_SLOT_PROTOCOL;
export const DSD_12_SLOT_PROTOCOL = AACD_DSD_12_SLOT_PROTOCOL;

export const STANDARD_12_SLOT_PROTOCOL: PhotoProtocolPreset = {
	id: 'standard_12_ortho_aesthetic',
	nameRu: 'Полный ортодонтический и эстетический фотопротокол (12 кадров)',
	shortNameRu: 'Стандарт 12 кадров',
	descriptionRu: 'Золотой стандарт: 6 портретных + 6 внутриротовых снимков.',
	slots: [
		portrait_rest,
		portrait_smile,
		portrait_smile_wide,
		profile_90_rest,
		profile_90_smile,
		portrait_45_smile,
		intraoral_frontal_occlusion,
		intraoral_right_buccal,
		intraoral_left_buccal,
		intraoral_maxillary_occlusal,
		intraoral_mandibular_occlusal,
		intraoral_overjet,
	],
	totalSlots: 12,
	categoryCount: { extraoral: 6, intraoral: 6 },
};
