import type { ProcedureSpecificConsentPayload } from "@dental/shared";

export const procedureTypeLabels: Record<
	ProcedureSpecificConsentPayload["procedureType"],
	string
> = {
	local_anesthesia: "местная анестезия",
	therapy_endo_restoration: "терапия, эндодонтия или реставрация",
	sedation: "седация (ЗАКС / внутривенная)",
	surgery_extraction: "хирургия или удаление зуба",
	implantation_bone_graft:
		"имплантация, костная пластика или синус-лифтинг",
	prosthetics: "ортопедия",
	orthodontics: "ортодонтия",
	hygiene_whitening: "профессиональная гигиена или отбеливание",
	periodontology: "пародонтология",
	other: "другая процедура",
	veneers: "виниры",
	implantation: "дентальная имплантация",
	sinus_lifting: "синус-лифтинг",
	fixed_prosthetics: "несъемное протезирование",
	removable_prosthetics: "съемное протезирование",
	deep_caries: "глубокий кариес",
	superficial_medium_caries: "поверхностный и средний кариес",
	pulpitis_endodontics: "пульпит и эндодонтия",
	professional_hygiene: "профессиональная гигиена",
	teeth_whitening: "отбеливание зубов",
	minor_general: "общее согласие для несовершеннолетних",
	xray_cbct: "рентгенологическое исследование и КЛКТ",
	photoprotocol: "фотопротокол",
	egisz_refusal: "отказ от передачи данных в ЕГИСЗ",
	medical_intervention_refusal: "отказ от медицинского вмешательства",
	warranty_policy: "гарантийные обязательства",
	warranty_passport: "гарантийный паспорт и условия",
	somatic_health_questionnaire: "анкета о соматическом здоровье и рисках",
	xray_dose_load_sheet: "лист учета дозовых нагрузок при рентгене",
	bone_grafting: "костная пластика и остеопластические материалы",
	aligners: "ортодонтическое лечение на элайнерах",
};
