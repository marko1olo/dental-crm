/**
 * validatorDocTypes.ts — SEMD document types and OIDs for EGISZ CDA Validator
 */

import { EGISZ_OIDS } from "@dental/shared/cda";

export const EGISZ_SEMD_DOC_TYPES = {
	"101": {
		code: "101", nsiCode: "101",
		title: "Протокол консультации стоматолога (СЭМД 101)",
		description: "Первичный или повторный консультативный прием врача-стоматолога",
		loincCode: "74208-1", loincDisplayName: "Протокол стоматологического осмотра",
		templateRoot: "1.2.643.5.1.13.13.11.101",
	},
	"102": {
		code: "102", nsiCode: "102",
		title: "Амбулаторный стоматологический протокол (СЭМД 102)",
		description: "Амбулаторный лечебно-диагностический протокол врача-стоматолога (ф. 043/у) по Приказу 804н",
		loincCode: "74208-1", loincDisplayName: "Протокол стоматологического вмешательства",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	},
	"105": {
		code: "105", nsiCode: "105",
		title: "Протокол консультации врача-специалиста (стоматолога)",
		description: "Первичный или повторный консультативный прием врача-стоматолога (ф. 043/у)",
		loincCode: "74208-1", loincDisplayName: "Протокол стоматологического осмотра",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	},
	"130": {
		code: "130", nsiCode: "130",
		title: "Справка об оплате медицинских услуг (СЭМД 130)",
		description: "Справка об оплате медицинских услуг для налогового органа (КНД 1151156)",
		loincCode: "48768-6", loincDisplayName: "Сведения об оплате медицинских услуг",
		templateRoot: "1.2.643.5.1.13.13.11.130",
	},
	"302": {
		code: "302", nsiCode: "75",
		title: "Протокол консультации стоматолога (СЭМД 302)",
		description: "Первичный или повторный консультативный прием врача-стоматолога",
		loincCode: "74208-1", loincDisplayName: "Протокол стоматологического осмотра",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	},
	"303": {
		code: "303", nsiCode: "76",
		title: "Протокол стоматологического лечения/вмешательства (СЭМД 303)",
		description: "Лечебно-диагностическое стоматологическое вмешательство (терапия, хирургия, ортопедия, пародонтология)",
		loincCode: "74208-1", loincDisplayName: "Протокол стоматологического лечения",
		templateRoot: "1.2.643.5.1.13.13.11.1527",
	},
} as const;

export type EgiszSemdDocTypeCode = keyof typeof EGISZ_SEMD_DOC_TYPES;

export const EGISZ_STANDARD_OIDS = {
	FRMO_MO_ROOT: EGISZ_OIDS.FRMO_MO_ROOT,
	SNILS: EGISZ_OIDS.SNILS,
	OGRN_LEGAL: EGISZ_OIDS.OGRN_LEGAL,
	OGRN_IP: EGISZ_OIDS.OGRN_IP,
	INN: EGISZ_OIDS.INN,
	SEMD_TEMPLATE_CONSULTATION: EGISZ_OIDS.SEMD_TEMPLATE_CONSULTATION,
	GENDER: EGISZ_OIDS.GENDER,
	MEDICAL_CARE_TYPE: EGISZ_OIDS.MEDICAL_CARE_TYPE,
	MEDICAL_POSITIONS: EGISZ_OIDS.MEDICAL_POSITIONS,
	ICD10: EGISZ_OIDS.ICD10,
	DENTAL_TOOTH: EGISZ_OIDS.DENTAL_TOOTH,
	V001_NOMENKLATURA: EGISZ_OIDS.ORDER_804N,
	CONFIDENTIALITY: EGISZ_OIDS.CONFIDENTIALITY,
	LOINC: EGISZ_OIDS.LOINC,
	GOST_3410_2012_256: EGISZ_OIDS.GOST_3410_2012_256,
	GOST_3410_2012_512: EGISZ_OIDS.GOST_3410_2012_512,
} as const;
