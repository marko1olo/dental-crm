import type React from "react";
import { FileCheck, FileText, Receipt, UserCheck } from "lucide-react";

export interface FilterDocumentKindChipsProps {
	readonly kindFilter: string;
	readonly onKindFilterChange: (kind: string) => void;
}

export function FilterDocumentKindChips({
	kindFilter,
	onKindFilterChange,
}: FilterDocumentKindChipsProps): React.JSX.Element {
	return (
		<div className="document-filters-row document-filters-row--kinds">
			<div className="document-filter-group" role="group" aria-label="Быстрый фильтр по типам документов">
				<span className="document-filter-label">Документы:</span>
				<button
					type="button"
					className={`document-filter-chip ${kindFilter === "all" ? "active" : ""}`}
					onClick={() => onKindFilterChange("all")}
					data-testid="filter-kind-all"
				>
					<FileText size={13} className="shrink-0" aria-hidden="true" />
					<span>Все типы</span>
				</button>
				<button
					type="button"
					className={`document-filter-chip ${kindFilter === "paid_medical_services_contract" ? "active" : ""}`}
					onClick={() => onKindFilterChange("paid_medical_services_contract")}
					data-testid="filter-kind-contracts"
				>
					<FileText size={13} className="shrink-0" aria-hidden="true" />
					<span>Договоры</span>
				</button>
				<button
					type="button"
					className={`document-filter-chip ${kindFilter === "informed_consent" ? "active" : ""}`}
					onClick={() => onKindFilterChange("informed_consent")}
					data-testid="filter-kind-consents"
				>
					<UserCheck size={13} className="shrink-0" aria-hidden="true" />
					<span>Согласия (ИДС)</span>
				</button>
				<button
					type="button"
					className={`document-filter-chip ${kindFilter === "completed_works_act" ? "active" : ""}`}
					onClick={() => onKindFilterChange("completed_works_act")}
					data-testid="filter-kind-acts"
				>
					<FileCheck size={13} className="shrink-0" aria-hidden="true" />
					<span>Акты выполненных работ</span>
				</button>
				<button
					type="button"
					className={`document-filter-chip ${kindFilter === "tax_deduction_certificate" ? "active" : ""}`}
					onClick={() => onKindFilterChange("tax_deduction_certificate")}
					data-testid="filter-kind-fns"
				>
					<Receipt size={13} className="shrink-0" aria-hidden="true" />
					<span>Справки для ФНС</span>
				</button>
			</div>
		</div>
	);
}
