/**
 * apps/web/src/components/odontogram/ToothCardModal.tsx
 *
 * Canonical Facade Delegate (Mandate 8s: The Best of Breed).
 * Consolidates duplicate tooth card modal logic into the canonical Tier 2 ToothContextDrawer.
 * Compliant with:
 * - Mandate 8s (Law of Single Indivisible Authority: 1 canonical master component)
 * - Mandate 8e (Doctor Autonomy: 0-norm reset, 1-click recall)
 * - Mandate 8d (7 Deadly Sins: 0 cartoon emojis, Apple HIG)
 */

import React from "react";
import {
	ToothContextDrawer,
	getSuggestedRecallForToothState,
	type SuggestedRecall,
} from "../diagnostics/ToothContextDrawer";
import type { ToothData } from "./ToothChart";

export { getSuggestedRecallForToothState, type SuggestedRecall };

export interface ToothCardModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly toothData?: ToothData | undefined;
	readonly onUpdateTooth?: ((toothNumber: number, updates: Partial<ToothData>) => void) | undefined;
	readonly onOpenHistory?: ((toothNumber: number) => void) | undefined;
	readonly onOpenEndo?: ((toothNumber: number) => void) | undefined;
	readonly onSetRecall?: ((toothNumber: number, cycleType: string, monthsOffset: number) => void) | undefined;
	readonly className?: string | undefined;
}

export const ToothCardModal: React.FC<ToothCardModalProps> = ({
	isOpen,
	onClose,
	toothNumber,
	toothData,
	onUpdateTooth,
	onOpenHistory,
	onOpenEndo,
	onSetRecall,
	className = "",
}) => {
	if (!isOpen) return null;

	return (
		<div data-testid="tooth-card-modal">
			<ToothContextDrawer
				isOpen={isOpen}
				onClose={onClose}
				toothNumber={toothNumber}
				toothData={toothData}
				onUpdateTooth={(num, updates) => onUpdateTooth?.(num, updates)}
				onOpenHistory={onOpenHistory}
				onOpenEndo={onOpenEndo}
				onSetRecall={onSetRecall}
				className={className}
			/>
		</div>
	);
};

export default ToothCardModal;
