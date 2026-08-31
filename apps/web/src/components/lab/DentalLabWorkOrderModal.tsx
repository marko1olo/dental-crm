/**
 * DentalLabWorkOrderModal.tsx — Statutory Dental Laboratory Work Order Modal
 * Interactive FDI Tooth Formula & Bridge Picker (11–48),
 * Precision VITA Classical (A1–D4) & VITA 3D-Master (1M1–5M3) Tone Selectors,
 * 4-Stage Clinical Vector Workflow (Слепок -> Каркас -> Примерка -> Фиксация),
 * and Kopeck-Exact Financial Accounting & GOST A4 Print Blank.
 */

import React from "react";
import {
	DentalLabOrderModal,
	type DentalLabOrderModalProps,
	type DentalLabOrderData,
	type CanonicalLabOrderStatus,
	type LabOrderStageKey,
	MATERIALS,
	LAB_MATERIALS,
	CONSTRUCTION_TYPES,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
	CANONICAL_LAB_STATUSES,
	LAB_ORDER_STAGES,
	calculateMaterialTotalCostKopecks,
	calculateLabFinancialSplit,
	buildLabAppointmentDraft,
	mapToCanonicalStatus,
	generateBarcodeSvg,
	generateQrCodeSvg,
	formatGostOrderNumber,
} from "./DentalLabOrderModal";

export type DentalLabWorkOrderModalProps = DentalLabOrderModalProps;

/**
 * Statutory Dental Laboratory Work Order Modal Component (Squad Theta).
 * Provides interactive CAD/CAM prosthetic workflow with FDI tooth selection,
 * VITA Classical / 3D-Master / Bleach ceramic shade palettes,
 * 3-zone color stratification (Cervical / Body / Incisal),
 * IPS Natural Die stump preparation shades (ND1–ND9),
 * and clean vector lifecycle tracker (Слепок -> Каркас -> Примерка -> Фиксация).
 */
export function DentalLabWorkOrderModal(props: DentalLabWorkOrderModalProps) {
	return <DentalLabOrderModal {...props} />;
}

export default DentalLabWorkOrderModal;

// Re-export all sub-components, types and presets for full backwards compatibility
export {
	DentalLabOrderModal,
	type DentalLabOrderData,
	type CanonicalLabOrderStatus,
	type LabOrderStageKey,
	MATERIALS,
	LAB_MATERIALS,
	CONSTRUCTION_TYPES,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
	CANONICAL_LAB_STATUSES,
	LAB_ORDER_STAGES,
	calculateMaterialTotalCostKopecks,
	calculateLabFinancialSplit,
	buildLabAppointmentDraft,
	mapToCanonicalStatus,
	generateBarcodeSvg,
	generateQrCodeSvg,
	formatGostOrderNumber,
};
