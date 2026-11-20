import React from "react";
import { Check, Wind } from "lucide-react";
import type { PediatricSedationState } from "./types";
import { PediatricSedationControls } from "./PediatricSedationControls";

export interface PediatricSedationProtocolProps {
	readonly sedation: PediatricSedationState;
	readonly onSedationChange: (next: PediatricSedationState) => void;
}

export const PediatricSedationProtocol: React.FC<PediatricSedationProtocolProps> = ({
	sedation,
	onSedationChange,
}) => {
	const handleToggleEnabled = () => {
		onSedationChange({
			...sedation,
			enabled: !sedation.enabled,
		});
	};

	return (
		<div className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-3">
			<div className="mb-2 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Wind className="h-4 w-4 text-[var(--primary)]" />
					<span className="text-xs font-semibold text-[var(--ink)]">
						Протокол седации ЗАКС (N2O / O2):
					</span>
				</div>
				<button
					type="button"
					onClick={handleToggleEnabled}
					className={`flex min-h-[36px] sm:min-h-0 sm:h-7 items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer active:scale-95 touch-manipulation ${
						sedation.enabled
							? "bg-[var(--primary)] text-white shadow-xs"
							: "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="pediatric-sedation-toggle-btn"
				>
					{sedation.enabled ? (
						<>
							<Check className="h-3.5 w-3.5" />
							<span>Седация активна</span>
						</>
					) : (
						<span>Без седации (включить ЗАКС)</span>
					)}
				</button>
			</div>

			{sedation.enabled && (
				<PediatricSedationControls sedation={sedation} onSedationChange={onSedationChange} />
			)}
		</div>
	);
};
