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
			<div className="mb-4 p-3 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-xs">
				<div className="flex items-center gap-2 text-[var(--ink)] font-bold mb-1">
					<ShieldCheck size={16} className="shrink-0 text-[var(--primary)]" />
					<span className="text-xs sm:text-sm">Гарантийные обязательства: {warrantyLabelRu}</span>
				</div>
				<p className="text-[var(--ink-muted)] leading-relaxed text-[11px]">
					Клиника гарантирует сохранение целостности, функциональной пригодности и цветостабильности конструкции в течение гарантийного срока при соблюдении гигиены и прохождении профосмотров.
				</p>
			</div>

			{/* Patient Care Recommendations */}
			<div className="mb-4">
				<h4 className="text-xs font-bold text-[var(--ink)] tracking-wider mb-1.5 flex items-center gap-1.5">
					<FileText size={14} className="text-[var(--primary)]" />
					<span>Памятка пациенту по уходу за конструкцией</span>
				</h4>
				<ol className="list-decimal pl-4 space-y-1 text-[11px] text-[var(--ink-muted)] leading-relaxed">
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
