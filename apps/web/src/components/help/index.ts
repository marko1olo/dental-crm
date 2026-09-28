/**
 * DENTE CRM — Contextual Clinical Quick Guides Index
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 */

export * from "./OdontogramGuide";
export * from "./CashierGuide";
export * from "./SanPiNAutoclaveGuide";
export * from "./LanMeshGuide";

export type ClinicalGuideTab = "odontogram" | "cashier" | "sanpin" | "lan_mesh";

export interface ClinicalGuideMeta {
	id: ClinicalGuideTab;
	title: string;
	shortTitle: string;
	badge: string;
	description: string;
}

export const CLINICAL_GUIDES: readonly ClinicalGuideMeta[] = [
	{
		id: "odontogram",
		title: "Одонтограмма за 2 клика",
		shortTitle: "Одонтограмма",
		badge: "Зубная формула",
		description: "Быстрая маркировка кариеса, пульпита, коронок и 1-клик заполнение нормой.",
	},
	{
		id: "cashier",
		title: "Касса и оплата (Сплит в 3 клика)",
		shortTitle: "Касса и чеки",
		badge: "Финансы",
		description: "Сплит-оплата (нал + карта + баланс семьи), СБП QR и печать чека без лишней бюрократии.",
	},
	{
		id: "sanpin",
		title: "Журнал стерилизации и Автоклав",
		shortTitle: "Стерилизация",
		badge: "Чистота и автоклав",
		description: "Журнал автоклавирования, этикетки крафт-пакетов DataMatrix и контроль качества ПСО.",
	},
	{
		id: "lan_mesh",
		title: "LAN Zero-Conf Mesh (Планшеты)",
		shortTitle: "LAN Mesh",
		badge: "Планшеты & Офлайн",
		description: "Сопряжение планшетов у кресла по 6-значному PIN / QR и работа без интернета.",
	},
];
