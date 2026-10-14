/**
 * VisiographExportModal.tsx
 *
 * Facade adapter over canonical ImagingExportModal SSOT.
 * Preserves backwards compatibility for VisiographStudioCanvas while consolidating logic.
 */

import React from "react";
import {
	ImagingExportModal,
	type ImagingExportModalProps,
} from "../imaging/ImagingExportModal";

export type VisiographExportModalProps = ImagingExportModalProps;

export function VisiographExportModal(props: VisiographExportModalProps) {
	return <ImagingExportModal {...props} />;
}

export default VisiographExportModal;
