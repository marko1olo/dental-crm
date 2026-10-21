import { ClipboardList, FileText, ShieldCheck, UserCheck } from "lucide-react";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";
import type { DocumentCatalogItem } from "./types";
import type { DocumentKind } from "@dental/shared";

export interface IntakeActionHandlers {
	setSelectedA4Tab: (tab: ProfessionalA4DocumentTab) => void;
	handleOpenKind: (kind: DocumentKind, titleRu?: string) => void;
}

export function getIntakeItems(h: IntakeActionHandlers): DocumentCatalogItem[] {
	return [
		{
			id: "consent_medical_intervention",
			kind: "informed_consent",
			titleRu: "Информированное согласие на лечение",
			category: "intake",
			descriptionRu:
				"Согласие на медицинское вмешательство: добровольное согласие пациента на осмотр, диагностику и анестезию",
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
			descriptionRu:
				"Договор с пациентом или заказчиком на стоматологическое лечение",
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
			descriptionRu:
				"Правовое основание для ведения медкарты, связи и оповещений",
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
			descriptionRu:
				"Сбор аллергоанамнеза, хронических патологий и реакций на анестетики",
			badgeRu: "Анкета здоровья",
			regulationRu: "Анкета здоровья · Аллергоанамнез",
			icon: ClipboardList,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () =>
				h.handleOpenKind(
					"patient_intake_questionnaire",
					"Анкета первичного пациента о здоровье",
				),
		},
	];
}
