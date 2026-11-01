/**
 * apps/web/src/components/sanpin/SterilizationHubModal.tsx
 *
 * Канонический ре-экспортный фасад SterilizationHubModal (Мандаты 8b, 8e, 8aq).
 * Ликвидирует конкурирующее модальное окно стерилизации в пользу канонической SanpinStudioModal.
 * Строго <= 50 строк (Мандат 8b Sweet Spot).
 */

import React from "react";
import { SanpinStudioModal } from "./SanpinStudioModal";

export interface SterilizationHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCycleCompleted?: ((result?: unknown) => void) | undefined;
	readonly onCycleCreated?: ((cycle?: unknown) => void) | undefined;
	readonly isDemo?: boolean | undefined;
	readonly initialTab?: "express" | "autoclave" | "pso" | "print" | string | undefined;
}

export const SterilizationHubModal: React.FC<SterilizationHubModalProps> = ({
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

export default SterilizationHubModal;
