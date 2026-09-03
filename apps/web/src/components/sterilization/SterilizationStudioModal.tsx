/**
 * ============================================================================
 * STERILIZATION STUDIO MODAL (ANTI-MATRYOSHKA CONSOLIDATION)
 * Canonical delegate to KraftPackageBarcodeModal (СанПиН 3.3686-21).
 * Eliminates nested sub-modal layering (Anti-Matryoshka Law max depth = 1).
 * ============================================================================
 */

import React from "react";
import {
	KraftPackageBarcodeModal,
	type KraftPackageBarcodeModalProps,
} from "../sanpin/kraft/KraftPackageBarcodeModal";
import type { ParsedKraftBarcode } from "@dental/shared";

export type SterilizationStudioTab =
	| "scanner"
	| "autoclave_cycles"
	| "pso_quality"
	| "kraft_labels";

export interface SterilizationStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: SterilizationStudioTab | undefined;
	readonly onAttachToProtocol?: ((parsed: ParsedKraftBarcode) => void | Promise<void>) | undefined;
	readonly currentDiaryBarcode?: string | null | undefined;
}

export function SterilizationStudioModal({
	isOpen,
	onClose,
	onAttachToProtocol,
	currentDiaryBarcode,
}: SterilizationStudioModalProps) {
	if (!isOpen) return null;

	return (
		<KraftPackageBarcodeModal
			isOpen={isOpen}
			onClose={onClose}
			onAttachToProtocol={onAttachToProtocol}
			initialBarcode={currentDiaryBarcode ?? undefined}
		/>
	);
}

export default SterilizationStudioModal;
