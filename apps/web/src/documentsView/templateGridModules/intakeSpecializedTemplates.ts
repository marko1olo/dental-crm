/**
 * intakeSpecializedTemplates.ts
 * Pediatric, photo consent, and refusal templates in clean clinical Russian.
 * Mandates 8b, 8e, 8x, 8ap: Zero regulatory bird-language.
 */

import type { DocumentTemplateItem } from "./documentTemplateTypes";

export const INTAKE_SPECIALIZED_TEMPLATES: readonly DocumentTemplateItem[] = [
	{
		id: "minor_legal_representative_consent",
		kind: "minor_legal_representative_consent",
		titleRu: "Согласие законного представителя несовершеннолетнего",
		category: "intake",
		badgeRu: "Детство",
		descriptionRu: "Согласие родителя или опекуна на стоматологический приём и лечение несовершеннолетнего.",
		regulationRu: "Законный представитель",
		printSupported: true,
		isPediatric: true,
	},
	{
		id: "pediatric_treatment_consent",
		kind: "pediatric_treatment_consent",
		titleRu: "ИДС на детский приём",
		category: "intake",
		badgeRu: "Детство",
		descriptionRu: "Согласие законного представителя на лечение временных и постоянных зубов у детей.",
		regulationRu: "Детский приём",
		isPediatric: true,
		printSupported: true,
	},
	{
		id: "photo_video_consent",
		kind: "photo_video_consent",
		titleRu: "Согласие на фото- и видеопротоколирование",
		category: "intake",
		badgeRu: "Фотопротокол",
		descriptionRu: "Разрешение на клиническую дентальную съёмку до и после для медкарты и контроля качества.",
		regulationRu: "Клинический фотопротокол",
		printSupported: true,
	},
	{
		id: "medical_intervention_refusal",
		kind: "medical_intervention_refusal",
		titleRu: "Отказ от медицинского вмешательства",
		category: "intake",
		badgeRu: "Отказ",
		descriptionRu: "Письменный отказ пациента от предложенного вмешательства с разъяснением клинических рисков.",
		regulationRu: "Отказ от лечения",
		printSupported: true,
		isStatutory: true,
	},
	{
		id: "refusal_of_medical_intervention",
		kind: "refusal_of_medical_intervention",
		titleRu: "Отказ от медицинского вмешательства (бланк)",
		category: "intake",
		badgeRu: "Отказ",
		descriptionRu: "Письменный отказ пациента от предложенного плана лечения с разъяснением клинических последствий.",
		regulationRu: "Отказ от лечения",
		printSupported: true,
	},
];
