/**
 * @file swarmTypes.ts
 * @description Canonical SSOT data contracts for DENTE In-App Multi-Agent Swarm
 * and Context Telemetry (.agents/AI_ASSISTANT_SUBAGENT_SWARM.md).
 * Mandate 8b: <= 120 lines. Zero cartoon emojis.
 */

export type SwarmAgentRole =
	| "triage"
	| "emr_inquisitor"
	| "billing_sentinel"
	| "vision_specialist";

export type SwarmAgentStatus = "idle" | "running" | "completed";

export interface SwarmAgentCard {
	id: SwarmAgentRole;
	name: string;
	roleTitle: string;
	description: string;
	status: SwarmAgentStatus;
	statusLabel: string;
	lastAuditAt: string;
	inspectedRecordsCount: number;
	metricLabel: string;
	referenceStandard: string;
}

export interface ContextTelemetryData {
	patientName: string;
	patientId: string;
	activeTooth: number | null;
	modelBadge: string;
	latencyMs: number;
	activeTokens: number;
	maxTokens: number;
	gatewayStatus: "cloud_active" | "local_deterministic";
}

export const DEFAULT_SWARM_AGENTS: SwarmAgentCard[] = [
	{
		id: "triage",
		name: "Triage Agent",
		roleTitle: "Маршрутизация обращений и звонков",
		description: "Socratic Triage, сортировка телефонии, WhatsApp, Telegram и запись к терапевту/хирургу/ортопеду",
		status: "completed",
		statusLabel: "Готово",
		lastAuditAt: "10:14",
		inspectedRecordsCount: 28,
		metricLabel: "обращений",
		referenceStandard: "Socratic Triage • Прейскурант услуг",
	},
	{
		id: "emr_inquisitor",
		name: "Odontogram & Diary Inquisitor",
		roleTitle: "Авто-аудит ЭМК и K02-K08 перед проверками",
		description: "Контроль протоколов СтАР, медицинской карты приёма и информированных согласий ИДС перед проверками ДМС",
		status: "running",
		statusLabel: "В работе",
		lastAuditAt: "10:16",
		inspectedRecordsCount: 42,
		metricLabel: "карт ЭМК",
		referenceStandard: "Протоколы СтАР (K02–K08) • Согласия ИДС",
	},
	{
		id: "billing_sentinel",
		name: "Billing & Fiscal Sentinel",
		roleTitle: "Сверка копеек, прейскуранта услуг и чеков кассы",
		description: "Сверка прейскуранта услуг, чеков кассы и смет без расхождений в копейках",
		status: "completed",
		statusLabel: "Готово",
		lastAuditAt: "10:15",
		inspectedRecordsCount: 64,
		metricLabel: "чеков кассы",
		referenceStandard: "Касса и чеки • Целочисленные копейки BIGINT",
	},
	{
		id: "vision_specialist",
		name: "Vision & DICOM Specialist",
		roleTitle: "Анализ RVG и КЛКТ срезов",
		description: "Сегментация кариеса, апексы и плотность кости D1–D4 по Хаунсфилду",
		status: "idle",
		statusLabel: "Ожидание",
		lastAuditAt: "Вчера, 18:20",
		inspectedRecordsCount: 12,
		metricLabel: "снимков КЛКТ",
		referenceStandard: "RVG 2D • КЛКТ 3D MPR • n. alveolaris",
	},
];

export const DEFAULT_TELEMETRY: ContextTelemetryData = {
	patientName: "Иванов Иван Иванович",
	patientId: "pat-active",
	activeTooth: 36,
	modelBadge: "Gemini 2.5 Flash",
	latencyMs: 450,
	activeTokens: 14250,
	maxTokens: 128000,
	gatewayStatus: "cloud_active",
};
