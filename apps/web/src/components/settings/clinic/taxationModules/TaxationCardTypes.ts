/**
 * apps/web/src/components/settings/clinic/taxationModules/TaxationCardTypes.ts
 *
 * Types, configurations, and statutory constants for Clinic Taxation & KKT Fiscalization.
 * Compliant with 54-FZ, FFD 1.2 (Order of FTS Russia No. ED-7-20/662@), and @dental/shared SSOT.
 */

import {
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1057_AGENT_CODES,
	type Ffd12AgentSign,
} from "@dental/shared";

export type TaxationSystem =
	| "usn_income"
	| "usn_income_expense"
	| "psn"
	| "osn"
	| "patent"
	| "osno";

export type CanonicalTaxationSystem =
	| "usn_income"
	| "usn_income_expense"
	| "psn"
	| "osn";

export interface TaxationSystemConfig {
	id: CanonicalTaxationSystem;
	ffdTagCode: number;
	name: string;
	shortName: string;
	rateDescription: string;
	vatRule: string;
	recommendedFor: string;
}

export const TAXATION_SYSTEMS: TaxationSystemConfig[] = [
	{
		id: "usn_income",
		ffdTagCode: FFD12_TAG_1055_TAXATION_CODES.usn_income,
		name: "УСН «Доходы» (6%)",
		shortName: "УСН Доходы (6%)",
		rateDescription: "Ставка 6% от выручки клиники",
		vatRule: "Без НДС (ст. 346.11 НК РФ)",
		recommendedFor:
			"Рекомендуется для частных врачей и клиник на 1–3 кресла с умеренной долей расходов",
	},
	{
		id: "usn_income_expense",
		ffdTagCode: FFD12_TAG_1055_TAXATION_CODES.usn_income_expense,
		name: "УСН «Доходы минус расходы» (15%)",
		shortName: "УСН Доходы–Расходы (15%)",
		rateDescription: "Ставка 15% от операционной прибыли",
		vatRule: "Без НДС (ст. 346.11 НК РФ)",
		recommendedFor:
			"Рекомендуется для хирургии, имплантологии и клиник с зуботехнической лабораторией",
	},
	{
		id: "psn",
		ffdTagCode: FFD12_TAG_1055_TAXATION_CODES.psn,
		name: "Патентная система налогообложения (ПСН)",
		shortName: "Патент (ПСН)",
		rateDescription: "Фиксированная стоимость патента ИП",
		vatRule: "Без НДС (ст. 346.43 НК РФ)",
		recommendedFor:
			"Доступно для индивидуальных предпринимателей со штатом до 15 сотрудников",
	},
	{
		id: "osn",
		ffdTagCode: FFD12_TAG_1055_TAXATION_CODES.osn,
		name: "Общая система налогообложения (ОСНО)",
		shortName: "ОСНО (Общая)",
		rateDescription: "Налог на прибыль + льгота медуслуг",
		vatRule: "Медуслуги: НДС 0% (ст. 149 п. 2 пп. 2 НК РФ)",
		recommendedFor:
			"Многопрофильные медицинские центры и сетевые клиники с филиалами",
	},
];

export const KKM_MODEL_OPTIONS = [
	{ value: "АТОЛ-55Ф", label: "АТОЛ-55Ф (ФФД 1.2, автоотрез)" },
	{ value: "АТОЛ 30Ф", label: "АТОЛ 30Ф (Компактная касса)" },
	{ value: "Штрих-М-01Ф", label: "Штрих-М-01Ф (Ритейл / Клиника)" },
	{ value: "Эвотор 7.2", label: "Эвотор 7.2 (Смарт-терминал)" },
	{ value: "Симулятор ККТ", label: "Симулятор ККТ (Тестовый контур)" },
] as const;

export const BRANCH_OPTIONS = [
	{ value: "main", label: "Главный филиал — Основная касса" },
	{ value: "branch_2", label: "Филиал №2 — Касса отделения" },
	{ value: "chair_side", label: "Кабинет врача — Терминал у кресла" },
] as const;

export const OFD_PROVIDER_OPTIONS = [
	{ value: "platforma_ofd", label: "Платформа ОФД" },
	{ value: "first_ofd", label: "Первый ОФД" },
	{ value: "taxcom", label: "Такском ОФД" },
	{ value: "sbis", label: "СБИС (Тензор)" },
	{ value: "kontur_ofd", label: "Контур ОФД" },
] as const;

export interface AgentSignOption {
	value: Ffd12AgentSign | "none";
	label: string;
	tag1057Code?: number;
	description: string;
}

export const FISCAL_AGENT_OPTIONS: AgentSignOption[] = [
	{
		value: "none",
		label: "Прямой расчёт (Клиника — исполнитель услуг)",
		description: "Стандартный режим: клиника оказывает услуги от своего имени",
	},
	{
		value: "paying_agent",
		label: "Платежный агент (Тег 1057: 3)",
		tag1057Code: FFD12_TAG_1057_AGENT_CODES.paying_agent,
		description: "Приём платежей в пользу сторонних врачей и поставщиков",
	},
	{
		value: "commission_agent",
		label: "Комиссионер (Тег 1057: 6)",
		tag1057Code: FFD12_TAG_1057_AGENT_CODES.commission_agent,
		description: "Реализация ортопедических изделий зуботехнических лабораторий",
	},
	{
		value: "agent",
		label: "Агент (Тег 1057: 7)",
		tag1057Code: FFD12_TAG_1057_AGENT_CODES.agent,
		description: "Агентские договоры с врачами на аренде кресел (Мандат 8e)",
	},
];

export function normalizeTaxationId(value: unknown): CanonicalTaxationSystem {
	if (typeof value !== "string") return "usn_income";
	const v = value.trim().toLowerCase();
	if (v === "usn_income_expense") return "usn_income_expense";
	if (v === "psn" || v === "patent") return "psn";
	if (v === "osn" || v === "osno") return "osn";
	return "usn_income";
}

export type FiscalSaveStatus = "idle" | "saved" | "error";

export interface FiscalSettingsFormData {
	activeTaxation: CanonicalTaxationSystem;
	ofdProvider: string;
	ffdVersion: "1.2" | "1.05";
	autoSendReceipt: boolean;
	allowAutonomousBuffer: boolean;
	cashBoxId: string | null;
	cashBoxName: string;
	kkmModel: string;
	kkmSerialNumber: string;
	branchId: string;
	kkmActive: boolean;
	agentSign?: Ffd12AgentSign | "none";
}
