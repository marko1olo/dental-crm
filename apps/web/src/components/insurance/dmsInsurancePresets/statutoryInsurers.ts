/**
 * statutoryInsurers.ts — Справочник ведущих страховых компаний РФ (ДМС-2026)
 */

import { SECONDARY_DMS_INSURERS } from "./statutoryInsurersSecondary.js";
import type { DmsInsurerMetadata } from "./types.js";

export const PRIMARY_DMS_INSURERS: readonly DmsInsurerMetadata[] = [
	{
		id: "sogaz",
		key: "sogaz",
		shortName: "АО «СОГАЗ»",
		fullName: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485",
		ogrn: "1027739820921",
		kpp: "770801001",
		phone: "8 (800) 333-08-88",
		email: "dms@sogaz.ru",
		portalUrl: "https://b2b.sogaz.ru",
		curatorDepartment: "Департамент урегулирования медицинских убытков ДМС",
		defaultSlaHours: 24,
		statutoryRegulations2026: true,
		supportedPrograms: ["standard_therapy", "vip_full_coverage", "extended_surgery_hygiene", "economy_emergency_only"],
		standardTermsDescription: "100% покрытие терапии и хирургии по стандартам МЗ РФ. Эндодонтия только при наличии визиографии. Исключены виниры и имплантация.",
		requiresXrayForEndo: true,
		requiresCtPreAuth: true,
	},
	{
		id: "ingosstrakh",
		key: "ingosstrakh",
		shortName: "СПАО «Ингосстрах»",
		fullName: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179",
		ogrn: "1027739362474",
		kpp: "770501001",
		phone: "8 (495) 956-55-55",
		email: "med@ingos.ru",
		portalUrl: "https://med.ingos.ru",
		curatorDepartment: "Управление экспертизы стоматологических счетов",
		defaultSlaHours: 48,
		statutoryRegulations2026: true,
		supportedPrograms: ["standard_therapy", "vip_full_coverage", "extended_surgery_hygiene", "economy_emergency_only"],
		standardTermsDescription: "Согласование гарантийных писем через B2B-шлюз. Обязательна кодировка по каталогу услуг. Сооплата пациента при франшизе 10-20%.",
		requiresXrayForEndo: true,
		requiresCtPreAuth: true,
	},
	{
		id: "reso_garantiya",
		key: "reso_garantiya",
		shortName: "СПАО «РЕСО-Гарантия»",
		fullName: "Страховое публичное акционерное общество «РЕСО-Гарантия»",
		inn: "7710045520",
		ogrn: "1027700042413",
		kpp: "771001001",
		phone: "8 (800) 234-18-02",
		email: "dms-expert@reso.ru",
		portalUrl: "https://dms.reso.ru",
		curatorDepartment: "Отдел медицинской стоматологической экспертизы",
		defaultSlaHours: 24,
		statutoryRegulations2026: true,
		supportedPrograms: ["standard_therapy", "vip_full_coverage", "extended_surgery_hygiene"],
		standardTermsDescription: "Экспертиза электронных счетов за 24 часа. Плановое лечение при сумме свыше 25 000 руб строго по гарантийным письмам.",
		requiresXrayForEndo: true,
		requiresCtPreAuth: false,
	},
];

export const STATUTORY_DMS_INSURERS: readonly DmsInsurerMetadata[] = [
	...PRIMARY_DMS_INSURERS,
	...SECONDARY_DMS_INSURERS,
];
