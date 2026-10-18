import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { VisitClinicalToothTabs } from "./VisitClinicalToothTabs";
import {
	type ClinicalTabType,
	type VisitClinicalToothModalProps,
} from "./clinicalToothModal/clinicalModalTypes";
import { ClinicalModalHeader } from "./clinicalToothModal/ClinicalModalHeader";
import { ClinicalModalTabsBar } from "./clinicalToothModal/ClinicalModalTabsBar";
import { ClinicalModalFooter } from "./clinicalToothModal/ClinicalModalFooter";

export type { VisitClinicalToothModalProps };

export function VisitClinicalToothModal({
	selectedToothForMenu,
	closeClinicalModal,
	toothStateByCode,
	materialCategory,
	setMaterialCategory,
	handleSelectDiagnosis,
	handleSelectSurface,
	selectedSurfaces,
	isSurfaceMode: _isSurfaceMode,
	setIsSurfaceMode: _setIsSurfaceMode,
	setEndoModalToothNumber,
	setEndoModalToothState,
	setIsEndoModalOpen,
	appendToEMKField,
	setLabOrderModalToothNumber,
	setIsLabOrderModalOpen,
	visitWarnings,
	onAddServiceToTooth,
}: VisitClinicalToothModalProps) {
	if (!selectedToothForMenu || typeof document === "undefined") return null;

	const { code } = selectedToothForMenu;
	// biome-ignore lint/suspicious/noExplicitAny: state lookup
	const state = (toothStateByCode as any)[code] ?? "idle";

	const [activeTab, setActiveTab] = useState<ClinicalTabType>(() => {
		if (materialCategory) {
			return materialCategory === "crown" || materialCategory === "veneer" || materialCategory === "implant"
				? "surgery"
				: "therapy";
		}
		return state === "treatment" || state === "watch" ? "therapy" : "diagnosis";
	});

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeClinicalModal();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [closeClinicalModal]);

	return createPortal(
		<>
			<button
				type="button"
				className="_ccm-overlay"
				onClick={closeClinicalModal}
				onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && closeClinicalModal()}
				aria-label="Закрыть"
			/>
			<div
				className="_ccm-content"
				role="dialog"
				aria-modal="true"
				aria-label={`Клиническая карта: Зуб ${code}`}
			>
				<div className="_ccm-drag-handle-wrap" aria-hidden="true">
					<div className="_ccm-drag-handle" />
				</div>

				<ClinicalModalHeader
					code={code}
					state={state}
					selectedSurfaces={selectedSurfaces}
					handleSelectSurface={handleSelectSurface}
					closeClinicalModal={closeClinicalModal}
				/>

				<ClinicalModalTabsBar activeTab={activeTab} setActiveTab={setActiveTab} />

				<VisitClinicalToothTabs
					activeTab={activeTab}
					selectedToothForMenu={selectedToothForMenu}
					code={code}
					state={state}
					materialCategory={materialCategory}
					setMaterialCategory={setMaterialCategory}
					selectedSurfaces={selectedSurfaces}
					handleSelectDiagnosis={handleSelectDiagnosis}
					appendToEMKField={appendToEMKField}
					closeClinicalModal={closeClinicalModal}
					setEndoModalToothNumber={setEndoModalToothNumber}
					setEndoModalToothState={setEndoModalToothState}
					setIsEndoModalOpen={setIsEndoModalOpen}
					setLabOrderModalToothNumber={setLabOrderModalToothNumber}
					setIsLabOrderModalOpen={setIsLabOrderModalOpen}
					visitWarnings={visitWarnings}
					onAddServiceToTooth={onAddServiceToTooth}
				/>

				<ClinicalModalFooter
					code={code}
					selectedSurfaces={selectedSurfaces}
					closeClinicalModal={closeClinicalModal}
				/>
			</div>
		</>,
		document.body,
	);
}
