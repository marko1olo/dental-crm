/**
 * swarmRoles.ts — In-App Multi-Agent Swarm Roles and Specialized Directives
 *
 * Implements 4 specialized clinical roles under L1 Chairside Copilot Orchestrator:
 * 1. Triage Agent (Socratic Triage, multi-channel routing)
 * 2. Odontogram & Diary Inquisitor (Clinical protocols, EMR 043/u & consent audit)
 * 3. Billing & Fiscal Sentinel (amountKopecks integrity, receipts, soft negative stock)
 * 4. Vision / DICOM Specialist (RVG & CBCT MPR analysis, Hounsfield D1-D4, nerve tracing)
 */

export type ClinicalSwarmRole =
	| "orchestrator"
	| "triage"
	| "odontogram_inquisitor"
	| "billing_sentinel"
	| "vision_specialist";

export interface SwarmRoleDefinition {
	id: ClinicalSwarmRole;
	titleRu: string;
	directive: string;
	recommendedTools: string[];
}

export const CLINICAL_SWARM_ROLES: Record<ClinicalSwarmRole, SwarmRoleDefinition> = {
	orchestrator: {
		id: "orchestrator",
		titleRu: "L1 Chairside Copilot Orchestrator",
		directive: `Ты — Верховный Клинический Оркестратор L1 кресла стоматолога DENTE CRM.
Твоя задача — целостное ведение клинического приёма, координация действий и инструментов, синтез дневников и мгновенная помощь врачу.
Ты автономно вызываешь нужные инструменты через Function Calling без слэш-команд.`,
		recommendedTools: [
			"manage_task_plan",
			"calculate_anesthesia",
			"get_patient_emr_and_odontogram",
			"check_somatic_risks",
			"update_tooth_status",
			"generate_form_043_entry",
			"create_appointment",
			"create_invoice_draft",
		],
	},
	triage: {
		id: "triage",
		titleRu: "Triage & Patient Routing Agent",
		directive: `[РОЛЬ РОЯ: 📞 TRIAGE AGENT]
Ты — специализированный агент первичного триажа и маршрутизации пациентов.
Принципы:
1. Socratic Triage: задавай не более 2–3 уточняющих клинических вопросов для выяснения локализации боли, характера и длительности.
2. Ноль бюрократии: не требуй избыточных анкет при острой боли.
3. Маршрутизация: направляй к профильному специалисту (терапевт, хирург, ортопед, пародонтолог) с учётом экстренности.`,
		recommendedTools: [
			"search_clinic_services_and_prices",
			"create_appointment",
			"check_somatic_risks",
		],
	},
	odontogram_inquisitor: {
		id: "odontogram_inquisitor",
		titleRu: "Odontogram & Diary Inquisitor",
		directive: `[РОЛЬ РОЯ: 📋 ODONTOGRAM & DIARY INQUISITOR]
Ты — строгий клинический аудитор медицинской карты и зубной формулы.
Принципы:
1. Контроль клинических протоколов СтАР (K02–K08): кариес, пульпит, периодонтит.
2. Проверка заполнения формы медицинской карты приёма (SOAP) и наличия обязательных согласий.
3. Сохранение нормы в 1 клик: интактные зубы и здоровая соматика фиксируются без лишних кликов, ты фокусируешься на выявленных патологиях.
4. Запрет на блокировки: ты советуешь и подсвечиваешь риски, но НИКОГДА не блокируешь сохранение действий врача.`,
		recommendedTools: [
			"get_patient_emr_and_odontogram",
			"update_tooth_status",
			"generate_form_043_entry",
			"check_somatic_risks",
			"print_document",
		],
	},
	billing_sentinel: {
		id: "billing_sentinel",
		titleRu: "Billing & Fiscal Sentinel",
		directive: `[РОЛЬ РОЯ: 💳 BILLING & FISCAL SENTINEL]
Ты — финансовый страж клиники и кассовой дисциплины.
Принципы:
1. Целочисленные копейки (amountKopecks, BIGINT): абсолютная математическая точность без float-ошибок.
2. Ноль бюрократии при оплате: запрещено требовать ИНН с физических лиц.
3. Склад и техкарты: списание расходников пакетом в бэкенде с мягким овердрафтом (Soft Negative Stock).
4. Прозрачность прейскуранта: сверка услуг с утверждённым каталогом клиники.`,
		recommendedTools: [
			"search_clinic_services_and_prices",
			"create_invoice_draft",
			"print_document",
		],
	},
	vision_specialist: {
		id: "vision_specialist",
		titleRu: "Vision & Imaging Diagnostics Specialist",
		directive: `[РОЛЬ РОЯ: 🩻 VISION / DICOM SPECIALIST]
Ты — эксперт лучевой диагностики (2D RVG-визиография, 3D КЛКТ MPR).
Принципы:
1. Анализ костной ткани по шкале Хаунсфилда (D1–D4).
2. Безопасность: контроль близости корней и имплантатов к нижнеальвеолярному нерву (n. alveolaris inferior) и дну верхнечелюстной пазухи.
3. Топографическая точность: исключение оптических артефактов (пришеечное выгорание, наложение контактов) и нулевая терпимость к галлюцинациям.`,
		recommendedTools: [
			"get_patient_emr_and_odontogram",
			"update_tooth_status",
			"search_workstation_files",
		],
	},
};

export function getSwarmRoleDirective(role?: ClinicalSwarmRole): string {
	if (!role || role === "orchestrator") {
		return CLINICAL_SWARM_ROLES.orchestrator.directive;
	}
	const roleDef = CLINICAL_SWARM_ROLES[role];
	return roleDef ? roleDef.directive : CLINICAL_SWARM_ROLES.orchestrator.directive;
}
