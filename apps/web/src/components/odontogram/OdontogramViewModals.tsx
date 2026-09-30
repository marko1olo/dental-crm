/**
 * DENTE Dental CRM — Odontogram Secondary View Modals & Drawers
 *
 * Houses lazily loaded clinical modals (Cephalometry, Jaw Occlusion, Treatment Plan Wizard)
 * and inspection drawers (Tooth Context Drawer, Endo Canal Measurement, Radial Menu).
 */

import React from "react";
import type { ToothData, ToothState } from "./ToothChart";
import { ToothRadialMenu } from "./ToothRadialMenu";
import { ToothContextDrawer } from "../diagnostics/ToothContextDrawer";
import { EndoCanalMeasurementDrawer } from "./EndoCanalMeasurementDrawer";
import { showToast } from "../GlobalToast";

const CephalometricAnalysisModal = React.lazy(() =>
	import("../radiology/CephalometricAnalysisModal").then((m) => ({
		default: m.CephalometricAnalysisModal,
	})),
);
const JawOcclusionModal = React.lazy(() =>
	import("./JawOcclusionModal").then((m) => ({
		default: m.JawOcclusionModal,
	})),
);
const TreatmentPlanWizard = React.lazy(() =>
	import("./TreatmentPlanWizard").then((m) => ({
		default: m.TreatmentPlanWizard,
	})),
);

export interface RadialMenuAnchorData {
	toothNumber: number;
	rect: { x: number; y: number; width: number; height: number };
	currentState?: ToothState | undefined;
	surfaces?: string[] | undefined;
}

export interface OdontogramViewModalsProps {
	teethData: ToothData[];
	patientId?: string | undefined;
	// Plan wizard
	isPlanWizardOpen: boolean;
	onClosePlanWizard: () => void;
	// Radial context menu
	radialMenuData: RadialMenuAnchorData | null;
	onCloseRadialMenu: () => void;
	onRadialSelectState: (state: ToothState, surfaces?: readonly string[]) => void;
	onRadialAddToInvoice: () => void;
	onRadialOpenTherapy: (toothNumber: number) => void;
	// Context drawer
	contextDrawerTooth: number | null;
	onCloseContextDrawer: () => void;
	onUpdateToothContext?: ((num: number, state: ToothState, surfaces?: string[]) => void) | undefined;
	// Endo drawer
	endoDrawerTooth: number | null;
	onCloseEndoDrawer: () => void;
	// Orthodontic ceph modal
	isOrthoCephOpen: boolean;
	onCloseOrthoCeph: () => void;
	// Jaw occlusion modal
	activeJawModalTarget: "JU" | "JL" | "C" | null;
	onCloseJawModal: () => void;
}

export const OdontogramViewModals: React.FC<OdontogramViewModalsProps> = React.memo(({
	teethData,
	patientId,
	isPlanWizardOpen,
	onClosePlanWizard,
	radialMenuData,
	onCloseRadialMenu,
	onRadialSelectState,
	onRadialAddToInvoice,
	onRadialOpenTherapy,
	contextDrawerTooth,
	onCloseContextDrawer,
	onUpdateToothContext,
	endoDrawerTooth,
	onCloseEndoDrawer,
	isOrthoCephOpen,
	onCloseOrthoCeph,
	activeJawModalTarget,
	onCloseJawModal,
}) => {
	return (
		<>
			{/* Radial Context Menu Modal */}
			{radialMenuData && (
				<ToothRadialMenu
					toothNumber={radialMenuData.toothNumber}
					anchorRect={radialMenuData.rect}
					currentState={radialMenuData.currentState}
					surfaces={radialMenuData.surfaces}
					onSelectState={onRadialSelectState}
					onAddToInvoice={onRadialAddToInvoice}
					onOpenTherapy={() => onRadialOpenTherapy(radialMenuData.toothNumber)}
					onClose={onCloseRadialMenu}
				/>
			)}

			{/* 1-Click Treatment Plan Wizard (StomX/IDENT Parity) */}
			{isPlanWizardOpen && (
				<React.Suspense fallback={null}>
					<TreatmentPlanWizard
						isOpen={isPlanWizardOpen}
						onClose={onClosePlanWizard}
						teethData={teethData}
						patientId={patientId}
						patientName={patientId ? `Пациент #${patientId}` : undefined}
						onPlanCreated={(planId, totalRub) => {
							showToast(
								`План лечения #${planId} сформирован (${totalRub} ₽)`,
								"success",
							);
						}}
					/>
				</React.Suspense>
			)}

			{/* Tier 2 Context Drawer for Selected Tooth */}
			{contextDrawerTooth !== null && (
				<ToothContextDrawer
					isOpen={contextDrawerTooth !== null}
					onClose={onCloseContextDrawer}
					toothNumber={contextDrawerTooth}
					toothData={teethData?.find((t) => t.toothNumber === contextDrawerTooth)}
					onUpdateTooth={(num, updates) => {
						if (updates.state) {
							onUpdateToothContext?.(num, updates.state, updates.surfaces);
							showToast(
								`Зуб ${num}: состояние «${updates.state}» сохранено`,
								"success",
							);
						}
					}}
				/>
			)}

			{/* Tier 2 Endo Canal Measurement Drawer */}
			{endoDrawerTooth !== null && (
				<EndoCanalMeasurementDrawer
					isOpen={endoDrawerTooth !== null}
					onClose={onCloseEndoDrawer}
					toothNumber={endoDrawerTooth}
					toothState={
						teethData?.find((t) => t.toothNumber === endoDrawerTooth)?.state
					}
					patientId={patientId}
				/>
			)}

			{/* Tier 3 Orthodontic Cephalometry TRG Tracker Modal */}
			{isOrthoCephOpen && (
				<React.Suspense fallback={null}>
					<CephalometricAnalysisModal
						isOpen={isOrthoCephOpen}
						onClose={onCloseOrthoCeph}
						patientId={patientId}
						patientName={patientId ? `Пациент #${patientId}` : undefined}
					/>
				</React.Suspense>
			)}

			{/* Tier 2 Jaw & Centric Occlusion Clinical Modal (JU, JL, C) */}
			{activeJawModalTarget !== null && (
				<React.Suspense fallback={null}>
					<JawOcclusionModal
						isOpen={activeJawModalTarget !== null}
						initialTarget={activeJawModalTarget}
						onClose={onCloseJawModal}
					/>
				</React.Suspense>
			)}
		</>
	);
});
OdontogramViewModals.displayName = "OdontogramViewModals";
