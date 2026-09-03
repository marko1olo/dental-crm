/**
 * ============================================================================
 * KRAFT PACKAGE MODAL — CANONICAL RE-EXPORT PROXY (Pass 6 Consolidation)
 * Re-exports the unified canonical implementation from:
 * apps/web/src/components/sanpin/kraft/KraftPackageBarcodeModal.tsx
 * Eliminates duplication between KraftPackageModal and KraftPackageBarcodeModal.
 * ============================================================================
 */

import {
	KraftPackageBarcodeModal,
	type KraftPackageBarcodeModalProps,
	type StudioActiveTab,
	POPULAR_KRAFT_PRESETS,
	type QuickKraftPreset,
} from "./kraft/KraftPackageBarcodeModal";

export type KraftModalMode = "generate" | "scan" | "batch_register" | StudioActiveTab;
export type KraftPackageModalProps = KraftPackageBarcodeModalProps;
export {
	KraftPackageBarcodeModal as KraftPackageModal,
	POPULAR_KRAFT_PRESETS,
	type QuickKraftPreset,
};
export default KraftPackageBarcodeModal;
