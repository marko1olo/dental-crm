import React from "react";
import { Copy } from "lucide-react";

interface VisitSurgeryProtocolEditorProps {
	protocolText: string;
	onChangeText: (text: string) => void;
	onCopy: () => void;
}

export const VisitSurgeryProtocolEditor: React.FC<VisitSurgeryProtocolEditorProps> = ({
	protocolText,
	onChangeText,
	onCopy,
}) => {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<label
					htmlFor="visit-surgery-text"
					className="text-xs font-black uppercase text-[var(--muted)] tracking-wider"
				>
					Текст протокола операции:
				</label>
				<button
					type="button"
					onClick={onCopy}
					className="px-3 py-1 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1 cursor-pointer"
					data-testid="btn-copy-protocol-text"
				>
					<Copy size={13} />
					<span>Скопировать</span>
				</button>
			</div>

			<textarea
				id="visit-surgery-text"
				value={protocolText}
				onChange={(e) => onChangeText(e.target.value)}
				rows={4}
				className="w-full p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono text-[var(--ink)] resize-y focus:outline-none focus:border-[var(--teal,#0d9488)]"
				data-testid="textarea-visit-surgery-protocol"
			/>
		</div>
	);
};
