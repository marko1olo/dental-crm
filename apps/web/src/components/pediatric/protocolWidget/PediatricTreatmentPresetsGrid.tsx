import React from "react";
import { AlertCircle } from "lucide-react";
import { PEDIATRIC_PROTOCOL_PRESETS } from "./constants";
import type { PediatricProtocolDefinition, PediatricProtocolId } from "./types";

interface PediatricTreatmentPresetsGridProps {
	readonly activePresetId: PediatricProtocolId;
	readonly onSelectPreset: (preset: PediatricProtocolDefinition) => void;
	readonly isInvasiveProtocol: boolean;
	readonly consentSigned: boolean;
	readonly onConfirmConsent: () => void;
}

export const PediatricTreatmentPresetsGrid: React.FC<PediatricTreatmentPresetsGridProps> = ({
	activePresetId,
	onSelectPreset,
	isInvasiveProtocol,
	consentSigned,
	onConfirmConsent,
}) => {
	return (
		<>
			{isInvasiveProtocol && !consentSigned && (
				<div
					className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200"
					data-testid="pediatric-consent-alert-banner"
				>
					<div className="flex items-center gap-2 min-w-0">
						<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
						<span className="font-semibold truncate">
							Выбрано инвазивное вмешательство. Требуется подтверждение согласия законного представителя.
						</span>
					</div>
					<button
						type="button"
						onClick={onConfirmConsent}
						className="min-h-[44px] sm:min-h-0 sm:h-7 px-3 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-xs shrink-0 cursor-pointer transition active:scale-95"
						data-testid="pediatric-btn-sign-consent"
					>
						<span>Согласие оформлено</span>
					</button>
				</div>
			)}

			<div>
				<div className="mb-2 text-xs font-bold text-[var(--muted,#64748b)]">
					Клинические протоколы у кресла:
				</div>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					{PEDIATRIC_PROTOCOL_PRESETS.map((preset) => {
						const isCurrent = activePresetId === preset.id;
						const PresetIcon = preset.icon;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => onSelectPreset(preset)}
								className={`flex min-h-[52px] flex-col justify-center rounded-xl border p-2.5 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation select-none ${
									isCurrent
										? `${preset.colorTheme} shadow-sm ring-2 ring-teal-500/20`
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`pediatric-preset-btn-${preset.id}`}
								title={`${preset.titleRu} • ${preset.serviceCode}`}
							>
								<div className="flex items-center gap-1.5 font-bold text-xs">
									<PresetIcon className="h-4 w-4 shrink-0" />
									<span className="truncate">{preset.shortLabelRu}</span>
								</div>
								<div className="mt-0.5 text-[11px] text-[var(--muted,#64748b)] truncate">
									{preset.subtitleRu}
								</div>
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
};

export default PediatricTreatmentPresetsGrid;
