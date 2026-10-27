/**
 * stringNormalizers.ts — Layer 0: Фасад нормализаторов строк, телефонов, карт и транслитерации.
 */

export {
	normalizePhoneToNational,
	normalizePhoneE164,
} from "./phoneNormalizers";

export {
	transliterateLatinToCyrillic,
	convertKeyboardMistype,
	normalizeCyrillicText,
} from "./keyboardTranslit";

export {
	extractPatientCardNumbers,
	extractPatientPhones,
	normalizeCardQuery,
} from "./cardQueryNormalizers";
