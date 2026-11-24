import React from "react";
import { Zap, CheckCircle2 } from "lucide-react";
import type { SurgicalOperationNorm } from "../../../surgery/surgeryCatalogData";

interface VisitSurgeryNormsGridProps {
	norms: readonly SurgicalOperationNorm[];
	selectedNormId: string;
	onSelectNorm: (norm: SurgicalOperationNorm) => void;
}

export const VisitSurgeryNormsGrid: React.FC<VisitSurgeryNormsGridProps> = ({
	norms,
	selectedNormId,
	onSelectNorm,
}) => {
	return (
		<div className="space-y-2">
			<div className="text-xs font-semibold text-[var(--muted)] tracking-tight flex items-center gap-1.5">
				<Zap size={14} className="text-[var(--primary)]" />
				<span>Хирургические нормы (СтАР / Минздрав):</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
				{norms.map((norm) => {
					const isSel = selectedNormId === norm.id;
					return (
						<button
							key={norm.id}
							type="button"
							onClick={() => onSelectNorm(norm)}
							className={`visit-surgery-touch-card bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)] ${isSel ? "active !bg-[var(--paper)] !border-[var(--primary)] shadow-xs" : ""}`}
							data-testid={`btn-surgery-norm-${norm.id}`}
						>
							<div className="flex items-start justify-between gap-1 mb-1">
								<strong className="text-xs font-semibold leading-snug text-[var(--ink)]">
									{norm.shortBadge}
								</strong>
								{isSel && (
									<CheckCircle2 size={16} className="text-[var(--primary)] shrink-0 mt-0.5" />
								)}
							</div>
							<span className="text-[10px] font-mono text-[var(--muted)] leading-tight">
								{norm.serviceCode ? `${norm.serviceCode} · ` : norm.code804n ? `${norm.code804n} · ` : ""}{norm.icd10}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
