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
 * Канонический реестр 23+ специализированных клинических пресетов StomX & Минздрава РФ.
 */
export const STOMX_SPECIALIZED_CONSENT_PRESETS: Record<
	string,
	ClinicalProcedureConsentPreset
> = {
	// 1. ИДС Виниры (StomX #58)
	veneers: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.veneers,
	// 2. ИДС Имплантация (StomX #60)
	implantation: SURGERY_AND_IMPLANT_CONSENT_PRESETS.implantation,
	// 3. ИДС Синус-лифтинг (StomX #73)
	sinus_lifting: SURGERY_AND_IMPLANT_CONSENT_PRESETS.sinus_lifting,
	// 3a. ИДС Костная пластика / Направленная костная регенерация (НКР) / Остеопластика (DentalPRO & StomX)
	bone_grafting: SURGERY_AND_IMPLANT_CONSENT_PRESETS.bone_grafting,
	// 4. ИДС Седация (StomX #72)
	sedation: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.sedation,
	// 5. ИДС Удаление зуба (StomX #76)
	surgery_extraction: SURGERY_AND_IMPLANT_CONSENT_PRESETS.surgery_extraction,
	// 6. ИДС Несъемные ортопедические конструкции (StomX #63)
	fixed_prosthetics: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.fixed_prosthetics,
	// 7. ИДС Съемные ортопедические конструкции (StomX #74)
	removable_prosthetics: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.removable_prosthetics,
	// 8. ИДС Глубокий кариес (StomX #59)
	deep_caries: THERAPY_CONSENT_PRESETS.deep_caries,
	// 9. ИДС Поверхностный и средний кариес (StomX #61)
	superficial_medium_caries: THERAPY_CONSENT_PRESETS.superficial_medium_caries,
	// 10. ИДС Пульпит и эндодонтия (StomX #70, #79)
	pulpitis_endodontics: THERAPY_CONSENT_PRESETS.pulpitis_endodontics,
	// 11. ИДС Пародонтология (StomX #68)
	periodontology: THERAPY_CONSENT_PRESETS.periodontology,
	// 12. ИДС Профессиональная гигиена (StomX #69)
	professional_hygiene: THERAPY_CONSENT_PRESETS.professional_hygiene,
	// 13. ИДС Отбеливание зубов (StomX #67)
	teeth_whitening: THERAPY_CONSENT_PRESETS.teeth_whitening,
	// 14. ИДС Ортодонтия (StomX #65)
	orthodontics: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.orthodontics,
	// 14a. ИДС Элайнеры и ортодонтические каппы (DentalPRO & StomX)
	aligners: ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.aligners,
	// 15. ИДС Общее для несовершеннолетних (представитель) (StomX #64)
	minor_general: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.minor_general,
	// 16. ИДС Рентгенологическое исследование и КЛКТ (StomX #71)
	xray_cbct: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.xray_cbct,
	// 17. ИДС Фотопротокол (StomX #77)
	photoprotocol: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.photoprotocol,
	// 18. Отказ от передачи данных в ЕГИСЗ (ФЗ-323 ст. 13) (StomX #80)
	egisz_refusal: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.egisz_refusal,
	// 19. Отказ от медицинского вмешательства (StomX #81)
	medical_intervention_refusal: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.medical_intervention_refusal,
	// 20. Положение о гарантийных обязательствах и сроках службы (StomX #82)
	warranty_policy: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.warranty_policy,
	// 21. Лист учета дозовых нагрузок пациента (СанПиН 2.6.1.1192-03) (StomX #15)
	xray_dose_load_sheet: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.xray_dose_load_sheet,
	// 22. Гарантийный паспорт стоматологического пациента (StomX #54)
	warranty_passport: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.warranty_passport,
	// 23. Анкета общего состояния здоровья (StomX #53)
	somatic_health_questionnaire: ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.somatic_health_questionnaire,

	// Legacy aliases (полная обратная совместимость)
	...LEGACY_CONSENT_PRESETS,
};
