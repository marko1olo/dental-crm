import {
	ClipboardList, FileText, Scan, ShieldCheck, Sparkles, UserCheck,
} from "lucide-react";
import { DentalMedicalCard } from "../../icons/DentalIcons";
import type { DocumentCatalogItem } from "./types";
import type { DocumentKind } from "@dental/shared";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";

export interface ItemActionHandlers {
	setSelectedA4Tab: (tab: ProfessionalA4DocumentTab) => void;
	handleOpenKind: (kind: DocumentKind, titleRu?: string) => void;
}

export function getIntakeAndClinicalItems(h: ItemActionHandlers): DocumentCatalogItem[] {
	return [
		{
			id: "consent_medical_intervention",
			kind: "informed_consent",
			titleRu: "Информированное согласие на лечение",
			category: "intake",
			descriptionRu: "Согласие на медицинское вмешательство: добровольное согласие пациента на осмотр, диагностику и анестезию",
			badgeRu: "Стандарт Минздрава",
			regulationRu: "Согласие на лечение · Стандарт",
			icon: ShieldCheck,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.setSelectedA4Tab("informed_consent"),
		},
		{
			id: "treatment_contract_paid",
			kind: "paid_medical_services_contract",
			titleRu: "Договор платных медицинских услуг",
			category: "intake",
			descriptionRu: "Договор с пациентом или заказчиком на стоматологическое лечение",
			badgeRu: "Договор клиники",
			regulationRu: "Договор клиники · ГОСТ",
			icon: FileText,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.setSelectedA4Tab("contract"),
		},
		{
			id: "personal_data_processing_consent",
			kind: "personal_data_processing_consent",
			titleRu: "Согласие на обработку персданных",
			category: "intake",
			descriptionRu: "Правовое основание для ведения медкарты, связи и оповещений",
			badgeRu: "Персональные данные",
			regulationRu: "Персональные данные · Конфиденциальность",
			icon: UserCheck,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.setSelectedA4Tab("personal_data"),
		},
		{
			id: "patient_intake_questionnaire",
			kind: "patient_intake_questionnaire",
			titleRu: "Анкета первичного пациента о здоровье",
			category: "intake",
			descriptionRu: "Сбор аллергоанамнеза, хронических патологий и реакций на анестетики",
			badgeRu: "Анкета здоровья",
			regulationRu: "Анкета здоровья · Аллергоанамнез",
			icon: ClipboardList,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.handleOpenKind("patient_intake_questionnaire", "Анкета первичного пациента о здоровье"),
		},
		{
			id: "dental_medical_card",
			kind: "dental_medical_card_043u",
			titleRu: "Медицинская карта приёма",
			category: "clinical",
			descriptionRu: "Амбулаторный протокол осмотра, зубной формулы и дневника приёма",
			badgeRu: "Амбулаторная карта",
			regulationRu: "Амбулаторная карта · Дневник",
			icon: DentalMedicalCard,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.setSelectedA4Tab("medical_card"),
		},
		{
			id: "treatment_plan",
			kind: "treatment_plan",
			titleRu: "План стоматологического лечения",
			category: "clinical",
			descriptionRu: "Поэтапный график санации, финансовая смета и согласование работ",
			badgeRu: "План и смета",
			regulationRu: "План и смета · Гарантии",
			icon: FileText,
			printSupported: true,
			onQuickAction: () => h.setSelectedA4Tab("treatment_plan"),
		},
		{
			id: "xray_cbct_referral",
			kind: "xray_cbct_referral",
			titleRu: "Направление на рентгенодиагностику и КТ",
			category: "clinical",
			descriptionRu: "Направление на прицельный снимок, ОПТГ или КЛКТ челюстей",
			badgeRu: "Рентген / КЛКТ",
			regulationRu: "Диагностика · Снимок",
			icon: Scan,
			printSupported: true,
			onQuickAction: () => h.handleOpenKind("xray_cbct_referral", "Направление на рентгенодиагностику и КТ"),
		},
		{
			id: "post_visit_recommendations",
			kind: "post_visit_recommendations",
			titleRu: "Рекомендации пациенту после приёма",
			category: "clinical",
			descriptionRu: "Памятка по уходу и режиму после проведённого лечения",
			badgeRu: "Памятка ухода",
			regulationRu: "Памятка ухода · Реабилитация",
			icon: Sparkles,
			printSupported: true,
			onQuickAction: () => h.handleOpenKind("post_visit_recommendations", "Рекомендации пациенту после приёма"),
		},
	];
}
