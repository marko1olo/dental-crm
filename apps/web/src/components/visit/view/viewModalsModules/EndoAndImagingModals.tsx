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
import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";
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
					onSaveCanals={async (canals, clinicalData) => {
						const patId =
							activePatient?.id ||
							((dashboard as Record<string, unknown> | null | undefined)?.activeVisit as { patientId?: string } | undefined)?.patientId;
						if (!patId || !endoModalToothNumber) return;
						const toothNum = Number(endoModalToothNumber);
						try {
							const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined;
							const res = await fetch(`/api/patients/${patId}/tooth-states/${toothNum}/endo`, {
								method: "POST",
								headers: getDenteAuthHeaders({
									"Content-Type": "application/json",
									...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
								}),
								body: JSON.stringify({
									toothNumber: toothNum,
									canals,
									irrigation: clinicalData.irrigation,
									rotarySystem: clinicalData.rotarySystem,
									radiologyControl: clinicalData.radiologyControl,
									apexLocator: clinicalData.apexLocator,
									stageStamp: clinicalData.stageStamp,
									notes: clinicalData.notes,
									visitId:
										((dashboard as Record<string, unknown> | null | undefined)?.activeVisit as { id?: string } | undefined)?.id ||
										((dashboard as Record<string, unknown> | null | undefined)?.activeVisitId as string | undefined),
								}),
							});
							if (!res.ok) {
								console.warn("[EndoAndImagingModals] onSaveCanals POST failed with status:", res.status);
							}
						} catch (saveErr) {
							console.error("[EndoAndImagingModals] onSaveCanals error:", saveErr);
						}
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
