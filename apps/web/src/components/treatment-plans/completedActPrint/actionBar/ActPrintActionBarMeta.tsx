import React from "react";
import { FileCheck } from "lucide-react";
import type { CompletedWorksActAndWriteOffData, ActPalette } from "../types.js";

export interface ActPrintActionBarMetaProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: ActPalette;
}

export const ActPrintActionBarMeta: React.FC<ActPrintActionBarMetaProps> = ({ actData, palette }) => {
	const stageLabel = /^этап\s*\d+/i.test(actData.stageTitle.trim())
		? actData.stageTitle
		: `Этап ${actData.stageNumber}: ${actData.stageTitle}`;

	const statusClass =
		actData.status === "executed"
			? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
			: actData.status === "signed"
				? "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/40"
				: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800";

	const statusLabel =
		actData.status === "executed"
			? "Списано на складе"
			: actData.status === "signed"
				? "Подписан пациентом"
				: "Черновик акта";

	return (
		<div className="flex items-center gap-3">
			<div
				className="p-2.5 rounded-2xl text-white shadow-sm shrink-0 flex items-center justify-center"
				style={{ backgroundColor: palette.primary }}
			>
				<FileCheck className="w-5 h-5" />
			</div>
			<div>
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-bold text-sm text-[var(--ink,#0f172a)] dark:text-white block">
						Акт сдачи-приемки и Накладная на списание ТМЦ
					</span>
					<span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${statusClass}`}>
						{statusLabel}
					</span>
				</div>
				<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
					Акт № {actData.actNumber} • {stageLabel}
				</span>
			</div>
		</div>
	);
};
