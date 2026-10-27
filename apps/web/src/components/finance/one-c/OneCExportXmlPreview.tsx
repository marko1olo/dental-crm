import React from "react";
import { Check, Copy } from "lucide-react";

export interface OneCExportXmlPreviewProps {
	readonly generatedXml: string;
	readonly isXmlCopied: boolean;
	readonly handleCopyXml: () => void;
}

export const OneCExportXmlPreview: React.FC<OneCExportXmlPreviewProps> = ({
	generatedXml,
	isXmlCopied,
	handleCopyXml,
}) => {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold text-[var(--muted,#64748b)]">
					Предпросмотр XML-структуры CommerceML 2.09:
				</span>
				<button
					type="button"
					onClick={handleCopyXml}
					className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] flex items-center gap-1 cursor-pointer transition-colors"
				>
					{isXmlCopied ? (
						<>
							<Check size={12} className="text-emerald-600" />
							<span>Скопировано</span>
						</>
					) : (
						<>
							<Copy size={12} />
							<span>Скопировать XML</span>
						</>
					)}
				</button>
			</div>
			<pre className="p-3.5 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[50vh] border border-slate-800 selection:bg-teal-800">
				<code>{generatedXml}</code>
			</pre>
		</div>
	);
};
