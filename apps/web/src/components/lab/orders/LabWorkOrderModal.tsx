/**
 * LabWorkOrderModal.tsx — Canonical Facade Delegate (Mandate 8s The Best of Breed).
 * Consolidates duplicate lab order logic into canonical DentalLabOrderModal.
 */
import {
	DentalLabOrderModal,
	type DentalLabOrderModalProps,
} from "../DentalLabOrderModal";

export type LabWorkOrderModalProps = DentalLabOrderModalProps;
export const LabWorkOrderModal = DentalLabOrderModal;
export default DentalLabOrderModal;

