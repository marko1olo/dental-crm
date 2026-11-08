import React from "react";
/**
 * LabWorkOrderModal.tsx — Canonical Facade Delegate (Mandate 8s The Best of Breed).
 * Consolidates duplicate lab order logic into canonical DentalLabOrderModal.
 */
import {
	DentalLabStudioModal as DentalLabOrderModal,
	type DentalLabStudioModalProps as DentalLabOrderModalProps,
} from "../DentalLabStudioModal";

export type LabWorkOrderModalProps = DentalLabOrderModalProps;
export const LabWorkOrderModal = DentalLabOrderModal;
export default DentalLabOrderModal;

