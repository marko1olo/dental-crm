/**
 * apps/web/src/components/settings/clinic/taxationModules/TaxSystemSelector.tsx
 *
 * Statutory Taxation System Selector (4 standard Russian tax regimes for dental clinics).
 * Compliant with 54-FZ FFD 1.2 Tag 1055 and Chapters 25, 26.2, 26.5 of the Tax Code of the Russian Federation.
 */

import { CheckCircle2, Info, Scale } from "lucide-react";
import type React from "react";
import {
	type CanonicalTaxationSystem,
	TAXATION_SYSTEMS,
	type TaxationSystemConfig,
} from "./TaxationCardTypes";

interface TaxSystemSelectorProps {
	activeTaxation: CanonicalTaxationSystem;
	onSelectTaxation: (systemId: CanonicalTaxationSystem) => void;
}

export const TaxSystemSelector: React.FC<TaxSystemSelectorProps> = ({
	activeTaxation,
	onSelectTaxation,
}) => {
	const currentSystem: TaxationSystemConfig =
		TAXATION_SYSTEMS.find((s) => s.id === activeTaxation) ??
		TAXATION_SYSTEMS[0]!;

	return (
		<div className="space-y-2.5" data-testid="tax-system-selector-section">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Scale size={14} className="text-[var(--teal)] shrink-0" />
					<span>Система налогообложения (СНО):</span>
				</span>
				<span className="text-[11px] text-[var(--muted)]">
					Автоматически подставляется в чеки ККТ (Тег 1055) и отчёты
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
				{TAXATION_SYSTEMS.map((system) => {
					const isSelected = activeTaxation === system.id;
					return (
						<button
							key={system.id}
							type="button"
							style={{
								padding: "12px 14px",
								borderRadius: "10px",
								border: isSelected
									? "1.5px solid var(--teal)"
									: "1px solid var(--line)",
								background: isSelected
									? "rgba(13, 148, 136, 0.08)"
									: "var(--paper-strong)",
							}}
							data-testid={`btn-taxation-${system.id}`}
							aria-pressed={isSelected}
							onClick={() => onSelectTaxation(system.id)}
							className={`text-left transition-all cursor-pointer flex flex-col justify-between min-h-[88px] ${
								isSelected
									? "ring-1 ring-[var(--teal)] text-[var(--ink)]"
									: "hover:border-[var(--ink)]/30 text-[var(--muted)]"
							}`}
						>
							<div>
								<div className="flex items-center justify-between gap-1.5">
									<span className="font-bold text-xs text-[var(--ink)]">
										{system.shortName}
									</span>
									{isSelected ? (
										<CheckCircle2
											size={15}
											className="text-[var(--teal)] shrink-0"
										/>
									) : (
										<span className="w-3.5 h-3.5 rounded-full border border-[var(--line)] shrink-0" />
									)}
								</div>
								<span className="text-[11px] text-[var(--muted)] block mt-1 leading-snug">
									{system.rateDescription}
								</span>
							</div>
							<div className="mt-2 pt-1.5 border-t border-[var(--line)]">
								<span className="text-[11px] font-medium text-[var(--ink)] block">
									{system.vatRule}
								</span>
							</div>
						</button>
					);
				})}
			</div>

			<div className="px-3 py-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] flex items-center gap-2">
				<Info size={14} className="text-[var(--teal)] shrink-0" />
				<span>
					<strong className="text-[var(--ink)]">{currentSystem.name}:</strong>{" "}
					{currentSystem.recommendedFor}
				</span>
			</div>
		</div>
	);
};
