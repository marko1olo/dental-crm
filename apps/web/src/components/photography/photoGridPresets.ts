/**
 * Clinical Dental Photography Protocol Presets & Slot Definitions
 * Standard 12-shot Orthodontic & Aesthetic Grid (Стандарт фотопротокола)
 */

import {
	PhotoProtocolPreset,
	PhotoProtocolSlotDefinition,
	StandardSlotId,
} from './presets/types';
import {
	CLINICAL_PROTOCOLS_REGISTRY,
	STANDARD_12_SLOT_PROTOCOL,
	STANDARD_8_SLOT_PROTOCOL,
	DENTAL_PHOTO_SLOTS,
} from './presets/protocolRegistry';

export * from './presets/types';
export * from './presets/silhouettes';
export * from './presets/extraoralSlots';
export * from './presets/intraoralFrontalSlots';
export * from './presets/intraoralOcclusalSlots';
export * from './presets/protocolRegistry';

export function getPresetById(id: string): PhotoProtocolPreset {
	if (id === 'standard_8_clinical' || id === 'standard_8_ortho' || id === 'ortho_8_slot') {
		return STANDARD_8_SLOT_PROTOCOL;
	}
	const found = CLINICAL_PROTOCOLS_REGISTRY.find((p) => p.id === id);
	return found || STANDARD_12_SLOT_PROTOCOL;
}

export function getSlotDefinitionById(slotId: string): PhotoProtocolSlotDefinition | undefined {
	return (DENTAL_PHOTO_SLOTS as Record<string, PhotoProtocolSlotDefinition>)[slotId as StandardSlotId];
}
