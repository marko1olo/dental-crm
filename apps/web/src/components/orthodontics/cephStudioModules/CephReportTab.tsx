import React from "react";
import { Check, Copy } from "lucide-react";

export interface CephReportTabProps {
	readonly theme: "light" | "dark";
	readonly protocolText: string;
	readonly copiedProtocol: boolean;
	readonly onCopyProtocol: () => void;
}

export const CephReportTab: React.FC<CephReportTabProps> = ({
	theme,
	protocolText,
	copiedProtocol,
	onCopyProtocol,
}) => {
	const isLight = theme === "light";
	return (
		<div className={`flex-1 flex flex-col overflow-y-auto p-4 space-y-3 ${isLight ? "bg-white" : ""}`}>
			<div className="flex items-center justify-between">
				<span className={`text-xs font-bold uppercase tracking-wide ${isLight ? "text-slate-800" : "text-slate-300"}`}>
					Заключение (Медицинская карта)
				</span>
				<button
					type="button"
					onClick={onCopyProtocol}
					className={`h-7 px-2.5 rounded border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
						isLight
							? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
							: "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white"
					}`}
				>
					{copiedProtocol ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
					<span>{copiedProtocol ? "Скопировано" : "Копировать"}</span>
				</button>
			</div>

			<textarea
				readOnly
				value={protocolText}
				data-testid="ceph-report-textarea"
				className={`w-full flex-1 min-h-[360px] p-3.5 rounded-xl font-mono text-xs leading-relaxed resize-none focus:outline-none border ${
					isLight
						? "bg-slate-50 border-slate-200 text-slate-800 focus:border-teal-600"
						: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] focus:border-[var(--primary)]"
				}`}
			/>
		</div>
	);
};
