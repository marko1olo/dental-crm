import React from "react";
import { CheckCircle2 } from "lucide-react";
import {
	SURGICAL_HEMOSTASIS_OPTIONS,
	type SurgicalHemostasisMethod,
} from "../../../surgery/surgeryProtocols";

export interface ExtractionHemostasisSelectorProps {
	readonly selectedHemostasis: readonly SurgicalHemostasisMethod[];
	readonly sutureMaterial: string;
	readonly onToggleHemostasis: (method: SurgicalHemostasisMethod) => void;
	readonly onSelectSutureMaterial: (suture: string) => void;
}

const SUTURE_OPTIONS = ["Викрил 4-0", "Монофиламент", "Шелк 3-0", "Пролен 4-0", "ПГА 4-0"] as const;

export const ExtractionHemostasisSelector: React.FC<ExtractionHemostasisSelectorProps> = ({
	selectedHemostasis,
	sutureMaterial,
	onToggleHemostasis,
	onSelectSutureMaterial,
}) => {
	return (
		<div className="space-y-1.5" data-testid="extraction-hemostasis-section">
			<span className="text-[11px] font-bold text-[var(--muted)]">Местный гемостаз & Лунка:</span>
			<div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Опции гемостаза">
				{SURGICAL_HEMOSTASIS_OPTIONS.map((opt) => {
					const isSel = selectedHemostasis.includes(opt.id);
					return (
						<button
							key={opt.id}
							type="button"
							onClick={() => onToggleHemostasis(opt.id)}
							className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ${
								isSel
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
							}`}
							data-testid={`btn-hemostasis-${opt.id}`}
							title={opt.descriptionRu}
						>
							{isSel && <CheckCircle2 size={13} className="shrink-0" />}
							<span>{opt.shortBadge}</span>
						</button>
					);
				})}

				<div className="flex items-center gap-1.5 ml-auto flex-wrap">
					<span className="text-[11px] text-[var(--muted)]">Шов:</span>
					{SUTURE_OPTIONS.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onSelectSutureMaterial(s)}
							className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								sutureMaterial === s
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"
							}`}
							data-testid={`btn-suture-${s.replace(/[\s.]+/g, "-")}`}
						>
							{s}
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
