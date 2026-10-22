/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Endo & Imaging Modals Section
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Модальные окна эндодонтического протокола (обработка корневых каналов)
 * и сплит-сравнения визиографических снимков (EzDent-i Dual View).
 */

import React from "react";
import { EndoCanalLogModal } from "../../../endo/EndoCanalLogModal";
import { VisiographComparisonModal } from "../../../visiograph/VisiographComparisonModal";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";

export interface EndoAndImagingModalsProps {
	effectiveActiveModal: string | null;
	isEndoModalOpen: boolean;
	setIsEndoModalOpen: (v: boolean) => void;
	endoModalToothNumber: string | number | null;
	setEndoModalToothNumber: (v: string | number | null) => void;
	endoModalToothState?: string | undefined;
	isVisiographComparisonModalOpen?: boolean | undefined;
	setIsVisiographComparisonModalOpen?: ((v: boolean) => void) | undefined;
	activePatient: any;
	dashboard: any;
	patientAge?: string | null | undefined;
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
				<EndoCanalLogModal
					isOpen={isEndoModalOpen || effectiveActiveModal === "endo_canal"}
					onClose={() => {
						setIsEndoModalOpen(false);
						setEndoModalToothNumber(null);
						useUiSurfaceStore.getState().closePrimaryModal("endo_canal");
					}}
					toothNumber={Number(endoModalToothNumber)}
					toothState={endoModalToothState}
					patientId={
						activePatient?.id ||
						(typeof dashboard?.activeVisit?.patientId === "string"
							? dashboard.activeVisit.patientId
							: undefined)
					}
					onInsertToProtocol={(protocolText) => {
						appendToEMKField("treatmentPlan", protocolText);
					}}
				/>
			)}

			{/* Модальное окно сплит-сравнения визиографа (EzDent-i Dual View) */}
			{isVisiographComparisonModalOpen && effectiveActiveModal === "visiograph_comparison" && (
				<VisiographComparisonModal
					isOpen={Boolean(isVisiographComparisonModalOpen)}
					onClose={() => setIsVisiographComparisonModalOpen?.(false)}
					patientName={activePatient?.fullName || activePatient?.name}
					patientCardNumber={activePatient?.cardNumber || activePatient?.medicalCardNumber}
					activeToothFdi={endoModalToothNumber ?? undefined}
					patientAge={patientAge ?? undefined}
					onInsertProtocol={(note) => appendToEMKField("anamnesis", note)}
				/>
			)}
		</>
	);
};
