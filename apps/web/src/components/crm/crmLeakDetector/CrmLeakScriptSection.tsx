import type React from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import type { CrmLeakLeadItem } from "@dental/shared";

interface Props {
	lead: CrmLeakLeadItem;
	copied: boolean;
	onCopy: (text: string) => void;
	onClose: () => void;
}

export const CrmLeakScriptSection: React.FC<Props> = ({
	lead,
	copied,
	onCopy,
	onClose,
}) => {
	return (
		<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]">
			<div className="flex items-center justify-between mb-2">
				<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
					<MessageCircle size={15} className="text-[var(--teal)]" />
					<span>Скрипт реактивации: {lead.patientFullName}</span>
				</h4>
				<button type="button" className="icon-button" onClick={onClose}>
					<X size={14} />
				</button>
			</div>
			<div className="text-xs text-[var(--ink)] bg-[var(--paper)] p-3 rounded-lg border border-[var(--line)] leading-relaxed whitespace-pre-wrap">
				{lead.aiReactivationSuggestion}
			</div>
			<div className="flex justify-end gap-2 mt-3">
				<button
					type="button"
					className="primary-button cld-btn-sync"
					onClick={() => onCopy(lead.aiReactivationSuggestion)}
				>
					{copied ? <Check size={14} /> : <Copy size={14} />}
					<span>{copied ? "Скопировано!" : "Скопировать текст"}</span>
				</button>
			</div>
		</div>
	);
};
