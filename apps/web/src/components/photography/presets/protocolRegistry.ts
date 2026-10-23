/**
 * Clinical Protocol Registry & Slot Dictionary Assembly
 */

import { StandardSlotId, PhotoProtocolSlotDefinition, PhotoProtocolPreset } from './types';
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
import {
	AACD_DSD_12_SLOT_PROTOCOL,
	STANDARD_12_SLOT_PROTOCOL,
	AACD_12_SLOT_PROTOCOL,
	DSD_12_SLOT_PROTOCOL,
} from './protocols12';
import {
	AESTHETIC_8_SLOT_PROTOCOL,
	STANDARD_8_SLOT_PROTOCOL,
	ORTHO_8_SLOT_PROTOCOL,
	EXPRESS_6_SLOT_PROTOCOL,
	MINIMAL_3_SLOT_PROTOCOL,
} from './protocolsExpress';

export * from './protocols12';
export * from './protocolsExpress';

export const DENTAL_PHOTO_SLOTS: Record<StandardSlotId, PhotoProtocolSlotDefinition> = {
	portrait_rest,
	portrait_smile,
	portrait_smile_wide,
	profile_90_rest,
	profile_90_smile,
	portrait_45_smile,
	intraoral_frontal_occlusion,
	intraoral_frontal_disclusion,
	intraoral_right_buccal,
	intraoral_left_buccal,
	intraoral_maxillary_occlusal,
	intraoral_mandibular_occlusal,
	intraoral_overjet,
	intraoral_enamel_macro,
};

export const CLINICAL_PROTOCOLS_REGISTRY: PhotoProtocolPreset[] = [
	STANDARD_12_SLOT_PROTOCOL,
	AACD_DSD_12_SLOT_PROTOCOL,
	AESTHETIC_8_SLOT_PROTOCOL,
	EXPRESS_6_SLOT_PROTOCOL,
	MINIMAL_3_SLOT_PROTOCOL,
];
