/**
 * RadiologyStudiesArchive.tsx — Картотека и архив всех рентгеновских и КЛКТ исследований (Мандат 8b <= 120 строк).
 *
 * Архитектурный инвариант изоляции прод/демо (Мандат 8wy):
 * - Запросы выполняются к реальным API: "/api/radiology/studies" и "/api/imaging/studies".
 * - В боевом режиме без демо-витрины: setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);
 * - Защита от утечки демо-данных: s.organizationId !== DEMO_SHOWCASE_ORG_ID
 * - Честный пустой экран: "Снимков пока нет. Загрузите DICOM или подключите датчик визиографа".
 */

import React from "react";
import type { RadiologyStudiesArchiveProps } from "./modules/RadiologyArchiveTypes";
import { RadiologyArchiveFilters } from "./modules/RadiologyArchiveFilters";
import { RadiologyArchiveStats } from "./modules/RadiologyArchiveStats";
import { RadiologyArchiveTable } from "./modules/RadiologyArchiveTable";
import { useRadiologyArchiveLogic } from "./modules/useRadiologyArchiveLogic";
import { StudyPatientBindControlModal } from "./StudyPatientBindControlModal";

export * from "./modules/RadiologyArchiveTypes";
export { DEMO_ARCHIVE_STUDIES } from "./demoArchiveStudies";

export const RadiologyStudiesArchive: React.FC<RadiologyStudiesArchiveProps> = ({
	onOpenStudio,
	onOpenViewer,
	onOpenSensorViewer,
	onUploadNew,
	onOpenDirectRvgCapture,
	initialStudies,
	initialLoading,
}) => {
	const {
		studies,
		isLoading,
		searchQuery,
		setSearchQuery,
		modalityFilter,
		setModalityFilter,
		bindingFilter,
		setBindingFilter,
		activeControlStudy,
		setActiveControlStudy,
		filteredStudies,
	} = useRadiologyArchiveLogic(initialStudies, initialLoading);

	return (
		<div
			className="flex-1 flex flex-col bg-[var(--paper)] overflow-hidden select-none"
			data-testid="radiology-archive-container"
		>
			<RadiologyArchiveStats studies={studies} />

			<RadiologyArchiveFilters
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				modalityFilter={modalityFilter}
				setModalityFilter={setModalityFilter}
				bindingFilter={bindingFilter}
				setBindingFilter={setBindingFilter}
				onUploadNew={onUploadNew}
			/>

			<RadiologyArchiveTable
				studies={filteredStudies}
				isLoading={isLoading}
				onOpenStudio={onOpenStudio}
				onOpenViewer={onOpenViewer}
				onOpenSensorViewer={onOpenSensorViewer}
				onOpenBindControl={(study) => setActiveControlStudy(study)}
				onUploadNew={onUploadNew}
				onOpenDirectRvgCapture={onOpenDirectRvgCapture}
			/>

			{activeControlStudy && (
				<StudyPatientBindControlModal
					isOpen={Boolean(activeControlStudy)}
					study={activeControlStudy}
					onClose={() => setActiveControlStudy(null)}
					onStudyUpdated={() => setActiveControlStudy(null)}
				/>
			)}
		</div>
	);
};
