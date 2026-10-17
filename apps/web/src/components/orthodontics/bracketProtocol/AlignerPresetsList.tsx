import React from "react";
import { Zap } from "lucide-react";
import { ALIGNER_ATTACHMENT_PRESETS } from "./types";

interface AlignerPresetsListProps {
	readonly activeAttachmentPreset: string | null;
	readonly onSelectAttachmentPreset: (presetId: string) => void;
}

export const AlignerPresetsList: React.FC<AlignerPresetsListProps> = ({
	activeAttachmentPreset,
	onSelectAttachmentPreset,
}) => {
	return (
		<div className="grid grid-cols-1 gap-1.5">
			{ALIGNER_ATTACHMENT_PRESETS.map((preset) => {
				const isSelected = activeAttachmentPreset === preset.id;
				return (
					<button
						key={preset.id}
						type="button"
						onClick={() => onSelectAttachmentPreset(preset.id)}
						data-testid={`preset-${preset.id}-attachments`}
						className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
							isSelected
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm font-black ring-2 ring-[var(--primary)]/30"
								: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
							isSelected ? "bg-white/20 text-white" : "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
						}`}>
							<Zap size={13} />
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-xs font-bold leading-tight">{preset.label}</div>
							<div className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
								{preset.description}
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
};
