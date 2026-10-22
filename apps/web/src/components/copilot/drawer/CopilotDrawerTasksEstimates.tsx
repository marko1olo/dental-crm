import React from "react";
import { FileText, Share2 } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ShiftDebtEstimate } from "./drawerTypes";

interface CopilotDrawerTasksEstimatesProps {
	estimates: ShiftDebtEstimate[];
}

export const CopilotDrawerTasksEstimates: React.FC<CopilotDrawerTasksEstimatesProps> = ({
	estimates,
}) => {
	const handleShare = (est: ShiftDebtEstimate) => {
		const origin = typeof window !== "undefined" ? window.location.origin : "";
		const url = `${origin}/portal/estimate/${est.id}`;
		if (navigator.clipboard) {
			navigator.clipboard.writeText(url).catch(() => {});
		}
		showToast(
			`Ссылка на смету (${est.amountRub.toLocaleString("ru-RU")} ₽) скопирована для пациента ${est.patientName}`,
			"success",
		);
	};

	return (
		<div className="copilot-tasks-section" data-testid="copilot-section-pending-estimates">
			<div className="copilot-tasks-section-header">
				<div className="flex items-center gap-1.5">
					<FileText size={13} className="text-amber-500 shrink-0" />
					<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)]">
						Ожидают ответа по смете
					</span>
				</div>
				<span className="copilot-tasks-count-pill bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
					{estimates.length}
				</span>
			</div>

			<div className="space-y-2 mt-2">
				{estimates.map((est) => (
					<div key={est.id} className="copilot-task-card" data-testid={`card-estimate-${est.id}`}>
						<div className="flex items-start justify-between gap-2 mb-1">
							<span className="font-bold text-xs text-[var(--ink)]">{est.patientName}</span>
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
								{est.statusLabel}
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] mb-2 leading-relaxed">{est.title}</p>
						<div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle,var(--line))]">
							<span className="font-bold text-xs text-[var(--teal)] font-mono">
								{est.amountRub.toLocaleString("ru-RU")} ₽
							</span>
							<button
								type="button"
								onClick={() => handleShare(est)}
								className="copilot-task-btn copilot-task-btn-teal"
								data-testid={`btn-estimate-remind-${est.id}`}
							>
								<Share2 size={12} className="shrink-0" />
								<span>Напомнить / Ссылка</span>
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
