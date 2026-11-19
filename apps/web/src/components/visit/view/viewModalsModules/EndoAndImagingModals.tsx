/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Endo & Imaging Modals Section
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Модальные окна эндодонтического протокола (обработка корневых каналов)
 * и сплит-сравнения визиографических снимков (EzDent-i Dual View).
 */

import React from "react";
import { EndodonticStudioModal } from "../../../endo/EndodonticStudioModal";
import { RadiologyConsultationSplit } from "../../../radiology/RadiologyConsultationSplit";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import type { VisitModalPatientEntity, VisitModalDashboardEntity } from "./visitViewModalsTypes";
import type { VisitDashboardEntity } from "../VisitViewProps";
import type { Dashboard } from "@dental/shared";

export interface EndoAndImagingModalsProps {
	effectiveActiveModal: string | null;
	isEndoModalOpen: boolean;
	setIsEndoModalOpen: (v: boolean) => void;
	endoModalToothNumber: string | number | null;
	setEndoModalToothNumber: (v: string | number | null) => void;
	endoModalToothState?: string | undefined;
	isVisiographComparisonModalOpen?: boolean | undefined;
	setIsVisiographComparisonModalOpen?: ((v: boolean) => void) | undefined;
	activePatient: VisitModalPatientEntity | null | undefined;
	dashboard: VisitDashboardEntity | undefined;
	patientAge?: string | number | null | undefined;
	appendToEMKField: (field: string, text: string) => void;
}

export const EndoAndImagingModals: React.FC<EndoAndImagingModalsProps> = ({
	effectiveActiveModal,
	isEndoModalOpen,
	setIsEndoModalOpen,
	endoModalToothNumber,
	setEndoModalToothNumber,
	endoModalToothState,
	isVisiographComparisonModalOpen,
	setIsVisiographComparisonModalOpen,
	activePatient,
	dashboard,
	patientAge,
	appendToEMKField,
}) => {
	return (
		<>
			{/* Endodontic Root Canal Log Modal */}
			{effectiveActiveModal === "endo_canal" && endoModalToothNumber && (
				<EndodonticStudioModal
					isOpen={isEndoModalOpen || effectiveActiveModal === "endo_canal"}
					onClose={() => {
						setIsEndoModalOpen(false);
						setEndoModalToothNumber(null);
						useUiSurfaceStore.getState().closePrimaryModal("endo_canal");
					}}
					toothNumber={Number(endoModalToothNumber)}
					toothState={endoModalToothState}
					visitId={
						((dashboard as Record<string, unknown> | null | undefined)?.activeVisit as { id?: string } | undefined)?.id ||
						((dashboard as Record<string, unknown> | null | undefined)?.activeVisitId as string | undefined)
					}
					patientId={
						activePatient?.id ||
						((dashboard as Record<string, unknown> | null | undefined)?.activeVisit as { patientId?: string } | undefined)?.patientId
					}
					onInsertToProtocol={(protocolText) => {
						appendToEMKField("treatmentPlan", protocolText);
					}}
				/>
			)}

			{/* Модальное окно сплит-сравнения визиографа (EzDent-i Dual View) */}
			{isVisiographComparisonModalOpen && effectiveActiveModal === "visiograph_comparison" && (
				<RadiologyConsultationSplit
					isOpen={Boolean(isVisiographComparisonModalOpen)}
					asModal={true}
					onClose={() => setIsVisiographComparisonModalOpen?.(false)}
					patientName={(activePatient?.fullName || activePatient?.name) ?? undefined}
					patientCardNumber={
						(typeof activePatient?.cardNumber === "string"
							? activePatient.cardNumber
							: typeof activePatient?.medicalCardNumber === "string"
								? activePatient.medicalCardNumber
								: undefined)
					}
					activeToothFdi={endoModalToothNumber ?? undefined}
					patientAge={patientAge != null ? String(patientAge) : undefined}
					onInsertProtocol={(note) => appendToEMKField("anamnesis", note)}
				/>
			)}
		</>
	);
};
