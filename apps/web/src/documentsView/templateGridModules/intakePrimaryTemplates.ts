/**
 * intakePrimaryTemplates.ts
 * Core intake, consent, and patient onboarding templates in clean clinical Russian.
 * Mandates 8b, 8e, 8x, 8ap: Zero regulatory bird-language.
 */

import type { DocumentTemplateItem } from "./documentTemplateTypes";

export const INTAKE_PRIMARY_TEMPLATES: readonly DocumentTemplateItem[] = [
	{
		id: "primary_intake_package_quick",
		kind: "primary_intake_package",
		titleRu: "Пакет первичного приёма в 1 клик",
		category: "intake",
		badgeRu: "Комплект",
		descriptionRu: "Комплект первичного приёма: Договор на лечение, Информированное согласие, Защита персональных данных и Анкета соматического здоровья.",
		regulationRu: "Базовый юридический комплект",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "paid_medical_services_contract",
		kind: "paid_medical_services_contract",
		titleRu: "Договор оказания платных медицинских услуг",
		category: "intake",
		badgeRu: "Обязательный",
		descriptionRu: "Двусторонний договор с пациентом или заказчиком, реквизиты клиники, предмет и гарантии.",
		regulationRu: "Правила платных услуг",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "informed_consent",
		kind: "informed_consent",
		titleRu: "Информированное добровольное согласие (ИДС)",
		category: "intake",
		badgeRu: "Согласие",
		descriptionRu: "Базовое согласие на первичный осмотр, сбор анамнеза, фотопротокол и инструментальное обследование.",
		regulationRu: "Информированное согласие",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "general_processing_consent",
		kind: "general_processing_consent",
		titleRu: "ИДС на общее стоматологическое лечение",
		category: "intake",
		badgeRu: "Согласие",
		descriptionRu: "Базовое согласие на терапевтическое и профилактическое стоматологическое лечение.",
		regulationRu: "Информированное согласие",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "personal_data_processing_consent",
		kind: "personal_data_processing_consent",
		titleRu: "Согласие на обработку персональных данных",
		category: "intake",
		badgeRu: "Персданные",
		descriptionRu: "Согласие на обработку персональных данных и сохранение врачебной тайны.",
		regulationRu: "Конфиденциальность и тайна",
		printSupported: true,
		isPrimary: true,
		isStatutory: true,
	},
	{
		id: "patient_intake_questionnaire",
		kind: "patient_intake_questionnaire",
		titleRu: "Анкета здоровья и соматического статуса",
		category: "intake",
		badgeRu: "Анамнез",
		descriptionRu: "Опрос соматических патологий, аллергий, гемостаза и противопоказаний к приёму.",
		regulationRu: "Клинический стандарт",
		printSupported: true,
		isPrimary: true,
	},
];
