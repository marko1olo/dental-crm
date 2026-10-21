import { Award, ClipboardList, FileCheck, Heart, Receipt, ShieldAlert, Zap } from "lucide-react";
import { ToothDeciduous } from "../../icons/DentalIcons";
import type { DocumentCatalogItem } from "./types";
import type { DocumentKind } from "@dental/shared";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";
import type { TaxDeductionTab } from "../../finance/taxDeduction/types";

export interface FinancePediatricActionHandlers {
	handleOpenTax: (tab?: TaxDeductionTab) => void;
	setSelectedA4Tab: (tab: ProfessionalA4DocumentTab) => void;
	handleOpenKind: (kind: DocumentKind, titleRu?: string) => void;
	setIsDiplomaModalOpen: (open: boolean) => void;
	setIsConsentModalOpen: (open: boolean) => void;
}

export function getFinanceAndPediatricItems(h: FinancePediatricActionHandlers): DocumentCatalogItem[] {
	return [
		{
			id: "tax_deduction_certificate",
			kind: "tax_deduction_certificate",
			titleRu: "Справка для налогового вычета 13%",
			category: "finance_tax",
			descriptionRu: "Справка об оплате медуслуг по кодам 1 и 2 для возврата 13% НДФЛ",
			badgeRu: "Справка ФНС",
			regulationRu: "Справка для налоговой (13%)",
			icon: Zap,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.handleOpenTax("form"),
		},
		{
			id: "tax_deduction_registry",
			titleRu: "Реестр справок для налогового вычета (ФНС)",
			category: "finance_tax",
			descriptionRu: "Электронный журнал выданных справок об оплате медицинских услуг и отправки в ФНС России",
			badgeRu: "Журнал ФНС",
			regulationRu: "Справка об оплате медуслуг · Вычет 13%",
			icon: ClipboardList,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.handleOpenTax("registry"),
		},
		{
			id: "treatment_act_completed",
			kind: "completed_works_act",
			titleRu: "Акт выполненных стоматологических работ",
			category: "finance_tax",
			descriptionRu: "Финансовый акт оказанных услуг с подписью о приёмке работ",
			badgeRu: "Акт услуг",
			regulationRu: "Финансовый акт · Услуги",
			icon: FileCheck,
			printSupported: true,
			onQuickAction: () => h.setSelectedA4Tab("act"),
		},
		{
			id: "payment_receipt",
			kind: "payment_receipt",
			titleRu: "Квитанция и подтверждение оплаты",
			category: "finance_tax",
			descriptionRu: "Подтверждение оплаты услуг наличными, картой, СБП или с депозита",
			badgeRu: "Кассовый чек",
			regulationRu: "Кассовый чек · Оплата",
			icon: Receipt,
			printSupported: true,
			onQuickAction: () => h.handleOpenKind("payment_receipt", "Квитанция и подтверждение оплаты"),
		},
		{
			id: "medical_intervention_refusal",
			kind: "medical_intervention_refusal",
			titleRu: "Отказ от медицинского вмешательства",
			category: "refusal",
			descriptionRu: "Официальное оформление отказа от предложенного вмешательства",
			badgeRu: "Форма отказа",
			regulationRu: "Отказ от вмешательства",
			icon: ShieldAlert,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.handleOpenKind("medical_intervention_refusal"),
		},
		{
			id: "minor_legal_consent",
			kind: "minor_legal_representative_consent",
			titleRu: "Согласие законного представителя ребёнка",
			category: "pediatric",
			descriptionRu: "Согласие родителя или опекуна на осмотр и лечение ребёнка",
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
			descriptionRu: "Памятный диплом супергероя маленькому пациенту за храбрость у кресла",
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
			descriptionRu: "Комплексный график адаптации, санации молочных зубов и профилактики",
			badgeRu: "План санации",
			regulationRu: "План санации · Педиатрия",
			icon: ToothDeciduous,
			isPediatric: true,
			printSupported: true,
			onQuickAction: () => h.setSelectedA4Tab("treatment_plan"),
		},
	];
}
