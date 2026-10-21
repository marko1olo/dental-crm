import { Award, Heart } from "lucide-react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";
import type { DocumentCatalogItem } from "./types";

export interface PediatricActionHandlers {
	setIsDiplomaModalOpen: (open: boolean) => void;
	setIsConsentModalOpen: (open: boolean) => void;
	setSelectedA4Tab: (tab: ProfessionalA4DocumentTab) => void;
}

export function getPediatricItems(
	h: PediatricActionHandlers,
): DocumentCatalogItem[] {
	return [
		{
			id: "minor_legal_consent",
			kind: "minor_legal_representative_consent",
			titleRu: "Согласие законного представителя ребёнка",
			category: "pediatric",
			descriptionRu:
				"Согласие родителя или опекуна на осмотр и лечение ребёнка",
			badgeRu: "Педиатрия",
			regulationRu: "Согласие родителя · Педиатрия",
			icon: Heart,
			isPediatric: true,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.setIsConsentModalOpen(true),
		},
		{
			id: "pediatric_bravery_diploma",
			titleRu: "Грамота за смелость (детский диплом)",
			category: "pediatric",
			descriptionRu:
				"Памятный диплом супергероя маленькому пациенту за храбрость у кресла",
			badgeRu: "Печать грамоты",
			regulationRu: "Печать грамоты · Адаптация",
			icon: Award,
			isPediatric: true,
			printSupported: true,
			onQuickAction: () => h.setIsDiplomaModalOpen(true),
		},
		{
			id: "pediatric_treatment_plan",
			kind: "treatment_plan",
			titleRu: "План лечения ребёнка",
			category: "pediatric",
			descriptionRu:
				"Комплексный график адаптации, санации молочных зубов и профилактики",
			badgeRu: "План санации",
			regulationRu: "План санации · Педиатрия",
			icon: ToothDeciduous,
			isPediatric: true,
			printSupported: true,
			onQuickAction: () => h.setSelectedA4Tab("treatment_plan"),
		},
	];
}
