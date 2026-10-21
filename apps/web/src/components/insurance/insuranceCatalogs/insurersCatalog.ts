/**
 * insurersCatalog.ts — Каталог ведущих страховых компаний РФ по ДМС
 */

import type { DmsInsurerDefinition } from "./types.js";

export const RUSSIAN_TOP_DMS_INSURERS: readonly DmsInsurerDefinition[] = [
	{
		id: "sogaz", key: "sogaz", shortName: "АО «СОГАЗ»",
		fullName: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485", ogrn: "1027739820921", phone: "8 (800) 333-08-88", email: "dms@sogaz.ru",
		portalUrl: "https://b2b.sogaz.ru", defaultClaimSlaHours: 24, supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Терапия и хирургия 100%, плановое лечение по ГП, исключена ортодонтия и имплантация.",
	},
	{
		id: "ingosstrakh", key: "ingosstrakh", shortName: "СПАО «Ингосстрах»",
		fullName: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179", ogrn: "1027739362474", phone: "8 (495) 956-55-55", email: "med@ingos.ru",
		portalUrl: "https://med.ingos.ru", defaultClaimSlaHours: 48, supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Покрытие по согласованию, франшиза 10-20% при расширенных опциях, строго по прайсу.",
	},
	{
		id: "reso", key: "reso", shortName: "СПАО «РЕСО-Гарантия»",
		fullName: "Страховое публичное акционерное общество «РЕСО-Гарантия»",
		inn: "7710045520", ogrn: "1027700042413", phone: "8 (800) 234-18-02", email: "dms-expert@reso.ru",
		portalUrl: "https://reso.ru/dms", defaultClaimSlaHours: 24, supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Кураторская экспертиза счетов, согласование гарантийных писем до 3 рабочих дней.",
	},
	{
		id: "alfastrakh", key: "alfastrakh", shortName: "АО «АльфаСтрахование»",
		fullName: "Акционерное общество «АльфаСтрахование»",
		inn: "7713056834", ogrn: "1027739795909", phone: "8 (800) 333-0-999", email: "curator_dms@alfastrah.ru",
		portalUrl: "https://alfastrah.ru/med", defaultClaimSlaHours: 24, supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Цифровой шлюз согласования, исключены отбеливание, виниры и эстетика.",
	},
	{
		id: "vsk", key: "vsk", shortName: "САО «ВСК»",
		fullName: "Страховое акционерное общество «ВСК»",
		inn: "7710026574", ogrn: "1027700186062", phone: "8 (800) 775-77-51", email: "dms_claims@vsk.ru",
		portalUrl: "https://vsk.ru/dms", defaultClaimSlaHours: 48, supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Лимиты на терапию до 100 000 руб/год, обязательное указание номеров зубов и МКБ-10.",
	},
	{
		id: "rosgosstrakh", key: "rosgosstrakh", shortName: "ПАО СК «Росгосстрах»",
		fullName: "Публичное акционерное общество Страховая Компания «Росгосстрах»",
		inn: "7707067683", ogrn: "1027739049689", phone: "8 (800) 200-09-00", email: "dms@rgs.ru",
		portalUrl: "https://rgs.ru/dms", defaultClaimSlaHours: 48, supportedPrograms: ["base", "extended"],
		standardTerms: "Федеральная сеть, жесткие протоколы согласования планового протезирования.",
	},
	{
		id: "soglasie", key: "soglasie", shortName: "ООО «СК «Согласие»",
		fullName: "Общество с ограниченной ответственностью «Страховая Компания «Согласие»",
		inn: "7706070733", ogrn: "1027700032700", phone: "8 (800) 755-00-01", email: "dms-info@soglasie.ru",
		portalUrl: "https://soglasie.ru/dms", defaultClaimSlaHours: 24, supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Строгая проверка показаний при депульпировании, эндодонтия по гарантийным письмам.",
	},
	{
		id: "renins", key: "renins", shortName: "ПАО «Группа Ренессанс Страхование»",
		fullName: "Публичное акционерное общество «Группа Ренессанс Страхование»",
		inn: "7725497022", ogrn: "1187746796231", phone: "8 (800) 333-8-800", email: "med_expert@renins.com",
		portalUrl: "https://renins.ru/med", defaultClaimSlaHours: 24, supportedPrograms: ["base", "extended", "vip"],
		standardTerms: "Онлайн-авторизация приемов через API, моментальное подтверждение гарантийных писем.",
	},
];

export function getDmsInsurerById(id: string): DmsInsurerDefinition | undefined {
	return RUSSIAN_TOP_DMS_INSURERS.find((ins) => ins.id.toLowerCase() === id.toLowerCase());
}
