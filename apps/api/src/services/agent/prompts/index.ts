/**
 * index.ts — DENTE Clinical AI Agent Prompts & System Prompt Builder.
 *
 * Consolidates:
 * 1. Clinical Constitution (Chief AI Resident & CMO, Form 043/u, StAR, FDI, SOAP)
 * 2. Pharmacology & Drug Safety (Articaine 7 mg/kg, Epinephrine ratios, Mepivacaine 3%, Form 107-1/u)
 * 3. Billing & Nomenclature 804n (Kopeck arithmetic, VAT exemption, 54-FZ cash register law)
 * 4. Doctor Autonomy (Mandate 8e: Software for doctor, 1-click norm, zero disabled buttons, soft warnings)
 */

export * from "./denteClinicalConstitution.js";
export * from "./pharmacologyAndSafetyPrompt.js";
export * from "./billingAndPricing804nPrompt.js";
export * from "./doctorAutonomyPrompt.js";

import {
	DENTE_CLINICAL_IDENTITY,
	DENTE_CLINICAL_STANDARDS_PROMPT,
	DENTE_REACT_CYCLE_PROMPT,
} from "./denteClinicalConstitution.js";
import { PHARMACOLOGY_AND_SAFETY_PROMPT } from "./pharmacologyAndSafetyPrompt.js";
import { BILLING_AND_PRICING_804N_PROMPT } from "./billingAndPricing804nPrompt.js";
import { DOCTOR_AUTONOMY_PROMPT } from "./doctorAutonomyPrompt.js";

export interface BuildDenteAgentPromptOptions {
	/**
	 * Clinical specialty for tailored clinical guidance
	 * (e.g. "therapy", "orthopedics", "surgery", "endodontics", "periodontics", "pediatric", "orthodontics", "implantology").
	 */
	readonly specialty?: string | undefined;

	/**
	 * Whether the agent is operating in autonomous proactive mode (true) or supervised copilot mode (false).
	 */
	readonly autonomousMode?: boolean | undefined;

	/**
	 * Formatted clinical context of the active doctor screen.
	 */
	readonly doctorContext?: string | undefined;
}

/**
 * Specialty-tailored clinical focus directives.
 */
const SPECIALTY_PROMPTS: Record<string, string> = {
	therapy: `СПЕЦИАЛИЗАЦИЯ: ТЕРАПЕВТИЧЕСКАЯ СТОМАТОЛОГИЯ
- Фокус: Диагностика и лечение кариеса (K02) и некариозных поражений.
- Протоколы: Адгезивный протокол тотального и самопротравливания, послойная полимеризация, анатомическая моделировка бугров и фиссур.
- Номенклатура: A16.07.002 (восстановление пломбой), A16.07.051 (профгигиена).`,

	endodontics: `СПЕЦИАЛИЗАЦИЯ: ЭНДОДОНТИЯ
- Фокус: Пульпит (K04.0), апикальный периодонтит (K04.5), ревизия и перелечивание корневых каналов.
- Протоколы: Изоляция коффердамом, конусность инструментальной обработки, ирригация гипохлоритом натрия 3% с активацией, пломбирование каналов гуттаперчей и силером строго до апекса.
- Номенклатура: A16.07.030 (обработка каналов), A16.07.008 (пломбирование каналов).`,

	surgery: `СПЕЦИАЛИЗАЦИЯ: ХИРУРГИЧЕСКАЯ СТОМАТОЛОГИЯ И ИМПЛАНТОЛОГИЯ
- Фокус: Удаление зубов (простое, сложное, ретинированные 18, 28, 38, 48), периостотомия, имплантация, синус-лифтинг.
- Безопасность: Контроль гемостаза, оценка притока крови, расчет максимальной дозы анестетика (артикаин 7 мг/кг, мепивакаин при ССС-рисках).
- Рецепты: Выписка антибиотикопрофилактики (Амоксиклав 875+125 мг или Клиндамицин 300 мг при аллергии на пенициллины) по форме 107-1/у.
- Номенклатура: A16.07.001 (удаление), A16.07.004 (сложное удаление), A16.07.054 (имплантация).`,

	orthopedics: `СПЕЦИАЛИЗАЦИЯ: ОРТОПЕДИЧЕСКАЯ СТОМАТОЛОГИЯ
- Фокус: Восстановление целостности зубных рядов вкладками, винирами, одиночными коронками (цирконий, E-max), мостовидными и съемными протезами.
- Протоколы: Оценка витальности зубов, культевые вкладки, уступное препарирование, снятие прецизионных оттисков / интраоральное сканирование.
- Номенклатура: A16.07.082 (сошлифовывание твердых тканей), A16.07.004 (коронка).`,

	periodontics: `СПЕЦИАЛИЗАЦИЯ: ПАРОДОНТОЛОГИЯ
- Фокус: Гингивит (K05.0, K05.1), пародонтит (K05.3).
- Протоколы: Пародонтальное зондирование 6 точек каждого зуба (глубина карманов в мм), поддесневой скейлинг и root planing (SRP), шинирование, оценка подвижности.
- Номенклатура: A16.07.051 (профгигиена), A16.07.026 (гингивопластика).`,

	pediatric: `СПЕЦИАЛИЗАЦИЯ: ДЕТСКАЯ СТОМАТОЛОГИЯ
- Фокус: Временный прикус (зубы 51–85), профилактика кариеса (герметизация фиссур), пульпотомия, лечение периодонтита молочных зубов.
- Безопасность: Строгий весовой расчет анестетиков и антибиотиков у детей.
- Номенклатура: B01.063.001 (прием детского стоматолога), A16.07.001.001 (удаление временного зуба).`,
};

/**
 * Builds the canonical DENTE Clinical AI System Prompt.
 *
 * Assembles:
 * 1. Clinical Identity & T.A.R.S. 100% factual rigor
 * 2. ReAct instrumental workflow
 * 3. Form 043/u, StAR protocols, FDI notation, SOAP skeleton
 * 4. Local anesthesia, antibiotic therapy & Form 107-1/u prescriptions
 * 5. Billing 804n nomenclature, kopeck exactness, VAT exemption, 54-FZ cash register law
 * 6. Mandate 8e: Doctor Autonomy & friction killer law
 * 7. Specialty-specific additions (optional)
 * 8. Autonomous mode additions (optional)
 * 9. Live screen context injection (optional)
 */
export function buildDenteAgentSystemPrompt(
	options?: BuildDenteAgentPromptOptions,
): string {
	const sections: string[] = [
		DENTE_CLINICAL_IDENTITY,
		DENTE_REACT_CYCLE_PROMPT,
		DENTE_CLINICAL_STANDARDS_PROMPT,
		PHARMACOLOGY_AND_SAFETY_PROMPT,
		BILLING_AND_PRICING_804N_PROMPT,
		DOCTOR_AUTONOMY_PROMPT,
	];

	// Specialty enhancement
	if (options?.specialty) {
		const normSpecialty = options.specialty.toLowerCase().trim();
		const specialtyBlock =
			SPECIALTY_PROMPTS[normSpecialty] ||
			(normSpecialty.includes("surg") || normSpecialty.includes("хирург")
				? SPECIALTY_PROMPTS.surgery
				: normSpecialty.includes("orthop") || normSpecialty.includes("ортопед")
					? SPECIALTY_PROMPTS.orthopedics
					: normSpecialty.includes("endo") || normSpecialty.includes("эндо")
						? SPECIALTY_PROMPTS.endodontics
						: normSpecialty.includes("perio") || normSpecialty.includes("пародонт")
							? SPECIALTY_PROMPTS.periodontics
							: normSpecialty.includes("pediat") || normSpecialty.includes("детск")
								? SPECIALTY_PROMPTS.pediatric
								: null);

		if (specialtyBlock) {
			sections.push(specialtyBlock);
		}
	}

	// Autonomous proactive mode
	if (options?.autonomousMode) {
		sections.push(`РЕЖИМ АВТОНОМНОГО КЛИНИЧЕСКОГО АССИСТЕНТА:
- Проактивно валидируйте входящие назначения на предмет фармакологической безопасности (DDI, аллергии, предельные дозы анестезии).
- При обнаружении несоответствий или рисков формируйте готовые варианты безопасных альтернатив.
- Автоматически сопоставляйте клинические диагнозы с обязательными кодами Номенклатуры 804н для быстрой подготовки черновика сметы.
- Все действия с изменением данных регистрируются для подтверждения врачом без блокировки рабочего процесса.`);
	}

	// Doctor context injection
	if (options?.doctorContext && options.doctorContext.trim()) {
		sections.push(options.doctorContext.trim());
	}

	return sections.join("\n\n");
}
