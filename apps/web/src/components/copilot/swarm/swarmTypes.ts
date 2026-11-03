/**
 * @file swarmTypes.ts
 * @description Canonical SSOT data contracts for DENTE In-App Multi-Agent Swarm
 * and Context Telemetry (.agents/AI_ASSISTANT_SUBAGENT_SWARM.md).
 * Mandate 8b: <= 120 lines. Mandate 8wy: Production vs Showcase isolation. Zero cartoon emojis.
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

const SWARM_ROLE_META: Record<SwarmAgentRole, { name: string; roleTitle: string; description: string; metricLabel: string; referenceStandard: string }> = {
	triage: {
		name: "Triage Agent",
		roleTitle: "Маршрутизация обращений и звонков",
		description: "Socratic Triage, сортировка телефонии, WhatsApp, Telegram и запись к терапевту/хирургу/ортопеду",
		metricLabel: "обращений",
		referenceStandard: "Socratic Triage • Прейскурант услуг",
	},
	emr_inquisitor: {
		name: "Odontogram & Diary Inquisitor",
		roleTitle: "Авто-аудит ЭМК и K02-K08 перед проверками",
		description: "Контроль протоколов СтАР, медицинской карты приёма и информированных согласий ИДС перед проверками ДМС",
		metricLabel: "карт ЭМК",
		referenceStandard: "Протоколы СтАР (K02–K08) • Согласия ИДС",
	},
	billing_sentinel: {
		name: "Billing & Fiscal Sentinel",
		roleTitle: "Сверка копеек, прейскуранта услуг и чеков кассы",
		description: "Сверка прейскуранта услуг, чеков кассы и смет без расхождений в копейках",
		metricLabel: "чеков кассы",
		referenceStandard: "Касса и чеки • Целочисленные копейки BIGINT",
	},
	vision_specialist: {
		name: "Vision & DICOM Specialist",
		roleTitle: "Анализ RVG и КЛКТ срезов",
		description: "Сегментация кариеса, апексы и плотность кости D1–D4 по Хаунсфилду",
		metricLabel: "снимков КЛКТ",
		referenceStandard: "RVG 2D • КЛКТ 3D MPR • n. alveolaris",
	},
};

/** Боевые канонические агенты: чистые нулевые метрики, ожидание аудита */
export const PRODUCTION_SWARM_AGENTS: SwarmAgentCard[] = (
	["triage", "emr_inquisitor", "billing_sentinel", "vision_specialist"] as const
).map((role) => ({
	id: role,
	...SWARM_ROLE_META[role],
	status: "idle",
	statusLabel: "Ожидание",
	lastAuditAt: "Не проводился",
	inspectedRecordsCount: 0,
}));

/** Демо-витринные агенты: заполненные метрики для тест-драйва */
export const SHOWCASE_SWARM_AGENTS: SwarmAgentCard[] = [
	{ id: "triage", ...SWARM_ROLE_META.triage, status: "completed", statusLabel: "Готово", lastAuditAt: "10:14", inspectedRecordsCount: 28 },
	{ id: "emr_inquisitor", ...SWARM_ROLE_META.emr_inquisitor, status: "running", statusLabel: "В работе", lastAuditAt: "10:16", inspectedRecordsCount: 42 },
	{ id: "billing_sentinel", ...SWARM_ROLE_META.billing_sentinel, status: "completed", statusLabel: "Готово", lastAuditAt: "10:15", inspectedRecordsCount: 64 },
	{ id: "vision_specialist", ...SWARM_ROLE_META.vision_specialist, status: "idle", statusLabel: "Ожидание", lastAuditAt: "Вчера, 18:20", inspectedRecordsCount: 12 },
];

/** Боевая телеметрия: чистый нулевой контекст без вымышленных пациентов */
export const PRODUCTION_TELEMETRY: ContextTelemetryData = {
	patientName: "",
	patientId: "",
	activeTooth: null,
	modelBadge: "Gemini 2.5 Flash",
	latencyMs: 0,
	activeTokens: 0,
	maxTokens: 128000,
	gatewayStatus: "cloud_active",
};

/** Демо-витринная телеметрия для презентаций */
export const SHOWCASE_TELEMETRY: ContextTelemetryData = {
	patientName: "Иванов Иван Иванович",
	patientId: "pat-active",
	activeTooth: 36,
	modelBadge: "Gemini 2.5 Flash",
	latencyMs: 450,
	activeTokens: 14250,
	maxTokens: 128000,
	gatewayStatus: "cloud_active",
};

/** Обратная совместимость */
export const DEFAULT_SWARM_AGENTS = PRODUCTION_SWARM_AGENTS;
export const DEFAULT_TELEMETRY = PRODUCTION_TELEMETRY;
