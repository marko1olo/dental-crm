import React from "react";
import { ChevronDown, ChevronUp, ExternalLink, Info } from "lucide-react";
import { getApIsolationDiagnostics, type LanServerInterfaceItem } from "../lanQrEngine";

export interface LanTroubleshootingGuideProps {
	readonly interfaces?: readonly LanServerInterfaceItem[];
	readonly showDetails: boolean;
	readonly onToggleDetails: () => void;
}

export const LanTroubleshootingGuide: React.FC<LanTroubleshootingGuideProps> = ({
	interfaces,
	showDetails,
	onToggleDetails,
}) => {
	const diagnostics = getApIsolationDiagnostics();

	return (
		<div className="space-y-3.5">
			<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs space-y-2">
				<div className="flex items-center gap-2 text-[var(--teal,#0d9488)] font-semibold text-sm">
					<Info className="w-4 h-4 shrink-0" />
					<span>{diagnostics.issueTitle}</span>
				</div>
				<p className="text-[var(--ink,#0f172a)] leading-relaxed">{diagnostics.cause}</p>
				<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]">
					<p className="font-medium text-[var(--teal,#0d9488)]">{diagnostics.solutionTitle}</p>
					<p className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">{diagnostics.solutionDescription}</p>
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="text-xs font-semibold text-[var(--ink,#0f172a)] uppercase tracking-wider">
					Пошаговая инструкция для Windows
				</h3>
				{diagnostics.steps.map((step) => (
					<div key={step.stepNumber} className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs flex items-start gap-3">
						<div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)] font-bold shrink-0 text-xs">
							{step.stepNumber}
						</div>
						<div className="space-y-1 flex-1">
							<p className="font-medium text-[var(--ink,#0f172a)]">{step.title}</p>
							<p className="text-[var(--muted,#64748b)] text-[11px] leading-relaxed">{step.description}</p>
							{step.command && (
								<div className="flex items-center gap-2 mt-1">
									<code className="px-2 py-0.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--teal,#0d9488)] font-mono text-[11px]">{step.command}</code>
									<a href={step.command} className="text-[11px] text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 font-medium">
										<ExternalLink className="w-3 h-3" />
										Открыть в Windows
									</a>
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			<div className="space-y-1.5">
				<button
					type="button"
					onClick={onToggleDetails}
					className="w-full min-h-[44px] flex items-center justify-between text-xs text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] p-2.5 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] cursor-pointer"
				>
					<span>Подробная топология сетевых адаптеров сервера</span>
					{showDetails ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
				</button>

				{showDetails && interfaces && (
					<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[11px] space-y-2 max-h-48 overflow-y-auto font-mono">
						{interfaces.map((i) => (
							<div key={`${i.name}-${i.address}`} className="p-1.5 rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between">
								<div>
									<span className="text-[var(--ink,#0f172a)] font-semibold">{i.name}</span>
									<span className="text-[var(--muted,#64748b)] ml-2">{i.address}</span>
								</div>
								<div className="flex items-center gap-2">
									<span className={`px-1.5 py-0.5 rounded text-[10px] ${i.isVirtual ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"}`}>
										{i.isVirtual ? "Виртуальный" : "Физический LAN"}
									</span>
									<span className="text-[var(--muted,#64748b)]">Score: {i.score}</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};
