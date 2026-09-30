import React from "react";
import { Check, Sparkles, X } from "lucide-react";
import { countLabel } from "../../lib/russianPlural";
import { TOOTH_STATE_LABELS, type ToothData, type ToothState } from "./ToothChart";

export interface OdontogramAiBannersProps {
	diagnocatPendingReport: {
		reportDate: string;
		findings: ToothData[];
	} | null;
	onApplyDiagnocat: () => void;
	onRejectDiagnocat: () => void;
	aiPendingProposal: {
		source: "voice" | "vision" | "sensor";
		title: string;
		findings: Array<{ toothNumber: number; state: ToothState; surfaces?: string[] }>;
	} | null;
	onApplyAiProposal: () => void;
	onRejectAiProposal: () => void;
}

export const OdontogramAiBanners: React.FC<OdontogramAiBannersProps> = ({
	diagnocatPendingReport,
	onApplyDiagnocat,
	onRejectDiagnocat,
	aiPendingProposal,
	onApplyAiProposal,
	onRejectAiProposal,
}) => {
	return (
		<>
			{diagnocatPendingReport && (
				<div
					className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-950 dark:text-indigo-100 text-xs shadow-xs animate-in fade-in"
					role="alert"
					data-testid="diagnocat-confirmation-banner"
				>
					<div className="flex items-start sm:items-center gap-2.5">
						<div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shrink-0 mt-0.5 sm:mt-0">
							<Sparkles size={16} />
						</div>
						<div>
							<div className="font-bold text-sm">
								Предложение ИИ Diagnocat от {diagnocatPendingReport.reportDate} ({diagnocatPendingReport.findings.length} находок)
							</div>
							<div className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
								Находки по зубам:{" "}
								<strong>
									{diagnocatPendingReport.findings.map((f) => `${f.toothNumber} (${TOOTH_STATE_LABELS[f.state] || f.state})`).join(", ")}
								</strong>
								. Автоматическая перезапись запрещена — подтвердите внесение.
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={onApplyDiagnocat}
							className="min-h-[36px] px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
							data-testid="apply-diagnocat-btn"
						>
							<Check size={14} />
							<span>Применить к формуле</span>
						</button>
						<button
							type="button"
							onClick={onRejectDiagnocat}
							className="min-h-[36px] px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
							data-testid="reject-diagnocat-btn"
						>
							<X size={14} />
							<span>Отклонить</span>
						</button>
					</div>
				</div>
			)}

			{aiPendingProposal && (
				<div
					className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-100 text-xs shadow-xs animate-in fade-in"
					role="alert"
					data-testid="ai-proposal-confirmation-banner"
				>
					<div className="flex items-start sm:items-center gap-2.5">
						<div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
							<Sparkles size={16} />
						</div>
						<div>
							<div className="font-bold text-sm">
								Предложение ИИ: {aiPendingProposal.title} ({aiPendingProposal.findings.length}{" "}
								{countLabel(aiPendingProposal.findings.length, "находка", "находки", "находок")})
							</div>
							<div className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
								Находки по зубам:{" "}
								<strong>
									{aiPendingProposal.findings
										.map(
											(f) =>
												`${f.toothNumber} (${TOOTH_STATE_LABELS[f.state] || f.state})`,
										)
										.join(", ")}
								</strong>
								. Автоматическая перезапись запрещена — подтвердите внесение в зубную формулу.
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={onApplyAiProposal}
							className="min-h-[36px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
							data-testid="apply-ai-proposal-btn"
						>
							<Check size={14} />
							<span>Применить к формуле</span>
						</button>
						<button
							type="button"
							onClick={onRejectAiProposal}
							className="min-h-[36px] px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
							data-testid="reject-ai-proposal-btn"
						>
							<X size={14} />
							<span>Отклонить</span>
						</button>
					</div>
				</div>
			)}
		</>
	);
};
