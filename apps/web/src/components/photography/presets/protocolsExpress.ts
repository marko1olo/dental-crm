/**
 * 8, 6, 3 Slot Clinical Photography Protocols
 */

import { PhotoProtocolPreset } from './types';
import { portrait_rest, portrait_smile, profile_90_smile } from './extraoralSlots';
import {
	intraoral_frontal_occlusion,
	intraoral_right_buccal,
	intraoral_left_buccal,
} from './intraoralFrontalSlots';
import {
	intraoral_maxillary_occlusal,
	intraoral_mandibular_occlusal,
	intraoral_overjet,
} from './intraoralOcclusalSlots';

export const AESTHETIC_8_SLOT_PROTOCOL: PhotoProtocolPreset = {
	id: 'aesthetic_8_prosthodontic',
	nameRu: 'Ортопедический / Эстетический протокол (8 кадров)',
	shortNameRu: 'Ортопедия 8 кадров',
	descriptionRu: 'Дизайн улыбки, виниры: 3 портретных + 5 внутриротовых кадров.',
	slots: [
		portrait_rest,
		portrait_smile,
		profile_90_smile,
		intraoral_frontal_occlusion,
		intraoral_right_buccal,
		intraoral_left_buccal,
		intraoral_maxillary_occlusal,
		intraoral_mandibular_occlusal,
	],
	totalSlots: 8,
	categoryCount: { extraoral: 3, intraoral: 5 },
};

export const STANDARD_8_SLOT_PROTOCOL = AESTHETIC_8_SLOT_PROTOCOL;
export const ORTHO_8_SLOT_PROTOCOL = AESTHETIC_8_SLOT_PROTOCOL;

export const EXPRESS_6_SLOT_PROTOCOL: PhotoProtocolPreset = {
	id: 'express_6_monitoring',
	nameRu: 'Экспресс-контроль и мониторинг лечения (6 кадров)',
	shortNameRu: 'Экспресс 6 кадров',
	descriptionRu: 'Быстрый протокол для регулярных визитов: 2 портрета + 4 внутриротовых.',
	slots: [
		portrait_rest,
		portrait_smile,
		intraoral_frontal_occlusion,
		intraoral_right_buccal,
		intraoral_left_buccal,
		intraoral_overjet,
	],
	totalSlots: 6,
	categoryCount: { extraoral: 2, intraoral: 4 },
};

export const MINIMAL_3_SLOT_PROTOCOL: PhotoProtocolPreset = {
	id: 'minimal_3_therapy',
	nameRu: 'Терапевтический протокол (3 кадра: До/После)',
	shortNameRu: 'Терапия 3 кадра',
	descriptionRu: 'Минимальный набор для фиксации реставраций: Улыбка, Фронт, Окклюзия ВЧ.',
	slots: [
		portrait_smile,
		intraoral_frontal_occlusion,
		intraoral_maxillary_occlusal,
	],
	totalSlots: 3,
	categoryCount: { extraoral: 1, intraoral: 2 },
};
