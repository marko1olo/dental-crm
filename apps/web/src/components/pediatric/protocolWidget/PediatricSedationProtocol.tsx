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
		<div className="mb-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3">
			<div className="mb-2 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Wind className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#0f172a)]">
						Протокол седации ЗАКС (N2O / O2):
					</span>
				</div>
				<button
					type="button"
					onClick={handleToggleEnabled}
					className={`flex min-h-[36px] sm:min-h-0 sm:h-7 items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 touch-manipulation ${
						sedation.enabled
							? "bg-cyan-600 text-white"
							: "border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
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
