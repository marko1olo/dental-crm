import React from "react";
import { DoctorMaterialsCatalogSection } from "../doctor";
import { DoctorVisitDurationCard } from "./DoctorVisitDurationCard";
import { DoctorFavoriteMedicationsCard } from "./DoctorFavoriteMedicationsCard";
import { DoctorOdontogramSettingsCard } from "./DoctorOdontogramSettingsCard";
import { DoctorQuickProtocolsCard } from "./DoctorQuickProtocolsCard";

export function DoctorMaterialsTabContent() {
	return (
		<>
			{/* 1. Длительность приёма по умолчанию */}
			<DoctorVisitDurationCard />

			{/* 2. РЕЕСТР КЛИНИЧЕСКИХ МАТЕРИАЛОВ */}
			<DoctorMaterialsCatalogSection />

			{/* 3. Любимые медикаменты для рецептов */}
			<DoctorFavoriteMedicationsCard />

			{/* 4. Отображение зубной формулы / Одонтограмма */}
			<DoctorOdontogramSettingsCard />

			{/* 5. Быстрые шаблоны дневников приёма */}
			<DoctorQuickProtocolsCard />
		</>
	);
}
