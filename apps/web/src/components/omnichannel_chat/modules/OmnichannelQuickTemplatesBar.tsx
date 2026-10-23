import React from "react";
import { FileText } from "lucide-react";
import { OMNICHANNEL_TEMPLATES } from "../omnichannelChatTemplates";

export interface OmnichannelQuickTemplatesBarProps {
	onApplyTemplate: (templateText: string) => void;
}

export function OmnichannelQuickTemplatesBar({
	onApplyTemplate,
}: OmnichannelQuickTemplatesBarProps): React.JSX.Element {
	return (
		<div className="px-3 py-1.5 border-t border-[var(--line)] bg-[var(--paper)] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
			<span className="text-[11px] font-bold text-[var(--muted)] shrink-0 flex items-center gap-1">
				<FileText size={12} /> Шаблоны:
			</span>
			{OMNICHANNEL_TEMPLATES.map((tmpl) => (
				<button
					key={tmpl.id}
					type="button"
					onClick={() => onApplyTemplate(tmpl.text)}
					className="shrink-0 min-h-[30px] px-2.5 py-0.5 rounded-full bg-[var(--paper-card)] hover:bg-[var(--teal-surface,#f0fdfa)] text-[var(--ink)] hover:text-[var(--teal,#0d9488)] border border-[var(--line)] text-[11px] font-semibold whitespace-nowrap transition-colors"
					data-testid={`quick-template-${tmpl.id}`}
				>
					{tmpl.title}
				</button>
			))}
		</div>
	);
}
