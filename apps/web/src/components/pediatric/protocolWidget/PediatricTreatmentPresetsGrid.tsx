import React from "react";
import { AlertCircle } from "lucide-react";
import { PEDIATRIC_PROTOCOL_PRESETS } from "./constants";
import type { PediatricProtocolDefinition, PediatricProtocolId } from "./types";

interface PediatricTreatmentPresetsGridProps {
	readonly activePresetId: PediatricProtocolId;
	readonly onSelectPreset: (preset: PediatricProtocolDefinition) => void;
	readonly isInvasiveProtocol: boolean;
	readonly consentSigned: boolean;
	readonly onSignConsent323Fz: () => void;
}

export const PediatricTreatmentPresetsGrid: React.FC<PediatricTreatmentPresetsGridProps> = ({
	activePresetId,
	onSelectPreset,
	isInvasiveProtocol,
	consentSigned,
	onSignConsent323Fz,
}) => {
	return (
		<>
			{isInvasiveProtocol && !consentSigned && (
				<div
					className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200"
					data-testid="pediatric-323fz-alert-banner"
				>
					<div className="flex items-center gap-2 min-w-0">
						<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
						<span className="font-semibold truncate">
							323-ФЗ ст. 20: Выбрано инвазивное вмешательство. Требуется подтверждение ИДС законного представителя.
						</span>
					</div>
					<button
						type="button"
						onClick={onSignConsent323Fz}
						className="min-h-[32px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shrink-0 cursor-pointer transition active:scale-95"
						data-testid="pediatric-btn-sign-consent-323fz"
					>
						ИДС оформлено
					</button>
				</div>
			)}

			<div>
				<div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
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
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								data-testid={`pediatric-preset-btn-${preset.id}`}
								title={`${preset.titleRu} • ${preset.serviceCode804n}`}
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
