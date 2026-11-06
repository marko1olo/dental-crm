import type { ClinicalProcedureConsentPreset } from "./types.js";
import { THERAPY_CONSENT_PRESETS } from "./therapyConsents.js";
import { SURGERY_AND_IMPLANT_CONSENT_PRESETS } from "./surgeryAndImplantConsents.js";
import { ORTHO_AND_PROSTHETIC_CONSENT_PRESETS } from "./orthoAndProstheticConsents.js";
import { ANESTHESIA_AND_GENERAL_CONSENT_PRESETS } from "./anesthesiaAndGeneralConsents.js";

export * from "./types.js";
export * from "./therapyConsents.js";
export * from "./surgeryAndImplantConsents.js";
export * from "./orthoAndProstheticConsents.js";
export * from "./anesthesiaAndGeneralConsents.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * КЛИНИЧЕСКИЕ ПРЕСЕТЫ ИДС STOMX ДЛЯ СПЕЦИАЛИЗИРОВАННОЙ СТОМАТОЛОГИИ
 * Сводный реестр (Мандаты 8e, 8k, 8n)
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Унаследованные клинические профили согласий для обратной совместимости с существующей базой.
 */
export const LEGACY_CONSENT_PRESETS: Record<
	string,
	ClinicalProcedureConsentPreset
> = {
	therapy_endo_restoration: THERAPY_CONSENT_PRESETS.therapy_endo_restoration,
	local_anesthesia: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.local_anesthesia,
	implantation_bone_graft: SURGERY_AND_IMPLANT_CONSENT_PRESETS.implantation_bone_graft,
	prosthetics: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.prosthetics,
	hygiene_whitening: THERAPY_CONSENT_PRESETS.hygiene_whitening,
	other: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.other,
};

/**
 * Канонический реестр 23+ специализированных клинических пресетов DENTE & Минздрава РФ.
 */
export const CLINICAL_SPECIALIZED_CONSENT_PRESETS: Record<
	string,
	ClinicalProcedureConsentPreset
> = {
	// 1. ИДС Виниры
	veneers: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.veneers,
	// 2. ИДС Имплантация
	implantation: SURGERY_AND_IMPLANT_CONSENT_PRESETS.implantation,
	// 3. ИДС Синус-лифтинг
	sinus_lifting: SURGERY_AND_IMPLANT_CONSENT_PRESETS.sinus_lifting,
	// 3a. ИДС Костная пластика / Направленная костная регенерация (НКР) / Остеопластика
	bone_grafting: SURGERY_AND_IMPLANT_CONSENT_PRESETS.bone_grafting,
	// 4. ИДС Седация
	sedation: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.sedation,
	// 5. ИДС Удаление зуба
	surgery_extraction: SURGERY_AND_IMPLANT_CONSENT_PRESETS.surgery_extraction,
	// 6. ИДС Несъемные ортопедические конструкции
	fixed_prosthetics: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.fixed_prosthetics,
	// 7. ИДС Съемные ортопедические конструкции
	removable_prosthetics: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.removable_prosthetics,
	// 8. ИДС Глубокий кариес
	deep_caries: THERAPY_CONSENT_PRESETS.deep_caries,
	// 9. ИДС Поверхностный и средний кариес
	superficial_medium_caries: THERAPY_CONSENT_PRESETS.superficial_medium_caries,
	// 10. ИДС Пульпит и эндодонтия
	pulpitis_endodontics: THERAPY_CONSENT_PRESETS.pulpitis_endodontics,
	// 11. ИДС Пародонтология
	periodontology: THERAPY_CONSENT_PRESETS.periodontology,
	// 12. ИДС Профессиональная гигиена
	professional_hygiene: THERAPY_CONSENT_PRESETS.professional_hygiene,
	// 13. ИДС Отбеливание зубов
	teeth_whitening: THERAPY_CONSENT_PRESETS.teeth_whitening,
	// 14. ИДС Ортодонтия
	orthodontics: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.orthodontics,
	// 14a. ИДС Элайнеры и ортодонтические каппы
	aligners: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.aligners,
	// 15. ИДС Общее для несовершеннолетних (представитель)
	minor_general: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.minor_general,
	// 16. ИДС Рентгенологическое исследование и КЛКТ
	xray_cbct: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.xray_cbct,
	// 17. ИДС Фотопротокол
	photoprotocol: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.photoprotocol,
	// 18. Отказ от передачи данных в ЕГИСЗ (ФЗ-323 ст. 13)
	egisz_refusal: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.egisz_refusal,
	// 19. Отказ от медицинского вмешательства
	medical_intervention_refusal: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.medical_intervention_refusal,
	// 20. Положение о гарантийных обязательствах и сроках службы
	warranty_policy: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.warranty_policy,
	// 21. Лист учета дозовых нагрузок пациента (СанПиН 2.6.1.1192-03)
	xray_dose_load_sheet: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.xray_dose_load_sheet,
	// 22. Гарантийный паспорт стоматологического пациента
	warranty_passport: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.warranty_passport,
	// 23. Анкета общего состояния здоровья
	somatic_health_questionnaire: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.somatic_health_questionnaire,

	// Legacy aliases (полная обратная совместимость)
	...LEGACY_CONSENT_PRESETS,
};

/** @deprecated Use CLINICAL_SPECIALIZED_CONSENT_PRESETS */
export const STOMX_SPECIALIZED_CONSENT_PRESETS = CLINICAL_SPECIALIZED_CONSENT_PRESETS;
