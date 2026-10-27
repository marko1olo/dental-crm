import { Activity, Camera, Image as ImageIcon } from "lucide-react";
import React from "react";
import type { DiagnosticTabMode } from "./types";

export interface DiagnosticsSegmentedModesProps {
	readonly diagnosticMode: DiagnosticTabMode;
	readonly setDiagnosticMode: (mode: DiagnosticTabMode) => void;
	readonly photoAttachmentsCount: number;
}

export function DiagnosticsSegmentedModes({
	diagnosticMode,
	setDiagnosticMode,
	photoAttachmentsCount,
}: DiagnosticsSegmentedModesProps) {
	return (
		<div
			className="diag-segmented-bar flex items-center shrink-0"
			role="tablist"
			aria-label="Режимы визуальной диагностики"
		>
			<button
				type="button"
				role="tab"
				aria-selected={diagnosticMode === "rvg"}
				onClick={() => setDiagnosticMode("rvg")}
				data-testid="tab-diagnostic-mode-rvg"
				className={`diag-segmented-item h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
					diagnosticMode === "rvg"
						? "bg-[var(--paper)] text-[var(--teal)] shadow-2xs border border-[var(--line-subtle)]"
						: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
			>
				<Camera size={14} />
				<span>RVG визиограф</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={diagnosticMode === "photo"}
				onClick={() => setDiagnosticMode("photo")}
				data-testid="tab-diagnostic-mode-photo"
				className={`diag-segmented-item h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
					diagnosticMode === "photo"
						? "bg-[var(--paper)] text-[var(--teal)] shadow-2xs border border-[var(--line-subtle)]"
						: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
			>
				<ImageIcon size={14} />
				<span>Фотопротокол</span>
				{photoAttachmentsCount > 0 ? (
					<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--teal)] text-white leading-none">
						{photoAttachmentsCount}
					</span>
				) : null}
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={diagnosticMode === "cbct"}
				onClick={() => setDiagnosticMode("cbct")}
				data-testid="tab-diagnostic-mode-cbct"
				className={`diag-segmented-item h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
					diagnosticMode === "cbct"
						? "bg-[var(--paper)] text-[var(--teal)] shadow-2xs border border-[var(--line-subtle)]"
						: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
			>
				<Activity size={14} />
				<span>КЛКТ и ОПТГ</span>
			</button>
		</div>
	);
}
