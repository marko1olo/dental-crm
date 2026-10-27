import type React from "react";
import { Zap, CheckCircle2 } from "lucide-react";
import type { SurgicalOperationNorm } from "../../../surgery/surgeryProtocols";

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
			<div className="text-xs font-black uppercase text-[var(--muted)] tracking-wider flex items-center gap-1.5">
				<Zap size={14} className="text-[var(--teal,#0d9488)]" />
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
							className={`visit-surgery-touch-card bg-[var(--paper-soft)] dark:bg-slate-900 text-[var(--ink)] dark:text-slate-100 border-[var(--line)] dark:border-slate-800 hover:border-[var(--teal,#0d9488)] ${isSel ? "active !bg-teal-900/30 !border-teal-500" : ""}`}
							data-testid={`btn-surgery-norm-${norm.id}`}
						>
							<div className="flex items-start justify-between gap-1 mb-1">
								<strong className="text-xs font-extrabold leading-snug text-[var(--ink)]">
									{norm.shortBadge}
								</strong>
								{isSel && (
									<CheckCircle2 size={16} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
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
