import {
	ClipboardList,
	FileCheck,
	Receipt,
	ShieldAlert,
	Zap,
} from "lucide-react";
import type { TaxDeductionTab } from "../../finance/taxDeduction/types";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";
import type { DocumentCatalogItem } from "./types";
import type { DocumentKind } from "@dental/shared";

export interface FinanceActionHandlers {
	handleOpenTax: (tab?: TaxDeductionTab) => void;
	setSelectedA4Tab: (tab: ProfessionalA4DocumentTab) => void;
	handleOpenKind: (kind: DocumentKind, titleRu?: string) => void;
}

export function getFinanceItems(
	h: FinanceActionHandlers,
): DocumentCatalogItem[] {
	return [
		{
			id: "tax_deduction_certificate",
			kind: "tax_deduction_certificate",
			titleRu: "Справка для налогового вычета 13%",
			category: "finance_tax",
			descriptionRu:
				"Справка об оплате медуслуг по кодам 1 и 2 для возврата 13% НДФЛ",
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
			descriptionRu:
				"Электронный журнал выданных справок об оплате медицинских услуг и отправки в ФНС России",
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
			descriptionRu:
				"Финансовый акт оказанных услуг с подписью о приёмке работ",
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
			descriptionRu:
				"Подтверждение оплаты услуг наличными, картой, СБП или с депозита",
			badgeRu: "Кассовый чек",
			regulationRu: "Кассовый чек · Оплата",
			icon: Receipt,
			printSupported: true,
			onQuickAction: () =>
				h.handleOpenKind("payment_receipt", "Квитанция и подтверждение оплаты"),
		},
		{
			id: "medical_intervention_refusal",
			kind: "medical_intervention_refusal",
			titleRu: "Отказ от медицинского вмешательства",
			category: "refusal",
			descriptionRu:
				"Официальное оформление отказа от предложенного вмешательства",
			badgeRu: "Форма отказа",
			regulationRu: "Отказ от вмешательства",
			icon: ShieldAlert,
			isStatutory: true,
			printSupported: true,
			onQuickAction: () => h.handleOpenKind("medical_intervention_refusal"),
		},
	];
}
