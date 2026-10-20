/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Clinical Workflow Step Validator & Soft-Focus Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ЖЕЛЕЗНЫЙ ЗАКОН АВТОНОМИИ ВРАЧА (МАНДАТ 8e):
 * 0 заблокированных disabled={true} кнопок!
 * Если врач нажимает «Далее» или «Завершить приём», а обязательное поле не заполнено:
 * 1. Интерфейс не выдает мертвую серую кнопку.
 * 2. Выполняется мягкий фокус (Soft-Focus Guidance) на первое незаполненное поле.
 * 3. Подставляются безопасные неразрушающие значения по умолчанию (Safe Defaults: «Норма»).
 */

import type {
	ClinicalWorkflowStep,
	ClinicalWorkflowStepValidationResult,
} from "./clinicalWorkflowTypes";

export const CLINICAL_DEFAULT_VALUES = {
	complaint: "Жалоб на момент осмотра не предъявляет (профилактический осмотр / санация).",
	anamnesis: "Соматически здоров. Аллергоанамнез не отягощен. Перенесенные заболевания отрицает.",
	statusLocalis: "Слизистая оболочка полости рта бледно-розовая, умеренно увлажнена. Десневой край без признаков воспаления.",
	diagnosisIcd10: "Z01.2 Стоматологическое обследование",
	treatmentDescription: "Проведен осмотр полости рта, инструментальное зондирование и гигиеническая санация.",
	recommendations: "Соблюдение гигиены полости рта, чистка зубов 2 раза в день, плановый профилактический осмотр через 6 месяцев.",
};

/**
 * Валидирует состояние шага визита и формирует безопасные дефолты или мягкий направляющий фокус.
 */
export function validateClinicalWorkflowStep(
	step: ClinicalWorkflowStep,
	currentFormData: Record<string, any>,
	options?: {
		allowSafeDefaults?: boolean;
		strictPromptDoctor?: boolean;
	},
): ClinicalWorkflowStepValidationResult {
	const allowSafeDefaults = options?.allowSafeDefaults ?? true;
	const resolved = { ...currentFormData };
	let softFocusFieldId: string | undefined;
	let guidingHint: string | undefined;
	let safeDefaultsApplied = false;

	switch (step) {
		case "intake": {
			if (!resolved.complaint?.trim()) {
				if (allowSafeDefaults) {
					resolved.complaint = CLINICAL_DEFAULT_VALUES.complaint;
					safeDefaultsApplied = true;
				} else {
					softFocusFieldId = "visit-complaint-input";
					guidingHint = "Укажите жалобы пациента или выберите пресет «✓ Жалоб нет»";
				}
			}
			if (!resolved.anamnesis?.trim()) {
				if (allowSafeDefaults) {
					resolved.anamnesis = CLINICAL_DEFAULT_VALUES.anamnesis;
					safeDefaultsApplied = true;
				} else if (!softFocusFieldId) {
					softFocusFieldId = "visit-anamnesis-input";
					guidingHint = "Укажите соматический анамнез или примените «✓ Норма»";
				}
			}
			break;
		}

		case "examination": {
			if (!resolved.statusLocalis?.trim() && !resolved.objectiveStatus?.trim()) {
				if (allowSafeDefaults) {
					resolved.statusLocalis = CLINICAL_DEFAULT_VALUES.statusLocalis;
					resolved.objectiveStatus = CLINICAL_DEFAULT_VALUES.statusLocalis;
					safeDefaultsApplied = true;
				} else {
					softFocusFieldId = "visit-status-localis-input";
					guidingHint = "Заполните объективный статус осмотра или отметьте зубы в формуле";
				}
			}
			break;
		}

		case "anesthesia": {
			// Анестезия клинически опциональна (например, при гигиене или безболезненном осмотре).
			// Не блокируем и не требуем обязательного ввода, если врач не применял анестетик.
			break;
		}

		case "protocol": {
			if (!resolved.diagnosisIcd10?.trim() && !resolved.diagnosis?.trim()) {
				if (allowSafeDefaults) {
					resolved.diagnosisIcd10 = CLINICAL_DEFAULT_VALUES.diagnosisIcd10;
					resolved.diagnosis = CLINICAL_DEFAULT_VALUES.diagnosisIcd10;
					safeDefaultsApplied = true;
				} else {
					softFocusFieldId = "visit-diagnosis-input";
					guidingHint = "Выберите диагноз по МКБ-10 или воспользуйтесь смарт-протоколом";
				}
			}

			if (!resolved.treatmentDescription?.trim() && !resolved.treatmentPlan?.trim()) {
				if (allowSafeDefaults) {
					resolved.treatmentDescription = CLINICAL_DEFAULT_VALUES.treatmentDescription;
					resolved.treatmentPlan = CLINICAL_DEFAULT_VALUES.treatmentDescription;
					safeDefaultsApplied = true;
				} else if (!softFocusFieldId) {
					softFocusFieldId = "visit-treatment-description-input";
					guidingHint = "Опишите проведенное лечение или выберите 1-клик шаблон приёма";
				}
			}
			break;
		}

		case "recommendations": {
			if (!resolved.recommendations?.trim()) {
				if (allowSafeDefaults) {
					resolved.recommendations = CLINICAL_DEFAULT_VALUES.recommendations;
					safeDefaultsApplied = true;
				} else {
					softFocusFieldId = "visit-recommendations-input";
					guidingHint = "Рекомендации пациенту заполнены стандартным планом";
				}
			}
			break;
		}

		case "fiscalization":
		case "auto_deduction": {
			// Фискализация и списание всегда валидны для запуска сметы (даже при гарантийном 0 ₽ приёме).
			break;
		}
	}

	const isValid = !softFocusFieldId;

	return {
		isValid,
		softFocusFieldId,
		guidingHint,
		safeDefaultsApplied,
		resolvedData: resolved,
	};
}

/**
 * Выполняет мягкий фокус на DOM-элементе без срыва скролла и блокировки UI.
 */
export function executeSoftFocusGuidance(fieldId?: string): boolean {
	if (typeof window === "undefined" || !fieldId) return false;
	const el = document.getElementById(fieldId);
	if (!el) return false;

	el.scrollIntoView({ behavior: "smooth", block: "center" });
	if (typeof (el as HTMLElement).focus === "function") {
		(el as HTMLElement).focus();
	}
	el.classList.add("dente-soft-focus-highlight");
	setTimeout(() => {
		el.classList.remove("dente-soft-focus-highlight");
	}, 2000);

	return true;
}
