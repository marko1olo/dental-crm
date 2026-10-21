import { FileText, Scan, Sparkles } from "lucide-react";
import { DentalMedicalCard } from "../../icons/DentalIcons";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";
import type { DocumentCatalogItem } from "./types";
import type { DocumentKind } from "@dental/shared";

export interface ClinicalActionHandlers {
	setSelectedA4Tab: (tab: ProfessionalA4DocumentTab) => void;
	handleOpenKind: (kind: DocumentKind, titleRu?: string) => void;
}

export function getClinicalItems(
	h: ClinicalActionHandlers,
): DocumentCatalogItem[] {
	return [
		{
			id: "dental_medical_card",
			kind: "dental_medical_card_043u",
			titleRu: "Медицинская карта приёма",
			category: "clinical",
			descriptionRu:
				"Амбулаторный протокол осмотра, зубной формулы и дневника приёма",
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
			descriptionRu:
				"Поэтапный график санации, финансовая смета и согласование работ",
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
			onQuickAction: () =>
				h.handleOpenKind(
					"xray_cbct_referral",
					"Направление на рентгенодиагностику и КТ",
				),
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
			onQuickAction: () =>
				h.handleOpenKind(
					"post_visit_recommendations",
					"Рекомендации пациенту после приёма",
				),
		},
	];
}
