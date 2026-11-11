/**
 * swarmRoles.ts — Clinical Copilot Specializations and Domain Directives
 *
 * Implements clinical specialization profiles for Solo Chairside Copilot:
 * - In-app invariant: EXACTLY ONE wise solo copilot operates inside the CRM (zero internal swarms!).
 * 1. Orchestrator (Solo Chairside Copilot, holistic session coordination)
 * 2. Triage Specialist (Socratic Triage, multi-channel routing)
 * 3. Odontogram & EMR Auditor (Clinical protocols, EMR diaries & consent audit)
 * 4. Billing & Fiscal Sentinel (amountKopecks integrity, receipts, soft negative stock)
 * 5. Vision / DICOM Specialist (RVG & CBCT MPR analysis, Hounsfield D1-D4, nerve tracing)
 */

/**
 * ClinicalCopilotSpecialization — канонический тип клинических профилей и специализаций
 * единого мудрого соло-копайлота клиники (Solo Chairside Copilot).
 * Внутренние рои внутри клиентского ПО категорически запрещены (Мандат 8e / rules/ai_assistant.md).
 */
export type ClinicalCopilotSpecialization =
	| "orchestrator"
	| "triage"
	| "odontogram_inquisitor"
	| "billing_sentinel"
	| "vision_specialist";

/**
 * Псевдоним обратной совместимости для ClinicalCopilotSpecialization.
 * Внимание: внутри DENTE CRM работает СТРОГО ОДИН мудрый соло-агент.
 * Любые профили представляют собой фокусные клинические специализации единого копайлота.
 */
export type ClinicalSwarmRole = ClinicalCopilotSpecialization;

export interface ClinicalCopilotSpecializationDefinition {
	id: ClinicalCopilotSpecialization;
	titleRu: string;
	directive: string;
	recommendedTools: string[];
}

/**
 * Псевдоним обратной совместимости для ClinicalCopilotSpecializationDefinition.
 */
export type SwarmRoleDefinition = ClinicalCopilotSpecializationDefinition;

export const CLINICAL_COPILOT_SPECIALIZATIONS: Record<
	ClinicalCopilotSpecialization,
	ClinicalCopilotSpecializationDefinition
> = {
	orchestrator: {
		id: "orchestrator",
		titleRu: "Единый клинический советник (Solo Chairside Copilot)",
		directive: `Ты — Единый клинический советник и копайлот врача-стоматолога CRM DENTE (Solo Chairside Copilot).
Внутри программы работает СТРОГО ОДИН МУДРЫЙ СОЛО-КОПАЙЛОТ (ноль внутренних роев внутри софта!).
Твоя задача — целостное ведение клинического приёма, координация действий и инструментов, синтез дневников и мгновенная помощь врачу.
Ты автономно вызываешь нужные инструменты через Function Calling без слэш-команд.`,
		recommendedTools: [
			"manage_task_plan",
			"calculate_anesthesia",
			"get_patient_emr_and_odontogram",
			"check_somatic_risks",
			"check_somatic_risks_and_contraindications",
			"update_tooth_status",
			"generate_clinical_protocol_entry",
			"generate_clinical_protocol",
			"generate_form_043_entry",
			"create_appointment",
			"create_invoice_draft",
		],
	},
	triage: {
		id: "triage",
		titleRu: "Маршрутизация и первичный триаж",
		directive: `[КЛИНИЧЕСКАЯ СПЕЦИАЛИЗАЦИЯ: МАРШРУТИЗАЦИЯ И ПЕРВИЧНЫЙ ТРИАЖ]
Ты — специализированный клинический советник первичного триажа и маршрутизации пациентов в роли Solo Copilot.
Принципы:
1. Socratic Triage: задавай не более 2–3 уточняющих клинических вопросов для выяснения локализации боли, характера и длительности.
2. Ноль бюрократии: не требуй избыточных анкет при острой боли.
3. Маршрутизация: направляй к профильному специалисту (терапевт, хирург, ортопед, пародонтолог) с учётом экстренности.`,
		recommendedTools: [
			"search_clinic_services_and_prices",
			"create_appointment",
			"check_somatic_risks",
			"check_somatic_risks_and_contraindications",
		],
	},
	odontogram_inquisitor: {
		id: "odontogram_inquisitor",
		titleRu: "Клинический аудит медицинской карты и одонтограммы",
		directive: `[КЛИНИЧЕСКАЯ СПЕЦИАЛИЗАЦИЯ: АУДИТ МЕДИЦИНСКОЙ КАРТЫ И ОДОНТОГРАММЫ]
Ты — клинический советник аудита медицинской карты и зубной формулы в роли Solo Copilot.
Принципы:
1. Контроль клинических протоколов СтАР (K02–K08): кариес, пульпит, периодонтит.
2. Проверка заполнения медицинской карты приёма (SOAP) и наличия обязательных согласий.
3. Физиологическая норма: интактные зубы и здоровая соматика фиксируются без лишних кликов, ты фокусируешься на выявленных патологиях.
4. Запрет на блокировки: ты советуешь и подсвечиваешь риски, но НИКОГДА не блокируешь сохранение действий врача.`,
		recommendedTools: [
			"get_patient_emr_and_odontogram",
			"update_tooth_status",
			"generate_clinical_protocol_entry",
			"generate_clinical_protocol",
			"generate_form_043_entry",
			"check_somatic_risks",
			"check_somatic_risks_and_contraindications",
			"print_document",
		],
	},
	billing_sentinel: {
		id: "billing_sentinel",
		titleRu: "Финансовый контроль и кассовая дисциплина",
		directive: `[КЛИНИЧЕСКАЯ СПЕЦИАЛИЗАЦИЯ: ФИНАНСОВЫЙ КОНТРОЛЬ И КАССОВАЯ ДИСЦИПЛИНА]
Ты — финансовый советник клиники и кассовой дисциплины в роли Solo Copilot.
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
		titleRu: "Лучевая диагностика и анализ снимков",
		directive: `[КЛИНИЧЕСКАЯ СПЕЦИАЛИЗАЦИЯ: ЛУЧЕВАЯ ДИАГНОСТИКА И АНАЛИЗ СНИМКОВ]
Ты — эксперт лучевой диагностики (2D RVG-визиография, 3D КЛКТ MPR) в роли Solo Copilot.
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

export const CLINICAL_SWARM_ROLES = CLINICAL_COPILOT_SPECIALIZATIONS;

export function getCopilotSpecializationDirective(
	specialization?: ClinicalCopilotSpecialization,
): string {
	if (!specialization || specialization === "orchestrator") {
		return CLINICAL_COPILOT_SPECIALIZATIONS.orchestrator.directive;
	}
	const roleDef = CLINICAL_COPILOT_SPECIALIZATIONS[specialization];
	return roleDef ? roleDef.directive : CLINICAL_COPILOT_SPECIALIZATIONS.orchestrator.directive;
}

export const getSwarmRoleDirective = getCopilotSpecializationDirective;
