/**
 * apps/web/src/components/sanpin/SanpinSterilizationHubModal.tsx
 *
 * Канонический ре-экспортный фасад SanpinSterilizationHubModal (Мандаты 8b, 8e, 8aq).
 * Ликвидирует дублирование стейта и окон в пользу канонической SanpinStudioModal.
 * Строго <= 50 строк (Мандат 8b Sweet Spot).
 */

import React from "react";
import { SanpinStudioModal } from "./SanpinStudioModal";

export interface SanpinSterilizationHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCycleCompleted?: ((result?: unknown) => void) | undefined;
	readonly onCycleCreated?: ((cycle?: unknown) => void) | undefined;
	readonly isDemo?: boolean | undefined;
	readonly initialTab?: "express" | "autoclave" | "pso" | "print" | string | undefined;
}

export const SanpinSterilizationHubModal: React.FC<SanpinSterilizationHubModalProps> = ({
	isOpen,
	onClose,
	onCycleCompleted,
	onCycleCreated,
	isDemo = true,
	initialTab = "autoclave",
}) => {
	if (!isOpen) return null;

	return (
		<SanpinStudioModal
			isOpen={isOpen}
			onClose={onClose}
			isDemo={isDemo}
			initialTab={initialTab === "express" ? "autoclave" : initialTab}
			onCycleCompleted={onCycleCompleted}
			onCycleCreated={onCycleCreated as any}
		/>
	);
};

export default SanpinSterilizationHubModal;
