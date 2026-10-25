/**
 * apps/web/src/components/settings/doctor/DoctorMaterialsCatalogSection.tsx
 *
 * Реестр 90% стоматологических материалов РФ/СНГ с 1-клик выбором
 * и автогенерацией персонализированного фрагмента протокола для медкарты.
 * Decomposed facade strictly <= 120 lines following Mandate 8b.
 */

import React, { useMemo, useState } from "react";
import {
	ADHESIVE_OPTIONS,
	type AdhesiveSystem,
	ANESTHETIC_OPTIONS,
	type AnestheticKey,
	type ClinicalMaterialOption,
	COMPOSITE_OPTIONS,
	type CompositeMaterial,
	ETCHANT_OPTIONS,
	type EtchantGel,
	ISOLATION_OPTIONS,
	type IsolationType,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";
import { showToast } from "../../GlobalToast";
import { buildDoctorPersonalizedTherapySnippet } from "../protocolSnippetHelpers";
import { DoctorMaterialsCategoryTabs, type MaterialCategoryTab } from "./materials/DoctorMaterialsCategoryTabs";
import { DoctorMaterialsGrid } from "./materials/DoctorMaterialsGrid";
import { DoctorMaterialsLiveSnippetCard } from "./materials/DoctorMaterialsLiveSnippetCard";
import { DoctorMaterialsSearchHeader } from "./materials/DoctorMaterialsSearchHeader";

export interface DoctorMaterialsCatalogSectionProps {
	readonly className?: string | undefined;
}

export function DoctorMaterialsCatalogSection({ className = "" }: DoctorMaterialsCatalogSectionProps) {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	const [activeMaterialTab, setActiveMaterialTab] = useState<MaterialCategoryTab>("composites");
	const [materialSearchQuery, setMaterialSearchQuery] = useState<string>("");

	const filteredMaterials = useMemo(() => {
		let list: readonly ClinicalMaterialOption[] = [];
		switch (activeMaterialTab) {
			case "composites": list = COMPOSITE_OPTIONS; break;
			case "adhesives": list = ADHESIVE_OPTIONS; break;
			case "anesthetics": list = ANESTHETIC_OPTIONS; break;
			case "isolation": list = ISOLATION_OPTIONS; break;
			case "etchants": list = ETCHANT_OPTIONS; break;
		}
		const q = materialSearchQuery.trim().toLowerCase();
		if (!q) return list;
		return list.filter((m) =>
			m.name.toLowerCase().includes(q) || m.title.toLowerCase().includes(q) ||
			m.manufacturer.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) ||
			(m.category && m.category.toLowerCase().includes(q)) ||
			(m.badge && m.badge.toLowerCase().includes(q)),
		);
	}, [activeMaterialTab, materialSearchQuery]);

	const isMaterialSelected = (id: string): boolean => {
		switch (activeMaterialTab) {
			case "composites": return preferences.defaultComposite === id;
			case "adhesives": return preferences.defaultAdhesive === id;
			case "anesthetics": return preferences.favoriteAnesthetic === id;
			case "isolation": return preferences.defaultIsolation === id;
			case "etchants": return preferences.defaultEtchant === id;
		}
	};

	const handleSelectFavoriteMaterial = (item: ClinicalMaterialOption) => {
		switch (activeMaterialTab) {
			case "composites": updatePreferences({ defaultComposite: item.id as CompositeMaterial }); break;
			case "adhesives": updatePreferences({ defaultAdhesive: item.id as AdhesiveSystem }); break;
			case "anesthetics": updatePreferences({ favoriteAnesthetic: item.id as AnestheticKey }); break;
			case "isolation": updatePreferences({ defaultIsolation: item.id as IsolationType }); break;
			case "etchants": updatePreferences({ defaultEtchant: item.id as EtchantGel }); break;
		}
		showToast(`Материал «${item.name}» выбран и подтягивается в протокол ЕМК`, "success");
	};

	const liveSoapSnippet = useMemo(() => buildDoctorPersonalizedTherapySnippet(preferences), [preferences]);

	const handleCopyLiveSnippet = () => {
		navigator.clipboard.writeText(liveSoapSnippet);
		showToast("Протокол ЕМК скопирован в буфер обмена", "success");
	};

	return (
		<div className={`p-3.5 sm:p-4 rounded-2xl bg-[var(--glass-panel,var(--paper-soft))] border border-[var(--glass-border,var(--line))] backdrop-blur-md space-y-3 shadow-xs ${className}`} data-testid="doctor-materials-catalog-section">
			<DoctorMaterialsSearchHeader searchQuery={materialSearchQuery} onSearchChange={setMaterialSearchQuery} />
			<DoctorMaterialsCategoryTabs activeTab={activeMaterialTab} onTabChange={setActiveMaterialTab} />
			<DoctorMaterialsGrid materials={filteredMaterials} isSelected={isMaterialSelected} onSelect={handleSelectFavoriteMaterial} />
			<DoctorMaterialsLiveSnippetCard liveSoapSnippet={liveSoapSnippet} onCopy={handleCopyLiveSnippet} />
		</div>
	);
}

export default DoctorMaterialsCatalogSection;
