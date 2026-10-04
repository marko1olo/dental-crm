import React from "react";
import { Copy } from "lucide-react";
import { DentalForm043 } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";

export interface ImplantDiaryTabProps {
	readonly diaryText: string;
}

export const ImplantDiaryTab: React.FC<ImplantDiaryTabProps> = ({ diaryText }) => {
	return (
		<div className="space-y-3" data-testid="tab-content-diary">
			<div className="flex items-center justify-between">
				<span className="text-xs font-black uppercase text-[var(--muted)] tracking-wider flex items-center gap-1.5">
					<DentalForm043 size={15} className="text-[var(--teal,#0d9488)]" />
					<span>Текст протокола для дневника приёма:</span>
				</span>
				<button
					type="button"
					onClick={() => {
						navigator.clipboard?.writeText(diaryText);
						showToast("Протокол скопирован в буфер обмена", "success");
					}}
					className="implant-touch-btn bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] text-xs flex items-center gap-1.5"
					data-testid="btn-copy-protocol"
				>
					<Copy size={14} />
					<span>Скопировать</span>
				</button>
			</div>
			<textarea
				readOnly
				value={diaryText}
				className="w-full p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] font-mono text-xs text-[var(--ink)] leading-relaxed resize-none"
				rows={8}
				data-testid="protocol-preview-text"
			/>
		</div>
	);
};
