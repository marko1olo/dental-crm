import { Copy, Download } from "lucide-react";
import type React from "react";
import { showToast } from "../../GlobalToast.js";

export interface SeniorNurseDisposalActMoreMenuProps {
	readonly actNumber: string;
	readonly onDownloadHtml: () => void;
	readonly onCloseMenu: () => void;
}

export const SeniorNurseDisposalActMoreMenu: React.FC<SeniorNurseDisposalActMoreMenuProps> = ({
	actNumber,
	onDownloadHtml,
	onCloseMenu,
}) => {
	const handleCopy = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(actNumber);
			showToast(`Номер акта ${actNumber} скопирован`, "success");
		}
	};

	return (
		<div
			className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1"
			onClick={onCloseMenu}
		>
			<button
				type="button"
				onClick={onDownloadHtml}
				className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
			>
				<Download size={14} className="text-teal-600" />
				<span>Скачать HTML</span>
			</button>
			<button
				type="button"
				onClick={handleCopy}
				className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2"
			>
				<Copy size={14} className="text-teal-600" />
				<span>Копировать № акта</span>
			</button>
		</div>
	);
};
