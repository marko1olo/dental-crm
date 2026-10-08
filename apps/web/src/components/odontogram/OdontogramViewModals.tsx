/**
 * DENTE Dental CRM — Odontogram Secondary View Modals & Drawers
 *
 * Houses lazily loaded clinical modals (Cephalometry, Jaw Occlusion, Treatment Plan Wizard, Orthopedics Chairside)
 * and inspection drawers (Tooth Context Drawer, Endo Canal Measurement, Radial Menu).
 */

import React from "react";
import { X } from "lucide-react";
import type { ToothData, ToothState } from "./ToothChart";
import { EndoCanalMeasurementDrawer } from "./EndoCanalMeasurementDrawer";
import { ToothRadialMenu } from "./ToothRadialMenu";
import { showToast } from "../GlobalToast";

import type { OpgToothSlot } from "../orthodontics/opgTopologicalEngine";

const ToothContextDrawer = React.lazy(() =>
	import("../diagnostics/ToothContextDrawer").then((m) => ({
		default: m.ToothContextDrawer,
	})),
);

const SmartOpgViewerModal = React.lazy(() =>
	import("../orthodontics/SmartOpgViewerModal").then((m) => ({
		default: m.SmartOpgViewerModal,
	})),
);

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
const OrthopedicsChairsidePanel = React.lazy(() =>
	import("../orthopedics/OrthopedicsChairsidePanel").then((m) => ({
		default: m.OrthopedicsChairsidePanel,
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
	// Smart OPG panoramic AI modal
	isSmartOpgOpen?: boolean | undefined;
	onCloseSmartOpg?: (() => void) | undefined;
	onApplyOpgOdontogram?: ((teethMap: Record<number, OpgToothSlot>) => void) | undefined;
	// Jaw occlusion modal
	activeJawModalTarget: "JU" | "JL" | "C" | null;
	onCloseJawModal: () => void;
	// Orthopedics chairside panel
	orthoDrawerTooth?: number | null | undefined;
	onCloseOrthoDrawer?: (() => void) | undefined;
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
	isSmartOpgOpen,
	onCloseSmartOpg,
	onApplyOpgOdontogram,
	activeJawModalTarget,
	onCloseJawModal,
	orthoDrawerTooth,
	onCloseOrthoDrawer,
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
				<React.Suspense fallback={null}>
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
				</React.Suspense>
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

			{/* Smart OPG Panoramic AI & Odontogram Auto-Mapping */}
			{isSmartOpgOpen && (
				<React.Suspense fallback={null}>
					<SmartOpgViewerModal
						isOpen={isSmartOpgOpen}
						onClose={onCloseSmartOpg ?? (() => {})}
						patientName={patientId ? `Пациент #${patientId}` : undefined}
						onApplyOdontogram={onApplyOpgOdontogram}
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

			{/* Tier 2 Orthopedics Chairside Panel (VITA shades, preparation margins, ZTL orders) */}
			{orthoDrawerTooth !== null && orthoDrawerTooth !== undefined && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
					role="dialog"
					aria-modal="true"
					aria-labelledby="ortho-chairside-title"
				>
					<div className="bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
						<div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-3">
							<h3 id="ortho-chairside-title" className="text-base font-bold text-[var(--ink)] m-0">
								Ортопедический протокол и наряд в ЗТЛ (Зуб {orthoDrawerTooth})
							</h3>
							<button
								type="button"
								onClick={onCloseOrthoDrawer}
								className="w-8 h-8 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
								aria-label="Закрыть панель ортопедии"
							>
								<X size={18} />
							</button>
						</div>
						<React.Suspense fallback={<div className="p-8 text-center text-xs text-[var(--muted)]">Загрузка ортопедической панели...</div>}>
							<OrthopedicsChairsidePanel
								patientId={patientId}
								activeToothFdi={orthoDrawerTooth}
								onToothSelect={(tooth) => {
									showToast(`Выбран зуб ${tooth} для ортопедии`, "info");
								}}
							/>
						</React.Suspense>
					</div>
				</div>
			)}
		</>
	);
});
OdontogramViewModals.displayName = "OdontogramViewModals";
