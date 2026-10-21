/**
 * defaultContracts.ts — Договоры со страховыми компаниями РФ
 */

import { SECONDARY_STATUTORY_INSURANCE_CONTRACTS } from "./defaultContractsSecondary.js";
import type { DmsInsuranceContractRecord } from "./types.js";

const PRIMARY_STATUTORY_INSURANCE_CONTRACTS: readonly DmsInsuranceContractRecord[] = [
	{
		id: "cnt-sogaz-2026",
		insurerKey: "sogaz",
		insurerShortName: "АО «СОГАЗ»",
		insurerFullName: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485",
		ogrn: "1027739820921",
		kpp: "770801001",
		contractNumber: "СГЗ-2026/ДМС-881",
		contractDate: "2026-01-10",
		validUntil: "2026-12-31",
		defaultFranchisePct: 0,
		curatorFullName: "Смирнова Елена Викторовна",
		curatorPhone: "8 (800) 333-08-88 доб. 114",
		curatorEmail: "dms-expert@sogaz.ru",
		portalUrl: "https://b2b.sogaz.ru",
		slaHours: 24,
		status: "active",
		notes: "100% покрытие терапии и хирургии. Эндодонтия по согласованию с прицельным снимком.",
	},
	{
		id: "cnt-alfa-2026",
		insurerKey: "alfastrakhovanie",
		insurerShortName: "АО «АльфаСтрахование»",
		insurerFullName: "Акционерное общество «АльфаСтрахование»",
		inn: "7713056834",
		ogrn: "1027739795909",
		kpp: "772501001",
		contractNumber: "АЛЬФА-МЕД-26/1042",
		contractDate: "2026-01-15",
		validUntil: "2026-12-31",
		defaultFranchisePct: 10,
		curatorFullName: "Михайлова Татьяна Анатольевна",
		curatorPhone: "8 (800) 333-0-999 доб. 208",
		curatorEmail: "curator_dms@alfastrah.ru",
		portalUrl: "https://dms.alfastrah.ru",
		slaHours: 24,
		status: "active",
		notes: "Цифровой B2B API шлюз. Базовая франшиза 10% на сложное эндодонтическое лечение.",
	},
	{
		id: "cnt-ingos-2026",
		insurerKey: "ingosstrakh",
		insurerShortName: "СПАО «Ингосстрах»",
		insurerFullName: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179",
		ogrn: "1027739362474",
		kpp: "770501001",
		contractNumber: "ИНГ-ДМС-2026/4120",
		contractDate: "2026-02-01",
		validUntil: "2027-01-31",
		defaultFranchisePct: 15,
		curatorFullName: "Воронов Михаил Петрович",
		curatorPhone: "8 (495) 956-55-55 доб. 881",
		curatorEmail: "med@ingos.ru",
		portalUrl: "https://med.ingos.ru",
		slaHours: 48,
		status: "active",
		notes: "Обязательное кодирование всех манипуляций строго по каталогу услуг.",
	},
];

export const DEFAULT_STATUTORY_INSURANCE_CONTRACTS: readonly DmsInsuranceContractRecord[] = [
	...PRIMARY_STATUTORY_INSURANCE_CONTRACTS,
	...SECONDARY_STATUTORY_INSURANCE_CONTRACTS,
];
