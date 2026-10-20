/**
 * SterilizationBatchCycleModal.tsx — 1-кликовое модальное окно запуска цикла автоклавирования.
 * Мандаты 8e, 8n (Soft Overdraft), 8s, Apple HIG. Строго <= 120 строк.
 */

import { createPortal } from "react-dom";
import { SterilizationBatchCycleFooter } from "./SterilizationBatchCycleFooter.js";
import { SterilizationBatchCycleHeader } from "./SterilizationBatchCycleHeader.js";
import { SterilizationBatchPackageSelector } from "./SterilizationBatchPackageSelector.js";
import type { SterilizationBatchCycleResult } from "./types.js";
import { useSterilizationBatchCycle } from "./useSterilizationBatchCycle.js";

export interface SterilizationBatchCycleModalProps {
	readonly isOpen: boolean;
	readonly organizationId: string;
	readonly onClose: () => void;
	readonly onCycleCompleted?: (result: SterilizationBatchCycleResult) => void;
	readonly operatorName?: string;
}

export function SterilizationBatchCycleModal({
	isOpen,
	organizationId,
	onClose,
	onCycleCompleted,
	operatorName = "Медсестра ЦСО",
}: SterilizationBatchCycleModalProps) {
	const {
		packages,
		indicatorPassed,
		setIndicatorPassed,
		submitting,
		totalPackages,
		updateCount,
		previewResult,
		handleConfirm,
	} = useSterilizationBatchCycle({
		organizationId,
		operatorName,
		onCycleCompleted,
		onClose,
	});

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
			role="dialog"
			aria-modal="true"
		>
			<div className="w-full max-w-[560px] max-h-[90vh] flex flex-col p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl overflow-hidden">
				<SterilizationBatchCycleHeader onClose={onClose} />
				<div className="flex-1 overflow-y-auto py-4">
					<SterilizationBatchPackageSelector
						packages={packages}
						onUpdateCount={updateCount}
						indicatorPassed={indicatorPassed}
						onToggleIndicator={() => setIndicatorPassed((p) => !p)}
					/>
				</div>
				<SterilizationBatchCycleFooter
					submitting={submitting}
					overdraftItems={previewResult.overdraftItems}
					totalPackages={totalPackages}
					onClose={onClose}
					onConfirm={handleConfirm}
				/>
			</div>
		</div>,
		document.body,
	);
}

export default SterilizationBatchCycleModal;
