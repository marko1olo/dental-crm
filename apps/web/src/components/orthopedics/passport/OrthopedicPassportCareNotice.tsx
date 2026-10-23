import React from "react";
import { ShieldCheck, FileText } from "lucide-react";

export interface OrthopedicPassportCareNoticeProps {
	readonly warrantyLabelRu: string;
	readonly careNotes: readonly string[];
}

export function OrthopedicPassportCareNotice({
	warrantyLabelRu,
	careNotes,
}: OrthopedicPassportCareNoticeProps) {
	return (
		<>
			{/* Warranty Conditions */}
			<div className="mb-4 p-3 rounded-lg border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
				<div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
					<ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
					<span className="text-xs sm:text-sm">Гарантийные обязательства: {warrantyLabelRu}</span>
				</div>
				<p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
					Клиника гарантирует сохранение целостности, функциональной пригодности и цветостабильности конструкции в течение гарантийного срока при соблюдении гигиены и прохождении профосмотров.
				</p>
			</div>

			{/* Patient Care Recommendations */}
			<div className="mb-4">
				<h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider mb-1.5 flex items-center gap-1.5">
					<FileText size={14} className="text-teal-600" />
					<span>Памятка пациенту по уходу за конструкцией</span>
				</h4>
				<ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
					{careNotes.map((note, idx) => (
						<li key={idx} className="pl-0.5">
							{note}
						</li>
					))}
				</ol>
			</div>
		</>
	);
}
