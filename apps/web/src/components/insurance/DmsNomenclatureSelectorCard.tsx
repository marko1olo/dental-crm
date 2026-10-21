/**
 * DmsNomenclatureSelectorCard.tsx — Карточка выбора номенклатурных услуг и диагнозов (МКБ-10).
 * (Мандат 8b: <= 120 строк)
 */

import { CheckCircle2 } from "lucide-react";
import React, { useId, useState } from "react";
import { search804nServices } from "./insuranceMath.js";
import {
	DmsDiagnosisSelectorChips,
	DmsServiceCatalogItemList,
	DmsServiceCatalogSearch,
} from "./dmsNomenclatureSelector/index.js";

export {
	DmsDiagnosisSelectorChips,
	DmsServiceCatalogItemList,
	DmsServiceCatalogSearch,
} from "./dmsNomenclatureSelector/index.js";

export interface DmsNomenclatureSelectorCardProps {
	readonly approvedServiceCodes: readonly string[];
	readonly approvedDiagnosisCodes: readonly string[];
	readonly onToggleApprovedService: (code: string) => void;
	readonly onToggleDiagnosis: (code: string) => void;
}

export function DmsNomenclatureSelectorCard({
	approvedServiceCodes,
	approvedDiagnosisCodes,
	onToggleApprovedService,
	onToggleDiagnosis,
}: DmsNomenclatureSelectorCardProps) {
	const serviceSearchInputId = useId();
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");

	const filteredCatalog = search804nServices(searchQuery).filter((item) => {
		if (selectedCategoryTab === "all") return true;
		return item.category === selectedCategoryTab;
	});

	return (
		<div className="dms-card">
			<h3 className="dms-card-title">
				<CheckCircle2 size={18} className="text-[var(--brand-primary,#0d9488)]" />
				4. Согласованные услуги и диагнозы (МКБ-10)
			</h3>
			<DmsDiagnosisSelectorChips
				approvedDiagnosisCodes={approvedDiagnosisCodes}
				onToggleDiagnosis={onToggleDiagnosis}
			/>
			<DmsServiceCatalogSearch
				selectedCategoryTab={selectedCategoryTab}
				onSelectCategoryTab={setSelectedCategoryTab}
				searchQuery={searchQuery}
				onSearchQueryChange={setSearchQuery}
				serviceSearchInputId={serviceSearchInputId}
			/>
			<DmsServiceCatalogItemList
				items={filteredCatalog}
				approvedServiceCodes={approvedServiceCodes}
				onToggleApprovedService={onToggleApprovedService}
			/>
		</div>
	);
}
