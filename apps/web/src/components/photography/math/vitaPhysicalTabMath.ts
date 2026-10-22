import type { VitaShade, VitaSystemType } from '../vitaShadesCatalog';
import { getVitaShadeByCode, VITA_CLASSICAL_SHADES } from '../vitaShadesCatalog';

export interface VitaPhysicalTabReference {
	shadeCode: string;
	shade: VitaShade;
	system: VitaSystemType;
	isBleach: boolean;
	clinicalNoteRu: string;
}

export function createVitaPhysicalTabReference(shadeCode: string): VitaPhysicalTabReference {
	const shade = getVitaShadeByCode(shadeCode) || VITA_CLASSICAL_SHADES[8]!;
	const isBleach = shade.hueGroup === 'Bleach';
	const clinicalNoteRu = `Эталон VITA ${shade.code} (${shade.nameRu}) зафиксирован по физической расцветке у зуба для ЗТЛ`;
	return {
		shadeCode: shade.code,
		shade,
		system: shade.system,
		isBleach,
		clinicalNoteRu,
	};
}

export function sortShadesByLightness(shades: VitaShade[]): VitaShade[] {
	return [...shades].sort((a, b) => b.lab.L - a.lab.L);
}

export function getShadeHueGroup(shadeCode: string): 'A' | 'B' | 'C' | 'D' | 'L' | 'M' | 'R' | 'Bleach' {
	const shade = getVitaShadeByCode(shadeCode);
	return shade ? shade.hueGroup : 'A';
}
